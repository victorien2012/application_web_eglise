import React, { useState } from 'react';
import { api } from '../../../services/api';
import { X, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './CreatePasteurModal.css';

export function CreatePasteurModal({ isOpen, onClose, onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    nom_affichage: '',
    nom_eglise: '',
    contact: '',
  });
  const [avatar, setAvatar] = useState(null);
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({ username: '', email: '', password: '', nom_affichage: '', nom_eglise: '', contact: '' });
    setAvatar(null);
    setLogo(null);
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (avatar) data.append('avatar', avatar);
    if (logo) data.append('logo_eglise', logo);
    try {
      await api.post('/pasteurs/creer_compte_admin/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (detail?.detail) {
        setError(detail.detail);
      } else if (typeof detail === 'object') {
        const messages = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(messages.join(' | '));
      } else {
        setError(t('admin.create_error', 'Erreur lors de la création du compte.'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cpmodal-overlay" onClick={handleClose}>
      <div className="cpmodal-content" onClick={(e) => e.stopPropagation()}>
        <button className="cpmodal-close" onClick={handleClose} type="button" disabled={loading} aria-label={t('common.close', 'Fermer')}>
          <X size={20} />
        </button>

        <div className="cpmodal-header">
          <div className="cpmodal-icon">
            <UserPlus size={24} />
          </div>
          <h3>{t('admin.create_pastor', 'Créer un compte pasteur')}</h3>
        </div>

        <form className="cpmodal-form" onSubmit={handleSubmit}>
          <div className="cpmodal-field">
            <label htmlFor="cp-username">{t('admin.username', "Nom d'utilisateur")}</label>
            <input id="cp-username" name="username" value={form.username} onChange={handleChange} autoComplete="off" required />
          </div>
          <div className="cpmodal-field">
            <label htmlFor="cp-email">{t('admin.email', 'Email')}</label>
            <input id="cp-email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="off" required />
          </div>
          <div className="cpmodal-field">
            <label htmlFor="cp-password">{t('admin.password', 'Mot de passe')}</label>
            <div className="cpmodal-password-wrapper">
              <input
                id="cp-password"
                name="password"
                type={afficherMotDePasse ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="cpmodal-password-toggle"
                onClick={() => setAfficherMotDePasse((v) => !v)}
                aria-label={afficherMotDePasse ? t('admin.hide_password', 'Masquer le mot de passe') : t('admin.show_password', 'Afficher le mot de passe')}
              >
                {afficherMotDePasse ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="cpmodal-field-hint">{t('admin.password_hint', '8 caractères minimum. Évitez un mot de passe trop simple ou trop proche du nom d\'utilisateur.')}</p>
          </div>
          <div className="cpmodal-row">
            <div className="cpmodal-field">
              <label htmlFor="cp-nom">{t('admin.display_name', "Nom d'affichage")}</label>
              <input id="cp-nom" name="nom_affichage" value={form.nom_affichage} onChange={handleChange} required />
            </div>
            <div className="cpmodal-field">
              <label htmlFor="cp-eglise">{t('admin.church_name', "Nom de l'église (optionnel)")}</label>
              <input id="cp-eglise" name="nom_eglise" value={form.nom_eglise} onChange={handleChange} />
            </div>
          </div>
          <div className="cpmodal-field">
            <label htmlFor="cp-contact">{t('admin.contact', 'Contact (optionnel)')}</label>
            <input id="cp-contact" name="contact" value={form.contact} onChange={handleChange} />
          </div>
          <div className="cpmodal-row">
            <div className="cpmodal-field">
              <label>{t('admin.avatar', 'Avatar (optionnel)')}</label>
              <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])} />
            </div>
            <div className="cpmodal-field">
              <label>{t('admin.church_logo', "Logo de l'église (optionnel)")}</label>
              <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files[0])} />
            </div>
          </div>

          {error && <div className="cpmodal-error">{error}</div>}

          <div className="cpmodal-footer">
            <button type="button" className="cpmodal-btn cpmodal-btn-cancel" onClick={handleClose} disabled={loading}>
              {t('common.cancel', 'Annuler')}
            </button>
            <button type="submit" className="cpmodal-btn cpmodal-btn-confirm" disabled={loading}>
              {loading ? t('common.loading', 'Chargement...') : t('admin.create', 'Créer le compte')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
