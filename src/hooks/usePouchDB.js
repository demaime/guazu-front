import { useState, useEffect, useCallback } from "react";
import {
  initializePouchDB,
  saveSurveyOffline,
  getPendingSurveys,
  getSurveyByIdOffline,
  deleteSurveyOffline,
  markSurveyAsSubmitted,
} from "@/lib/pouchdb";
import { toast } from "react-toastify";

// Base de datos separadas para diferentes tipos de datos
const SURVEYS_DB_NAME = "surveys_db";
const RESPONSES_DB_NAME = "responses_db";

let surveysDB = null;
let responsesDB = null;

const initSurveysDB = async () => {
  if (typeof window === "undefined") return null;

  if (!surveysDB) {
    const PouchDB = (await import("pouchdb")).default;
    surveysDB = new PouchDB(SURVEYS_DB_NAME);
  }
  return surveysDB;
};

const initResponsesDB = async () => {
  if (typeof window === "undefined") return null;

  if (!responsesDB) {
    const PouchDB = (await import("pouchdb")).default;
    responsesDB = new PouchDB(RESPONSES_DB_NAME);
  }
  return responsesDB;
};

/**
 * Hook para manejo completo de datos offline con PouchDB
 */
export const usePouchDB = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [offlineSurveys, setOfflineSurveys] = useState([]);
  const [pendingResponses, setPendingResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos offline
  const loadOfflineData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [surveys, responses] = await Promise.all([
        loadOfflineSurveys(),
        getPendingSurveys(),
      ]);
      console.log("Loaded surveys from PouchDB:", surveys);
      setOfflineSurveys(surveys);
      setPendingResponses(responses);
    } catch (err) {
      console.error("Error loading offline data:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Inicializar bases de datos
  useEffect(() => {
    const initDatabases = async () => {
      try {
        await Promise.all([
          initializePouchDB(),
          initSurveysDB(),
          initResponsesDB(),
        ]);
        setIsInitialized(true);
        // Cargar datos después de la inicialización
        await loadOfflineData();
      } catch (err) {
        console.error("Error initializing PouchDB:", err);
        setError(err);
      }
    };

    initDatabases();
  }, [loadOfflineData]);

  // Cargar encuestas guardadas offline
  const loadOfflineSurveys = async () => {
    try {
      const db = await initSurveysDB();
      if (!db) {
        console.log("No database available for offline surveys");
        return [];
      }

      const result = await db.allDocs({ include_docs: true });
      console.log("PouchDB allDocs result:", result);

      const surveys = result.rows.map((row) => row.doc);
      console.log("Mapped offline surveys:", surveys);

      return surveys;
    } catch (err) {
      console.error("Error loading offline surveys:", err);
      return [];
    }
  };

  // Descargar encuesta para uso offline
  const downloadSurveyForOffline = useCallback(
    async (surveyId, surveyData = null) => {
      try {
        setIsLoading(true);

        let survey = surveyData;

        // Si no se proporciona la encuesta, intentar obtenerla del servidor
        if (!survey) {
          const { surveyService } = await import("@/services/survey.service");
          survey = await surveyService.getSurvey(surveyId);
        }

        if (!survey) {
          throw new Error("No se pudo obtener la encuesta");
        }

        const db = await initSurveysDB();
        if (!db) throw new Error("Base de datos no disponible");

        // Guardar encuesta con metadatos offline
        const offlineSurvey = {
          _id: `survey_${surveyId}`,
          surveyId,
          title: survey.survey?.title || survey.title,
          description: survey.survey?.description || survey.description,
          survey: survey.survey || survey,
          surveyInfo: survey.surveyInfo,
          downloadedAt: new Date().toISOString(),
          availableOffline: true,
        };

        await db.put(offlineSurvey);

        // Pre-cachear la ruta de responder
        if (
          "serviceWorker" in navigator &&
          navigator.serviceWorker.controller
        ) {
          navigator.serviceWorker.controller.postMessage({
            type: "PRECACHE_SURVEY_ROUTE",
            surveyId,
          });
        }

        await loadOfflineData();
        toast.success("Encuesta descargada para uso offline");

        return offlineSurvey;
      } catch (err) {
        console.error("Error downloading survey for offline:", err);
        toast.error("Error al descargar encuesta para offline");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [loadOfflineData]
  );

  // Obtener encuesta offline
  const getSurveyOffline = useCallback(async (surveyId) => {
    try {
      const db = await initSurveysDB();
      if (!db) return null;

      const doc = await db.get(`survey_${surveyId}`);
      return doc;
    } catch (err) {
      if (err.name === "not_found") {
        return null;
      }
      console.error("Error getting survey offline:", err);
      throw err;
    }
  }, []);

  // Verificar si encuesta está disponible offline
  const isSurveyAvailableOffline = useCallback(
    async (surveyId) => {
      try {
        const survey = await getSurveyOffline(surveyId);
        return !!survey;
      } catch {
        return false;
      }
    },
    [getSurveyOffline]
  );

  // Guardar respuesta offline
  const saveResponseOffline = useCallback(
    async (surveyId, responses, metadata = {}) => {
      try {
        const db = await initResponsesDB();
        if (!db) throw new Error("Base de datos de respuestas no disponible");

        const responseDoc = {
          _id: `response_${surveyId}_${Date.now()}`,
          surveyId,
          responses,
          timestamp: new Date().toISOString(),
          synced: false,
          ...metadata,
        };

        await db.put(responseDoc);
        await loadOfflineData();

        return responseDoc;
      } catch (err) {
        console.error("Error saving response offline:", err);
        throw err;
      }
    },
    [loadOfflineData]
  );

  // Obtener respuestas pendientes de sincronización
  const getPendingResponsesCount = useCallback(() => {
    return pendingResponses.filter((r) => !r.synced).length;
  }, [pendingResponses]);

  // Eliminar encuesta offline
  const removeSurveyOffline = useCallback(
    async (surveyId) => {
      try {
        const db = await initSurveysDB();
        if (!db) return;

        const doc = await db.get(`survey_${surveyId}`);
        await db.remove(doc);
        await loadOfflineData();
        toast.success("Encuesta eliminada del almacenamiento offline");
      } catch (err) {
        if (err.name !== "not_found") {
          console.error("Error removing survey offline:", err);
          toast.error("Error al eliminar encuesta offline");
        }
      }
    },
    [loadOfflineData]
  );

  // Limpiar datos offline
  const clearOfflineData = useCallback(async () => {
    try {
      const [surveysDb, responsesDb] = await Promise.all([
        initSurveysDB(),
        initResponsesDB(),
      ]);

      if (surveysDb) await surveysDb.destroy();
      if (responsesDb) await responsesDb.destroy();

      // Reinicializar
      surveysDB = null;
      responsesDB = null;

      await Promise.all([initSurveysDB(), initResponsesDB()]);

      await loadOfflineData();
      toast.success("Datos offline limpiados");
    } catch (err) {
      console.error("Error clearing offline data:", err);
      toast.error("Error al limpiar datos offline");
    }
  }, [loadOfflineData]);

  return {
    // Estados
    isInitialized,
    offlineSurveys,
    pendingResponses,
    isLoading,
    error,

    // Funciones de encuestas
    downloadSurveyForOffline,
    getSurveyOffline,
    isSurveyAvailableOffline,
    removeSurveyOffline,

    // Funciones de respuestas
    saveResponseOffline,
    getPendingResponsesCount,

    // Funciones de gestión
    loadOfflineData,
    clearOfflineData,

    // Funciones heredadas de PouchDB original (para compatibilidad)
    saveSurveyOffline,
    getPendingSurveys,
    getSurveyByIdOffline,
    deleteSurveyOffline,
    markSurveyAsSubmitted,
  };
};
