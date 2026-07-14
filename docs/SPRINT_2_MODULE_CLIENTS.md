# Sprint 2 — Module Clients

## Objectif

Implémenter la gestion des clients pour la V1 : ajout, modification, consultation, recherche, suppression conditionnelle, archivage et réactivation.

## Backend livré

Routes ajoutées :

```text
GET    /api/clients
POST   /api/clients
GET    /api/clients/:id
PUT    /api/clients/:id
DELETE /api/clients/:id
PATCH  /api/clients/:id/archive
PATCH  /api/clients/:id/reactivate
GET    /api/clients/:id/history
```

Fichiers ajoutés :

```text
backend/src/modules/clients/client.routes.js
backend/src/modules/clients/client.controller.js
backend/src/modules/clients/client.service.js
backend/src/modules/clients/client.repository.js
backend/src/middlewares/permission.middleware.js
```

## Frontend livré

La page `Clients` permet maintenant de :

```text
- afficher la liste des clients ;
- rechercher par nom, téléphone, email, adresse ou code ;
- filtrer par statut actif / archive ;
- filtrer par type particulier / entreprise ;
- ajouter un client ;
- modifier un client ;
- consulter le résumé financier d’un client ;
- archiver un client ;
- réactiver un client archivé ;
- supprimer un client sans historique.
```

Fichiers ajoutés / modifiés :

```text
frontend/src/services/clients.service.js
frontend/src/pages/Clients/Clients.jsx
frontend/src/styles.css
```

## Règles métier couvertes

```text
1. Le nom du client est obligatoire.
2. Un nouveau client est actif par défaut.
3. Un client peut être recherché par plusieurs champs.
4. Un client avec factures ou paiements ne peut pas être supprimé définitivement.
5. Un client avec historique doit être archivé.
6. Un client archivé peut être réactivé.
7. Les actions sensibles sont enregistrées dans audit_logs.
```

## Commande de lancement

```bash
docker compose up --build
```

Ensuite :

```text
Frontend : http://localhost:5173
Backend  : http://localhost:5000/api/health
```
