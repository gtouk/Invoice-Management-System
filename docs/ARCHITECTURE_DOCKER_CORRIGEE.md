# Architecture technique corrigee - Ajout de Docker

## Correction importante

Docker doit faire partie de la stack officielle du projet. Il doit etre utilise des la V1 pour lancer un environnement coherent entre developpeurs et pour preparer le deploiement.

## Stack officielle V1

```text
Frontend: React + Vite
Backend: Node.js + Express
Base de donnees: PostgreSQL
Authentification: JWT + refresh token
API: REST JSON
PDF: generation cote backend
OCR: module separe plus tard
Conteneurisation: Docker + Docker Compose
Reverse proxy production: Nginx
Deploiement: VPS + SSL
Versioning: Git / GitHub
```

## Services Docker developpement

```text
frontend  -> React + Vite, port 5173
backend   -> Express API, port 5000
postgres  -> PostgreSQL, port 5432
pgadmin   -> Interface PostgreSQL, port 5050
```

## Services Docker production

```text
nginx     -> reverse proxy public
frontend  -> build React statique
backend   -> API Express
postgres  -> base de donnees
storage   -> factures PDF, releves importes, exports
```

## Commandes principales

```bash
cp .env.example .env
docker compose up --build
```

Pour arreter :

```bash
docker compose down
```

Pour reinitialiser la base de donnees locale :

```bash
docker compose down -v
docker compose up --build
```

## Regle d'ingenierie

A partir de maintenant, toute nouvelle fonctionnalite doit fonctionner dans Docker avant d'etre consideree comme validee.
