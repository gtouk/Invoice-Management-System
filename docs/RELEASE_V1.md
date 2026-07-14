# Release V1 SaaS

## Version

`v1.0-saas`

Branche et tag Git : `v1.0-saas`  
Commit de référence : `Finalize SaaS V1: security, dashboards, email, and UX polish.`

## Fonctionnalités principales

- Authentification JWT (+ refresh)
- Rôles : `super_admin`, `company_admin`, `admin`, `employee`, `client`
- Plateforme SaaS multi-entreprises
- Super Admin (stats, entreprises, suspension / activation)
- Inscription entreprise transactionnelle
- Suspension / activation entreprise
- Clients
- Articles / services
- Factures avec PDF sécurisé
- Paiements
- Relevés bancaires sécurisés
- Email facture avec PDF privé attaché
- Logs email
- Audit logs (admin entreprise + super admin)
- Dashboards (admin, client, super admin)
- Reports entreprise
- Portail client
- Stockage privé (`storage/private/...`)
- Isolation `company_id` / anti cross-tenant

## Comptes démo

Voir [`DEMO_ACCOUNTS.md`](./DEMO_ACCOUNTS.md).

## SMTP

Voir [`SMTP_SETUP.md`](./SMTP_SETUP.md).

## Sauvegarde base de données

Dump local recommandé (non versionné dans Git) :

```bash
mkdir -p backups
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > backups/invoice_db_v1_saas.sql
```

Fichier attendu : `backups/invoice_db_v1_saas.sql`

## Notes

Cette version est une **V1 fonctionnelle**, prête pour démonstration.

Prochaines pistes : déploiement, tests automatisés, ou améliorations UI / graphes.
