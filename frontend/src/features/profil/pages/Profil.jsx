import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart, BellRing, History, Download, Trash2,
  Loader2, UserRound, LogIn, BookOpen, CheckCircle2, AlertTriangle, KeyRound
} from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { Toast } from 'primereact/toast';
import { api, extraireListe } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './Profil.css';

export function Profil() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pasteur, session, estConnecte, deconnexion } = useAuth();
  const [actionRgpd, setActionRgpd] = useState('');
  const [favoris, setFavoris] = useState([]);
  const [abonnements, setAbonnements] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [imgErreur, setImgErreur] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [motDePasseForm, setMotDePasseForm] = useState({ actuel: '', nouveau: '', confirmation: '' });
  const [motDePasseErreur, setMotDePasseErreur] = useState('');
  const [motDePasseEnCours, setMotDePasseEnCours] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    if (!estConnecte) { setChargement(false); return; }
    let active = true;
    Promise.all([
      api.get('/favoris/'),
      api.get('/abonnements/'),
      api.get('/historique-lecture/'),
    ])
      .then(([fav, abo, hist]) => {
        if (!active) return;
        setFavoris(extraireListe(fav.data));
        setAbonnements(extraireListe(abo.data));
        setHistorique(extraireListe(hist.data));
      })
      .catch(() => {})
      .finally(() => { if (active) setChargement(false); });
    return () => { active = false; };
  }, [estConnecte]);

  async function exporterDonnees() {
    setActionRgpd('');
    try {
      const response = await api.get('/auth/mes-donnees/');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url; lien.download = 'mes-donnees.json'; lien.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionRgpd(t('profile.export_error'));
    }
  }

  async function changerMotDePasse(e) {
    e.preventDefault();
    setMotDePasseErreur('');

    if (motDePasseForm.nouveau !== motDePasseForm.confirmation) {
      setMotDePasseErreur(t('profile.change_password_mismatch'));
      return;
    }

    setMotDePasseEnCours(true);
    try {
      await api.post('/auth/changer-mot-de-passe/', {
        mot_de_passe_actuel: motDePasseForm.actuel,
        nouveau_mot_de_passe: motDePasseForm.nouveau,
      });
      setMotDePasseForm({ actuel: '', nouveau: '', confirmation: '' });
      toast.current?.show({ severity: 'success', summary: t('profile.change_password_success'), life: 4000 });
    } catch (error) {
      const donnees = error.response?.data;
      const message = donnees?.mot_de_passe_actuel?.[0]
        || donnees?.nouveau_mot_de_passe?.[0]
        || donnees?.detail
        || t('profile.change_password_error');
      setMotDePasseErreur(message);
    } finally {
      setMotDePasseEnCours(false);
    }
  }

  const confirmerSuppressionCompte = () => {
    setConfirmDelete(true);
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/auth/mon-compte/');
      deconnexion();
      navigate('/', { replace: true });
    } catch {
      setActionRgpd(t('profile.delete_error'));
    }
  };

  /* ── Non connecté ── */
  if (!estConnecte) {
    return (
      <div className="profil-container profil-center">
        <div className="profil-guest-card">
          <div className="profil-guest-icon"><LogIn size={28} /></div>
          <h1>{t('profile.login_required')}</h1>
          <p>{t('profile.login_desc')}</p>
          <Link to="/compte-fidele" className="btn-profil btn-export" style={{ textDecoration: 'none', justifyContent: 'center' }}>
            {t('profile.login_btn')}
          </Link>
        </div>
      </div>
    );
  }

  /* ── Initiales fallback ── */
  const nomAffichage = pasteur?.nom_affichage || session?.username || t('profile.default_user');
  const initiale = nomAffichage[0]?.toUpperCase() || 'U';
  const avatarUrl = pasteur?.avatar;
  const afficherImg = avatarUrl && !imgErreur;

  return (
    <div className="profil-container">
      <Toast ref={toast} />
      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteAccount}
        title={t('profile.personal_data') || 'Confirmation'}
        message={t('profile.delete_confirm')}
        confirmText={t('profile.delete_btn') || 'Supprimer mon compte'}
        variant="danger"
        icon={AlertTriangle}
      />
      <div className="profil-content">

        {/* ══════════════ EN-TÊTE PROFIL ══════════════ */}
        <section className="profil-hero">
          <div className="profil-hero-bg" aria-hidden="true" />

          <div className="profil-hero-body">
            {/* Avatar */}
            <div className="profil-avatar-ring">
              {afficherImg ? (
                <img
                  src={avatarUrl}
                  alt={nomAffichage}
                  className="profil-avatar-img"
                  onError={() => setImgErreur(true)}
                />
              ) : (
                <div className="profil-avatar-initiale">{initiale}</div>
              )}
              {pasteur?.est_valide && (
                <span className="profil-avatar-badge" title={t('profile.validated_account')}>
                  <CheckCircle2 size={16} />
                </span>
              )}
            </div>

            {/* Infos */}
            <div className="profil-hero-info">
              <h1 className="profil-hero-nom">{nomAffichage}</h1>
              {pasteur ? (
                <>
                  {pasteur.nom_eglise && (
                    <p className="profil-hero-eglise">⛪ {pasteur.nom_eglise}</p>
                  )}
                  {pasteur.contact && (
                    <p className="profil-hero-contact">📞 {pasteur.contact}</p>
                  )}
                  <span className="profil-hero-role pasteur">{t('profile.role_pastor')}</span>
                </>
              ) : (
                <>
                  {session?.contact && (
                    <p className="profil-hero-contact">📞 {session.contact}</p>
                  )}
                  <span className="profil-hero-role fidele">{t('profile.role_faithful')}</span>
                </>
              )}
            </div>
          </div>

          {/* Bio pasteur */}
          {pasteur?.biographie && (
            <p className="profil-hero-bio">{pasteur.biographie}</p>
          )}
        </section>

        {/* ══════════════ STATS RAPIDES ══════════════ */}
        <div className="profil-stats-row">
          <div className="profil-stat-chip">
            <Heart size={16} />
            <strong>{favoris.length}</strong>
            <span>{favoris.length !== 1 ? t('profile.favorites_label_plural') : t('profile.favorites_label_singular')}</span>
          </div>
          <div className="profil-stat-chip">
            <BellRing size={16} />
            <strong>{abonnements.length}</strong>
            <span>{abonnements.length !== 1 ? t('profile.subscriptions_label_plural') : t('profile.subscriptions_label_singular')}</span>
          </div>
          <div className="profil-stat-chip">
            <BookOpen size={16} />
            <strong>{historique.length}</strong>
            <span>{historique.length !== 1 ? t('profile.reading_label_plural') : t('profile.reading_label_singular')}</span>
          </div>
        </div>

        {/* ══════════════ GRILLE ══════════════ */}
        <div className="profil-grid">

          {/* Favoris */}
          <section className="profil-card">
            <h2><div className="icon-wrapper icon-favoris"><Heart size={18} /></div>{t('profile.my_favorites')}</h2>
            {chargement ? <Spinner t={t} /> : favoris.length ? (
              <ul className="profil-liste">
                {favoris.map((f) => (
                  <li key={f.id}>
                    <Link to={`/sermon/${f.predication_detail?.id || f.predication}`}>
                      {f.predication_detail?.titre || t('profile.default_sermon')}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <Vide texte={t('profile.no_favorites')} />}
          </section>

          {/* Abonnements */}
          <section className="profil-card">
            <h2><div className="icon-wrapper icon-abos"><BellRing size={18} /></div>{t('profile.my_subscriptions')}</h2>
            {chargement ? <Spinner t={t} /> : abonnements.length ? (
              <ul className="profil-liste">
                {abonnements.map((a) => (
                  <li key={a.id}>
                    <Link to={`/pasteurs/${a.pasteur_detail?.id || a.pasteur}`}>
                      {a.pasteur_detail?.nom_affichage || t('profile.default_pastor')}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <Vide texte={t('profile.no_subscriptions')} />}
          </section>

          {/* Historique */}
          <section className="profil-card">
            <h2><div className="icon-wrapper icon-historique"><History size={18} /></div>{t('profile.reading_history')}</h2>
            {chargement ? <Spinner t={t} /> : historique.length ? (
              <ul className="profil-liste">
                {historique.map((e) => (
                  <li key={e.id}>
                    <Link to={`/sermon/${e.predication_detail?.id || e.predication}`}>
                      {e.predication_detail?.titre || t('profile.default_sermon')}
                    </Link>
                    {e.est_termine && <span className="profil-badge">{t('profile.history_completed')}</span>}
                  </li>
                ))}
              </ul>
            ) : <Vide texte={t('profile.no_history')} />}
          </section>

          {/* Sécurité */}
          <section className="profil-card">
            <h2><div className="icon-wrapper icon-securite"><KeyRound size={18} /></div>{t('profile.security')}</h2>
            <p className="profil-info" style={{ marginBottom: '1rem' }}>
              {t('profile.security_desc')}
            </p>
            <form className="profil-form-securite" onSubmit={changerMotDePasse}>
              <input
                type="password"
                placeholder={t('profile.current_password')}
                value={motDePasseForm.actuel}
                onChange={(e) => setMotDePasseForm((f) => ({ ...f, actuel: e.target.value }))}
                autoComplete="current-password"
                required
              />
              <input
                type="password"
                placeholder={t('profile.new_password')}
                value={motDePasseForm.nouveau}
                onChange={(e) => setMotDePasseForm((f) => ({ ...f, nouveau: e.target.value }))}
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                placeholder={t('profile.confirm_new_password')}
                value={motDePasseForm.confirmation}
                onChange={(e) => setMotDePasseForm((f) => ({ ...f, confirmation: e.target.value }))}
                autoComplete="new-password"
                required
              />
              {motDePasseErreur && <div className="profil-erreur">{motDePasseErreur}</div>}
              <button type="submit" className="btn-profil btn-export" disabled={motDePasseEnCours}>
                {motDePasseEnCours ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={18} />}
                {t('profile.change_password_btn')}
              </button>
            </form>
          </section>

          {/* RGPD */}
          <section className="profil-card">
            <h2><div className="icon-wrapper icon-rgpd"><UserRound size={18} /></div>{t('profile.personal_data')}</h2>
            <p className="profil-info" style={{ marginBottom: '1rem' }}>
              {t('profile.personal_data_desc')}
            </p>
            {actionRgpd && <div className="profil-erreur">{actionRgpd}</div>}
            <div className="profil-rgpd-actions">
              <button type="button" className="btn-profil btn-export" onClick={exporterDonnees}>
                <Download size={18} /> {t('profile.export_btn')}
              </button>
              <button type="button" className="btn-profil btn-danger" onClick={confirmerSuppressionCompte}>
                <Trash2 size={18} /> {t('profile.delete_btn')}
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function Spinner({ t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t ? t('profile.loading') : 'Chargement...'}
    </div>
  );
}

function Vide({ texte }) {
  return <p className="profil-info">{texte}</p>;
}

export default Profil;
