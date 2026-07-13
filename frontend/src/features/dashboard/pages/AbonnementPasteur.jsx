import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from 'primereact/toast';
import { Loader2, CheckCircle2, AlertCircle, CreditCard, Plus, Minus, Star } from 'lucide-react';
import { api, extraireListe } from '../../../services/api';
import './AbonnementPasteur.css';

export function AbonnementPasteur() {
  const { t } = useTranslation();
  const toast = useRef(null);
  
  const [souscription, setSouscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [chargementPaiement, setChargementPaiement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [quantites, setQuantites] = useState({});

  const handleIncrement = (planId) => {
    setQuantites(prev => ({ ...prev, [planId]: (prev[planId] || 1) + 1 }));
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

  const handleSimulerPaiement = async (planId, methode) => {
    setChargementPaiement(true);
    const quantite = getQuantite(planId);
    try {
      const response = await api.post('/paiements/simuler/', { plan_id: planId, methode, quantite });
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
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: '#004a94' }} />
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Chargement de votre espace abonnement...</p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '12px' }}>
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
        <CreditCard size={28} color="#004a94" />
        <h3 style={{ fontSize: '1.75rem', margin: 0, color: '#0f172a', fontWeight: '800' }}>Choisissez votre formule</h3>
      </div>
      
      <div className="plans-grid">
        {plans.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', width: '100%', gridColumn: '1 / -1' }}>Aucun forfait disponible pour le moment.</p>
        ) : (
          plans.map(plan => {
            const isAnnuel = plan.nom.toLowerCase().includes('annuel');
            const planQuantite = getQuantite(plan.id);
            const labelUnite = isAnnuel ? (planQuantite > 1 ? 'Années' : 'Année') : (planQuantite > 1 ? 'Mois' : 'Mois');

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
                      <button className="qty-btn" onClick={() => handleDecrement(plan.id)}>
                        <Minus size={20} />
                      </button>
                      
                      <div className="qty-display">
                        <span className="qty-value">{planQuantite}</span>
                        <span className="qty-unit">{labelUnite}</span>
                      </div>

                      <button className="qty-btn" onClick={() => handleIncrement(plan.id)}>
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
                      className="pay-btn wave"
                      onClick={() => handleSimulerPaiement(plan.id, 'WAVE')}
                      disabled={chargementPaiement}
                    >
                      {chargementPaiement && <Loader2 size={20} className="animate-spin" />}
                      Payer avec Wave
                    </button>
                    <button 
                      className="pay-btn orange"
                      onClick={() => handleSimulerPaiement(plan.id, 'ORANGE_MONEY')}
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
    </div>
  );
}

export default AbonnementPasteur;
