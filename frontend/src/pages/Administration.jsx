import { useEffect, useState } from 'react';
import { ShieldCheck, Flag, BadgeCheck, BarChart3, CheckCircle, XCircle, Clock, AlertTriangle, Users, Video, Eye, Download, MessageSquare, Heart, Bell } from 'lucide-react';
import { api, extraireListe } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import Pagination from '../components/Pagination';
import './Administration.css';

export function Administration() {
  const { t } = useTranslation();

  const LIBELLES_STATUT = {
    NOUVEAU: t('admin.status_new'),
    EN_COURS: t('admin.status_progress'),
    TRAITE: t('admin.status_resolved'),
    REJETE: t('admin.status_rejected'),
  };

  const [stats, setStats] = useState(null);
  const [pasteurs, setPasteurs] = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [actionEnCours, setActionEnCours] = useState(null);
  const [pasteurExamine, setPasteurExamine] = useState(null);
  const [recherchePasteur, setRecherchePasteur] = useState('');
  const [filtreStatutPasteur, setFiltreStatutPasteur] = useState('tous');
  const [pagePasteurs, setPagePasteurs] = useState(1);
  const [pageSignalements, setPageSignalements] = useState(1);
  const ELEMENTS_PAR_PAGE = 5;
  
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    titre: '',
    message: '',
    texteConfirmer: '',
    variante: 'primary',
    icone: null,
    action: () => {}
  });

  const ICONES_STATUT = {
    NOUVEAU: AlertTriangle,
    EN_COURS: Clock,
    TRAITE: CheckCircle,
    REJETE: XCircle,
  };

  async function charger() {
    setChargement(true);
    try {
      const [statsRes, pasteursRes, signalementsRes] = await Promise.all([
        api.get('/admin/statistiques/'),
        api.get('/pasteurs/'),
        api.get('/signalements/'),
      ]);
      setStats(statsRes.data);
      setPasteurs(extraireListe(pasteursRes.data));
      setSignalements(extraireListe(signalementsRes.data));
      setErreur('');
    } catch (error) {
      setErreur(error.response?.data?.detail || t('admin.load_error'));
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPagePasteurs(1);
  }, [recherchePasteur, filtreStatutPasteur]);

  const demanderConfirmation = (titre, message, texteConfirmer, variante, icone, action) => {
    setModalConfig({ titre, message, texteConfirmer, variante, icone, action });
    setModalOuvert(true);
  };

  useEffect(() => {
    if (messageSucces) {
      const timer = setTimeout(() => setMessageSucces(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [messageSucces]);

  async function validerPasteur(pasteur) {
    setActionEnCours(`valider-${pasteur.id}`);
    try {
      await api.post(`/pasteurs/${pasteur.id}/valider/`, { est_valide: true });
      setPasteurs((actuels) => actuels.map(p => p.id === pasteur.id ? { ...p, est_valide: true, est_rejete: false } : p));
      setMessageSucces(t('admin.success_validate', 'Le pasteur a été validé.'));
      setErreur('');
    } catch {
      setErreur(t('admin.validate_error'));
      setMessageSucces('');
    } finally {
      setActionEnCours(null);
    }
  }

  async function rejeterPasteur(pasteur) {
    setActionEnCours(`rejeter-${pasteur.id}`);
    try {
      await api.post(`/pasteurs/${pasteur.id}/valider/`, { est_valide: false });
      setPasteurs((actuels) => actuels.map(p => p.id === pasteur.id ? { ...p, est_valide: false, est_rejete: true } : p));
      setMessageSucces(t('admin.success_reject', 'Le pasteur a été rejeté.'));
      setErreur('');
    } catch {
      setErreur(t('admin.reject_error'));
      setMessageSucces('');
    } finally {
      setActionEnCours(null);
    }
  }

  async function changerStatut(signalement, statut) {
    try {
      const response = await api.post(`/signalements/${signalement.id}/changer_statut/`, { statut });
      setSignalements((actuels) =>
        actuels.map((item) => (item.id === signalement.id ? { ...item, statut: response.data.statut } : item))
      );
      setMessageSucces(t('admin.success_status', 'Le statut a été mis à jour avec succès.'));
      setErreur('');
    } catch {
      setErreur(t('admin.status_change_error'));
      setMessageSucces('');
    }
  }

  const pasteursFiltres = pasteurs.filter(p => {
    const correspondRecherche = (p.nom_affichage || '').toLowerCase().includes(recherchePasteur.toLowerCase()) ||
                                (p.nom_eglise || '').toLowerCase().includes(recherchePasteur.toLowerCase()) ||
                                (p.email || '').toLowerCase().includes(recherchePasteur.toLowerCase());
    
    if (filtreStatutPasteur === 'valides') return correspondRecherche && p.est_valide === true;
    if (filtreStatutPasteur === 'en_attente') return correspondRecherche && p.est_valide === false && !p.est_rejete;
    if (filtreStatutPasteur === 'rejetes') return correspondRecherche && p.est_valide === false && p.est_rejete === true;
    return correspondRecherche;
  });

  const indexDebutPasteurs = (pagePasteurs - 1) * ELEMENTS_PAR_PAGE;
  const pasteursAffiches = pasteursFiltres.slice(indexDebutPasteurs, indexDebutPasteurs + ELEMENTS_PAR_PAGE);
  const totalPagesPasteurs = Math.ceil(pasteursFiltres.length / ELEMENTS_PAR_PAGE);

  const indexDebutSignalements = (pageSignalements - 1) * ELEMENTS_PAR_PAGE;
  const signalementsAffiches = signalements.slice(indexDebutSignalements, indexDebutSignalements + ELEMENTS_PAR_PAGE);
  const totalPagesSignalements = Math.ceil(signalements.length / ELEMENTS_PAR_PAGE);

  if (chargement) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <p>{t('admin.loading')}</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* En-tête */}
      <header className="admin-hero">
        <div className="admin-hero-content">
          <div className="admin-hero-icon">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1>{t('admin.title')}</h1>
            <p>{t('admin.subtitle')}</p>
          </div>
        </div>
        {erreur ? <div className="admin-alert-error">{erreur}</div> : null}
        {messageSucces ? <div className="admin-alert-success">{messageSucces}</div> : null}
      </header>

      {/* KPIs */}
      {stats ? (
        <section className="admin-section">
          <div className="admin-section-header">
            <BarChart3 size={20} />
            <h2>{t('admin.overview')}</h2>
          </div>
          <div className="admin-kpis">
            <div className="admin-kpi admin-kpi-blue">
              <div className="admin-kpi-icon"><Users size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_utilisateurs}</strong>
                <span>{t('admin.users')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-purple">
              <div className="admin-kpi-icon"><BadgeCheck size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_pasteurs}</strong>
                <span>{t('admin.pastors', { count: stats.total_pasteurs_valides })}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-teal">
              <div className="admin-kpi-icon"><Video size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_predications}</strong>
                <span>{t('admin.sermons', { count: stats.total_predications_publiees })}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-amber">
              <div className="admin-kpi-icon"><Eye size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_vues?.toLocaleString('fr-FR')}</strong>
                <span>{t('admin.views')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-green">
              <div className="admin-kpi-icon"><Download size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_telechargements?.toLocaleString('fr-FR')}</strong>
                <span>{t('admin.downloads')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-pink">
              <div className="admin-kpi-icon"><MessageSquare size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_commentaires}</strong>
                <span>{t('admin.comments')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-rose">
              <div className="admin-kpi-icon"><Heart size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_favoris}</strong>
                <span>{t('admin.favorites')}</span>
              </div>
            </div>
            <div className="admin-kpi admin-kpi-indigo">
              <div className="admin-kpi-icon"><Bell size={20} /></div>
              <div className="admin-kpi-data">
                <strong>{stats.total_abonnements}</strong>
                <span>{t('admin.subscriptions')}</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Pasteurs */}
      <section className="admin-section">
        <div className="admin-section-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BadgeCheck size={20} />
            <h2>{t('admin.manage_pastors', 'Gestion des Pasteurs')}</h2>
            <span className="admin-badge-count">{pasteursFiltres.length}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Rechercher par nom, église, email..." 
              value={recherchePasteur}
              onChange={(e) => setRecherchePasteur(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '250px' }}
            />
            <select 
              value={filtreStatutPasteur} 
              onChange={(e) => setFiltreStatutPasteur(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            >
              <option value="tous">Tous les statuts</option>
              <option value="valides">Validés</option>
              <option value="en_attente">En attente</option>
              <option value="rejetes">Rejetés</option>
            </select>
          </div>
        </div>
        {pasteursFiltres.length ? (
          <div className="datatable-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>{t('admin.col_avatar', 'Avatar')}</th>
                  <th>{t('admin.col_name', 'Nom complet')}</th>
                  <th>{t('admin.col_church', 'Église')}</th>
                  <th>{t('admin.col_contact', 'Contact')}</th>
                  <th>{t('admin.col_status', 'Statut')}</th>
                  <th>{t('admin.col_date', 'Inscription')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.col_actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pasteursAffiches.map((pasteur) => (
                  <tr key={pasteur.id} className="datatable-row">
                    <td>
                      <div className="admin-table-avatar">
                        {pasteur.avatar ? (
                          <img src={pasteur.avatar} alt={pasteur.nom_affichage} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span>{(pasteur.nom_affichage || '?')[0].toUpperCase()}</span>
                        )}
                      </div>
                    </td>
                    <td className="cell-title">
                      <strong>{pasteur.nom_affichage}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{pasteur.email}</div>
                    </td>
                    <td>{pasteur.nom_eglise || '-'}</td>
                    <td>{pasteur.contact || '-'}</td>
                    <td>
                      {pasteur.est_valide ? (
                        <span className="status-badge published">Validé</span>
                      ) : pasteur.est_rejete ? (
                        <span className="status-badge archived" style={{ color: '#ef4444', backgroundColor: '#fee2e2' }}>Rejeté</span>
                      ) : (
                        <span className="status-badge draft" style={{ color: '#ca8a04', backgroundColor: '#fef08a' }}>En attente</span>
                      )}
                    </td>
                    <td>{new Date(pasteur.cree_le).toLocaleDateString()}</td>
                    <td>
                      <div className="admin-table-actions">
                        {!pasteur.est_valide && (
                          <Button
                            variant="green"
                            icon={CheckCircle}
                            onClick={() => demanderConfirmation(
                              'Valider le pasteur',
                              `Êtes-vous sûr de vouloir valider le compte de ${pasteur.nom_affichage} ? Il pourra alors publier des vidéos.`,
                              'Valider le compte',
                              'success',
                              CheckCircle,
                              () => validerPasteur(pasteur)
                            )}
                            disabled={actionEnCours === `valider-${pasteur.id}` || actionEnCours === `rejeter-${pasteur.id}`}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                          >
                            {t('admin.validate_btn')}
                          </Button>
                        )}
                        {(!pasteur.est_rejete || pasteur.est_valide) && (
                          <Button
                            variant="red"
                            icon={XCircle}
                            onClick={() => demanderConfirmation(
                              'Rejeter le pasteur',
                              `Êtes-vous sûr de vouloir rejeter le compte de ${pasteur.nom_affichage} ?`,
                              'Rejeter le compte',
                              'danger',
                              XCircle,
                              () => rejeterPasteur(pasteur)
                            )}
                            disabled={actionEnCours === `valider-${pasteur.id}` || actionEnCours === `rejeter-${pasteur.id}`}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                          >
                            {t('admin.reject_btn')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={pagePasteurs} total={totalPagesPasteurs} onChange={setPagePasteurs} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            <p>{t('admin.no_pending_pastors')}</p>
          </div>
        )}
      </section>

      {/* Signalements */}
      <section className="admin-section">
        <div className="admin-section-header">
          <Flag size={20} />
          <h2>{t('admin.reports')}</h2>
          {signalements.length > 0 && (
            <span className="admin-badge-count admin-badge-red">{signalements.length}</span>
          )}
        </div>
        {signalements.length ? (
          <div className="datatable-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t('admin.col_reason', 'Raison')}</th>
                  <th>{t('admin.col_details', 'Détails')}</th>
                  <th>{t('admin.col_status', 'Statut')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.col_actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {signalementsAffiches.map((signalement) => {
                  const IconeStatut = ICONES_STATUT[signalement.statut] || AlertTriangle;
                  return (
                    <tr key={signalement.id} className="datatable-row">
                      <td className="cell-title" style={{ fontWeight: 600 }}>{signalement.raison}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: '200px' }}>{signalement.details || '-'}</td>
                      <td>
                        <span className={`admin-statut admin-statut-${signalement.statut}`}>
                          <IconeStatut size={12} style={{ marginRight: '4px' }} />
                          {LIBELLES_STATUT[signalement.statut] || signalement.statut}
                        </span>
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          {signalement.statut !== 'EN_COURS' && (
                            <button type="button" className="admin-action-btn admin-action-pending" onClick={() => demanderConfirmation(
                              'En cours de traitement',
                              `Voulez-vous marquer ce signalement comme "En cours de traitement" ?`,
                              'Marquer en cours',
                              'warning',
                              Clock,
                              () => changerStatut(signalement, 'EN_COURS')
                            )}>
                              <Clock size={14} /> {t('admin.action_progress')}
                            </button>
                          )}
                          {signalement.statut !== 'TRAITE' && (
                            <button type="button" className="admin-action-btn admin-action-resolve" onClick={() => demanderConfirmation(
                              'Traiter le signalement',
                              `Voulez-vous marquer ce signalement comme "Traité" ?`,
                              'Marquer comme traité',
                              'success',
                              CheckCircle,
                              () => changerStatut(signalement, 'TRAITE')
                            )}>
                              <CheckCircle size={14} /> {t('admin.action_resolve')}
                            </button>
                          )}
                          {signalement.statut !== 'REJETE' && (
                            <button type="button" className="admin-action-btn admin-action-reject" onClick={() => demanderConfirmation(
                              'Rejeter le signalement',
                              `Voulez-vous rejeter ce signalement (sans suite) ?`,
                              'Rejeter',
                              'danger',
                              XCircle,
                              () => changerStatut(signalement, 'REJETE')
                            )}>
                              <XCircle size={14} /> {t('admin.action_reject')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
              <Pagination current={pageSignalements} total={totalPagesSignalements} onChange={setPageSignalements} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <CheckCircle size={32} />
            <p>{t('admin.no_reports')}</p>
          </div>
        )}
      </section>

      <ConfirmModal 
        isOpen={modalOuvert}
        onClose={() => setModalOuvert(false)}
        onConfirm={modalConfig.action}
        title={modalConfig.titre}
        message={modalConfig.message}
        confirmText={modalConfig.texteConfirmer}
        variant={modalConfig.variante}
        icon={modalConfig.icone}
      />
    </div>
  );
}
