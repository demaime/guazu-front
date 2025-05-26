import PouchDB from "pouchdb";

// Nombre de la base de datos local para las encuestas pendientes
const DB_NAME = "pending-surveys";
let db;

/**
 * Inicializa la instancia de PouchDB.
 * Es importante llamar a esta función antes de usar las demás funciones del módulo.
 */
const initDB = () => {
  if (!db) {
    try {
      db = new PouchDB(DB_NAME);
      console.log(`Base de datos PouchDB '${DB_NAME}' inicializada.`);

      // Verificar que la BD funciona con una operación básica
      return db
        .info()
        .then((info) => {
          console.log(
            `PouchDB info: db tiene ${info.doc_count} documentos, ${info.update_seq} secuencia.`
          );
          return db;
        })
        .catch((error) => {
          console.error("Error verificando la base de datos PouchDB:", error);
          throw error;
        });
    } catch (error) {
      console.error("Error crítico inicializando PouchDB:", error);
      throw error;
    }
  }
  return Promise.resolve(db);
};

// Asegurarse de que la BD se inicialice al cargar el módulo (en el cliente/worker)
if (typeof window !== "undefined" || typeof self !== "undefined") {
  initDB().catch((err) => {
    console.error("Fallo en inicialización automática de PouchDB:", err);
  });
}

/**
 * Guarda una encuesta en la base de datos local.
 * @param {object} surveyData - Los datos de la encuesta a guardar.
 * @returns {Promise<PouchDB.Core.Response>} - Promesa con la respuesta de PouchDB.
 */
export const saveSurveyOffline = async (surveyData) => {
  console.log("[PouchDB] Attempting to save survey offline:", surveyData);
  if (!db) {
    console.error(
      "[PouchDB] PouchDB no ha sido inicializada antes de saveSurveyOffline."
    );
    try {
      await initDB();
    } catch (initError) {
      console.error(
        "[PouchDB] Error inicializando PouchDB en saveSurveyOffline:",
        initError
      );
      throw new Error(`PouchDB init error: ${initError.message}`);
    }
  }

  // Validar que surveyData sea un objeto válido
  if (!surveyData || typeof surveyData !== "object") {
    const error = new Error("Invalid survey data: must be an object");
    console.error("[PouchDB] Error: Invalid survey data format:", surveyData);
    throw error;
  }

  const docToSave = {
    _id: surveyData._id || surveyData.surveyId || new Date().toISOString(), // Usar surveyId si existe también
    ...surveyData,
    offline: true,
    submitted: false,
  };
  console.log("[PouchDB] Document to be saved:", docToSave);
  try {
    const response = await db.put(docToSave);
    console.log("[PouchDB] Survey successfully saved offline:", response);
    return response;
  } catch (error) {
    console.error("[PouchDB] Error saving survey offline:", error);
    console.error("[PouchDB] Failed document:", docToSave);
    throw error; // Re-throw the error so the SW can catch it
  }
};

/**
 * Obtiene todas las encuestas pendientes de la base de datos local.
 * @returns {Promise<Array<any>>} - Promesa con un array de documentos de encuestas.
 */
export const getPendingSurveys = async () => {
  if (!db) throw new Error("PouchDB no ha sido inicializada.");
  const result = await db.allDocs({ include_docs: true });
  return result.rows.map((row) => row.doc).filter((doc) => !doc.submitted);
};

/**
 * Obtiene una encuesta específica por su ID.
 * @param {string} surveyId - El ID de la encuesta.
 * @returns {Promise<any>} - Promesa con el documento de la encuesta.
 */
export const getSurveyByIdOffline = async (surveyId) => {
  if (!db) throw new Error("PouchDB no ha sido inicializada.");
  return db.get(surveyId);
};

/**
 * Elimina una encuesta de la base de datos local (generalmente después de sincronizarla con éxito).
 * @param {string} surveyId - El ID de la encuesta a eliminar.
 * @returns {Promise<PouchDB.Core.Response>} - Promesa con la respuesta de PouchDB.
 */
export const deleteSurveyOffline = async (surveyId) => {
  if (!db) throw new Error("PouchDB no ha sido inicializada.");
  const doc = await db.get(surveyId);
  return db.remove(doc);
};

/**
 * Marca una encuesta como enviada (submitted = true).
 * @param {string} surveyId - El ID de la encuesta a actualizar.
 * @returns {Promise<PouchDB.Core.Response>} - Promesa con la respuesta de PouchDB.
 */
export const markSurveyAsSubmitted = async (surveyId) => {
  if (!db) throw new Error("PouchDB no ha sido inicializada.");
  const doc = await db.get(surveyId);
  doc.submitted = true;
  doc.offline = false; // Ya no está solo offline, fue (o está siendo) enviada.
  return db.put(doc);
};

// Exportar la instancia de la DB directamente si se necesita acceso más granular
export { db as pouchInstance, initDB as initializePouchDB };
