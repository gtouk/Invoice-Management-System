# Comptes de démo V1

URLs locales après `docker compose up --build` :

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Health | http://localhost:5000/api/health |
| pgAdmin | http://localhost:5050 |

Pages utiles :

| Rôle | Chemins |
|------|---------|
| Login | `/login` |
| Admin entreprise | `/admin/dashboard`, `/admin/invoices`, `/admin/payments`, `/admin/reports`, `/admin/audit-logs` |
| Portail client | `/client/dashboard`, `/client/invoices`, `/client/payments`, `/client/profile` |
| Super Admin | `/super-admin/dashboard`, `/super-admin/companies`, `/super-admin/audit-logs` |

## Comptes

### Super Admin

```txt
Email / identifiant : superadmin@invoice.com
Mot de passe        : SuperAdmin123!
```

### Admin entreprise NEA NKAP

```txt
Email / identifiant : admin@invoice.com
Mot de passe        : admin123
```

### Client portail (test)

```txt
Email / identifiant : portal.client.test@invoice.local
Mot de passe        : ClientTest123!
```

Compte créé pour les tests de sécurité / portail client. Lié à un client de l’entreprise NEA.

Pour le supprimer (optionnel) :

```sql
UPDATE clients SET user_id = NULL
WHERE user_id = (
  SELECT id FROM users WHERE email = 'portal.client.test@invoice.local'
);

DELETE FROM users
WHERE email = 'portal.client.test@invoice.local';
```

### Autre entreprise (cross-tenant)

```txt
Email / identifiant : admin@beautydemo.test
Mot de passe        : admin123
```

Utile pour vérifier qu’une entreprise ne voit pas les données NEA.

## SMTP

Sans Mailtrap / SMTP réel, l’envoi email facture renvoie une erreur propre (502) et écrit un log `failed`.

Voir [`SMTP_SETUP.md`](./SMTP_SETUP.md).
