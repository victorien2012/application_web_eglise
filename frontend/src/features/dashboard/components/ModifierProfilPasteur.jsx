import { useState, useRef, useEffect } from 'react';
import { Toast } from 'primereact/toast';
import { User, Church, Phone, Save, Loader2, FileText, Camera, Check, ImagePlus, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { verifierFichier } from '../../../utils/fichiers';
import './ModifierProfilPasteur.css';

const LIMITE_BIO = 500;
// Doit rester aligné sur EXTENSIONS_AVATAR / TAILLE_MAX_AVATAR_MO du serveur
// (backend/api/serializers/utilisateurs.py) : un fichier accepté ici mais
// refusé là-bas ne produirait qu'une erreur tardive et peu lisible.
const EXTENSIONS_IMAGE = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const TAILLE_MAX_MO = 5;

export function ModifierProfilPasteur() {
  const { pasteur, actualiserProfilPasteur } = useAuth();
  const { t } = useTranslation();

  const [nomAffichage, setNomAffichage] = useState(pasteur?.nom_affichage || '');
  const [nomEglise, setNomEglise] = useState(pasteur?.nom_eglise || '');
  const [contact, setContact] = useState(pasteur?.contact || '');
  const [biographie, setBiographie] = useState(pasteur?.biographie || '');
  const [avatar, setAvatar] = useState(null);
  const [logoEglise, setLogoEglise] = useState(null);
  // Aperçus locaux : sans eux, choisir le mauvais fichier ne se remarquait
  // qu'après l'enregistrement — seul le nom du fichier était visible avant.
  const [avatarApercu, setAvatarApercu] = useState(null);
  const [logoApercu, setLogoApercu] = useState(null);
  const avatarUrlRef = useRef(null);
  const logoUrlRef = useRef(null);

  const [erreur, setErreur] = useState('');
  const [nomAffichageErreur, setNomAffichageErreur] = useState('');
  const toast = useRef(null);
  const [soumission, setSoumission] = useState(false);
  const avatarInputRef = useRef(null);
  const logoInputRef = useRef(null);

  useEffect(() => () => {
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
  }, []);

  function choisirAvatar(fichier) {
    setAvatar(fichier);
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    avatarUrlRef.current = fichier ? URL.createObjectURL(fichier) : null;
    setAvatarApercu(avatarUrlRef.current);
  }

  function choisirLogo(fichier) {
    setLogoEglise(fichier);
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    logoUrlRef.current = fichier ? URL.createObjectURL(fichier) : null;
    setLogoApercu(logoUrlRef.current);
  }

  // Un fichier trop lourd ou d'un type non autorisé doit être signalé
  // immédiatement : sinon le bouton semble ne rien faire, ou l'erreur
  // n'apparaît qu'après l'envoi, renvoyée par le serveur.
  function validerImage(fichier) {
    return verifierFichier(fichier, {
      extensions: EXTENSIONS_IMAGE,
      tailleMaxMo: TAILLE_MAX_MO,
      messageFormatInvalide: () => t('dashboard.profile_file_invalid_type', 'Format non pris en charge (JPG, PNG, WEBP ou GIF).'),
      messageTropVolumineux: () => t('dashboard.profile_file_too_large', 'Le fichier est trop volumineux (5 Mo maximum).'),
    });
  }

  function gererFichier(evenement, appliquer) {
    const fichier = evenement.target.files?.[0];
    // Réinitialiser tout de suite : sans cela, resélectionner le même fichier
    // après l'avoir retiré ne déclencherait aucun évènement change.
    evenement.target.value = '';
    if (!fichier) return;

    const messageErreur = validerImage(fichier);
    if (messageErreur) {
      toast.current?.show({
        severity: 'error',
        summary: t('dashboard.profile_file_rejected', 'Fichier refusé'),
        detail: messageErreur,
        life: 6000,
      });
      return;
    }
    appliquer(fichier);
  }

  function extraireErreur(error) {
    const data = error.response?.data;
    if (!data) return t('dashboard.profile_update_error');
    if (typeof data === 'string') return data;
    const premier = Object.values(data)[0];
    if (Array.isArray(premier)) return premier[0];
    return premier || t('dashboard.profile_update_error');
  }

  function reinitialiserFichiers() {
    choisirAvatar(null);
    choisirLogo(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  // Aucun moyen jusqu'ici d'abandonner une modification en cours : revient
  // aux dernières valeurs enregistrées et retire les fichiers en attente.
  function gererAnnuler() {
    setNomAffichage(pasteur?.nom_affichage || '');
    setNomEglise(pasteur?.nom_eglise || '');
    setContact(pasteur?.contact || '');
    setBiographie(pasteur?.biographie || '');
    setNomAffichageErreur('');
    setErreur('');
    reinitialiserFichiers();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');

    const nomAffichageSaisi = nomAffichage.trim();
    if (!nomAffichageSaisi) {
      setNomAffichageErreur(t('dashboard.profile_name_required', "Le nom d'affichage est obligatoire."));
      return;
    }
    setNomAffichageErreur('');
    setSoumission(true);

    try {
      const formData = new FormData();
      formData.append('nom_affichage', nomAffichageSaisi);
      formData.append('nom_eglise', nomEglise.trim());
      formData.append('contact', contact.trim());
      formData.append('biographie', biographie.trim());
      if (avatar) formData.append('avatar', avatar);
      if (logoEglise) formData.append('logo_eglise', logoEglise);

      const response = await api.patch('/pasteurs/mon_profil/', formData);

      // Mettre à jour la session globale sans recharger
      actualiserProfilPasteur(response.data);

      toast.current.show({ severity: 'success', summary: 'Succès', detail: t('dashboard.profile_update_success'), life: 5000 });
      // Réinitialiser les fichiers : l'aperçu local n'a plus lieu d'être,
      // pasteur.avatar (rafraîchi ci-dessus) reflète désormais la même image.
      reinitialiserFichiers();
    } catch (err) {
      setErreur(extraireErreur(err));
    } finally {
      setSoumission(false);
    }
  }

  // Pas de bouton Enregistrer actif tant que rien n'a réellement changé :
  // évite une requête PATCH inutile et donne un signal clair de l'état du
  // formulaire (rien à perdre / rien à sauvegarder).
  const estModifie = (
    nomAffichage.trim() !== (pasteur?.nom_affichage || '') ||
    nomEglise.trim() !== (pasteur?.nom_eglise || '') ||
    contact.trim() !== (pasteur?.contact || '') ||
    biographie.trim() !== (pasteur?.biographie || '') ||
    !!avatar ||
    !!logoEglise
  );

  const avatarAffiche = avatarApercu || pasteur?.avatar;
  const logoAffiche = logoApercu || pasteur?.logo_eglise;

  return (
    <div className="dashboard-tab-content" style={{ padding: 0 }}>
      <Toast ref={toast} />

      <div className="profil-conteneur">
        <Card className="profil-carte">
          {/* En-tête d'identité : bande institutionnelle fixe (mêmes tons que
              la barre de navigation) plutôt qu'un dégradé arbitraire, pour
              rester cohérent avec le reste du site. */}
          <div className="profil-banniere" />

          <div className="profil-identite">
            {/* La photo est elle-même le sélecteur : un bouton « Changer la
                photo » isolé plus bas n'avait aucun lien visuel avec l'image
                qu'il modifiait. */}
            <button
              type="button"
              className="profil-avatar-bouton"
              onClick={() => avatarInputRef.current?.click()}
              disabled={soumission}
              aria-label={t('dashboard.profile_change_avatar')}
              title={t('dashboard.profile_change_avatar')}
            >
              <span className="profil-avatar-cadre">
                {avatarAffiche ? (
                  <img src={avatarAffiche} alt="" />
                ) : (
                  <User size={42} color="var(--text-muted)" aria-hidden="true" />
                )}
                <span className="profil-avatar-surcouche" aria-hidden="true">
                  <Camera size={20} />
                  {t('dashboard.profile_change_short', 'Modifier')}
                </span>
              </span>
              {avatar && (
                <span className="profil-pastille-attente" aria-hidden="true">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
              hidden
              onChange={(e) => gererFichier(e, choisirAvatar)}
            />

            <div className="profil-identite-texte">
              <h2 className="profil-nom">
                {pasteur?.nom_affichage || t('profile.default_user')}
              </h2>
              <span className="profil-eglise-pastille">
                <Church size={13} aria-hidden="true" />
                {pasteur?.nom_eglise || t('dashboard.profile_no_church', 'Aucune église spécifiée')}
              </span>
            </div>
          </div>

          <div className="profil-corps">
            {erreur && (
              <div role="alert" className="profil-alerte">
                <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span>{erreur}</span>
              </div>
            )}

            <form className="profil-formulaire" onSubmit={handleSubmit}>

              {/* ---- Section : identité personnelle ---- */}
              <section className="profil-section">
                <h3 className="profil-section-titre">
                  <span className="profil-section-icone" aria-hidden="true"><User size={15} /></span>
                  {t('dashboard.profile_section_you', 'Vos informations')}
                </h3>

                <div className="profil-champs">
                  <div className="profil-grille-2">
                    <label className="dashboard-field">
                      <span>
                        <User size={14} /> {t('dashboard.profile_name_label')}
                        <span className="profil-obligatoire" aria-hidden="true"> *</span>
                      </span>
                      <input
                        id="nomAffichage"
                        value={nomAffichage}
                        onChange={(e) => {
                          setNomAffichage(e.target.value);
                          if (nomAffichageErreur) setNomAffichageErreur('');
                        }}
                        placeholder={t('dashboard.profile_name_placeholder')}
                        maxLength={255}
                        disabled={soumission}
                        required
                        aria-invalid={!!nomAffichageErreur}
                        aria-describedby={nomAffichageErreur ? 'nomAffichage-erreur' : undefined}
                        className={nomAffichageErreur ? 'est-en-erreur' : undefined}
                      />
                      {nomAffichageErreur && (
                        <small id="nomAffichage-erreur" role="alert" className="profil-erreur-champ">
                          {nomAffichageErreur}
                        </small>
                      )}
                    </label>

                    <label className="dashboard-field">
                      <span><Phone size={14} /> {t('dashboard.profile_contact_label')}</span>
                      <input
                        id="contact"
                        type="tel"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder={t('dashboard.profile_contact_placeholder')}
                        maxLength={50}
                        disabled={soumission}
                      />
                    </label>
                  </div>

                  <label className="dashboard-field">
                    <span className="profil-etiquette-ligne">
                      <span><FileText size={14} /> {t('dashboard.profile_bio_label', 'Biographie')}</span>
                      <small className={`profil-compteur${restantBioProche(biographie) ? ' est-proche-limite' : ''}`}>
                        {biographie.length} / {LIMITE_BIO}
                      </small>
                    </span>
                    <textarea
                      id="biographie"
                      className="profil-textarea"
                      value={biographie}
                      onChange={(e) => setBiographie(e.target.value.slice(0, LIMITE_BIO))}
                      placeholder={t('dashboard.profile_bio_placeholder', 'Présentez-vous en quelques phrases : votre parcours, votre ministère, votre message...')}
                      rows={4}
                      disabled={soumission}
                    />
                    <small className="champ-aide">
                      {t('dashboard.profile_bio_help', 'Visible sur votre fiche publique et la liste des pasteurs.')}
                    </small>
                  </label>
                </div>
              </section>

              {/* ---- Section : église ---- */}
              <section className="profil-section">
                <h3 className="profil-section-titre">
                  <span className="profil-section-icone" aria-hidden="true"><Church size={15} /></span>
                  {t('dashboard.profile_section_church', 'Votre église')}
                </h3>

                <div className="profil-champs">
                  <label className="dashboard-field">
                    <span><Church size={14} /> {t('dashboard.profile_church_label')}</span>
                    <input
                      id="nomEglise"
                      value={nomEglise}
                      onChange={(e) => setNomEglise(e.target.value)}
                      placeholder={t('dashboard.profile_church_placeholder')}
                      maxLength={255}
                      disabled={soumission}
                    />
                  </label>

                  <div className="dashboard-field">
                    <span>{t('dashboard.profile_logo_label')}</span>
                    <div className="profil-logo-choix">
                      {/* Affiche aussi le logo DÉJÀ enregistré : auparavant une
                          vignette n'apparaissait que pour un nouveau fichier,
                          impossible donc de savoir quel logo était en place. */}
                      <button
                        type="button"
                        className="profil-logo-bouton"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={soumission}
                        aria-label={t('dashboard.profile_change_logo')}
                        title={t('dashboard.profile_change_logo')}
                      >
                        {logoAffiche
                          ? <img src={logoAffiche} alt="" />
                          : <ImagePlus size={24} aria-hidden="true" />}
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                        hidden
                        onChange={(e) => gererFichier(e, choisirLogo)}
                      />

                      <div className="profil-logo-texte">
                        <span className="profil-logo-nom">
                          {logoEglise ? logoEglise.name : t('dashboard.profile_change_logo')}
                        </span>
                        <small className="profil-logo-aide">
                          {t('dashboard.profile_image_help', 'JPG, PNG, WEBP ou GIF — 5 Mo maximum.')}
                        </small>
                        {logoEglise && (
                          <button type="button" className="profil-lien-retirer" onClick={() => choisirLogo(null)}>
                            {t('dashboard.profile_remove_file', 'Retirer le fichier choisi')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="profil-pied">
                {estModifie && (
                  <span className="profil-etat-modifie">
                    <span className="profil-point-modifie" aria-hidden="true" />
                    {t('dashboard.profile_unsaved', 'Modifications non enregistrées')}
                  </span>
                )}
                {estModifie && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={gererAnnuler}
                    disabled={soumission}
                  >
                    {t('dashboard.cancel')}
                  </button>
                )}
                <button className="btn btn-dark" type="submit" disabled={soumission || !estModifie}>
                  {soumission ? (
                    <>
                      <Loader2 className="spinner" size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                      {t('dashboard.saving')}
                    </>
                  ) : (
                    <>
                      <Save size={16} style={{ marginRight: '8px' }} />
                      {t('dashboard.save_changes')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Le compteur passe en alerte sur les 50 derniers caractères, pour prévenir
// avant que la saisie ne soit tronquée.
function restantBioProche(valeur) {
  return LIMITE_BIO - valeur.length <= 50;
}
