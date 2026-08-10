import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from 'primereact/toast';
import { Loader2, CheckCircle2, AlertCircle, CreditCard, Plus, Minus, Star } from 'lucide-react';
import { api, extraireListe } from '../../../services/api';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import './AbonnementPasteur.css';

// Doit correspondre au plafond du serveur (PaiementSimulationViewSet.simuler) :
// duree_jours * quantite au-dela de 10 ans fait deborder l'arithmetique de
// date et etait jusqu'ici refuse seulement cote serveur, sans indication ni
// limite dans l'interface — rien n'empechait de cliquer sur "+" des dizaines
// de fois puis de payer un montant absurde par erreur.
const JOURS_MAX = 3650;

export function AbonnementPasteur() {
  const { t } = useTranslation();
  const toast = useRef(null);

  const [souscription, setSouscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [chargementPaiement, setChargementPaiement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [quantites, setQuantites] = useState({});
  const [paiementAConfirmer, setPaiementAConfirmer] = useState(null);

  function quantiteMax(plan) {
    return Math.max(1, Math.floor(JOURS_MAX / plan.duree_jours));
  }

  const handleIncrement = (plan) => {
    setQuantites(prev => ({
      ...prev,
      [plan.id]: Math.min(quantiteMax(plan), (prev[plan.id] || 1) + 1),
    }));
  };

  const handleDecrement = (planId) => {
    setQuantites(prev => ({ ...prev, [planId]: Math.max(1, (prev[planId] || 1) - 1) }));
  };

  const getQuantite = (planId) => quantites[planId] || 1;

  useEffect(() => {
    let active = true;

    async function chargerDonnees() {
      try {
        const [sousResponse, plansResponse] = await Promise.all([
          api.get('/souscriptions/courante/').catch(() => ({ data: null })),
          api.get('/plans/').catch(() => ({ data: [] }))
        ]);

        if (active) {
          setSouscription(sousResponse.data);
          setPlans(extraireListe(plansResponse.data));
          setErreur('');
        }
      } catch (err) {
        if (active) setErreur("Erreur lors du chargement des données d'abonnement.");
      } finally {
        if (active) setChargement(false);
      }
    }

    chargerDonnees();
    return () => { active = false; };
  }, []);

  // Cliquer sur « Payer » lancait immediatement la simulation de paiement,
  // sans aucune etape de confirmation — le seul flux d'argent de tout le site
  // sans le filet qu'on trouve partout ailleurs pour un simple clic sur
  // Supprimer. Un clic accidentel (le selecteur de quantite est juste
  // au-dessus) engageait directement le paiement.
  const demanderPaiement = (plan, methode) => {
    setPaiementAConfirmer({ plan, methode, quantite: getQuantite(plan.id) });
  };

  const confirmerPaiement = async () => {
    if (!paiementAConfirmer) return;
    const { plan, methode, quantite } = paiementAConfirmer;
    setPaiementAConfirmer(null);
    setChargementPaiement(true);
    try {
      await api.post('/paiements/simuler/', { plan_id: plan.id, methode, quantite });
      toast.current.show({ severity: 'success', summary: 'Succès', detail: 'Paiement simulé avec succès via ' + methode, life: 5000 });
      const nouvelleSouscription = await api.get('/souscriptions/courante/');
      setSouscription(nouvelleSouscription.data);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Erreur', detail: err.response?.data?.detail || 'Erreur lors du paiement', life: 5000 });
    } finally {
      setChargementPaiement(false);
    }
  };

  if (chargement) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--primary)' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Chargement de votre espace abonnement...</p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div role="alert" style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)', backgroundColor: 'rgba(var(--danger-rgb), 0.1)', borderRadius: '12px' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 1rem' }} />
        <p>{erreur}</p>
      </div>
    );
  }

  const estActive = souscription?.est_active;
  const joursRestants = souscription?.jours_restants || 0;
  
  return (
    <div className="abonnement-container fade-in">
      <Toast ref={toast} />
      
      <div className="abonnement-header">
        <h2 className="abonnement-title">Mon Abonnement</h2>
        <p className="abonnement-subtitle">Gérez votre forfait pour continuer à publier sur la plateforme sans interruption et développer votre audience.</p>
      </div>

      {/* État actuel */}
      <div className={`status-banner ${estActive ? 'active' : 'expired'}`}>
        <div className="status-icon-container">
          {estActive ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
        </div>
        <div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: '700' }}>
            {estActive ? 'Statut : Actif' : 'Statut : Expiré'}
          </h3>
          <p style={{ margin: 0, fontSize: '1.05rem', opacity: 0.9 }}>
            {estActive ? (
              souscription?.est_essai 
                ? `Vous êtes en période d'essai gratuit. Il vous reste ${joursRestants} jour(s).`
                : `Votre abonnement est valide. Il vous reste ${joursRestants} jour(s).`
            ) : (
              'Votre abonnement a expiré. Renouvelez-le pour continuer à publier.'
            )}
          </p>
        </div>
      </div>

      {/* Plans tarifaires */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
        <CreditCard size={28} color="var(--primary)" />
        <h3 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--text-main)', fontWeight: '800' }}>Choisissez votre formule</h3>
      </div>

      <div className="plans-grid">
        {plans.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', width: '100%', gridColumn: '1 / -1' }}>Aucun forfait disponible pour le moment.</p>
        ) : (
          plans.map(plan => {
            // Deduit de duree_jours plutot que du nom du plan : un simple
            // renommage ("Formule Premium" au lieu de "Abonnement Annuel")
            // faisait perdre silencieusement le badge et l'unite "Années"
            // sans toucher a la duree reelle du plan.
            const isAnnuel = plan.duree_jours >= 365;
            const planQuantite = getQuantite(plan.id);
            const labelUnite = isAnnuel ? (planQuantite > 1 ? 'Années' : 'Année') : (planQuantite > 1 ? 'Mois' : 'Mois');
            const maxAtteint = planQuantite >= quantiteMax(plan);

            return (
              <div key={plan.id} className={`plan-card ${isAnnuel ? 'featured' : ''}`}>
                {isAnnuel && (
                  <div className="badge-recommande">
                    <Star size={14} fill="currentColor" /> Recommandé
                  </div>
                )}

                <div className="plan-info-section">
                  <h4 className="plan-title">{plan.nom}</h4>
                  
                  <div className="plan-price-container">
                    <span className="plan-price">{plan.prix.toLocaleString('fr-FR')}</span>
                    <span className="plan-currency">FCFA</span>
                    <div className="plan-period">par {isAnnuel ? 'an' : 'mois'}</div>
                  </div>

                  <p className="plan-desc">
                    {plan.description || `Accès illimité pour publier vos contenus pendant ${plan.duree_jours} jours.`}
                  </p>
                </div>

                {/* Sélecteur de quantité stylisé */}
                <div className="quantity-section">
                  <div className="quantity-box">
                    <span className="quantity-label">Durée souhaitée</span>
                    <div className="quantity-controls">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => handleDecrement(plan.id)}
                        disabled={planQuantite <= 1}
                        aria-label="Diminuer la durée"
                      >
                        <Minus size={20} />
                      </button>

                      <div className="qty-display">
                        <span className="qty-value">{planQuantite}</span>
                        <span className="qty-unit">{labelUnite}</span>
                      </div>

                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => handleIncrement(plan)}
                        disabled={maxAtteint}
                        aria-label="Augmenter la durée"
                        title={maxAtteint ? `Maximum : ${quantiteMax(plan)} ${labelUnite.toLowerCase()}` : undefined}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="checkout-section">
                  <div className="total-section">
                    <div className="total-label">Total à payer</div>
                    <div className="total-amount">
                      {(plan.prix * planQuantite).toLocaleString('fr-FR')} <span style={{ fontSize: '1.25rem' }}>FCFA</span>
                    </div>
                  </div>
                  
                  <div className="payment-buttons">
                    <button
                      type="button"
                      className="pay-btn wave"
                      onClick={() => demanderPaiement(plan, 'WAVE')}
                      disabled={chargementPaiement}
                    >
                      {chargementPaiement && <Loader2 size={20} className="animate-spin" />}
                      Payer avec Wave
                    </button>
                    <button
                      type="button"
                      className="pay-btn orange"
                      onClick={() => demanderPaiement(plan, 'ORANGE_MONEY')}
                      disabled={chargementPaiement}
                    >
                      {chargementPaiement && <Loader2 size={20} className="animate-spin" />}
                      Payer avec Orange Money
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={!!paiementAConfirmer}
        onClose={() => setPaiementAConfirmer(null)}
        onConfirm={confirmerPaiement}
        title="Confirmer le paiement"
        message={
          paiementAConfirmer
            ? `Payer ${(paiementAConfirmer.plan.prix * paiementAConfirmer.quantite).toLocaleString('fr-FR')} FCFA pour ${paiementAConfirmer.quantite} ${(paiementAConfirmer.plan.duree_jours >= 365 ? (paiementAConfirmer.quantite > 1 ? 'années' : 'année') : (paiementAConfirmer.quantite > 1 ? 'mois' : 'mois'))} de « ${paiementAConfirmer.plan.nom} », via ${paiementAConfirmer.methode === 'WAVE' ? 'Wave' : 'Orange Money'} ?`
            : ''
        }
        confirmText="Confirmer le paiement"
        variant="primary"
        icon={CreditCard}
      />
    </div>
  );
}

export default AbonnementPasteur;
