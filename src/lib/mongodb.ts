import { MongoClient, Db } from 'mongodb';
import dns from 'dns';

// Fix Windows DNS SRV refusal for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // ignore
}

const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kyra_crm';

/**
 * Automatically create empty collections in MongoDB if they do not exist yet.
 * Does NOT insert any user credentials or dummy documents.
 */
async function ensureCollectionsExist(db: Db) {
  try {
    const existingCollections = await db.listCollections().toArray();
    const existingNames = new Set(existingCollections.map((c) => c.name));
    const requiredCollections = [
      'users',
      'leads',
      'bookings',
      'projects',
      'plots',
      'site_visits',
      'webhook_logs',
      'user_logins',
      'audit_logs',
    ];

    for (const name of requiredCollections) {
      if (!existingNames.has(name)) {
        await db.createCollection(name);
      }
    }
  } catch {
    // Non-blocking
  }
}

async function connectToMongo(uri: string): Promise<MongoClient> {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    await ensureCollectionsExist(client.db());
    console.log('✅ DB connected successfully');
    return client;
  } catch (err: any) {
    // Handle Windows DNS local router refusal for mongodb+srv://
    if (
      uri.startsWith('mongodb+srv://') &&
      (err?.message?.includes('querySrv') || err?.code === 'ECONNREFUSED')
    ) {
      console.warn('[MongoDB Client]: Local DNS refused SRV lookup. Resolving seedlist via Google DNS (8.8.8.8)...');
      const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)$/);
      if (match) {
        const [, user, pass, host, dbAndQuery] = match;
        const resolver = new dns.promises.Resolver();
        resolver.setServers(['8.8.8.8', '1.1.1.1']);
        const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
        if (srvRecords && srvRecords.length > 0) {
          const seedList = srvRecords.map((r) => `${r.name}:${r.port}`).join(',');
          const directUri = `mongodb://${user}:${pass}@${seedList}/${dbAndQuery}?ssl=true&authSource=admin`;
          const directClient = new MongoClient(directUri);
          await directClient.connect();
          await ensureCollectionsExist(directClient.db());
          console.log('✅ DB connected successfully');
          return directClient;
        }
      }
    }
    console.error('❌ DB connection error:', err?.message || err);
    throw err;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connectToMongo(rawUri);
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = connectToMongo(rawUri);
}

// Eagerly handle logging when module loads
clientPromise.catch(() => {});

export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db();
}
