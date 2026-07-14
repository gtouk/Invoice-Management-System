# Déploiement gratuit — bêta privée

Architecture recommandée **sans hébergeur payant**, avec limites acceptées pour une bêta privée.

## Architecture cible

```txt
Frontend : Vercel Free (React/Vite)
Backend  : Render Free Web Service (Node/Express)
Database : Supabase Free Postgres (ou Neon Free)
Storage  : Supabase Storage Free (bucket privé)
Email    : Brevo Free ou Mailtrap Testing
```

Docker local (`docker compose`) **reste intact** avec `STORAGE_PROVIDER=local`.

## Limites acceptées

- Le backend Render Free **dort** après inactivité → cold start (30s–1 min)
- Quotas Supabase Free (DB size, storage, bandwidth)
- Pas adapté aux gros volumes / production commerciale
- Storage éphémère Render **non utilisé** pour les PDF (Supabase Storage à la place)
- Une seule instance, pas de scaling

## Variables storage

```env
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # BACKEND ONLY — never in frontend
SUPABASE_STORAGE_BUCKET=invoice-files
```

En local :

```env
STORAGE_PROVIDER=local
```

**Fichiers gérés via ce bucket (privé) :**

- PDF factures → `private/companies/{companyId}/invoices/...`
- Relevés bancaires → `private/companies/{companyId}/bank-statements/...`
- Logos entreprise → `public/companies/{companyId}/logo.ext`

Les logos restent **persistants** même si le disque Render est éphémère. Ils sont servis via :

```txt
GET /api/public/companies/{companyId}/logo
```

Le bucket Supabase peut rester **privé** (pas de clé service role côté frontend).

En local :

```txt
STORAGE_PROVIDER=local
→ fichiers sous storage/public/companies/...
→ même URL API /api/public/companies/:id/logo
→ fallback legacy /storage/company/... encore supporté
```

## Étapes

### 1. Supabase — Postgres + Storage

1. Créer un projet sur [supabase.com](https://supabase.com)
2. **Settings → Database** : copier la connection string (`DATABASE_URL`)
3. Lancer les migrations SQL du repo (`database/migrations/001_initial_schema.sql`) via SQL Editor
4. **Storage** → créer un bucket **`invoice-files`** en mode **Private** (pas public)
5. **Settings → API** :
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role — secret serveur uniquement)

### 2. Backend — Render Free

1. New → **Web Service** → brancher le repo GitHub
2. Root Directory : `backend` (si monorepo)
3. Build : `npm install`
4. Start : `npm start`
5. Environment variables (exemples, **pas les vrais secrets dans Git**) :

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=https://ton-app.vercel.app
CORS_ORIGIN=https://ton-app.vercel.app
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=invoice-files
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=no-reply@example.com
```

6. Health check path : `/health`

Optionnel : `render.yaml` à la racine du repo (placeholders uniquement).

### 3. Frontend — Vercel Free

1. Import repo → Root Directory : `frontend`
2. Build : `npm run build`
3. Output : `dist`
4. Env :

```env
VITE_API_URL=https://ton-backend.onrender.com/api
```

5. `frontend/vercel.json` gère le fallback SPA.

### 4. CORS

Sur le backend :

```env
FRONTEND_URL=https://ton-app.vercel.app
CORS_ORIGIN=https://ton-app.vercel.app
```

### 5. Email

- **Mailtrap** : test inbox uniquement
- **Brevo Free** : envoi limité réel pour la bêta

### 6. Tests manuels après déploiement

1. `curl https://ton-backend.onrender.com/health`
2. Login admin / super admin / client
3. Upload logo entreprise → aperçu OK
4. `curl -I https://ton-backend.onrender.com/api/public/companies/{companyId}/logo`
5. Créer facture → générer PDF → logo visible dans le PDF
6. Télécharger PDF / relevé via API
7. Vérifier qu’aucun lien public Supabase n’est exposé
8. Envoi email facture
9. Portail client download PDF

### 7. Test Supabase storage (manuel)

Sans variables Supabase, les tests automatisés restent sur **local**. Pour valider Supabase :

1. Mettre `STORAGE_PROVIDER=supabase` + clés dans `.env` backend
2. Générer une facture
3. Vérifier l’objet dans le bucket `invoice-files` sous `private/companies/...`
4. Télécharger via `/api/invoices/:id/download`

## Sécurité fichiers

- Bucket **privé** uniquement
- Pas d’URL publique
- Downloads uniquement via API authentifiée + ownership
- `SUPABASE_SERVICE_ROLE_KEY` **jamais** dans le frontend ni dans Git

## Local vs Free beta

| | Local Docker | Free beta |
|--|--------------|-----------|
| DB | Postgres container | Supabase/Neon |
| Storage | `STORAGE_PROVIDER=local` | `STORAGE_PROVIDER=supabase` |
| Front | Vite :5173 | Vercel |
| Back | Node :5000 | Render |

## Voir aussi

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — déploiement VPS / Docker payant
- [`TESTING.md`](./TESTING.md) — tests automatisés
- [`SMTP_SETUP.md`](./SMTP_SETUP.md) — email
