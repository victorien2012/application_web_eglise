import { ShieldCheck, FileText, Cookie, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Legales.css';

function PageLegale({ titre, icon: Icon, children }) {
  const { t } = useTranslation();
  return (
    <div className="legale-wrapper">
      <div className="legale-container">
        <section className="legale-card">
          <div className="legale-header">
            {Icon && (
              <div className="legale-icon-wrapper">
                <Icon size={36} className="legale-icon" />
              </div>
            )}
            <h1 className="legale-title">{titre}</h1>
          </div>
          
          <div className="legale-content">
            {children}
          </div>
          
          <div className="legale-footer">
            <p>{t('legales.last_updated')} {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function MentionsLegales() {
  const { t } = useTranslation();
  return (
    <PageLegale titre={t('legales.legal_notices')} icon={FileText}>
      <h2>{t('legales.publisher')}</h2>
      <p>
        <strong>{t('legales.platform_name')}</strong><br />
        {t('legales.director')} Koffi Kouassi Victorien<br />
        {t('legales.location')} Abidjan, Côte d'Ivoire
      </p>

      <h2>{t('legales.contact')}</h2>
      <p>
        {t('legales.phone')} +225 0777355012<br />
        {t('legales.email')} koffikouassivictorien@gmail.com
      </p>

      <h2>{t('legales.hosting')}</h2>
      <p>
        {t('legales.hosting_desc')}
      </p>
    </PageLegale>
  );
}

export function Confidentialite() {
  const { t } = useTranslation();
  return (
    <PageLegale titre={t('legales.privacy_policy')} icon={ShieldCheck}>
      <h2>{t('legales.data_collection')}</h2>
      <p>
        {t('legales.data_collection_desc')}
      </p>

      <h2>{t('legales.data_use')}</h2>
      <p dangerouslySetInnerHTML={{ __html: t('legales.data_use_desc') }} />

      <h2>{t('legales.rights')}</h2>
      <p>
        {t('legales.rights_desc')}
      </p>
    </PageLegale>
  );
}

export function Cookies() {
  const { t } = useTranslation();
  return (
    <PageLegale titre={t('legales.cookies_management')} icon={Cookie}>
      <h2>{t('legales.what_is_cookie')}</h2>
      <p>
        {t('legales.cookie_desc')}
      </p>

      <h2>{t('legales.cookie_use')}</h2>
      <p>
        <span dangerouslySetInnerHTML={{ __html: t('legales.cookie_use_desc_1') }} />
        <br /><br />
        <span dangerouslySetInnerHTML={{ __html: t('legales.cookie_use_desc_2') }} />
      </p>
      
      <h2>{t('legales.consent')}</h2>
      <p>
        {t('legales.consent_desc')}
      </p>
    </PageLegale>
  );
}

export function Conditions() {
  const { t } = useTranslation();
  return (
    <PageLegale titre={t('legales.terms_of_use')} icon={AlertCircle}>
      <h2>{t('legales.purpose')}</h2>
      <p>
        {t('legales.purpose_desc')}
      </p>

      <h2>{t('legales.behavior')}</h2>
      <p>
        {t('legales.behavior_desc')}
      </p>

      <h2>{t('legales.moderation')}</h2>
      <p>
        {t('legales.moderation_desc')}
      </p>
    </PageLegale>
  );
}
