import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from 'primereact/toast';
import { Loader2, CheckCircle2, AlertCircle, CreditCard, Plus, Minus, Star, BadgeCheck } from 'lucide-react';
import { api, extraireListe } from '../../../services/api';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import './AbonnementPasteur.css';

// Doit correspondre au plafond du serveur (PaiementSimulationViewSet.simuler) :
// duree_jours * quantite au-dela de 10 ans fait deborder l'arithmetique de
// date et etait jusqu'ici refuse seulement cote serveur, sans indication ni
// limite dans l'interface — rien n'empechait de cliquer sur "+" des dizaines
// de fois puis de payer un montant absurde par erreur.
const JOURS_MAX = 3650;

// prix est un DecimalField : DRF le serialise en CHAINE ("120000"). Appeler
// toLocaleString() dessus renvoie la chaine telle quelle, sans separateur de
// milliers — le prix du plan s'affichait "120000" alors que le total juste
// en dessous, calcule par multiplication (donc converti en nombre), affichait
// bien "120 000". D'ou cette conversion explicite.
function montant(valeur) {
  return Number(valeur) || 0;
}

function formater(valeur) {
  return montant(valeur).toLocaleString('fr-FR');
}

export function AbonnementPasteur() {
  const { t } = useTranslation();
  const toast = useRef(null);

  const [souscription, setSouscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [chargement, setChargement] = useState(true);
  // Identifie le paiement precis en cours ({planId, methode}) et non un simple
  // booleen : avec un booleen, les quatre boutons affichaient leur spinner en
  // meme temps, impossible de savoir lequel etait reellement en traitement.
  const [paiementEnCours, setPaiementEnCours] = useState(null);
  const [erreur, setErreur] = useState('');
  const [quantites, setQuantites] = useState({});
  const [paiementAConfirmer, setPaiementAConfirmer] = useState(null);

  const paiementActif = !!paiementEnCours;

  function quantiteMax(plan) {
    // duree_jours a 0 (ou absent) donnerait une division par zero -> Infinity,
    // et donc un plafond inexistant cote interface.
    const duree = Number(plan.duree_jours) || 0;
    if (duree < 1) return 1;
    return Math.max(1, Math.floor(JOURS_MAX / duree));
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
        if (active) setErreur(t('dashboard.subscription_load_error', "Erreur lors du chargement des données d'abonnement."));
      } finally {
        if (active) setChargement(false);
      }
    }

    chargerDonnees();
    return () => { active = false; };
  }, [t]);

  // Cliquer sur « Payer » lancait immediatement la simulation de paiement,
  // sans aucune etape de confirmation — le seul flux d'argent de tout le site
  // sans le filet qu'on trouve partout ailleurs pour un simple clic sur
  // Supprimer. Un clic accidentel (le selecteur de quantite est juste
  // au-dessus) engageait directement le paiement.
  const demanderPaiement = (plan, methode) => {
    setPaiementAConfirmer({ plan, methode, quantite: getQuantite(plan.id) });
  };

  // « mois » est invariable en francais, mais pas « month » en anglais :
  // le singulier doit rester une cle distincte, sinon la version anglaise
  // affiche « 1 months ».
  const libelleUnite = (plan, quantite) => {
    const annuel = Number(plan.duree_jours) >= 365;
    if (annuel) {
      return quantite > 1
        ? t('dashboard.subscription_years', 'années')
        : t('dashboard.subscription_year', 'année');
    }
    return quantite > 1
      ? t('dashboard.subscription_months', 'mois')
      : t('dashboard.subscription_month', 'mois');
  };

  const confirmerPaiement = async () => {
    if (!paiementAConfirmer) return;
    const { plan, methode, quantite } = paiementAConfirmer;
    setPaiementAConfirmer(null);
    setPaiementEnCours({ planId: plan.id, methode });
    try {
      await api.post('/paiements/simuler/', { plan_id: plan.id, methode, quantite });
      toast.current?.show({
        severity: 'success',
        summary: t('dashboard.subscription_success_title', 'Succès'),
        detail: t('dashboard.subscription_success', {
          defaultValue: 'Paiement simulé avec succès via {{methode}}.',
          methode: methode === 'WAVE' ? 'Wave' : 'Orange Money',
        }),
        life: 5000,
      });
      const nouvelleSouscription = await api.get('/souscriptions/courante/');
      setSouscription(nouvelleSouscription.data);
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: t('dashboard.subscription_error_title', 'Erreur'),
        detail: err.response?.data?.detail || t('dashboard.subscription_pay_error', 'Erreur lors du paiement'),
        life: 5000,
      });
    } finally {
      setPaiementEnCours(null);
    }
  };

  if (chargement) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <Loader2 size={32} className="spin-icone" style={{ margin: '0 auto', color: 'var(--primary)' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
          {t('dashboard.subscription_loading', 'Chargement de votre espace abonnement...')}
        </p>
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
  const planActuelId = souscription?.plan ?? null;

  return (
    <div className="abonnement-container fade-in">
      <Toast ref={toast} />

      <div className="abonnement-header">
        <h2 className="abonnement-title">{t('dashboard.subscription_title', 'Mon Abonnement')}</h2>
        <p className="abonnement-subtitle">
          {t('dashboard.subscription_subtitle', 'Gérez votre forfait pour continuer à publier sur la plateforme sans interruption et développer votre audience.')}
        </p>
      </div>

      {/* État actuel */}
      <div className={`status-banner ${estActive ? 'active' : 'expired'}`}>
        <div className="status-icon-container">
          {estActive ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
        </div>
        <div>
          <h3 className="status-titre">
            {estActive
              ? t('dashboard.subscription_status_active', 'Statut : Actif')
              : t('dashboard.subscription_status_expired', 'Statut : Expiré')}
          </h3>
          <p className="status-texte">
            {estActive ? (
              souscription?.est_essai
                ? t('dashboard.subscription_trial', { defaultValue: "Vous êtes en période d'essai gratuit. Il vous reste {{jours}} jour(s).", jours: joursRestants })
                : t('dashboard.subscription_valid', { defaultValue: 'Votre abonnement est valide. Il vous reste {{jours}} jour(s).', jours: joursRestants })
            ) : (
              t('dashboard.subscription_expired_desc', 'Votre abonnement a expiré. Renouvelez-le pour continuer à publier.')
            )}
          </p>
        </div>
      </div>

      {/* Plans tarifaires */}
      <div className="plans-intro">
        <CreditCard size={26} color="var(--primary)" aria-hidden="true" />
        <h3>{t('dashboard.subscription_choose', 'Choisissez votre formule')}</h3>
      </div>

      <div className="plans-grid">
        {plans.length === 0 ? (
          <p className="plans-vide">
            {t('dashboard.subscription_none', 'Aucun forfait disponible pour le moment.')}
          </p>
        ) : (
          plans.map(plan => {
            // Deduit de duree_jours plutot que du nom du plan : un simple
            // renommage ("Formule Premium" au lieu de "Abonnement Annuel")
            // faisait perdre silencieusement le badge et l'unite "Années"
            // sans toucher a la duree reelle du plan.
            const isAnnuel = Number(plan.duree_jours) >= 365;
            const planQuantite = getQuantite(plan.id);
            const maxPlan = quantiteMax(plan);
            const maxAtteint = planQuantite >= maxPlan;
            const estPlanActuel = planActuelId !== null && planActuelId === plan.id;
            const unite = libelleUnite(plan, planQuantite);
            const enCoursWave = paiementEnCours?.planId === plan.id && paiementEnCours?.methode === 'WAVE';
            const enCoursOrange = paiementEnCours?.planId === plan.id && paiementEnCours?.methode === 'ORANGE_MONEY';

            return (
              <div
                key={plan.id}
                className={`plan-card${isAnnuel ? ' featured' : ''}${estPlanActuel ? ' est-actuel' : ''}`}
              >
                {isAnnuel && (
                  <div className="badge-recommande">
                    <Star size={13} fill="currentColor" aria-hidden="true" />
                    {t('dashboard.subscription_recommended', 'Recommandé')}
                  </div>
                )}
                {estPlanActuel && (
                  <div className="badge-actuel">
                    <BadgeCheck size={13} aria-hidden="true" />
                    {t('dashboard.subscription_current', 'Formule actuelle')}
                  </div>
                )}

                <div className="plan-info-section">
                  <h4 className="plan-title">{plan.nom}</h4>

                  <div className="plan-price-container">
                    <span className="plan-price">{formater(plan.prix)}</span>
                    <span className="plan-currency">FCFA</span>
                    <div className="plan-period">
                      {isAnnuel
                        ? t('dashboard.subscription_per_year', 'par an')
                        : t('dashboard.subscription_per_month', 'par mois')}
                    </div>
                  </div>

                  <p className="plan-desc">
                    {plan.description || t('dashboard.subscription_default_desc', { defaultValue: 'Accès illimité pour publier vos contenus pendant {{jours}} jours.', jours: plan.duree_jours })}
                  </p>
                </div>

                {/* Sélecteur de durée */}
                <div className="quantity-section">
                  <div className="quantity-box">
                    <span className="quantity-label">
                      {t('dashboard.subscription_duration', 'Durée souhaitée')}
                    </span>
                    <div className="quantity-controls">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => handleDecrement(plan.id)}
                        disabled={planQuantite <= 1 || paiementActif}
                        aria-label={t('dashboard.subscription_decrease', 'Diminuer la durée')}
                      >
                        <Minus size={18} />
                      </button>

                      <div className="qty-display">
                        <span className="qty-value">{planQuantite}</span>
                        <span className="qty-unit">{unite}</span>
                      </div>

                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => handleIncrement(plan)}
                        disabled={maxAtteint || paiementActif}
                        aria-label={t('dashboard.subscription_increase', 'Augmenter la durée')}
                        title={maxAtteint
                          ? t('dashboard.subscription_max', { defaultValue: 'Maximum : {{max}} {{unite}}', max: maxPlan, unite })
                          : undefined}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="checkout-section">
                  <div className="total-section">
                    <div className="total-label">{t('dashboard.subscription_total', 'Total à payer')}</div>
                    <div className="total-amount">
                      {formater(montant(plan.prix) * planQuantite)}
                      <span className="total-devise"> FCFA</span>
                    </div>
                  </div>

                  <div className="payment-buttons">
                    <button
                      type="button"
                      className="pay-btn wave"
                      onClick={() => demanderPaiement(plan, 'WAVE')}
                      disabled={paiementActif}
                    >
                      {enCoursWave && <Loader2 size={18} className="spin-icone" />}
                      {t('dashboard.subscription_pay_wave', 'Payer avec Wave')}
                    </button>
                    <button
                      type="button"
                      className="pay-btn orange"
                      onClick={() => demanderPaiement(plan, 'ORANGE_MONEY')}
                      disabled={paiementActif}
                    >
                      {enCoursOrange && <Loader2 size={18} className="spin-icone" />}
                      {t('dashboard.subscription_pay_orange', 'Payer avec Orange Money')}
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
        title={t('dashboard.subscription_confirm_title', 'Confirmer le paiement')}
        message={
          paiementAConfirmer
            ? t('dashboard.subscription_confirm', {
                defaultValue: 'Payer {{total}} FCFA pour {{quantite}} {{unite}} de « {{plan}} », via {{methode}} ?',
                total: formater(montant(paiementAConfirmer.plan.prix) * paiementAConfirmer.quantite),
                quantite: paiementAConfirmer.quantite,
                unite: libelleUnite(paiementAConfirmer.plan, paiementAConfirmer.quantite),
                plan: paiementAConfirmer.plan.nom,
                methode: paiementAConfirmer.methode === 'WAVE' ? 'Wave' : 'Orange Money',
                interpolation: { escapeValue: false },
              })
            : ''
        }
        confirmText={t('dashboard.subscription_confirm_action', 'Confirmer le paiement')}
        variant="primary"
        icon={CreditCard}
      />
    </div>
  );
}

export default AbonnementPasteur;
