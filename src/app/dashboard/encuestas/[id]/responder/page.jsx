"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Model, surveyLocalization, StylesManager } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { useTheme } from "@/providers/ThemeProvider";
import { DoubleBorderLight, DoubleBorderDark } from "survey-core/themes";
import { CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { saveSurveyOffline, initializePouchDB } from "@/lib/pouchdb"; // Import PouchDB functions
import { usePouchDB } from "@/hooks/usePouchDB";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

// Import SurveyJS styles
import "survey-core/survey-core.css";
import "survey-core/i18n/spanish";
import "@/styles/survey-styles.css"; // Import our custom survey styles

// Spanish localization configuration
const spanishLocalization = {
  pagePrevText: "Anterior",
  pageNextText: "Siguiente",
  completeText: "Finalizar",
  requiredText: "",
  requiredError: "Este campo es obligatorio.",
  requiredInAllRowsError:
    "Por favor responda las preguntas en todas las filas.",
  emptySurvey: "No hay página visible o pregunta en la encuesta.",
  questionsProgressText: "Respondido {0}/{1} preguntas",
  completingSurvey: "¡Gracias por completar la encuesta!",
  completingSurveyBefore: "Ya has completado esta encuesta anteriormente.",
};

// Configure Spanish locale
surveyLocalization.locales["es"] = spanishLocalization;
surveyLocalization.defaultLocale = "es";

export default function SurveyPage() {
  const router = useRouter();
  const { id } = useParams();
  const { theme } = useTheme();
  const { isOnline, isOffline } = useNetworkStatus();
  const { getSurveyOffline, saveResponseOffline, isSurveyAvailableOffline } =
    usePouchDB();
  const [surveyModel, setSurveyModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const redirectTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const [surveyCompletedSuccessfully, setSurveyCompletedSuccessfully] =
    useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showOfflineSaveMessage, setShowOfflineSaveMessage] = useState(false);
  const [isOfflineForSubmit, setIsOfflineForSubmit] = useState(false);
  const [loadedFromOffline, setLoadedFromOffline] = useState(false);

  useEffect(() => {
    const initDB = async () => {
      try {
        await initializePouchDB();
        console.log("PouchDB initialized from responder page.");
      } catch (error) {
        console.error("Error initializing PouchDB from responder page:", error);
        toast.error("Error al iniciar la base de datos local.");
      }
    };
    initDB();

    const handleOnline = () => setIsOfflineForSubmit(false);
    const handleOffline = () => setIsOfflineForSubmit(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOfflineForSubmit(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Effect to handle redirection when countdown finishes
  useEffect(() => {
    if (surveyCompletedSuccessfully && countdown === 0) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current); // Ensure interval is cleared before navigation
      }
      console.log("Countdown finished, redirecting from useEffect...");

      // Check if offline and redirect appropriately
      if (!navigator.onLine) {
        console.log(
          "Offline detected, redirecting to dashboard/encuestas with offline flag"
        );
        router.push("/dashboard/encuestas?showOffline=true");
      } else {
        console.log("Online, redirecting to dashboard");
        router.push("/dashboard");
      }
    }
  }, [countdown, surveyCompletedSuccessfully, router]);

  // Apply theme when it changes
  useEffect(() => {
    if (surveyModel) {
      if (theme === "dark") {
        surveyModel.applyTheme(DoubleBorderDark);
      } else {
        surveyModel.applyTheme(DoubleBorderLight);
      }
    }
  }, [theme, surveyModel]);

  // Load survey data
  useEffect(() => {
    let modelInstance = null; // To store the model instance for cleanup

    const loadSurvey = async () => {
      try {
        // Check authentication
        const user = authService.getUser();
        if (!user) {
          console.log("No user found, redirecting to login");
          router.replace("/login");
          return;
        }

        console.log("Loading survey with ID:", id);

        // Intentar cargar desde offline primero si está disponible
        let response = null;
        const isAvailableOffline = await isSurveyAvailableOffline(id);

        if (isOffline || isAvailableOffline) {
          try {
            const offlineSurvey = await getSurveyOffline(id);
            if (offlineSurvey) {
              console.log("Survey loaded from offline storage:", offlineSurvey);
              response = offlineSurvey;
              setLoadedFromOffline(true);
              if (isOffline) {
                toast.info("Encuesta cargada desde almacenamiento offline");
              }
            }
          } catch (offlineError) {
            console.warn("Could not load survey from offline:", offlineError);
          }
        }

        // Si no se cargó desde offline y hay conexión, cargar desde servidor
        if (!response && isOnline) {
          try {
            response = await surveyService.getSurvey(id);
            console.log("Survey response from server:", response);
            setLoadedFromOffline(false);
          } catch (networkError) {
            console.error("Network error loading survey:", networkError);
            throw networkError;
          }
        }

        // Si no hay response en este punto, lanzar error
        if (!response) {
          throw new Error(
            "No se pudo cargar la encuesta. Verifique que esté disponible offline o que tenga conexión a internet."
          );
        }

        if (!response?.survey) {
          throw new Error("Survey not found");
        }

        // Get the actual survey data
        const surveyData = response.survey.survey || response.survey;
        console.log("Processing survey data:", surveyData);

        if (!surveyData.pages || !surveyData.pages.length) {
          throw new Error("La encuesta no tiene preguntas configuradas");
        }

        // Check if we have quotas defined in the survey
        const quotas = response.survey.surveyInfo?.quotas || [];

        // Add quota-based questions at the beginning if quotas exist
        if (quotas.length > 0) {
          // Create a new page for quota-based questions
          const quotaPage = {
            name: "quota_page",
            title: "Información del participante",
            description:
              "Por favor, seleccione los datos del participante para comenzar la encuesta",
            elements: [],
          };

          // Create questions for each quota category
          quotas.forEach((quota) => {
            const questionName = `quota_${quota.category
              .toLowerCase()
              .replace(/\s+/g, "_")}`;

            // Create a dropdown question for this quota category
            const quotaQuestion = {
              type: "dropdown",
              name: questionName,
              title: quota.category,
              isRequired: true,
              choicesOrder: "asc",
              placeholder: `Seleccione ${quota.category.toLowerCase()}`,
              choices: quota.segments.map((segment) => ({
                value: segment.name,
                text: segment.name,
              })),
            };

            // Add the question to the quota page
            quotaPage.elements.push(quotaQuestion);
          });

          // Add this page at the beginning of the survey
          surveyData.pages.unshift(quotaPage);
        }

        // Process choices for radio, checkbox, and dropdown questions
        surveyData.pages.forEach((page) => {
          if (!page.elements) return;

          page.elements.forEach((question) => {
            if (
              (question.type === "radiogroup" ||
                question.type === "checkbox" ||
                question.type === "dropdown") &&
              question.choices
            ) {
              question.choices = question.choices
                .map((choice) => {
                  let processedChoice = {};

                  if (typeof choice === "string") {
                    // Si es un string, convertirlo a objeto
                    processedChoice = { value: choice, text: choice };
                  } else if (typeof choice === "object" && choice !== null) {
                    // Si ya es un objeto, copiarlo y procesarlo
                    processedChoice = { ...choice };

                    // Handle choice text in Spanish
                    if (
                      processedChoice.text &&
                      typeof processedChoice.text === "object" &&
                      processedChoice.text.es
                    ) {
                      processedChoice.text = processedChoice.text.es;
                    }

                    // Generate value from text if missing
                    if (
                      typeof processedChoice.value === "undefined" ||
                      processedChoice.value === null ||
                      typeof processedChoice.value === "object" // Tambien chequear si value es objeto
                    ) {
                      if (
                        processedChoice.text &&
                        typeof processedChoice.text === "string"
                      ) {
                        processedChoice.value = processedChoice.text
                          .toLowerCase()
                          .replace(/\s+/g, "_");
                      } else {
                        // Fallback si no hay texto para generar valor (poco probable con objetos)
                        processedChoice.value = String(Math.random());
                      }
                    }
                  } else {
                    // Ignorar si no es string ni objeto (ej. null, undefined)
                    return null; // O manejar como error si prefieres
                  }

                  return processedChoice;
                })
                .filter(Boolean); // Filtrar cualquier null que se haya retornado
            }
          });
        });

        // Create and configure survey model
        const model = new Model(surveyData);
        modelInstance = model; // Store for cleanup

        console.log("Survey model created:", model);
        console.log("Survey pages:", model.pages);

        // Incluir la definición de la encuesta completa para acceder a la numeración
        try {
          // Verificar si tenemos datos de surveyDefinition y questionNumberMap
          if (
            response.survey.surveyDefinition &&
            response.survey.surveyDefinition.questionNumberMap
          ) {
            model.data = {
              surveyDefinition: response.survey.surveyDefinition,
            };
            console.log("Using hierarchical question numbers from definition");
          } else {
            console.log("No hierarchical question numbers found in definition");
            // Crear una estructura básica para evitar errores
            model.data = {
              surveyDefinition: {
                questionNumberMap: {},
              },
            };

            // Crear un mapa básico de numeración
            const elements = surveyData.pages[0]?.elements || [];
            elements.forEach((element, index) => {
              if (model.data.surveyDefinition.questionNumberMap) {
                model.data.surveyDefinition.questionNumberMap[
                  element.name
                ] = `${index + 1}`;
              }
            });
          }
        } catch (err) {
          console.error("Error setting up survey definition data:", err);
          // Fallback
          model.data = { surveyDefinition: { questionNumberMap: {} } };
        }

        // Basic configuration
        model.locale = "es";
        model.showQuestionNumbers = true;
        model.questionTitlePattern = "{no}) {title}"; // Formato para numeración personalizada
        model.showProgressBar = "top";
        model.pageNextText = "Siguiente";
        model.pagePrevText = "Anterior";
        model.completeText = "Finalizar";
        model.showPreviewBeforeComplete = "noPreview";

        // Conservar el orden jerárquico establecido durante la creación
        model.questionsOrder = "initial";

        // Configurar para mostrar una pregunta por página
        model.questionsOnPageMode = "questionPerPage";

        // Evitar que se salten preguntas en una rama jerárquica
        model.onCurrentPageChanging.add(function (sender, options) {
          try {
            if (options.isNextPage) {
              const currentPage = sender.currentPage;
              if (currentPage && currentPage.hasErrors()) {
                options.allowChanging = false;
              }

              // Verificar que todas las preguntas condicionales visibles actuales estén contestadas
              const visibleQuestions = sender.currentPage.questions.filter(
                (q) => q.isVisible
              );
              const allAnswered = visibleQuestions.every(
                (q) =>
                  !q.isRequired ||
                  (q.value !== undefined && q.value !== null && q.value !== "")
              );

              if (!allAnswered) {
                options.allowChanging = false;
              }
            }
          } catch (err) {
            console.error("Error in page changing event:", err);
            // En caso de error, permitir el cambio para evitar bloquear la encuesta
            options.allowChanging = true;
          }
        });

        // Formatear los números de las preguntas para mostrar la jerarquía
        model.onProcessTextValue.add(function (sender, options) {
          try {
            if (options.name === "no" && options.question) {
              const questionId = options.question.name;
              if (
                sender.data &&
                sender.data.surveyDefinition &&
                sender.data.surveyDefinition.questionNumberMap &&
                sender.data.surveyDefinition.questionNumberMap[questionId]
              ) {
                const hierarchicalNumber =
                  sender.data.surveyDefinition.questionNumberMap[questionId];
                if (hierarchicalNumber) {
                  options.value = hierarchicalNumber;
                }
              }
            }
          } catch (err) {
            console.error("Error processing question number:", err);
            // En caso de error, dejar que SurveyJS use su numeración predeterminada
          }
        });

        // Custom progress text
        const updateProgressText = (sender) => {
          const currentPageNo = sender.currentPageNo + 1;
          const pageCount = sender.pageCount;
          const progressTextElement =
            document.querySelector(".sv-progress__text");
          if (progressTextElement) {
            progressTextElement.textContent = `Pregunta ${currentPageNo} de ${pageCount}`;
          }
        };

        // Initial progress text
        model.onAfterRenderPage.add(updateProgressText);
        // Update progress text when page changes
        model.onCurrentPageChanged.add(updateProgressText);

        // Apply initial theme
        if (theme === "dark") {
          model.applyTheme(DoubleBorderDark);
        } else {
          model.applyTheme(DoubleBorderLight);
        }

        // Configurar el HTML personalizado para la página de finalización
        model.completedHtml = `
        <div style="max-width: 500px; margin: auto; padding: 15px; text-align: center;">
          <h3 style="color: var(--primary); font-size: 28px; font-weight: 700; margin-bottom: 20px;">Procesando...</h3>
        </div>
        `;

        model.showCompletedPage = true;
        model.navigateToUrl = null; // Deshabilitar la navegación automática

        setSurveyModel(model);
      } catch (err) {
        console.error("Error loading survey:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();

    // Cleanup function for useEffect
    return () => {
      if (modelInstance && typeof modelInstance.dispose === "function") {
        console.log("Disposing survey model instance.");
        modelInstance.dispose();
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [id, router, theme]);

  // Handle survey completion
  const handleComplete = async (sender) => {
    setShowOfflineSaveMessage(false);
    setError(null);
    setLoading(true); // Start loading

    try {
      const user = authService.getUser();
      const token = localStorage.getItem("token");

      const transformedAnswers = {};
      const quotaAnswers = {};

      sender.getAllQuestions().forEach((question) => {
        const questionName = question.name;
        const questionText = question.title || question.name; // Use name as fallback for title
        const answer = sender.data[questionName];
        const isQuotaQuestion = questionName.startsWith("quota_");

        if (answer !== undefined) {
          if (isQuotaQuestion) {
            const quotaCategory = questionText;
            quotaAnswers[quotaCategory] = answer;
          }

          if (Array.isArray(answer)) {
            transformedAnswers[questionText] = answer.map((value) => {
              const choice = question.choices?.find((c) => c.value === value);
              return choice?.text || value;
            });
          } else if (typeof answer === "object" && answer !== null) {
            transformedAnswers[questionText] = {};
            Object.entries(answer).forEach(([key, value]) => {
              const row = question.rows?.find((r) => r.value === key);
              const col = question.columns?.find((c) => c.value === value);
              transformedAnswers[questionText][row?.text || key] =
                col?.text || value;
            });
          } else {
            const choice = question.choices?.find((c) => c.value === answer);
            transformedAnswers[questionText] = choice?.text || answer;
          }
        }
      });

      const answerData = {
        surveyId: id,
        _id: `survey_${id}_${user?._id || "anon"}_${new Date().getTime()}`, // More robust unique ID
        fullName: user?.fullName,
        userId: user?._id,
        answer: transformedAnswers,
        quotaAnswers: quotaAnswers,
        createdAt: new Date().toISOString(),
        time: sender.timeSpent,
        authToken: token, // Include token for SW to use during sync
      };

      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          });
          answerData.lat = position.coords.latitude;
          answerData.lng = position.coords.longitude;
        } catch (geoError) {
          console.warn("No se pudo obtener geolocalización:", geoError);
        }
      }

      // --- Intent de Envío de Encuesta ---
      if (isOffline || !navigator.onLine) {
        console.log(
          "Dispositivo offline detectado, guardando respuesta localmente."
        );
        try {
          await saveResponseOffline(id, transformedAnswers, {
            quotaAnswers,
            fullName: user?.fullName,
            userId: user?._id,
            time: sender.timeSpent,
            lat: answerData.lat,
            lng: answerData.lng,
            authToken: token,
          });

          // También guardar en el sistema legacy para compatibilidad con SW
          await saveSurveyOffline(answerData);

          console.log(
            "Respuesta guardada localmente para sync:",
            answerData._id
          );
          setShowOfflineSaveMessage(true);
          setSurveyCompletedSuccessfully(true);
          toast.success(
            "Respuesta guardada localmente. Se enviará cuando recuperes la conexión."
          );

          // Ahora hacemos el fetch para que BackgroundSyncPlugin lo registre
          // El SW no devolverá un JSON con offline:true aquí si BackgroundSyncPlugin lo maneja.
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/insert-answer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token, // Token for the initial attempt if online, SW will use stored one
            },
            body: JSON.stringify(answerData), // Send the full answerData
          })
            .then((response) => {
              if (response.ok) {
                console.log(
                  "CLIENT: Survey submitted successfully online immediately (this pathway might be unexpected if offline was detected)."
                );
              } else {
                console.log(
                  "CLIENT: Initial POST to /api/insert-answer failed with status: ",
                  response.status,
                  ". Background Sync should take over if SW is active and request was eligible."
                );
              }
            })
            .catch((error) => {
              console.warn(
                "CLIENT: Initial POST to /api/insert-answer failed locally (e.g., net::ERR_INTERNET_DISCONNECTED). Error:",
                error.message,
                ". Background Sync should take over if SW is active."
              );
            });

          setSurveyCompletedSuccessfully(true); // Consider it completed from user's perspective
          setLoading(false);
          return;
        } catch (pouchDbError) {
          console.error("Error al guardar en PouchDB:", pouchDbError);
          setError(
            "Error al guardar la encuesta localmente. Intenta de nuevo o contacta a soporte."
          );
          toast.error(
            "Error al guardar la encuesta localmente. Revisa la consola para más detalles."
          );
          setSurveyCompletedSuccessfully(true); // Consider it completed from user's perspective
          setLoading(false);
          return;
        }
      }

      // --- Online Submission ---
      console.log("Dispositivo Online: Intentando envío directo al servidor.");
      let submitEndpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/insert-answer`;
      const response = await fetch(submitEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(answerData), // Send the full answerData
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Error desconocido del servidor." }));
        console.error(
          "Error del servidor al enviar la encuesta:",
          response.status,
          errorData
        );
        // Attempt to save to PouchDB as a fallback if online submission fails
        try {
          console.warn(
            "Online submission failed, attempting to save to PouchDB as fallback."
          );
          await saveSurveyOffline(answerData);
          setShowOfflineSaveMessage(true); // Inform user it's saved locally
          setSurveyCompletedSuccessfully(true); // Consider it completed from user's perspective
          toast.error(
            `El servidor devolvió un error (${response.status}). La encuesta se guardó localmente y se enviará más tarde.`
          );
          setLoading(false);
          return;
        } catch (fallbackSaveError) {
          console.error(
            "Error al guardar en PouchDB como fallback:",
            fallbackSaveError
          );
          setError(
            `Error del servidor: ${
              errorData.message || response.statusText
            }. No se pudo guardar localmente como respaldo.`
          );
          toast.error("Falló el envío y el guardado local de respaldo.");
          setLoading(false);
          return;
        }
      }

      const responseData = await response.json();
      console.log("Encuesta enviada con éxito:", responseData);
      setSurveyCompletedSuccessfully(true);
      toast.success("¡Encuesta enviada con éxito!");
      // Solo ejecutar countdown cuando estamos online y el envío fue exitoso
      if (navigator.onLine) {
        console.log("Online detected, calling startCountdown");
        startCountdown();
      } else {
        console.log("Offline detected, NOT calling startCountdown");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error general en handleComplete:", error);
      setError(
        error.message || "Ocurrió un error inesperado al procesar la encuesta."
      );
      toast.error(error.message || "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  const startCountdown = () => {
    console.log("startCountdown called, setting countdown to 5");
    setCountdown(5);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        console.log("Countdown interval tick, current value:", prev);
        if (prev <= 1) {
          console.log("Countdown reached 0, clearing interval");
          clearInterval(countdownIntervalRef.current);
          return 0; // Solo cambiar el estado a 0, el useEffect se encargará de la navegación
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (surveyCompletedSuccessfully) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-green-50 dark:bg-green-900 p-8 rounded-lg shadow-md max-w-2xl w-full">
          <div className="mb-4 flex justify-center">
            <CheckCircle2
              size={80}
              className="text-green-500 dark:text-green-400"
            />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-green-700 dark:text-green-300">
            ¡Encuesta completada con éxito!
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            {showOfflineSaveMessage
              ? "Intenta conectarte nuevamente para sincronizar tus resultados."
              : "Gracias por tu participación. Tu respuesta ha sido registrada."}
          </p>

          {isOfflineForSubmit || !navigator.onLine ? (
            <>
              <div className="mt-4 bg-yellow-100 p-4 rounded-md border border-yellow-300">
                <p className="text-yellow-800 font-medium">
                  Estás en modo offline
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Tu encuesta se ha guardado localmente y se sincronizará cuando
                  vuelvas a tener conexión.
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Puedes seguir completando otras encuestas en modo offline.
                </p>
              </div>
              <button
                onClick={() =>
                  router.push("/dashboard/encuestas?showOffline=true")
                }
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Volver al inicio
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirigiendo a la página principal en {countdown} segundos...
              </p>
              <button
                onClick={() => {
                  // Check if offline and redirect appropriately
                  if (!navigator.onLine) {
                    console.log(
                      "Manual redirect - Offline detected, redirecting to dashboard/encuestas with offline flag"
                    );
                    router.push("/dashboard/encuestas?showOffline=true");
                  } else {
                    console.log(
                      "Manual redirect - Online, redirecting to dashboard"
                    );
                    router.push("/dashboard");
                  }
                }}
                className="mt-6 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
              >
                Volver ahora
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <LoaderWrapper
        size="lg"
        fullScreen
        text="Cargando encuesta..."
        className="text-primary"
      />
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Volver al panel
        </button>
      </div>
    );
  }

  if (!surveyModel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-700">No hay encuesta disponible</div>
      </div>
    );
  }

  return (
    <>
      {/* Indicador de estado offline */}
      {isOffline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Estás en modo offline. Podrás completar la encuesta y se
                guardará localmente para sincronizar cuando tengas conexión.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de encuesta cargada desde offline */}
      {loadedFromOffline && !isOffline && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Esta encuesta se cargó desde almacenamiento offline. Los datos
                están actualizados desde la última descarga.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="survey-container">
        {surveyModel && (
          <Survey model={surveyModel} onComplete={handleComplete} />
        )}
      </div>
    </>
  );
}
