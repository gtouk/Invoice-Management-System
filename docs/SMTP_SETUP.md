# Configuration SMTP (emails de factures)

L’envoi de factures par email utilise **Nodemailer**. Sans SMTP valide, `POST /api/invoices/:id/email/send` retourne une erreur propre (**502**) et enregistre un log `failed` dans `invoice_email_logs` (+ audit `invoice_email_failed`).

## Variables d’environnement

À placer dans le `.env` à la racine du projet (chargé par Docker Compose / backend) :

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_username
SMTP_PASS=your_mailtrap_password
SMTP_FROM=no-reply@neankap.com
SMTP_SECURE=false
```

Alias acceptés par le backend :

- `SMTP_PASSWORD` (équivalent de `SMTP_PASS`)
- `SMTP_FROM_EMAIL` (équivalent de `SMTP_FROM`)

## Comportement From / Reply-To

| Champ | Source |
|-------|--------|
| **From technique** | `SMTP_FROM` (ou compte SMTP) — requis par Mailtrap / la plupart des SMTP |
| **Reply-To** | email de l’entreprise (`company_settings.company_email`) quand disponible |

Ne pas mettre `smtp.example.com` : c’est un placeholder et l’envoi échouera (`ENOTFOUND`).

## Mailtrap (dev recommandé)

1. Créer un inbox Email Testing sur [mailtrap.io](https://mailtrap.io)
2. Copier host / port / user / pass dans `.env`
3. Port courant : **2525** ou **587**, `SMTP_SECURE=false`
4. Redémarrer :

```bash
docker compose up -d --force-recreate backend
```

Mailtrap peut limiter le nombre d’emails par seconde : en cas d’erreurs intermittentes, patienter puis réessayer.

## Vérification rapide

```bash
# Après login admin
curl -X POST http://localhost:5000/api/invoices/$INVOICE_ID/email/send \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","body":"Bonjour"}'
```

- **200** + log `sent` → SMTP OK  
- **502** + log `failed` → corriger `.env` SMTP
