# Guide de demarrage du projet

## Decision corrigee

Docker fait maintenant partie de la stack officielle du projet. Il ne remplace pas React, Express ou PostgreSQL. Il sert a executer ces composants dans des conteneurs coherents.

## Stack officielle

```text
Frontend: React + Vite
Backend: Node.js + Express
Database: PostgreSQL
Auth: JWT + refresh token
API: REST JSON
PDF: generation cote backend
OCR: module separe plus tard
Docker: Docker + Docker Compose
Production: VPS + Nginx + SSL
```

## Demarrer avec Docker

Depuis la racine du projet :

```bash
cp .env.example .env
docker compose up --build
```

## URLs locales

```text
Frontend: http://localhost:5173
Backend: http://localhost:5000/api
pgAdmin: http://localhost:5050
PostgreSQL: localhost:5432
```

## Notes importantes

- En developpement, Vite tourne dans le conteneur frontend.
- Express tourne dans le conteneur backend.
- PostgreSQL tourne dans le conteneur postgres.
- Les migrations SQL placees dans `database/migrations/` sont montees dans PostgreSQL au premier demarrage du volume.
- Si vous modifiez les migrations initiales, relancez avec `docker compose down -v` puis `docker compose up --build`.

## Prochaine implementation

Le prochain module a developper est le module Clients :

```text
- ajouter client
- modifier client
- consulter client
- rechercher client
- supprimer client sans historique
- archiver client avec historique
- reactiver client archive
```
