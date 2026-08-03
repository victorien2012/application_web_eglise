import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSite } from '../../context/SiteContext';
import './PiedDePage.css';

export function PiedDePage() {
  const { t } = useTranslation();
  const { siteConfig } = useSite();
  return (
    <footer className="footer-premium">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Colonne 1 : Marque et description */}
          <div className="footer-col brand-col">
            <div className="footer-brand-header">
              <img src={siteConfig?.logo || "/user_eagle.png"} alt="Logo" className="footer-brand-img" />
              <h3 className="footer-logo">Plateforme Église</h3>
            </div>
            <p className="footer-desc">
              {t('footer.desc')}
            </p>
            <div className="footer-socials">
              <a href="#" aria-label="Facebook"><Facebook size={20} /></a>
              <a href="#" aria-label="Twitter"><Twitter size={20} /></a>
              <a href="#" aria-label="Instagram"><Instagram size={20} /></a>
              <a href="#" aria-label="YouTube"><Youtube size={20} /></a>
            </div>
          </div>

          {/* Colonne 2 : Liens Rapides */}
          <div className="footer-col">
            <h4 className="footer-heading">{t('footer.nav_heading')}</h4>
            <ul className="footer-links">
              <li><Link to="/">{t('footer.nav_home')}</Link></li>
              <li><Link to="/videos">{t('footer.nav_videos')}</Link></li>
              <li><Link to="/pasteurs">{t('footer.nav_pastors')}</Link></li>
              <li><Link to="/profil">{t('footer.nav_profile')}</Link></li>
            </ul>
          </div>

          {/* Colonne 3 : Contact */}
          <div className="footer-col">
            <h4 className="footer-heading">{t('footer.contact_heading')}</h4>
            <ul className="footer-contact">
              <li><MapPin size={16} /> Côte d'Ivoire, Abidjan</li>
              <li><Phone size={16} /> +225 0777355012</li>
              <li><Mail size={16} /> koffikouassivictorien@gmail.com</li>
            </ul>
          </div>

          {/* Colonne 4 : Légal */}
          <div className="footer-col">
            <h4 className="footer-heading">{t('footer.legal_heading')}</h4>
            <ul className="footer-links">
              <li><Link to="/mentions-legales">{t('footer.legal_mentions')}</Link></li>
              <li><Link to="/confidentialite">{t('footer.legal_privacy')}</Link></li>
              <li><Link to="/cookies">{t('footer.legal_cookies')}</Link></li>
              <li><Link to="/conditions">{t('footer.legal_terms')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom" style={{ justifyContent: 'center' }}>
          <p>&copy; {new Date().getFullYear()} Plateforme Église. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}
