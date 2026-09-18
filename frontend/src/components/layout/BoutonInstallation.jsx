import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

/**
 * Bouton d'installation de l'application (PWA).
 *
 * Chrome/Edge n'exposent leur propre bouton que via une icone discrete dans la
 * barre d'adresse, que beaucoup d'utilisateurs ne trouvent jamais — et Firefox
 * desktop ne propose aucune installation. Ce bouton reprend la main : il
 * n'apparait que lorsque le navigateur signale que l'application est
 * reellement installable (evenement beforeinstallprompt), et disparait une
 * fois installee.
 */
export function BoutonInstallation() {
  // L'evenement est souvent emis avant que React ne monte ce composant : il
  // est capture au plus tot par le script de index.html, qu'on lit ici.
  const [invite, setInvite] = useState(() => window.__inviteInstallation || null);

  useEffect(() => {
    // Deja lancee en mode application : rien a proposer.
    if (window.matchMedia('(display-mode: standalone)').matches) return undefined;

    const surInvitePrete = () => setInvite(window.__inviteInstallation || null);
    const surInvite = (evenement) => {
      evenement.preventDefault();
      setInvite(evenement);
    };
    const surInstallation = () => {
      window.__inviteInstallation = null;
      setInvite(null);
    };

    // Le premier couvre l'evenement capture par index.html, le second ceux
    // qui surviendraient plus tard (l'app redevient eligible apres un refus).
    window.addEventListener('invite-installation-prete', surInvitePrete);
    window.addEventListener('beforeinstallprompt', surInvite);
    window.addEventListener('appinstalled', surInstallation);
    return () => {
      window.removeEventListener('invite-installation-prete', surInvitePrete);
      window.removeEventListener('beforeinstallprompt', surInvite);
      window.removeEventListener('appinstalled', surInstallation);
    };
  }, []);

  if (!invite) return null;

  const installer = async () => {
    invite.prompt();
    await invite.userChoice;
    // L'evenement n'est utilisable qu'une fois : le navigateur en emettra un
    // nouveau si l'utilisateur a refuse et redevient eligible plus tard.
    window.__inviteInstallation = null;
    setInvite(null);
  };

  return (
    <button
      type="button"
      onClick={installer}
      className="theme-toggle-btn"
      title="Installer l'application sur cet appareil"
      aria-label="Installer l'application"
    >
      <Download size={18} />
    </button>
  );
}
