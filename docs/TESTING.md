# Testing — Invoice Management System

## Framework

| Zone | Outil | Type |
|------|--------|------|
| Backend | **Vitest** + **Supertest** | Tests d’intégration API (contre Postgres + comptes démo) |
| Frontend | **Vitest** | Tests unitaires (`utils/formatters`) |

Pas de Jest. Le backend est en ES Modules ; Vitest est le choix le plus simple.

## Prérequis backend

1. Stack Docker démarrée (`postgres` + `backend`)
2. Comptes démo présents (voir [`DEMO_ACCOUNTS.md`](./DEMO_ACCOUNTS.md))
3. Dépendances de test installées dans le conteneur backend

Les tests backend **ne mockent pas** la base : ils s’appuient sur la DB live Docker et sur des comptes de démo. Ils sont **non destructifs** (lecture + login uniquement ; pas de delete / seed agressif).

## Lancer les tests backend (méthode retenue)

Recommandé : depuis Docker, pour réutiliser `DATABASE_URL` et le `node_modules` du conteneur.

```bash
docker compose up -d
docker compose exec backend npm install
docker compose exec backend npm test
```

Mode watch :

```bash
docker compose exec backend npm run test:watch
```

### Depuis la machine host (optionnel)

```bash
cd backend
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invoice_system
# Reprendre JWT_* du fichier .env projet
npm install
npm test
```

## Lancer les tests frontend

Aucune DB requise.

```bash
cd frontend
npm install
npm test
```

## Comptes requis (backend)

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Super Admin | `superadmin@invoice.com` | `SuperAdmin123!` |
| Admin NEA | `admin@invoice.com` | `admin123` |
| Admin autre société | `admin@beautydemo.test` | `admin123` |
| Client portail | `portal.client.test@invoice.local` | `ClientTest123!` |

Overrides possibles via variables d’environnement :

- `TEST_SUPERADMIN_IDENTIFIER` / `TEST_SUPERADMIN_PASSWORD`
- `TEST_ADMIN_IDENTIFIER` / `TEST_ADMIN_PASSWORD`
- `TEST_OTHER_ADMIN_IDENTIFIER` / `TEST_OTHER_ADMIN_PASSWORD`
- `TEST_CLIENT_IDENTIFIER` / `TEST_CLIENT_PASSWORD`
- `TEST_SUSPENDED_ADMIN_IDENTIFIER` / `TEST_SUSPENDED_ADMIN_PASSWORD` (optionnel)

## Couverture automatisée

- Auth login (super admin, admin, mauvais password)
- Super Admin stats / companies / audit-logs (+ 401 / 403)
- Isolation multi-tenant + PDF download + `/storage/invoices` bloqué
- Dashboard / reports (admin 200, client & super_admin 403, sans token 401)
- Portail client (client 200, admin & super_admin 403)
- Email facture `prepare` (owner, client 403, cross-company)

## Limites connues

- **Login entreprise suspendue** : test auto seulement si `TEST_SUSPENDED_*` est fourni ; sinon checklist manuelle.
- **Envoi email SMTP** (`POST .../email/send`) : non automatisé (dépend SMTP). Tester manuellement avec Mailtrap.
- **CI GitHub Actions** : frontend unitaires seulement. Les tests backend d’intégration nécessitent Postgres + comptes démo (à lancer en local / avant démo).
- Si BeautyDemo n’a pas de facture, certains cas cross-company sont skippés (assert soft).

## Avant une démo

1. `docker compose up -d --build`
2. `docker compose exec backend npm test`
3. `cd frontend && npm test`
4. Parcourir [`QA_CHECKLIST.md`](./QA_CHECKLIST.md)
5. Vérifier SMTP (Mailtrap) pour un envoi facture réel
