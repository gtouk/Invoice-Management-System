# Déploiement V1 — bêta privée

Guide pour déployer Invoice Management System en environnement de production légère (VPS) ou PaaS.

**Ne jamais committer** `.env.prod`, tokens SMTP, mots de passe DB ou dumps SQL.

## Prérequis

- Docker + Docker Compose v2
- Domaine(s) pointant vers le VPS (ex. `app.example.com`, `api.example.com`)
- Secrets aléatoires (JWT, mot de passe Postgres)

## Fichiers utiles

| Fichier | Rôle |
|---------|------|
| `.env.prod.example` | Modèle secrets prod → copier vers `.env.prod` |
| `docker-compose.prod.yml` | Stack prod (postgres, backend, frontend, nginx) |
| `nginx/default.conf` | Reverse proxy (API + SPA, storage privé bloqué) |
| `scripts/backup_postgres.sh` | Dump Postgres |
| `scripts/restore_postgres.sh` | Restore dump |

## Option A — VPS Ubuntu + Docker Compose

### 1. Préparer le serveur

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin certbot python3-certbot-nginx
sudo usermod -aG docker "$USER"
# reconnect SSH after usermod
```

### 2. Cloner et configurer

```bash
git clone https://github.com/gtouk/Invoice-Management-System.git
cd Invoice-Management-System
git checkout v1.0-saas   # ou la branche/tag cible

cp .env.prod.example .env.prod
nano .env.prod
```

À renseigner au minimum :

- `POSTGRES_*` + mots de passe forts
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (longs, aléatoires)
- `FRONTEND_URL` + `CORS_ORIGIN` = URL HTTPS du frontend
- SMTP réel ou Mailtrap
- `VITE_API_URL=/api` si front et API derrière le même nginx

### 3. Lancer la stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
curl -s http://127.0.0.1/health | jq
```

Par défaut, seul nginx expose `80`/`443`. Backend et Postgres restent sur le réseau Docker interne.

### 4. Nginx hôte + HTTPS (recommandé)

Si vous terminer TLS sur le hôte (pas dans le container), écoutez les ports compose sur localhost et reverse-proxyez :

```nginx
# /etc/nginx/sites-available/invoice-app
server {
  server_name app.example.com;

  location / {
    proxy_pass http://127.0.0.1:80;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Variante sous-domaines séparés (si vous mappez backend `5000` et frontend `5173` en localhost) :

```nginx
server {
  server_name app.example.com;

  location / {
    proxy_pass http://127.0.0.1:5173;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}

server {
  server_name api.example.com;

  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

Dans ce cas, décommentez les `ports` backend/frontend dans `docker-compose.prod.yml` et fixez :

```env
FRONTEND_URL=https://app.example.com
CORS_ORIGIN=https://app.example.com
VITE_API_URL=https://api.example.com/api
```

Certificat Let’s Encrypt :

```bash
sudo certbot --nginx -d app.example.com -d api.example.com
```

### 5. Seed / comptes

Après le premier boot, créer le super admin si besoin :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec backend \
  npm run seed:super-admin
```

Voir aussi [`DEMO_ACCOUNTS.md`](./DEMO_ACCOUNTS.md) — **changer tous les mots de passe** avant une bêta réelle.

## Option B — Render / Railway / Vercel

| Couche | Suggestion |
|--------|------------|
| Frontend | Vercel / Netlify (build Vite, `VITE_API_URL=https://api…/api`) |
| Backend | Render / Railway / Fly.io (Dockerfile backend `target: production`) |
| Postgres | Managed (Render/Railway/Supabase/Neon) |
| Storage | Volume ephemeral ❌ pour prod commerciale → S3 / R2 / Spaces |

Points d’attention PaaS :

1. Définir `FRONTEND_URL` / `CORS_ORIGIN` stricts.
2. Migrations SQL à lancer une fois sur la DB managée.
3. Le volume Docker `storage_data` n’existe pas : migrer les PDF vers object storage (hors scope V1 bêta).
4. Healthcheck : `GET /health`.

## Backups

### Base de données

```bash
chmod +x scripts/*.sh
./scripts/backup_postgres.sh
```

Restore :

```bash
./scripts/restore_postgres.sh backups/invoice_db_YYYYMMDD_HHMMSS.sql
```

Les dumps sont dans `backups/` (gitignoré).

### Storage (PDF / relevés)

En V1 bêta, le volume Docker `storage_data` est acceptable.

Sauvegarder aussi ce volume, par exemple :

```bash
docker run --rm \
  -v invoice-management-system_storage_data:/data \
  -v "$(pwd)/backups:/backup" \
  alpine tar czf /backup/storage_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

(Adaptez le nom du volume via `docker volume ls`.)

## Storage & fichiers privés

- En V1 bêta : stockage local via volume Docker OK.
- **À sauvegarder** : PostgreSQL **et** volume storage.
- Pour une prod commerciale : S3, Cloudflare R2, DigitalOcean Spaces ou Supabase Storage.
- `/storage/invoices` et relevés **ne doivent pas** être publics.
- Accès fichiers privés uniquement via API authentifiée :
  - `GET /api/invoices/:id/download`
  - `GET /api/bank-statements/:id/file`
  - `GET /api/client/invoices/:id/download`
- Nginx refuse tout `/storage/*` hors `company` et `public`.

## Sécurité runtime (déployée)

- Helmet + `x-powered-by` désactivé
- CORS strict en production (`FRONTEND_URL` / `CORS_ORIGIN`)
- Rate limit global `/api` (~300 / 15 min)
- Rate limit auth login + register-company (~10 / 15 min)
- Health : `GET /health` (inclut `database: ok|error`, sans secrets)

## Checklist avant bêta privée

- [ ] `.env.prod` hors Git, secrets rotés
- [ ] HTTPS actif
- [ ] CORS limité au domaine front
- [ ] Mots de passe comptes démo changés ou comptes désactivés
- [ ] SMTP testé (envoi facture Mailtrap/prod)
- [ ] Backup Postgres + storage testé
- [ ] `curl /health` → `database: ok`
- [ ] Accès direct `/storage/invoices/...` → 404
- [ ] Tests locaux encore verts (`docs/TESTING.md`)

## Commandes utiles

```bash
# Valider le compose sans démarrer
docker compose -f docker-compose.prod.yml --env-file .env.prod config

# Logs
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f backend

# Arrêt
docker compose -f docker-compose.prod.yml --env-file .env.prod down
```

## Risques restants (V1 bêta)

- Storage local non multi-nœuds / perte si volume non sauvegardé
- Pas encore d’object storage cloud
- Rate limit IP-based (derrière proxy : bien transmettre `X-Forwarded-For` / trust proxy si besoin)
- Comptes démo et mots de passe faibles si non rotés
- Monitoring / alerting non inclus
- CI backend integration tests pas lancés sans Postgres + seed
