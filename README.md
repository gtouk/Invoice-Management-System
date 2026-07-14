# Invoice Management System

Systeme de gestion de facturation, paiements, clients, articles/services, commissions et releves de compte.

## Stack officielle V1 corrigee

- Frontend: React + Vite
- Backend: Node.js + Express
- Base de donnees: PostgreSQL
- Authentification: JWT + refresh token
- API: REST JSON
- PDF: generation cote backend
- OCR: module separe a integrer plus tard
- Conteneurisation: Docker + Docker Compose
- Reverse proxy production: Nginx
- Deploiement cible: VPS + SSL
- Versioning: Git / GitHub

## Structure

```text
invoice-system/
├── backend/
│   ├── Dockerfile
│   └── src/
├── frontend/
│   ├── Dockerfile
│   └── src/
├── database/
│   └── migrations/
├── docs/
├── nginx/
│   └── default.conf
├── storage/
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## Demarrage rapide avec Docker

1. Copier le fichier d'environnement :

```bash
cp .env.example .env
```

2. Lancer tous les services :

```bash
docker compose up --build
```

3. Acceder aux services :

```text
Frontend: http://localhost:5173
Backend API: http://localhost:5000/api
PostgreSQL: localhost:5432
pgAdmin: http://localhost:5050
```

Identifiants pgAdmin par defaut :

```text
Email: admin@invoice.local
Mot de passe: admin
```

## Services Docker

```text
frontend  -> React + Vite
backend   -> Node.js + Express
postgres  -> PostgreSQL 16
pgadmin   -> Interface graphique PostgreSQL
nginx     -> Reverse proxy pour la production
```

## Commandes utiles

```bash
# Demarrer en developpement
docker compose up --build

# Lancer en arriere-plan
docker compose up -d --build

# Voir les logs
docker compose logs -f

# Arreter les services
docker compose down

# Arreter et supprimer les volumes de donnees
docker compose down -v
```

## Premier objectif

Sprint 1: authentification, utilisateurs, roles, permissions et structure initiale du projet.
