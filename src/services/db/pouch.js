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
  db.info().catch((e) => console.warn("[Pouch] db info error", e));
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
  const results = [];
  for (const doc of docs) {
    try {
      const res = await db.put(doc);
      results.push(res);
    } catch (e) {
      if (e.status === 409) {
        const existing = await db.get(doc._id);
        const res = await db.put({ ...existing, ...doc });
        results.push(res);
      } else {
        console.warn("[Pouch] put error", e);
        results.push({ error: true, e });
      }
    }
  }
  return results;
}

export async function replaceAllSurveys(surveys) {
  const db = getSurveysDB();

  try {
    // 1. Obtener todas las encuestas existentes
    const existing = await db.allDocs({ include_docs: true });
    const indexDocs = existing.rows
      .map((r) => r.doc)
      .filter((d) => typeof d._id === "string" && !d._id.startsWith("survey:"));

    // 3. Eliminar solo documentos de índice (preservar detalles existentes)
    for (const doc of indexDocs) {
      try {
        await db.remove(doc);
      } catch (e) {
        console.warn("[Pouch] remove old doc error", e);
      }
    }

    // 4. Insertar las nuevas encuestas (solo índice)
    const results = [];
    for (const survey of surveys || []) {
      const surveyId = String(survey?._id || survey?.id || "unknown");

      // 4a. Crear documento de índice (sin prefijo, para la lista)
      const indexDoc = sanitizeTopLevel({
        _id: surveyId,
        ...survey,
      });

      try {
        const res = await db.put(indexDoc);
        results.push(res);
      } catch (e) {
        console.warn("[Pouch] put new index doc error", e);
        results.push({ error: true, e });
      }
    }

    return results;
  } catch (e) {
    console.error("[Pouch] replaceAllSurveys failed", e);
    throw e;
  }
}

// Lee todos los documentos de detalle 'survey:*'
export async function getAllDetailsLocal() {
  const db = getSurveysDB();
  const res = await db.allDocs({
    include_docs: true,
    startkey: "survey:",
    endkey: "survey:\ufff0",
  });
  return res.rows.map((r) => r.doc);
}

// Reconstruye documentos de índice a partir de los detalles existentes
export async function reconstructIndexesFromDetails() {
  const db = getSurveysDB();
  const details = await getAllDetailsLocal();
  let created = 0;
  let updated = 0;
  for (const detail of details) {
    try {
      const indexId = String(detail?._id || "").replace(/^survey:/, "");
      if (!indexId) continue;
      const indexDoc = sanitizeTopLevel({
        _id: indexId,
        // Intentar traer título/descripción si existen
        survey: detail?.survey || {},
        // Deducir surveyInfo desde el propio detalle
        surveyInfo:
          detail?.surveyInfo ||
          (detail?.survey && detail.survey.surveyInfo
            ? detail.survey.surveyInfo
            : {}),
      });
      try {
        await db.put(indexDoc);
        created += 1;
      } catch (e) {
        if (e.status === 409) {
          const existing = await db.get(indexDoc._id).catch(() => null);
          await db.put({ ...existing, ...indexDoc });
          updated += 1;
        } else {
          console.warn("[Pouch] reconstruct index put error", e);
        }
      }
    } catch (e) {
      console.warn("[Pouch] reconstruct index error", e);
    }
  }
  return { created, updated, total: details.length };
}

// Variante segura: reemplaza exclusivamente documentos índice
export async function safeReplaceAllSurveys(surveys) {
  const db = getSurveysDB();
  try {
    const existing = await db.allDocs({ include_docs: true });
    const indexDocs = existing.rows
      .map((r) => r.doc)
      .filter((d) => typeof d._id === "string" && !d._id.startsWith("survey:"));
    // Borrar sólo índices
    for (const doc of indexDocs) {
      try {
        await db.remove(doc);
      } catch (e) {
        console.warn("[Pouch] safe remove index error", e);
      }
    }
    // Insertar índices nuevos
    const results = [];
    for (const survey of surveys || []) {
      const surveyId = String(survey?._id || survey?.id || "unknown");
      const indexDoc = sanitizeTopLevel({ _id: surveyId, ...survey });
      try {
        const res = await db.put(indexDoc);
        results.push(res);
      } catch (e) {
        if (e.status === 409) {
          const existingIndex = await db.get(indexDoc._id);
          const res = await db.put({ ...existingIndex, ...indexDoc });
          results.push(res);
        } else {
          console.warn("[Pouch] safe put index error", e);
          results.push({ error: true, e });
        }
      }
    }
    return results;
  } catch (e) {
    console.warn("[Pouch] safeReplaceAllSurveys failed (non-fatal)", e);
    return [];
  }
}

export async function getAllSurveysLocal() {
  const db = getSurveysDB();
  const res = await db.allDocs({ include_docs: true });
  const all = res.rows.map((r) => r.doc);
  // Filtrar: sólo documentos de índice (no los de detalle 'survey:<id>')
  const indexDocs = all.filter(
    (d) => typeof d._id === "string" && !d._id.startsWith("survey:")
  );
  return indexDocs;
}

export async function getSurveyByIdLocal(id) {
  const db = getSurveysDB();
  try {
    const key = `survey:${String(id)}`;
    try {
      const doc = await db.get(key);
      return doc;
    } catch (e1) {
      // Intento sin prefijo por si el ID fue guardado plano
      try {
        const doc = await db.get(String(id));
        return doc;
      } catch (e2) {
        // Búsqueda por rango como último recurso
        const res = await db.allDocs({
          include_docs: true,
          startkey: "survey:",
          endkey: "survey:\ufff0",
        });
        const hit = res.rows
          .map((r) => r.doc)
          .find(
            (d) => d && typeof d._id === "string" && d._id.endsWith(String(id))
          );
        if (hit) return hit;
        console.warn(
          "[Pouch] getSurveyByIdLocal not found",
          id,
          e2?.status || e1?.status
        );
        return null;
      }
    }
  } catch (e) {
    console.warn("[Pouch] getSurveyByIdLocal not found", id, e?.status);
    return null;
  }
}

export async function saveSurveyDetail(id, detail) {
  const db = getSurveysDB();
  const key = `survey:${String(id)}`;
  try {
    const existing = await db.get(key).catch(() => null);
    const merged = existing
      ? { ...existing, survey: detail }
      : { _id: key, survey: detail };
    const res = await db.put(merged);
    return res;
  } catch (e) {
    console.warn("[Pouch] saveSurveyDetail error", e);
    return null;
  }
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
