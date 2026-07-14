# QA Checklist — Invoice Management System (V1)

Checklist manuelle à passer avant une démo ou une release. Cocher chaque point après validation.

## Login

- [ ] Super Admin : `superadmin@invoice.com` / `SuperAdmin123!` → `/super-admin/dashboard`
- [ ] Admin entreprise : `admin@invoice.com` / `admin123` → `/admin/dashboard`
- [ ] Client : `portal.client.test@invoice.local` / `ClientTest123!` → `/client/dashboard`
- [ ] Mauvais mot de passe → erreur 401, pas de token
- [ ] Entreprise suspendue → login admin refusé (403) avec message clair

## Super Admin

- [ ] Stats plateforme affichées (`/super-admin/dashboard`)
- [ ] Liste des entreprises chargée
- [ ] Suspendre une entreprise fonctionne
- [ ] Réactiver une entreprise fonctionne
- [ ] Audit logs globaux visibles et filtrables
- [ ] Un admin entreprise ne peut pas ouvrir `/super-admin/*`

## Admin entreprise

- [ ] Clients : CRUD + liste filtrée à la société courante
- [ ] Items : CRUD OK
- [ ] Factures : brouillon → génération → PDF
- [ ] Paiements : enregistrement et mise à jour du solde
- [ ] Relevés bancaires : upload + parsing
- [ ] Paramètres entreprise / logo
- [ ] Dashboard résumé cohérent avec les données
- [ ] Rapports (summary, revenus, top clients, paiements) OK

## Client portal

- [ ] Dashboard client 200 avec stats propres au client
- [ ] Liste factures et paiements du client uniquement
- [ ] Download PDF facture client via API authentifiée
- [ ] Un admin / super admin ne peut pas accéder à `/api/client/*`

## Sécurité

- [ ] Sans token : routes protégées → 401
- [ ] Mauvais rôle : routes réservées → 403
- [ ] JWT expiré / invalide refusé
- [ ] Isolation `company_id` sur clients, factures, paiements, relevés

## Fichiers privés

- [ ] `GET /storage/invoices/...` → 404 (non exposé)
- [ ] `GET /storage/bank-statements/...` → 404 (non exposé)
- [ ] Logo company via `/storage/company/...` OK (public limité)
- [ ] PDF via `GET /api/invoices/:id/download` avec token propriétaire → 200
- [ ] PDF avec token autre entreprise → 403/404

## Email

- [ ] `prepare` email facture remplit subject / body / to / can_send
- [ ] Envoi SMTP (Mailtrap ou réel) avec PDF joint si configuré
- [ ] Log email visible côté facture
- [ ] Client / autre société ne peuvent pas préparer/envoyer

## Reports

- [ ] `/api/reports/summary` 200 pour admin
- [ ] `/api/reports/revenue-by-month` 200
- [ ] `/api/reports/invoices-by-status` 200
- [ ] `/api/reports/top-clients` 200
- [ ] `/api/reports/payments-by-method` 200
- [ ] Client et super admin → 403 sur ces routes

## Cross-company

- [ ] Admin NEA ne voit pas les clients BeautyDemo
- [ ] Admin NEA ne peut pas ouvrir une facture BeautyDemo (403/404)
- [ ] Download PDF cross-company refusé
- [ ] Email prepare cross-company refusé
