import Pouch from "pouchdb-browser";
import { trackEvent } from "@/lib/analytics";

function getOutboxDB() {
  return new Pouch("responses", { adapter: "idb" });
}

export async function queueResponseForSync(doc) {
  const db = getOutboxDB();
  const _id = doc._id || `pending:${Date.now()}`;
  const payload = { _id, status: "pending", ...doc };
  try {
    await db.put(payload);
    try {
      if (doc?.surveyId) {
        trackEvent("offline_saved", { survey_id: doc.surveyId });
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("offline_saved trackEvent failed", e);
      }
    }
  } catch (e) {
    if (e.status === 409) {
      const existing = await db.get(_id);
      await db.put({ ...existing, ...payload });
    } else {
      throw e;
    }
  }
}

export async function getPendingResponses() {
  const db = getOutboxDB();
  const res = await db.allDocs({ include_docs: true });
  return res.rows.map((r) => r.doc).filter((d) => d.status === "pending");
}

export async function markSynced(id) {
  const db = getOutboxDB();
  const doc = await db.get(id);
  await db.put({ ...doc, status: "synced", syncedAt: Date.now() });
}

export async function removeDoc(id) {
  const db = getOutboxDB();
  const doc = await db.get(id);
  await db.remove(doc);
}
