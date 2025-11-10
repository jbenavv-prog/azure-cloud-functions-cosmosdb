import { MongoClient, Collection } from "mongodb";

let cachedCol: Collection | null = null;

export async function getCollection(): Promise<Collection> {
  if (cachedCol) return cachedCol;

  const uri = process.env["MONGO_URI"];
  if (!uri) throw new Error("Missing MONGO_URI");

  const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
  await client.connect();

  const dbName = process.env["DB_NAME"]!;
  const collName = process.env["COLLECTION_NAME"]!;
  const col = client.db(dbName).collection(collName);

  const secondary = (process.env["SECONDARY_UNIQUE_FIELD"] || "").trim();
  if (secondary) col.createIndex({ [secondary]: 1 }, { background: true }).catch(() => {});

  cachedCol = col;
  return col;
}
