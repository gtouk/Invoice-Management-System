# Invoice Management System

Plateforme SaaS multi-entreprise de facturation, paiements, clients, articles/services, commissions et relevés bancaires.

## Stack V1

- Frontend : React + Vite
- Backend : Node.js + Express (ES Modules)
- Base de données : PostgreSQL
- Auth : JWT + refresh token
- PDF : génération backend (pdfkit)
- Email : Nodemailer / SMTP ou Mailtrap
- Conteneurisation : Docker Compose
- Reverse proxy production : Nginx

## Prérequis

- Docker
- Docker Compose
- (Optionnel) Node.js 22+ pour scripts hors Docker

## Lancement

```bash
cp .env.example .env
# Configurer SMTP et JWT si besoin

docker compose down
docker compose up --build
```

Ou en arrière-plan :

```bash
docker compose up -d --build
```

## URLs

```txt
Frontend : http://localhost:5173
Backend  : http://localhost:5000
API      : http://localhost:5000/api
pgAdmin  : http://localhost:5050
```

Identifiants pgAdmin par défaut (selon `.env`) :

```txt
Email    : admin@invoice.local
Mot de passe : admin
```

## Comptes de test

Détails complets : [`docs/DEMO_ACCOUNTS.md`](docs/DEMO_ACCOUNTS.md)

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Super Admin | `superadmin@invoice.com` | `SuperAdmin123!` |
| Admin entreprise | `admin@invoice.com` | `admin123` |
| Client portail | `portal.client.test@invoice.local` | `ClientTest123!` |

Parcours démo :

1. `/login` → Super Admin → `/super-admin/dashboard`
2. `/login` → Admin NEA → `/admin/dashboard`
3. `/login` → Client → `/client/dashboard`

## Fonctionnalités V1

- Multi-entreprise (SaaS) avec isolation `company_id`
- Super Admin (stats, entreprises, suspension / activation, audit global)
- Inscription entreprise transactionnelle (`/register-company`)
- Clients, articles / services, utilisateurs internes
- Factures PDF (stockage privé) + téléchargement sécurisé
- Paiements
- Relevés bancaires sécurisés
- Envoi email facture + PDF privé + logs email
- Audit logs admin entreprise + super admin
- Dashboards admin / client / super admin
- Rapports entreprise (résumé, revenus, top clients, etc.)
- Portail client

## SMTP

Voir [`docs/SMTP_SETUP.md`](docs/SMTP_SETUP.md).

Variables principales :

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=no-reply@neankap.com
SMTP_SECURE=false
```

## Notes sécurité

- `/storage` global n’est plus public (seuls logos / public exposés)
- PDF et relevés via endpoints authentifiés :
  - `GET /api/invoices/:id/download`
  - `GET /api/bank-statements/:id/file`
  - `GET /api/client/invoices/:id/download`
- Filtrage strict par `company_id` (et `client_id` côté portail)
- Accès cross-company refusé (404 / 403)

## Structure

```text
Invoice-Management-System/
├── backend/
├── frontend/
├── database/migrations/
├── docs/
├── nginx/
├── storage/
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## Tests

Détails : [`docs/TESTING.md`](docs/TESTING.md) · Checklist : [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md)

### Backend (intégration API — nécessite Docker + Postgres + comptes démo)

```bash
docker compose up -d
docker compose exec backend npm install
docker compose exec backend npm test
```

### Frontend (unitaires formatters)

```bash
cd frontend
npm install
npm test
```

## Commandes utiles

```bash
docker compose up --build
docker compose up -d --build
docker compose logs -f backend
docker compose down
docker compose down -v   # attention : efface les données Postgres
```

## Documentation

- [`docs/DEMO_ACCOUNTS.md`](docs/DEMO_ACCOUNTS.md) — comptes et parcours démo
- [`docs/SMTP_SETUP.md`](docs/SMTP_SETUP.md) — configuration email
- [`docs/TESTING.md`](docs/TESTING.md) — lancer les tests automatisés
- [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) — checklist qualité manuelle
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — déploiement V1 bêta / prod
- [`docs/FREE_DEPLOYMENT.md`](docs/FREE_DEPLOYMENT.md) — déploiement gratuit (Vercel + Render + Supabase)
- [`docs/START_HERE.md`](docs/START_HERE.md) — démarrage projet
