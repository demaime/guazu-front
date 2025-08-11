// Inicialización segura de PouchDB sólo en navegador via npm bundle
let PouchDB = null;
// Import estático compatible con Next para el cliente
// Evitamos reglas eslint que no están configuradas en este proyecto
// y utilizamos import estándar.
import Pouch from "pouchdb-browser";
PouchDB = Pouch;

function ensurePouch() {
  if (!PouchDB) {
    throw new Error("PouchDB no está disponible en el navegador");
  }
  return PouchDB;
}

export function getSurveysDB() {
  const DB = ensurePouch();
  const db = new DB("surveys", { adapter: "idb" });
  db.info()
    .then((i) => console.log("[Pouch] surveys db info", i))
    .catch((e) => console.warn("[Pouch] db info error", e));
  return db;
}

export function getResponsesDB() {
  const DB = ensurePouch();
  return new DB("responses");
}

export function getMetaDB() {
  const DB = ensurePouch();
  return new DB("meta");
}

function sanitizeTopLevel(doc) {
  const allowed = new Set(["_id", "_rev", "_attachments"]);
  const clean = {};
  for (const key of Object.keys(doc || {})) {
    if (key.startsWith("_") && !allowed.has(key)) {
      continue; // eliminar campos tipo __v, _something
    }
    clean[key] = doc[key];
  }
  return clean;
}

export async function upsertSurveys(surveys) {
  const db = getSurveysDB();
  const docs = (surveys || []).map((s) =>
    sanitizeTopLevel({
      _id: `survey:${String(s?._id || s?.id || "unknown")}`,
      ...s,
    })
  );
  console.log("[Pouch] upsertSurveys count=", docs.length);
  const results = await db.bulkDocs(docs, { new_edits: true }).catch((e) => {
    console.error("[Pouch] bulkDocs error", e);
    return [];
  });
  const errs = (results || []).filter((r) => r && r.error);
  if (errs.length) {
    console.warn("[Pouch] bulkDocs had errors:", errs.slice(0, 3));
  }
  return results;
}

export async function getAllSurveysLocal() {
  const db = getSurveysDB();
  const res = await db.allDocs({ include_docs: true });
  console.log("[Pouch] getAllSurveysLocal rows=", res.rows.length);
  return res.rows.map((r) => r.doc);
}

export async function setLastSync(timestamp) {
  const db = getMetaDB();
  try {
    const doc = await db.get("lastSync");
    return await db.put({ ...doc, value: timestamp });
  } catch {
    return await db.put({ _id: "lastSync", value: timestamp });
  }
}

export async function getLastSync() {
  const db = getMetaDB();
  try {
    const doc = await db.get("lastSync");
    return doc.value;
  } catch {
    return null;
  }
}
