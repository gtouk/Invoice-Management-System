# Stack officielle corrigee du projet

## Stack applicative

```text
Frontend: React + Vite
Backend: Node.js + Express
Base de donnees: PostgreSQL
Authentification: JWT + refresh token
API: REST JSON
PDF: generation cote backend
OCR: module separe plus tard
```

## Stack d'environnement et de deploiement

```text
Conteneurisation: Docker + Docker Compose
Reverse proxy: Nginx
Deploiement: VPS
SSL: certificat TLS en production
Versioning: Git / GitHub
```

## Pourquoi Docker est inclus

Docker garantit que tous les developpeurs lancent le meme environnement : meme version de Node.js, meme version PostgreSQL, memes variables d'environnement, meme structure de services.

## Services Docker en developpement

```text
frontend: React + Vite sur le port 5173
backend: Express sur le port 5000
postgres: PostgreSQL sur le port 5432
pgadmin: interface PostgreSQL sur le port 5050
```

## Services Docker en production

```text
nginx: reverse proxy public
frontend: build statique React servi par Nginx
backend: API Express
postgres: base de donnees
storage: fichiers PDF et releves importes
```
