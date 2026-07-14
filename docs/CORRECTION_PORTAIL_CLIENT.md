# Correction — Back-office admin/employé et portail client

## Objectif

La plateforme possède maintenant deux espaces séparés :

1. Back-office admin/employé
2. Portail client

## Rôles

La table `roles` contient maintenant :

- `admin`
- `employee`
- `client`

## Back-office

Routes frontend :

- `/admin/dashboard`
- `/admin/clients`
- `/admin/items`
- `/admin/invoices`
- `/admin/payments`
- `/admin/bank-statements`
- `/admin/commissions`
- `/admin/reports`
- `/admin/users`

Utilisateurs autorisés :

- admin
- employee

## Portail client

Routes frontend :

- `/client/dashboard`
- `/client/profile`
- `/client/invoices`
- `/client/payments`

Utilisateur autorisé :

- client

## Routes API client

Nouvelles routes backend :

- `GET /api/client/profile`
- `GET /api/client/summary`
- `GET /api/client/invoices`
- `GET /api/client/invoices/:id`
- `GET /api/client/invoices/:id/pdf`
- `GET /api/client/payments`

Ces routes retournent uniquement les données du client connecté.

## Base de données

La table `clients` contient maintenant :

```sql
user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL
```

Cela permet de lier un compte utilisateur de rôle `client` à un dossier client.

## Règle importante

Un client connecté ne doit jamais accéder aux données d’un autre client.

Le backend vérifie toujours le client connecté via :

```text
clients.user_id = req.user.id
```

## Impact sur Sprint 3

Le Sprint 3 Articles / Services reste un module réservé au back-office.

Le client ne peut pas gérer les articles/services.
Il peut seulement voir les articles/services déjà copiés dans ses factures via `invoice_items`.
