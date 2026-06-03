import './Legales.css';

function PageLegale({ titre, children }) {
  return (
    <section className="legale-page glass-card">
      <h1>{titre}</h1>
      {children}
      <p className="legale-note">
        Ce contenu est un modele a completer par l'editeur de la plateforme avant la mise en production.
      </p>
    </section>
  );
}

export function MentionsLegales() {
  return (
    <PageLegale titre="Mentions legales">
      <p>Editeur du site : [Nom de l'organisation], [adresse].</p>
      <p>Directeur de la publication : [Nom].</p>
      <p>Hebergeur : [Nom et adresse de l'hebergeur].</p>
      <p>Contact : [adresse email].</p>
    </PageLegale>
  );
}

export function Confidentialite() {
  return (
    <PageLegale titre="Politique de confidentialite">
      <p>
        Nous collectons les donnees strictement necessaires au fonctionnement du service :
        identifiants de compte, contenus publies, favoris, abonnements et historique de lecture.
      </p>
      <p>
        Conformement au RGPD, vous disposez d'un droit d'acces, de rectification et d'effacement
        de vos donnees. Depuis votre profil, vous pouvez a tout moment exporter vos donnees ou
        supprimer votre compte.
      </p>
      <p>Les donnees ne sont ni revendues, ni cedees a des tiers a des fins commerciales.</p>
    </PageLegale>
  );
}

export function Cookies() {
  return (
    <PageLegale titre="Gestion des cookies">
      <p>
        La plateforme utilise uniquement un stockage local technique pour conserver votre session
        de connexion. Aucun cookie de suivi publicitaire n'est depose.
      </p>
      <p>Votre consentement est demande lors de votre premiere visite.</p>
    </PageLegale>
  );
}

export function Conditions() {
  return (
    <PageLegale titre="Conditions d'utilisation">
      <p>
        En utilisant cette plateforme, vous vous engagez a publier des contenus respectueux et
        a ne pas porter atteinte aux droits de tiers.
      </p>
      <p>
        Les contenus signales peuvent etre masques ou supprimes par les pasteurs concernes ou par
        l'administration.
      </p>
    </PageLegale>
  );
}
