# Azure Functions Backend & Cloud Sync Documentation

This document describes the **Azure Serverless Backend architecture**, database containers, code structure, deployment instructions, and testing commands for the Password Manager app.

---

## 1. Overview & Architecture

The Azure backend provides a serverless bi-directional synchronization endpoint backed by **Azure Cosmos DB (Serverless NoSQL)** with fallback support for Azure Blob Storage:

```
+------------------------+                     +-------------------------------+
|                        |  POST /api/sync     |                               |
|  Desktop Password App  | ------------------> |  Azure Function (sync.js)     |
|  (Local Encrypted)     | <------------------ |  (Node.js 20/22 v4 Handler)   |
|                        |  { passwords, ... } |                               |
+------------------------+                     +-------------------------------+
                                                               |
                                        +----------------------+----------------------+
                                        |                                             |
                                        v                                             v
                          +----------------------------+                +----------------------------+
                          | Cosmos DB: Passwords       |                | Cosmos DB: Accounts        |
                          | PartitionKey: /vaultId     |                | PartitionKey: /id          |
                          | (Tombstones & Entries)     |                | (Users, Auth, Vaults)      |
                          +----------------------------+                +----------------------------+
```

---

## 2. Database Containers (`PasswordVaultDB`)

### 1. `Accounts` Container
- **Partition Key**: `/id`
- **Unique Key**: `/email`
- **Purpose**: Stores user profiles, authentication hashes, zero-knowledge encryption keys/salts, registered devices, and owned `vaultId` associations.

### 2. `Passwords` Container
- **Partition Key**: `/vaultId`
- **Purpose**: Stores password entries, custom fields, revision metadata, and deletion tombstones (`isDeleted`).

---

## 3. Sync Strategy & Conflict Resolution

- **Last-Write-Wins (LWW)**: Each password entry includes an `updatedAt` timestamp (epoch in milliseconds).
- **Tombstones (`isDeleted: true`)**: When an entry is deleted, it is marked with `isDeleted: true` and pushed to the cloud. Other devices downloading the sync payload see the tombstone and remove the item locally without resurrecting it.

---

## 4. Backend Code & File Structure

```text
azure-functions/
├── host.json
├── package.json
└── src/
    └── functions/
        └── sync.js
```

### `package.json`
```json
{
  "name": "azure-sync-function",
  "version": "1.0.0",
  "description": "Password Manager Sync Azure Function",
  "main": "src/functions/sync.js",
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "@azure/storage-blob": "^12.17.0",
    "@azure/cosmos": "^4.0.0"
  }
}
```

---

## 5. API Endpoints and Payloads

### 1. Password Sync
**`POST /api/sync`**
```json
{
  "action": "sync",
  "vaultId": "vlt_personal_123",
  "passwords": [
    {
      "id": "item-1",
      "name": "GitHub",
      "username": "user@example.com",
      "email": "user@example.com",
      "password": "SecretPassword123!",
      "customFields": [],
      "updatedAt": 1725004800000,
      "isDeleted": false
    }
  ],
  "lastSyncedAt": 1725000000000
}
```

### 2. Account Registration / Upsert
**`POST /api/sync`**
```json
{
  "action": "account-register",
  "account": {
    "id": "usr_12345",
    "email": "user@example.com",
    "displayName": "Alex Morgan",
    "vaults": [
      {
        "vaultId": "vlt_personal_123",
        "name": "Personal Vault",
        "role": "owner",
        "createdAt": 1725004800000
      }
    ],
    "devices": []
  }
}
```

---

## 6. Testing with cURL

```bash
# Sync vault passwords
curl -X POST "https://your-app-name.azurewebsites.net/api/sync?code=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync",
    "vaultId": "test-vault",
    "passwords": [
      {
        "id": "test-1",
        "name": "Google",
        "username": "test@gmail.com",
        "email": "test@gmail.com",
        "password": "Password123!",
        "customFields": [],
        "updatedAt": 1725000000000
      }
    ]
  }'
```

## 7. GitHub Actions deployment

The workflow at `.github/workflows/deploy-azure-function.yml` deploys the
`azure-functions` directory whenever changes are pushed to `main`, and can
also be started manually from the Actions tab.

Configure these values in the repository's environment:

- Secret `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`: the Function App's downloaded publish profile XML.
- Secret `COSMOS_DB_CONNECTION_STRING`: the Cosmos DB connection string.
- Secret `AZURE_STORAGE_CONNECTION_STRING`: the storage connection string used by `AzureWebJobsStorage`.
- Variable `AZURE_FUNCTION_APP_NAME`: the Azure Function App name.
- Variable `COSMOS_DB_DATABASE`: usually `PasswordVaultDB`.

The environment variable names and local placeholders are listed as 
`.env.example`.
