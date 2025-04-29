import { SURVEY_ROUTES } from "@/config/routes";
import { ANSWER_ROUTES } from "@/config/routes";
import axios from "axios";

class SurveyService {
  async getAllSurveys(page = 1, limit = 10) {
    try {
      console.log(`Fetching surveys page ${page} limit ${limit}...`);

      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      console.log("User role:", user.role);

      // Construir URL base (sin query params aún)
      const baseUrl = SURVEY_ROUTES.BY_ID(user._id);

      // Añadir parámetros de paginación a la URL
      const url = `${baseUrl}?page=${page}&limit=${limit}`;

      console.log("Fetching from URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Paginated survey response:", data);

      if (data.error) {
        console.error("Error from API:", data.error);
        throw new Error(data.message || "Error fetching paginated surveys");
      }

      // Devolver directamente la data paginada del backend
      // Asegurarse que la estructura coincida con lo esperado por el componente
      return {
        surveys: data.surveys || [], // El array de encuestas de esta página
        totalPages: data.totalPages || 0, // Total de páginas
        currentPage: data.currentPage || 1, // Página actual
      };
    } catch (error) {
      console.error("Error in getAllSurveys (paginated):", error);
      throw error; // Re-lanzar para que el componente lo maneje
    }
  }

  async getSurvey(surveyId) {
    try {
      const token = localStorage.getItem("token");

      // Primero obtenemos los datos de la encuesta
      const surveyResponse = await fetch(SURVEY_ROUTES.GET(surveyId), {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!surveyResponse.ok) {
        const errorData = await surveyResponse.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${surveyResponse.status}`
        );
      }

      const surveyData = await surveyResponse.json();
      console.log("Survey data from backend:", surveyData);

      if (surveyData.error) {
        return Promise.reject(surveyData.validation);
      }

      // Luego obtenemos las respuestas
      const answersResponse = await fetch(SURVEY_ROUTES.ANSWERS(surveyId), {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!answersResponse.ok) {
        const errorData = await answersResponse.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${answersResponse.status}`
        );
      }

      const answersData = await answersResponse.json();

      if (answersData.error) {
        return Promise.reject(answersData.validation);
      }

      // Devolvemos la estructura correcta de la encuesta
      return surveyData;
    } catch (error) {
      console.error("Error in getSurvey:", error);
      throw error;
    }
  }

  async deleteSurvey(surveyId) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }

      const url = SURVEY_ROUTES.DELETE(surveyId);
      console.log("Deleting survey with URL:", url);

      // Validar que el surveyId sea válido
      if (!surveyId) {
        throw new Error("El ID de la encuesta es requerido");
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      console.log("Delete response status:", response.status);

      if (response.status === 401 || response.status === 403) {
        throw new Error("No tienes permisos para eliminar esta encuesta");
      }

      if (response.status === 404) {
        throw new Error("La encuesta no fue encontrada");
      }

      if (response.status === 500) {
        throw new Error(
          "Error interno del servidor. Por favor, intenta más tarde"
        );
      }

      // Si la respuesta no es OK y no fue manejada arriba
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage;

        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage =
            errorData.message || `Error del servidor: ${response.status}`;
        } else {
          const errorText = await response.text();
          console.error("Error response (text):", errorText);
          errorMessage =
            "Error al eliminar la encuesta. Por favor, intenta más tarde";
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Delete response data:", data);

      if (data.error) {
        console.error("API error:", data.error);
        throw new Error(data.error || "Error al eliminar la encuesta");
      }

      return data;
    } catch (error) {
      console.error("Error in deleteSurvey:", error);
      // Propagar el error con un mensaje más amigable
      throw new Error(
        error.message ||
          "No se pudo eliminar la encuesta. Por favor, intenta más tarde"
      );
    }
  }

  async deleteAnswers(surveyId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${ANSWER_ROUTES.DELETE(surveyId)}`, {
        method: "PUT",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      // Check for 404 specifically
      if (response.status === 404) {
        const data = await response.json();
        return {
          noAnswersFound: true,
          message:
            data.message || "No se encontraron respuestas para eliminar.",
        };
      }

      // Handle other non-ok responses
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      // Handle successful deletion (200 OK)
      const data = await response.json();
      return {
        success: true,
        message: data.message || "Respuestas eliminadas con éxito",
        deletedCount: data.deletedCount,
      };
    } catch (error) {
      console.error("Error al borrar respuestas:", error);
      // Re-throw the error or return an error object for the component to handle
      return {
        error: true,
        message: error.message || "Ocurrió un error inesperado.",
      };
    }
  }

  async createOrUpdateSurvey(surveyData, surveyId = null, isDraft = false) {
    try {
      const token = localStorage.getItem("token");
      const isUpdating = !!surveyId;

      // Include the id in the body only when updating
      const requestBody = isUpdating
        ? {
            ...surveyData,
            id: surveyId,
            status: isDraft ? "draft" : "published",
          }
        : { ...surveyData, status: isDraft ? "draft" : "published" };

      // The backend uses PUT to /api/survey for both creating and updating
      const url = SURVEY_ROUTES.BASE;

      // Always use PUT for both creating and updating (based on backend implementation)
      const requestMethod = "PUT";

      console.log(
        `Sending ${requestMethod} request to ${url} with data:`,
        requestBody
      );

      const response = await fetch(url, {
        method: requestMethod,
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
        body: JSON.stringify(requestBody),
      });

      // Check response status first
      console.log("Response status:", response.status);

      if (!response.ok) {
        // Try to get content type
        const contentType = response.headers.get("content-type");

        // If it's JSON, parse it normally
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `Error del servidor: ${response.status}`
          );
        }
        // Otherwise, handle as text (including HTML errors)
        else {
          const errorText = await response.text();
          console.error("Server response (non-JSON):", errorText);
          throw new Error(
            `Error al guardar la encuesta. Código: ${response.status}`
          );
        }
      }

      // Parse successful response
      const data = await response.json();
      console.log("Survey save response:", data);

      if (data.error) {
        throw new Error(data.message || "Error al guardar la encuesta");
      }

      return data;
    } catch (error) {
      console.error("Error in createOrUpdateSurvey:", error);
      throw error;
    }
  }

  async getSurveyWithAnswers(surveyId) {
    console.log(
      `[SurveyService] Fetching survey and answers for ID: ${surveyId}`
    );
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticación no encontrado.");
      }

      // 1. Obtener definición de la encuesta
      console.log(
        `[SurveyService] Fetching survey definition from: ${SURVEY_ROUTES.GET(
          surveyId
        )}`
      );
      const surveyResponse = await fetch(SURVEY_ROUTES.GET(surveyId), {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!surveyResponse.ok) {
        // Si no se encuentra la encuesta, lanzar error específico
        if (surveyResponse.status === 404) {
          throw new Error(`Encuesta no encontrada (ID: ${surveyId})`);
        }
        const errorDataSurvey = await surveyResponse.json().catch(() => ({})); // Intentar parsear JSON, sino objeto vacío
        throw new Error(
          errorDataSurvey.message ||
            `Error al obtener la encuesta: ${surveyResponse.status}`
        );
      }
      const surveyData = await surveyResponse.json();
      console.log("[SurveyService] Survey definition received:", surveyData);
      if (surveyData.error) {
        throw new Error(surveyData.validation || "Error en datos de encuesta");
      }

      // 2. Obtener respuestas de la encuesta
      console.log(
        `[SurveyService] Fetching answers from: ${SURVEY_ROUTES.ANSWERS(
          surveyId
        )}`
      );
      const answersResponse = await fetch(SURVEY_ROUTES.ANSWERS(surveyId), {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      // No lanzamos error si no hay respuestas, simplemente devolvemos array vacío
      let answersData = { answersBySurveyId: [] };
      if (answersResponse.ok) {
        answersData = await answersResponse.json();
        console.log("[SurveyService] Answers received:", answersData);
      } else {
        console.warn(
          `[SurveyService] Could not fetch answers for survey ${surveyId}, status: ${answersResponse.status}. Proceeding without answers.`
        );
      }

      // 3. Combinar y devolver
      const combinedData = {
        // Asegurarnos de devolver la estructura correcta de la encuesta
        survey: {
          ...surveyData.survey,
          // Ensure surveyInfo is preserved correctly
          surveyInfo: {
            ...(surveyData.survey?.surveyInfo || {}),
            quotas: surveyData.survey?.surveyInfo?.quotas || [],
            target: surveyData.survey?.surveyInfo?.target || 0,
          },
        },
        answers: answersData.answersBySurveyId || [],
      };
      console.log("[SurveyService] Combined data:", combinedData);

      // Verificar si la encuesta en sí es null después de extraerla
      if (!combinedData.survey) {
        throw new Error(
          `Definición de encuesta no encontrada o inválida dentro de la respuesta (ID: ${surveyId})`
        );
      }

      return combinedData;
    } catch (error) {
      console.error(
        `[SurveyService] Error in getSurveyWithAnswers for ID ${surveyId}:`,
        error
      );
      // Re-lanzar el error para que el componente lo maneje
      throw error;
    }
  }

  async updateQuotas(surveyId, quotas) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No hay token de autenticación");
        throw new Error("No hay token de autenticación");
      }

      const config = {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      };

      const API_URL = SURVEY_ROUTES.BASE.split("/survey")[0]; // Obtener la URL base

      const response = await axios.put(
        `${API_URL}/update-quotas`,
        { surveyId, quotas },
        config
      );

      return response.data;
    } catch (error) {
      console.error("Error al actualizar cuotas:", error);
      throw error;
    }
  }

  async checkQuotaAvailability(surveyId, formData) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No hay token de autenticación");
        throw new Error("No hay token de autenticación");
      }

      // Primero obtenemos la encuesta con su información de cuotas
      const surveyResponse = await fetch(SURVEY_ROUTES.GET(surveyId), {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!surveyResponse.ok) {
        throw new Error(`Error al obtener encuesta: ${surveyResponse.status}`);
      }

      const surveyData = await surveyResponse.json();
      const survey = surveyData.survey;

      if (
        !survey ||
        !survey.surveyInfo ||
        !survey.surveyInfo.quotas ||
        !survey.surveyInfo.quotas.length
      ) {
        // Si no hay cuotas definidas, consideramos que hay disponibilidad
        return { available: true, segments: [] };
      }

      const quotas = survey.surveyInfo.quotas;

      // Análisis local para verificar disponibilidad
      const segments = [];
      let allAvailable = true;

      quotas.forEach((quota) => {
        const category = quota.category.toLowerCase();

        // Buscar la pregunta correspondiente a esta categoría
        Object.keys(formData).forEach((key) => {
          const keyLower = key.toLowerCase();
          if (
            keyLower.includes(category) ||
            (category === "género" && keyLower.includes("genero")) ||
            (category === "genero" && keyLower.includes("género")) ||
            (category === "educacion" && keyLower.includes("educación")) ||
            (category === "educación" && keyLower.includes("educacion"))
          ) {
            const answer = formData[key];

            // Buscar el segmento correspondiente
            const matchedSegment = quota.segments.find(
              (segment) =>
                segment.name.toLowerCase() === answer.toLowerCase() ||
                answer.toLowerCase().includes(segment.name.toLowerCase())
            );

            if (matchedSegment) {
              const isAvailable =
                matchedSegment.current < matchedSegment.target;

              segments.push({
                category: quota.category,
                segment: matchedSegment.name,
                available: isAvailable,
              });

              if (!isAvailable) {
                allAvailable = false;
              }
            }
          }
        });
      });

      return {
        available: allAvailable,
        segments,
      };
    } catch (error) {
      console.error("Error al verificar cuotas:", error);
      // En caso de error, permitimos continuar para no bloquear el proceso
      return { available: true, segments: [] };
    }
  }

  async getDrafts() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(SURVEY_ROUTES.GET_DRAFTS, {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Draft surveys response:", data);

      if (data.error) {
        return Promise.reject(data.validation);
      }

      // Retornar los borradores
      return { drafts: data.drafts || [] };
    } catch (error) {
      console.error("Error in getDrafts:", error);
      throw error;
    }
  }

  async publishDraft(draftId) {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(SURVEY_ROUTES.PUBLISH_DRAFT(draftId), {
        method: "PUT",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Publish draft response:", data);

      if (data.error) {
        return Promise.reject(data.message || "Error al publicar el borrador");
      }

      return data;
    } catch (error) {
      console.error("Error in publishDraft:", error);
      throw error;
    }
  }
}

export const surveyService = new SurveyService();
