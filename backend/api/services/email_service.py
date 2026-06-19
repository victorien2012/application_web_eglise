"""Service d'envoi d'emails de la plateforme.

Contient les fonctions utilitaires d'envoi d'email (vérification,
validation pasteur, notification admin, rejet) avec leurs templates HTML inline.
"""
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


class GenerateurTokenEmail(PasswordResetTokenGenerator):
    """Generateur de token dedie a la verification d'email, distinct de
    celui du mot de passe oublie pour eviter qu'un token serve aux deux usages."""
    key_salt = "api.verification.email"


generateur_token_email = GenerateurTokenEmail()


def _email_est_verifie(user):
    profil = getattr(user, 'profil', None)
    return bool(profil and profil.email_verifie)


def envoyer_email_verification(user):
    """Envoie a l'utilisateur un lien de verification de son adresse email."""
    if not user.email:
        return
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = generateur_token_email.make_token(user)
    lien = f"{settings.FRONTEND_URL}/verifier-email?uid={uid}&token={token}"

    sujet = "Activez votre compte - Plateforme Église"

    # Version texte brut fallback
    message_texte = (
        f"Bonjour {user.username},\n\n"
        "Bienvenue sur la Plateforme Église ! Nous sommes ravis de vous compter parmi nous.\n\n"
        "Pour finaliser la création de votre compte et commencer à explorer les prédications, "
        "suivre vos pasteurs favoris et enregistrer vos favoris, veuillez confirmer votre adresse "
        f"email en cliquant sur le lien ci-dessous :\n\n"
        f"{lien}\n\n"
        "Ce lien de vérification expirera bientôt. Si vous n'êtes pas à l'origine de cette "
        "inscription, vous pouvez ignorer cet e-mail en toute sécurité.\n\n"
        "Que la paix soit avec vous,\n"
        "L'équipe Plateforme Église"
    )

    # Version HTML premium
    annee = timezone.now().year
    message_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activez votre compte</title>
  <style>
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f6f8fb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .email-container {{
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e1e8ed;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }}
    .email-header {{
      background: linear-gradient(135deg, #7c5cff, #a786ff);
      padding: 30px;
      text-align: center;
      color: #ffffff;
    }}
    .email-header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .email-header p {{
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }}
    .email-body {{
      padding: 40px 30px;
      color: #2c3e50;
      line-height: 1.6;
    }}
    .email-body h2 {{
      margin-top: 0;
      font-size: 20px;
      color: #1a252f;
    }}
    .email-body p {{
      font-size: 16px;
      margin: 0 0 20px 0;
    }}
    .btn-container {{
      text-align: center;
      margin: 35px 0;
    }}
    .btn-primary {{
      display: inline-block;
      background-color: #7c5cff;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 10px rgba(124, 92, 255, 0.25);
    }}
    .email-footer {{
      background-color: #fafbfc;
      padding: 20px 30px;
      text-align: center;
      font-size: 13px;
      color: #7f8c8d;
      border-top: 1px solid #f1f2f6;
    }}
    .email-footer a {{
      color: #7c5cff;
      text-decoration: none;
    }}
    .link-fallback {{
      font-size: 13px;
      word-break: break-all;
      background: #f8f9fa;
      padding: 10px;
      border-radius: 6px;
      border: 1px dashed #ced4da;
      margin-top: 20px;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Plateforme Église</h1>
      <p>Votre espace d'édification spirituelle</p>
    </div>
    <div class="email-body">
      <h2>Bienvenue, {user.username} !</h2>
      <p>Merci de vous être inscrit sur notre plateforme. Nous sommes heureux de vous compter parmi nous.</p>
      <p>Pour finaliser la création de votre compte et commencer à explorer les prédications, suivre vos pasteurs favoris et enregistrer vos coups de cœur, veuillez activer votre compte en cliquant sur le bouton ci-dessous :</p>
      <div class="btn-container">
        <a href="{lien}" class="btn-primary" target="_blank">Activer mon compte</a>
      </div>
      <p>Si le bouton ci-dessus ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur :</p>
      <div class="link-fallback">
        <a href="{lien}" style="color: #7c5cff;">{lien}</a>
      </div>
    </div>
    <div class="email-footer">
      <p>Ce lien de vérification expirera bientôt. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
      <p>&copy; {annee} Plateforme Église. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
"""

    send_mail(
        subject=sujet,
        message=message_texte,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=message_html,
        fail_silently=True,
    )


def envoyer_email_validation_pasteur(pasteur):
    """Envoie un email de bienvenue au pasteur lorsque l'admin valide sa demande."""
    user = pasteur.utilisateur
    if not user.email:
        return

    annee = timezone.now().year
    nom = pasteur.nom_affichage or user.username
    lien_espace = f"{settings.FRONTEND_URL}/espace-pasteur"

    sujet = "✅ Votre compte ministère a été validé - Plateforme Église"

    message_texte = (
        f"Bonjour {nom},\n\n"
        "Bonne nouvelle ! Votre demande d'inscription en tant que pasteur sur la Plateforme Église "
        "a été examinée et validée par notre équipe d'administration.\n\n"
        "Vous pouvez dès maintenant accéder à votre espace pasteur pour publier vos prédications, "
        "créer des séries thématiques et gérer votre profil ministère :\n\n"
        f"{lien_espace}\n\n"
        "Que la grâce de Dieu vous accompagne dans ce ministère.\n"
        "L'équipe Plateforme Église"
    )

    message_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compte validé</title>
  <style>
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f6f8fb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .email-container {{
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e1e8ed;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }}
    .email-header {{
      background: linear-gradient(135deg, #7c5cff, #a786ff);
      padding: 30px;
      text-align: center;
      color: #ffffff;
    }}
    .email-header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .email-header p {{
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }}
    .badge-valide {{
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border: 2px solid rgba(255,255,255,0.5);
      border-radius: 50px;
      padding: 6px 18px;
      font-size: 13px;
      font-weight: 700;
      margin-top: 12px;
      letter-spacing: 1px;
    }}
    .email-body {{
      padding: 40px 30px;
      color: #2c3e50;
      line-height: 1.6;
    }}
    .email-body h2 {{
      margin-top: 0;
      font-size: 20px;
      color: #1a252f;
    }}
    .email-body p {{
      font-size: 16px;
      margin: 0 0 20px 0;
    }}
    .check-icon {{
      text-align: center;
      font-size: 56px;
      margin-bottom: 20px;
    }}
    .btn-container {{
      text-align: center;
      margin: 35px 0;
    }}
    .btn-primary {{
      display: inline-block;
      background-color: #7c5cff;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 10px rgba(124, 92, 255, 0.25);
    }}
    .info-box {{
      background: #f0ebff;
      border-left: 4px solid #7c5cff;
      border-radius: 6px;
      padding: 15px 20px;
      margin: 20px 0;
      font-size: 15px;
      color: #4a3880;
    }}
    .email-footer {{
      background-color: #fafbfc;
      padding: 20px 30px;
      text-align: center;
      font-size: 13px;
      color: #7f8c8d;
      border-top: 1px solid #f1f2f6;
    }}
    .email-footer a {{
      color: #7c5cff;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Plateforme Église</h1>
      <p>Votre espace d'édification spirituelle</p>
      <div class="badge-valide">✅ COMPTE VALIDÉ</div>
    </div>
    <div class="email-body">
      <div class="check-icon">🎉</div>
      <h2>Félicitations, {nom} !</h2>
      <p>Votre demande d'inscription en tant que <strong>pasteur</strong> sur la Plateforme Église
      a été <strong>examinée et approuvée</strong> par notre équipe d'administration.</p>

      <div class="info-box">
        Vous pouvez dès maintenant publier vos prédications, créer des séries thématiques,
        synchroniser votre chaîne YouTube et gérer votre profil ministère.
      </div>

      <p>Connectez-vous et accédez à votre espace pasteur en cliquant sur le bouton ci-dessous :</p>
      <div class="btn-container">
        <a href="{lien_espace}" class="btn-primary" target="_blank">Accéder à mon espace</a>
      </div>
      <p style="font-size: 14px; color: #7f8c8d;">
        Que la grâce de Dieu vous accompagne dans ce ministère et que votre parole porte du fruit.
      </p>
    </div>
    <div class="email-footer">
      <p>&copy; {annee} Plateforme Église. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
"""

    send_mail(
        subject=sujet,
        message=message_texte,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=message_html,
        fail_silently=True,
    )


def envoyer_email_notification_admin_nouveau_pasteur(pasteur):
    """Notifie les administrateurs qu'un nouveau pasteur vient de s'inscrire
    et attend leur validation."""
    admins = User.objects.filter(is_staff=True)
    emails_admins = [u.email for u in admins if u.email]
    if not emails_admins:
        return

    nom = pasteur.nom_affichage or pasteur.utilisateur.username
    email_pasteur = pasteur.utilisateur.email
    eglise = pasteur.nom_eglise or 'Non renseignée'
    contact = pasteur.contact or 'Non renseigné'
    annee = timezone.now().year
    lien_admin = f"{settings.FRONTEND_URL}/administration"

    sujet = f"📋 Nouvelle demande de compte ministère – {nom}"

    message_texte = (
        f"Nouvelle demande d'inscription pasteur\n\n"
        f"Nom d'affichage : {nom}\n"
        f"Email : {email_pasteur}\n"
        f"Église : {eglise}\n"
        f"Contact : {contact}\n\n"
        f"Connectez-vous à l'espace d'administration pour examiner cette demande :\n"
        f"{lien_admin}\n"
    )

    message_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle demande pasteur</title>
  <style>
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f6f8fb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .email-container {{
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e1e8ed;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }}
    .email-header {{
      background: linear-gradient(135deg, #004a94, #00336b);
      padding: 30px;
      text-align: center;
      color: #ffffff;
    }}
    .email-header h1 {{
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }}
    .email-header p {{
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }}
    .badge {{
      display: inline-block;
      background: rgba(255,211,107,0.25);
      border: 2px solid rgba(255,211,107,0.5);
      border-radius: 50px;
      padding: 6px 18px;
      font-size: 13px;
      font-weight: 700;
      margin-top: 12px;
      letter-spacing: 1px;
      color: #ffd36b;
    }}
    .email-body {{
      padding: 35px 30px;
      color: #2c3e50;
      line-height: 1.6;
    }}
    .email-body h2 {{
      margin-top: 0;
      font-size: 20px;
      color: #1a252f;
    }}
    .info-table {{
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }}
    .info-table td {{
      padding: 10px 14px;
      border-bottom: 1px solid #f1f2f6;
      font-size: 15px;
    }}
    .info-table td:first-child {{
      font-weight: 600;
      color: #64748b;
      width: 130px;
    }}
    .btn-container {{
      text-align: center;
      margin: 30px 0 10px;
    }}
    .btn-primary {{
      display: inline-block;
      background-color: #004a94;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 10px rgba(0, 74, 148, 0.25);
    }}
    .email-footer {{
      background-color: #fafbfc;
      padding: 20px 30px;
      text-align: center;
      font-size: 13px;
      color: #7f8c8d;
      border-top: 1px solid #f1f2f6;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Plateforme Église</h1>
      <p>Administration</p>
      <div class="badge">📋 NOUVELLE DEMANDE</div>
    </div>
    <div class="email-body">
      <h2>Nouvelle inscription ministère</h2>
      <p>Un nouveau pasteur vient de soumettre une demande d'inscription et attend votre validation :</p>
      <table class="info-table">
        <tr><td>Nom</td><td><strong>{nom}</strong></td></tr>
        <tr><td>Email</td><td>{email_pasteur}</td></tr>
        <tr><td>Église</td><td>{eglise}</td></tr>
        <tr><td>Contact</td><td>{contact}</td></tr>
      </table>
      <p>Connectez-vous à l'espace d'administration pour examiner et valider (ou rejeter) cette demande :</p>
      <div class="btn-container">
        <a href="{lien_admin}" class="btn-primary" target="_blank">Accéder à l'administration</a>
      </div>
    </div>
    <div class="email-footer">
      <p>&copy; {annee} Plateforme Église. Notification automatique.</p>
    </div>
  </div>
</body>
</html>
"""

    send_mail(
        subject=sujet,
        message=message_texte,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=emails_admins,
        html_message=message_html,
        fail_silently=True,
    )


def envoyer_email_rejet_pasteur(pasteur):
    """Envoie un email au pasteur pour l'informer que sa demande a été rejetée."""
    user = pasteur.utilisateur
    if not user.email:
        return

    annee = timezone.now().year
    nom = pasteur.nom_affichage or user.username
    lien_contact = f"{settings.FRONTEND_URL}/connexion"

    sujet = "❌ Votre demande de compte ministère – Plateforme Église"

    message_texte = (
        f"Bonjour {nom},\n\n"
        "Nous avons examiné votre demande d'inscription en tant que pasteur sur la "
        "Plateforme Église.\n\n"
        "Malheureusement, votre demande n'a pas pu être approuvée à ce stade. "
        "Cela peut être dû à des informations incomplètes ou à un profil ne correspondant "
        "pas aux critères requis.\n\n"
        "Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à nous contacter "
        "ou à soumettre une nouvelle demande avec des informations complémentaires.\n\n"
        "Cordialement,\n"
        "L'équipe Plateforme Église"
    )

    message_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande non approuvée</title>
  <style>
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f6f8fb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .email-container {{
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e1e8ed;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }}
    .email-header {{
      background: linear-gradient(135deg, #64748b, #475569);
      padding: 30px;
      text-align: center;
      color: #ffffff;
    }}
    .email-header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }}
    .email-header p {{
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }}
    .email-body {{
      padding: 40px 30px;
      color: #2c3e50;
      line-height: 1.6;
    }}
    .email-body h2 {{
      margin-top: 0;
      font-size: 20px;
      color: #1a252f;
    }}
    .email-body p {{
      font-size: 16px;
      margin: 0 0 20px 0;
    }}
    .info-box {{
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      border-radius: 6px;
      padding: 15px 20px;
      margin: 20px 0;
      font-size: 15px;
      color: #991b1b;
    }}
    .btn-container {{
      text-align: center;
      margin: 35px 0;
    }}
    .btn-secondary {{
      display: inline-block;
      background-color: #64748b;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }}
    .email-footer {{
      background-color: #fafbfc;
      padding: 20px 30px;
      text-align: center;
      font-size: 13px;
      color: #7f8c8d;
      border-top: 1px solid #f1f2f6;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Plateforme Église</h1>
      <p>Votre espace d'édification spirituelle</p>
    </div>
    <div class="email-body">
      <h2>Bonjour {nom},</h2>
      <p>Nous avons examiné votre demande d'inscription en tant que <strong>pasteur</strong> sur la Plateforme Église.</p>

      <div class="info-box">
        Malheureusement, votre demande n'a pas pu être approuvée à ce stade.
        Cela peut être dû à des informations incomplètes ou à un profil ne correspondant
        pas aux critères requis.
      </div>

      <p>Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à soumettre une nouvelle demande
      avec des informations complémentaires ou à nous contacter directement.</p>

      <div class="btn-container">
        <a href="{lien_contact}" class="btn-secondary" target="_blank">Retour à la plateforme</a>
      </div>

      <p style="font-size: 14px; color: #7f8c8d;">
        Que la paix soit avec vous.
      </p>
    </div>
    <div class="email-footer">
      <p>&copy; {annee} Plateforme Église. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
"""

    send_mail(
        subject=sujet,
        message=message_texte,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=message_html,
        fail_silently=True,
    )
