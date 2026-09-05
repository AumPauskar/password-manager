const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const { BlobServiceClient } = require("@azure/storage-blob");

const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING || "";
const blobConnectionString = process.env.AzureWebJobsStorage || "";

const DATABASE_ID = process.env.COSMOS_DB_DATABASE || "PasswordVaultDB";
const PASSWORDS_CONTAINER = "Passwords";
const ACCOUNTS_CONTAINER = "Accounts";
const BLOB_CONTAINER_NAME = "password-vaults";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-functions-key, Authorization, x-requested-with",
  "Content-Type": "application/json",
};

let cosmosDbCache = null;

async function getCosmosContainers() {
  if (cosmosDbCache) return cosmosDbCache;

  const client = new CosmosClient(cosmosConnectionString);
  const { database } = await client.databases.createIfNotExists({ id: DATABASE_ID });

  // Create Accounts Container (Partition Key: /id)
  const { container: accountsContainer } = await database.containers.createIfNotExists({
    id: ACCOUNTS_CONTAINER,
    partitionKey: { paths: ["/id"] },
    uniqueKeyPolicy: {
      uniqueKeys: [{ paths: ["/email"] }],
    },
  });

  // Create Passwords Container (Partition Key: /vaultId)
  const { container: passwordsContainer } = await database.containers.createIfNotExists({
    id: PASSWORDS_CONTAINER,
    partitionKey: { paths: ["/vaultId"] },
  });

  cosmosDbCache = { client, database, accountsContainer, passwordsContainer };
  return cosmosDbCache;
}

/**
 * Merges local and remote entries based on updatedAt timestamp.
 * Handles tombstone deletions (isDeleted).
 */
function mergeEntries(localEntries, remoteEntries) {
  const mergedMap = new Map();

  [...remoteEntries, ...localEntries].forEach((entry) => {
    if (!entry || !entry.id) return;
    const existing = mergedMap.get(entry.id);
    if (!existing) {
      mergedMap.set(entry.id, entry);
    } else {
      const existingTime = existing.updatedAt || 0;
      const entryTime = entry.updatedAt || 0;
      if (entryTime >= existingTime) {
        mergedMap.set(entry.id, entry);
      }
    }
  });

  return Array.from(mergedMap.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );
}

/**
 * Handles Passwords synchronization with Azure Cosmos DB
 */
async function syncWithCosmos(vaultId, localPasswords, localProfiles, context) {
  const { passwordsContainer } = await getCosmosContainers();

  // Query all existing passwords for this vaultId
  const querySpec = {
    query: "SELECT * FROM c WHERE c.vaultId = @vaultId",
    parameters: [{ name: "@vaultId", value: vaultId }],
  };

  const { resources: remoteRecords } = await passwordsContainer.items
    .query(querySpec, { partitionKey: vaultId })
    .fetchAll();

  // Merge entries
  const remotePasswords = remoteRecords.filter((record) => record.recordType !== "profile");
  const remoteProfiles = remoteRecords.filter((record) => record.recordType === "profile");
  const profileRecords = localProfiles.map((profile) => ({
    ...profile, id: `profile:${profile.id}`, profileId: profile.id, passwords: undefined, recordType: "profile",
  }));
  const merged = mergeEntries(localPasswords, remotePasswords);
  const mergedProfileRecords = mergeEntries(profileRecords, remoteProfiles);

  // Bulk upsert changed items to Cosmos DB
  const operations = [...merged, ...mergedProfileRecords].map((entry) => {
    const item = {
      ...entry,
      vaultId,
      updatedAt: entry.updatedAt || Date.now(),
      createdAt: entry.createdAt || entry.updatedAt || Date.now(),
      isDeleted: Boolean(entry.isDeleted),
    };
    return passwordsContainer.items.upsert(item, { partitionKey: vaultId });
  });

  await Promise.all(operations);

  return { passwords: merged, profiles: mergedProfileRecords.map(({ id, profileId, recordType, vaultId: ignored, ...profile }) => ({ ...profile, id: profileId })) };
}

/**
 * Fallback: Handles Passwords synchronization with Azure Blob Storage
 */
async function syncWithBlob(vaultId, localPasswords, localProfiles) {
  if (!blobConnectionString) {
    throw new Error("Neither COSMOS_DB_CONNECTION_STRING nor AzureWebJobsStorage is configured.");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(blobConnectionString);
  const containerClient = blobServiceClient.getContainerClient(BLOB_CONTAINER_NAME);
  await containerClient.createIfNotExists();

  const blobClient = containerClient.getBlockBlobClient(`vault-${vaultId}.json`);

  let remotePasswords = [];
  let remoteProfiles = [];
  if (await blobClient.exists()) {
    const downloadResponse = await blobClient.downloadToBuffer();
    const stored = JSON.parse(downloadResponse.toString());
    remotePasswords = Array.isArray(stored) ? stored : stored.passwords || [];
    remoteProfiles = Array.isArray(stored) ? [] : stored.profiles || [];
  }

  const merged = mergeEntries(localPasswords, remotePasswords);
  const mergedProfiles = mergeEntries(localProfiles, remoteProfiles).map(({ passwords, ...profile }) => profile);

  const content = JSON.stringify({ passwords: merged, profiles: mergedProfiles }, null, 2);
  await blobClient.upload(content, content.length, { overwrite: true });

  return { passwords: merged, profiles: mergedProfiles };
}

/**
 * Handles Accounts Container operations (Registration / Fetch / Update)
 */
async function handleAccountAction(body, context) {
  const { accountsContainer } = await getCosmosContainers();
  const { action, account } = body;

  if (action === "account-register" || action === "account-upsert") {
    if (!account || !account.id || !account.email) {
      throw new Error("Missing required account fields (id, email).");
    }

    const now = Date.now();
    const accountDoc = {
      ...account,
      status: account.status || "active",
      createdAt: account.createdAt || now,
      updatedAt: now,
    };

    const { resource: savedAccount } = await accountsContainer.items.upsert(accountDoc, {
      partitionKey: accountDoc.id,
    });

    return {
      status: 200,
      headers: CORS_HEADERS,
      jsonBody: { success: true, account: savedAccount },
    };
  }

  if (action === "account-get") {
    const accountId = body.accountId;
    if (!accountId) throw new Error("Missing accountId parameter.");

    try {
      const { resource: accountDoc } = await accountsContainer
        .item(accountId, accountId)
        .read();

      return {
        status: 200,
        headers: CORS_HEADERS,
        jsonBody: { success: true, account: accountDoc || null },
      };
    } catch (e) {
      // If document not found (404), return null
      return {
        status: 200,
        headers: CORS_HEADERS,
        jsonBody: { success: true, account: null },
      };
    }
  }

  throw new Error(`Unsupported account action: ${action}`);
}

app.http("sync", {
  methods: ["POST", "GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    context.log("Processing Password Manager Azure Request...");

    // Handle CORS preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return {
        status: 204,
        headers: CORS_HEADERS,
      };
    }

    try {
      const body = (request.method === "POST" ? await request.json() : {}) || {};
      const action = body.action || "sync";

      // Route Account operations
      if (action.startsWith("account-")) {
        if (!cosmosConnectionString) {
          return {
            status: 400,
            headers: CORS_HEADERS,
            jsonBody: {
              success: false,
              error: "Accounts feature requires Azure Cosmos DB (COSMOS_DB_CONNECTION_STRING).",
            },
          };
        }
        return await handleAccountAction(body, context);
      }

      // Default: Synchronize passwords
      const vaultId = body.vaultId || "default";
      const localPasswords = body.passwords || [];
      const localProfiles = body.profiles || [];

      let syncedVault = { passwords: [], profiles: [] };
      let backendUsed = "cosmos";

      if (cosmosConnectionString) {
        syncedVault = await syncWithCosmos(vaultId, localPasswords, localProfiles, context);
      } else {
        backendUsed = "blob";
        syncedVault = await syncWithBlob(vaultId, localPasswords, localProfiles);
      }

      return {
        status: 200,
        headers: CORS_HEADERS,
        jsonBody: {
          success: true,
          backend: backendUsed,
          vaultId,
          passwords: syncedVault.passwords,
          profiles: syncedVault.profiles,
          syncedAt: Date.now(),
        },
      };
    } catch (err) {
      context.error("Request failed:", err);
      return {
        status: 500,
        headers: CORS_HEADERS,
        jsonBody: { success: false, error: err.message },
      };
    }
  },
});
