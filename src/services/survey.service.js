import { SURVEY_ROUTES } from "@/config/routes";

class SurveyService {
  async getAllSurveys() {
    try {
      console.log("Fetching surveys...");

      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      console.log("User role:", user.role);

      // Usamos la misma ruta para todos los roles, el backend se encarga de filtrar
      const url = SURVEY_ROUTES.BY_ID(user._id);

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
      console.log("Survey response:", data);

      if (data.error) {
        console.error("Error from API:", data.error);
        return Promise.reject(data.validation);
      }

      // Para todos los roles, las encuestas vienen en data.survey
      let surveys = data.survey || [];

      // Obtener las respuestas para cada encuesta
      const surveysWithAnswers = await Promise.all(
        surveys.map(async (survey) => {
          try {
            const answersResponse = await fetch(
              SURVEY_ROUTES.ANSWERS(survey._id),
              {
                method: "GET",
                headers: new Headers({
                  "Content-Type": "application/json; charset=utf-8",
                  Authorization: token,
                }),
                credentials: "include",
                mode: "cors",
              }
            );

            if (!answersResponse.ok) {
              console.error(`Error fetching answers for survey ${survey._id}`);
              return survey;
            }

            const answersData = await answersResponse.json();
            const answers = answersData.answersBySurveyId || [];

            return {
              ...survey,
              totalAnswers: answers.length,
              answers: answers,
            };
          } catch (error) {
            console.error(
              `Error fetching answers for survey ${survey._id}:`,
              error
            );
            return survey;
          }
        })
      );

      console.log("Processed surveys:", surveysWithAnswers);
      return { surveys: surveysWithAnswers };
    } catch (error) {
      console.error("Error in getAllSurveys:", error);
      throw error;
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
      return surveyData.survey?.survey || surveyData.survey;
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
      const response = await fetch(`${SURVEY_ROUTES.ANSWERS(surveyId)}`, {
        method: "DELETE",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      const data = await response.json();

      if (data.error) {
        return Promise.reject(data.validation);
      }

      return data;
    } catch (error) {
      console.error("Error in deleteAnswers:", error);
      throw error;
    }
  }

  async createOrUpdateSurvey(surveyData, surveyId = null) {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      // Construir el cuerpo base
      const baseBody = {
        survey: surveyData.survey,
        surveyInfo: {
          ...surveyData.surveyInfo,
          userIds:
            surveyData.participants?.userIds ||
            surveyData.surveyInfo?.userIds ||
            [],
          supervisorsIds:
            surveyData.participants?.supervisorsIds ||
            surveyData.surveyInfo?.supervisorsIds ||
            [],
        },
      };

      // Añadir 'id' solo si surveyId tiene un valor (no es null ni undefined)
      const requestBody = surveyId ? { ...baseBody, id: surveyId } : baseBody;

      const requestUrl = SURVEY_ROUTES.BASE;
      const requestMethod = "PUT";

      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.error) {
        return Promise.reject(data.validation);
      }

      return data;
    } catch (error) {
      console.error("Error in createOrUpdateSurvey:", error);
      throw error;
    }
  }
}

export const surveyService = new SurveyService();
