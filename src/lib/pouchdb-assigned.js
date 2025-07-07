let db;

const DB_NAME = "assigned-surveys";

const initDB = async () => {
  if (typeof window === "undefined")
    throw new Error("PouchDB solo está disponible en el cliente.");
  if (!db) {
    const PouchDB =
      (await import("pouchdb")).default || (await import("pouchdb"));
    db = new PouchDB(DB_NAME);
    await db.info();
  }
  return db;
};

export const saveAssignedSurveys = async (surveys) => {
  if (typeof window === "undefined")
    throw new Error("PouchDB solo está disponible en el cliente.");
  const db = await initDB();
  if (!Array.isArray(surveys)) throw new Error("Surveys must be an array");
  const existing = await db.allDocs({ include_docs: true });
  const existingMap = new Map(existing.rows.map((row) => [row.id, row.doc]));
  const docs = surveys.map((survey) => {
    const id = survey._id || survey.surveyId || new Date().toISOString();
    const existingDoc = existingMap.get(id);
    return existingDoc
      ? { ...existingDoc, ...survey, _id: id, _rev: existingDoc._rev }
      : { _id: id, ...survey };
  });
  return db.bulkDocs(docs);
};

export const getAssignedSurveys = async () => {
  if (typeof window === "undefined")
    throw new Error("PouchDB solo está disponible en el cliente.");
  const db = await initDB();
  const result = await db.allDocs({ include_docs: true });
  return result.rows.map((row) => row.doc);
};

export const getAssignedSurveyById = async (surveyId) => {
  if (typeof window === "undefined")
    throw new Error("PouchDB solo está disponible en el cliente.");
  const db = await initDB();
  return db.get(surveyId);
};

export const clearAssignedSurveys = async () => {
  if (typeof window === "undefined")
    throw new Error("PouchDB solo está disponible en el cliente.");
  const db = await initDB();
  const result = await db.allDocs();
  await Promise.all(result.rows.map((row) => db.remove(row.id, row.value.rev)));
};
