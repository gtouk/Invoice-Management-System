# Diagrammes UML — Système de facturation et paiements

## 1. Diagramme de cas d’utilisation global

```mermaid
flowchart LR
    Admin[Administrateur]
    Emp[Employé]
    Client[Client]
    Agent[Intermédiaire / Agent de commission]
    Bank[Relevé de compte / Source bancaire]

    subgraph System[Système de facturation et paiements]
        UC1((Se connecter))
        UC2((Gérer utilisateurs))
        UC3((Gérer clients))
        UC4((Gérer articles / services))
        UC5((Créer facture))
        UC6((Générer PDF))
        UC7((Enregistrer paiement))
        UC8((Importer relevé))
        UC9((Extraire transactions))
        UC10((Valider transaction))
        UC11((Créer facture depuis transaction))
        UC12((Gérer commissions))
        UC13((Consulter rapports))
        UC14((Consulter historique client))
        UC15((Annuler facture))
        UC16((Archiver client))
    end

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14
    Admin --> UC15
    Admin --> UC16

    Emp --> UC1
    Emp --> UC3
    Emp --> UC4
    Emp --> UC5
    Emp --> UC6
    Emp --> UC7
    Emp --> UC8
    Emp --> UC10
    Emp --> UC11
    Emp --> UC14

    Client -. associé à .-> UC5
    Client -. associé à .-> UC7
    Client -. possède .-> UC14
    Agent -. associé à .-> UC12
    Bank --> UC8
    Bank --> UC9

    UC5 --> UC6
    UC5 --> UC7
    UC8 --> UC9
    UC9 --> UC10
    UC10 --> UC11
    UC11 --> UC5
```

---

## 2. Diagramme de classes principal

```mermaid
classDiagram
    class User {
        +uuid id
        +string fullName
        +string email
        +string username
        +string passwordHash
        +string status
        +login()
        +logout()
    }

    class Role {
        +uuid id
        +string name
        +string description
    }

    class Permission {
        +uuid id
        +string code
        +string description
    }

    class Client {
        +uuid id
        +string clientCode
        +string fullName
        +string phone
        +string email
        +string address
        +string clientType
        +string status
        +archive()
        +reactivate()
    }

    class Item {
        +uuid id
        +string name
        +string description
        +string itemType
        +decimal defaultPrice
        +string status
        +disable()
        +reactivate()
    }

    class Invoice {
        +uuid id
        +string invoiceNumber
        +date issueDate
        +string status
        +decimal totalAmount
        +decimal paidAmount
        +decimal balanceDue
        +string pdfUrl
        +generate()
        +cancel()
        +calculateTotals()
    }

    class InvoiceItem {
        +uuid id
        +string itemName
        +string description
        +decimal quantity
        +decimal unitPrice
        +decimal lineTotal
        +string paymentStatus
        +calculateLineTotal()
    }

    class Payment {
        +uuid id
        +decimal amount
        +date paymentDate
        +string paymentMethod
        +string reference
    }

    class BankStatement {
        +uuid id
        +string fileName
        +string fileUrl
        +string sourceType
        +string status
        +process()
    }

    class BankTransaction {
        +uuid id
        +string extractedClientName
        +date transactionDate
        +decimal amount
        +string reference
        +string rawText
        +string status
        +correct()
        +validate()
        +markAsUsed()
    }

    class Commission {
        +uuid id
        +string intermediaryName
        +string commissionType
        +decimal commissionValue
        +decimal calculatedAmount
        +decimal paidAmount
        +decimal balanceDue
        +string paymentStatus
        +calculate()
        +updatePaymentStatus()
    }

    class AuditLog {
        +uuid id
        +string action
        +string entityType
        +uuid entityId
        +json oldValues
        +json newValues
        +datetime createdAt
    }

    Role "1" --> "*" User
    Role "*" --> "*" Permission
    User "1" --> "*" Client : creates
    User "1" --> "*" Item : creates
    User "1" --> "*" Invoice : creates
    User "1" --> "*" Payment : records
    User "1" --> "*" Commission : creates
    User "1" --> "*" AuditLog : performs
    Client "1" --> "*" Invoice
    Invoice "1" --> "*" InvoiceItem
    Item "1" --> "*" InvoiceItem
    Invoice "1" --> "*" Payment
    Client "1" --> "*" Payment
    Invoice "1" --> "*" Commission
    BankStatement "1" --> "*" BankTransaction
    BankTransaction "0..1" --> "0..1" Client : matchedClient
    BankTransaction "0..1" --> "0..1" Invoice : createdInvoice
```

---

## 3. Diagramme entité-relation ERD

```mermaid
erDiagram
    ROLES ||--o{ USERS : has
    ROLES ||--o{ ROLE_PERMISSIONS : contains
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : assigned

    USERS ||--o{ CLIENTS : creates
    USERS ||--o{ ITEMS : creates
    USERS ||--o{ INVOICES : creates
    USERS ||--o{ PAYMENTS : records
    USERS ||--o{ COMMISSIONS : creates
    USERS ||--o{ AUDIT_LOGS : performs

    CLIENTS ||--o{ INVOICES : owns
    CLIENTS ||--o{ PAYMENTS : makes

    INVOICES ||--o{ INVOICE_ITEMS : contains
    ITEMS ||--o{ INVOICE_ITEMS : referenced_by

    INVOICES ||--o{ PAYMENTS : receives
    INVOICES ||--o{ COMMISSIONS : has

    BANK_STATEMENTS ||--o{ BANK_TRANSACTIONS : contains
    CLIENTS ||--o{ BANK_TRANSACTIONS : matched_to
    INVOICES ||--o{ BANK_TRANSACTIONS : created_from

    ROLES {
        uuid id PK
        string name
        string description
    }

    USERS {
        uuid id PK
        uuid role_id FK
        string full_name
        string email
        string username
        string password_hash
        string status
    }

    CLIENTS {
        uuid id PK
        string client_code
        string full_name
        string phone
        string email
        text address
        string client_type
        string status
        uuid created_by FK
    }

    ITEMS {
        uuid id PK
        string name
        text description
        string item_type
        decimal default_price
        string status
        uuid created_by FK
    }

    INVOICES {
        uuid id PK
        string invoice_number
        uuid client_id FK
        string status
        date issue_date
        decimal total_amount
        decimal paid_amount
        decimal balance_due
        string pdf_url
        uuid created_by FK
    }

    INVOICE_ITEMS {
        uuid id PK
        uuid invoice_id FK
        uuid item_id FK
        string item_name
        decimal quantity
        decimal unit_price
        decimal line_total
        string payment_status
    }

    PAYMENTS {
        uuid id PK
        uuid invoice_id FK
        uuid client_id FK
        decimal amount
        date payment_date
        string payment_method
        string reference
        uuid created_by FK
    }

    BANK_STATEMENTS {
        uuid id PK
        string file_name
        string file_url
        string source_type
        string status
        uuid imported_by FK
    }

    BANK_TRANSACTIONS {
        uuid id PK
        uuid bank_statement_id FK
        string extracted_client_name
        uuid matched_client_id FK
        date transaction_date
        decimal amount
        string reference
        string status
        uuid created_invoice_id FK
    }

    COMMISSIONS {
        uuid id PK
        uuid invoice_id FK
        string intermediary_name
        string commission_type
        decimal commission_value
        decimal calculated_amount
        decimal paid_amount
        decimal balance_due
        string payment_status
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        json old_values
        json new_values
    }
```

---

## 4. Diagramme de séquence — Création d’une facture manuelle

```mermaid
sequenceDiagram
    actor U as Administrateur / Employé
    participant FE as Frontend React
    participant API as Backend Express
    participant DB as PostgreSQL
    participant PDF as Service PDF

    U->>FE: Ouvre Nouvelle facture
    FE->>API: GET /api/clients?status=actif
    API->>DB: Récupérer clients actifs
    DB-->>API: Liste clients
    API-->>FE: Clients actifs

    FE->>API: GET /api/items?status=actif
    API->>DB: Récupérer articles/services actifs
    DB-->>API: Liste articles/services
    API-->>FE: Articles/services

    U->>FE: Sélectionne client et articles
    FE->>API: POST /api/invoices
    API->>API: Valider client actif
    API->>API: Valider lignes facture
    API->>API: Calculer total
    API->>DB: Créer facture brouillon
    DB-->>API: Facture créée
    API-->>FE: Facture brouillon créée

    U->>FE: Générer facture
    FE->>API: PATCH /api/invoices/:id/generate
    API->>API: Générer numéro unique
    API->>DB: Mettre facture en non_payée
    DB-->>API: Facture mise à jour
    API-->>FE: Facture générée

    U->>FE: Générer PDF
    FE->>API: POST /api/invoices/:id/generate-pdf
    API->>DB: Récupérer facture complète
    DB-->>API: Données facture
    API->>PDF: Générer PDF
    PDF-->>API: URL du PDF
    API->>DB: Enregistrer pdf_url
    API-->>FE: PDF disponible
```

---

## 5. Diagramme de séquence — Paiement partiel

```mermaid
sequenceDiagram
    actor U as Administrateur / Employé
    participant FE as Frontend React
    participant API as Backend Express
    participant DB as PostgreSQL

    U->>FE: Ouvre une facture non payée
    FE->>API: GET /api/invoices/:id
    API->>DB: Récupérer facture
    DB-->>API: Facture avec solde
    API-->>FE: Détails facture

    U->>FE: Saisit montant partiel
    FE->>API: POST /api/payments
    API->>DB: Récupérer facture
    DB-->>API: total_amount, paid_amount, balance_due

    API->>API: Vérifier montant > 0
    API->>API: Vérifier montant <= balance_due
    API->>DB: Enregistrer paiement
    API->>API: Recalculer paid_amount
    API->>API: Recalculer balance_due
    API->>API: Déterminer statut facture
    API->>DB: Mettre à jour facture
    API->>DB: Écrire audit log

    DB-->>API: Paiement enregistré
    API-->>FE: Nouveau solde et statut
    FE-->>U: Affiche confirmation
```

---

## 6. Diagramme d’activité — Facture depuis relevé de compte

```mermaid
flowchart TD
    A([Début]) --> B[Importer ou scanner relevé]
    B --> C[Stocker fichier]
    C --> D[Lancer extraction OCR]
    D --> E[Extraire noms, montants, dates, références]
    E --> F[Créer transactions avec statut extrait]
    F --> G[Afficher transactions à l'utilisateur]

    G --> H{Données correctes ?}
    H -- Non --> I[Corriger nom, montant, date ou référence]
    I --> J[Statut = corrigé]
    J --> K[Valider transaction]

    H -- Oui --> K[Valider transaction]
    K --> L[Statut = validé]

    L --> M{Client existe ?}
    M -- Non --> N[Créer nouveau client]
    M -- Oui --> O[Lier au client existant]
    N --> P[Sélectionner articles/services]
    O --> P

    P --> Q[Choisir paiement total ou partiel]
    Q --> R[Créer facture]
    R --> S[Utiliser montant extrait comme paiement]
    S --> T[Calculer solde restant]
    T --> U[Mettre statut facture]
    U --> V[Associer transaction à facture]
    V --> W[Statut transaction = utilisé]
    W --> X([Fin])
```

---

## 7. Diagramme d’état — Cycle de vie d’une facture

```mermaid
stateDiagram-v2
    [*] --> Brouillon

    Brouillon --> NonPayee: Générer facture
    Brouillon --> Annulee: Annuler

    NonPayee --> PartiellementPayee: Paiement partiel
    NonPayee --> Payee: Paiement total
    NonPayee --> Annulee: Annuler

    PartiellementPayee --> Payee: Solde payé
    PartiellementPayee --> Annulee: Annuler selon règle métier

    Payee --> [*]
    Annulee --> [*]
```

---

## 8. Diagramme de composants technique

```mermaid
flowchart TB
    User[Utilisateur navigateur]

    subgraph Frontend[Frontend React + Vite]
        Login[Page Login]
        Dashboard[Dashboard]
        ClientsUI[Écrans clients]
        ItemsUI[Écrans articles/services]
        InvoicesUI[Écrans factures]
        PaymentsUI[Écrans paiements]
        BankUI[Écrans relevés]
        ReportsUI[Écrans rapports]
    end

    subgraph Backend[Backend Node.js + Express]
        AuthAPI[Auth API]
        UsersAPI[Users API]
        ClientsAPI[Clients API]
        ItemsAPI[Items API]
        InvoicesAPI[Invoices API]
        PaymentsAPI[Payments API]
        BankAPI[Bank Statements API]
        CommissionsAPI[Commissions API]
        ReportsAPI[Reports API]
        AuditAPI[Audit Logs]
        PDFService[PDF Service]
        OCRService[OCR Service]
        StorageService[Storage Service]
    end

    subgraph DB[PostgreSQL]
        Tables[(Tables métier)]
    end

    subgraph Files[Stockage fichiers]
        PDFs[Factures PDF]
        Statements[Relevés importés]
    end

    User --> Frontend
    Frontend --> AuthAPI
    Frontend --> ClientsAPI
    Frontend --> ItemsAPI
    Frontend --> InvoicesAPI
    Frontend --> PaymentsAPI
    Frontend --> BankAPI
    Frontend --> ReportsAPI

    AuthAPI --> Tables
    UsersAPI --> Tables
    ClientsAPI --> Tables
    ItemsAPI --> Tables
    InvoicesAPI --> Tables
    PaymentsAPI --> Tables
    BankAPI --> Tables
    CommissionsAPI --> Tables
    ReportsAPI --> Tables
    AuditAPI --> Tables

    InvoicesAPI --> PDFService
    PDFService --> PDFs

    BankAPI --> OCRService
    BankAPI --> StorageService
    StorageService --> Statements
```

---

## 9. Diagramme de déploiement V1

```mermaid
flowchart TB
    ClientBrowser[Poste utilisateur / Navigateur]

    subgraph VPS[Serveur VPS]
        Nginx[Nginx + HTTPS]
        FrontBuild[Frontend React build]
        BackendApp[Backend Node.js Express]
        PostgreSQL[(PostgreSQL)]
        Storage[Stockage local fichiers]
        Backup[Service de sauvegarde]
    end

    ClientBrowser -->|HTTPS| Nginx
    Nginx --> FrontBuild
    Nginx -->|/api| BackendApp
    BackendApp --> PostgreSQL
    BackendApp --> Storage
    Backup --> PostgreSQL
    Backup --> Storage
```

---

## 10. Diagramme de deploiement corrige avec Docker

```mermaid
flowchart TB
    Browser[Utilisateur / Navigateur]

    subgraph Host[Serveur ou poste developpeur]
        subgraph Docker[Docker Engine]
            subgraph Compose[Docker Compose]
                Nginx[Nginx container]
                Frontend[Frontend container: React + Vite ou build statique]
                Backend[Backend container: Node.js + Express]
                Postgres[(PostgreSQL container)]
                PgAdmin[pgAdmin container - dev uniquement]
            end
        end

        Storage[Volume storage: PDF, releves, exports]
        PgData[Volume postgres_data]
    end

    Browser -->|HTTP/HTTPS| Nginx
    Nginx --> Frontend
    Nginx -->|/api| Backend
    Backend --> Postgres
    Backend --> Storage
    Postgres --> PgData
    PgAdmin --> Postgres
```
