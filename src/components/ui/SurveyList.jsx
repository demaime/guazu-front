import { useState, useEffect, useRef } from "react";
import {
  ChevronRightCircle,
  ChevronLeftCircle,
  Edit,
  Settings,
  Play,
  ChartBar,
  BarChart3,
  Trash2,
  Users,
  Eye,
  MoveHorizontal,
  Info,
  Calendar,
  Map,
  ClipboardX,
  ChevronDown,
  TestTube2,
  ArrowUp,
  ArrowDown,
  FileText,
  Copy,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useWindowSize } from "@/hooks/useWindowSize";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "./ConfirmModal";
import { surveyService } from "@/services/survey.service";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function SurveyList({
  surveys,
  onDelete,
  onDeleteAnswers,
  role,
  isFinished,
  onSurveyListChange,
}) {
  const router = useRouter();
  const { isMobile } = useWindowSize();
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [expandedActionsId, setExpandedActionsId] = useState(null);
  const [showFinishedAlert, setShowFinishedAlert] = useState(false);
  const [showDeleteAnswersModal, setShowDeleteAnswersModal] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [openDescriptionTooltipId, setOpenDescriptionTooltipId] =
    useState(null);
  const [descriptionTooltipPosition, setDescriptionTooltipPosition] = useState({
    x: 0,
    y: 0,
  });
  const [openActionTooltipId, setOpenActionTooltipId] = useState(null);
  const [actionTooltipPosition, setActionTooltipPosition] = useState({
    x: 0,
    y: 0,
  });
  const [openRemainingTooltipId, setOpenRemainingTooltipId] = useState(null);
  const [remainingTooltipPosition, setRemainingTooltipPosition] = useState({
    x: 0,
    y: 0,
  });
  const tooltipTimeoutRef = useRef(null);
  const [showCloneSuccessModal, setShowCloneSuccessModal] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Estados para tooltips de título (solo desktop)
  const [titleTooltipVisible, setTitleTooltipVisible] = useState(null);
  const [titleTooltipPosition, setTitleTooltipPosition] = useState({
    x: 0,
    y: 0,
  });

  // Estados para feedback visual de botones
  const [buttonLoadingStates, setButtonLoadingStates] = useState({});
  const [buttonClickedStates, setButtonClickedStates] = useState({});

  // Constantes para anchos de columnas
  const COLUMN_WIDTHS = {
    description: "w-16",
    title: "w-2/5",
    remaining: "w-20",
    progress: "w-1/4",
    actions: "w-20",
  };

  // Funciones helper para feedback visual
  const setButtonLoading = (actionKey, isLoading) => {
    setButtonLoadingStates((prev) => ({ ...prev, [actionKey]: isLoading }));
  };

  const setButtonClicked = (actionKey, isClicked) => {
    setButtonClickedStates((prev) => ({ ...prev, [actionKey]: isClicked }));
  };

  const getButtonKey = (action, surveyId) => `${action}-${surveyId}`;

  const showSuccessFeedback = (actionKey) => {
    setButtonClicked(actionKey, true);

    setTimeout(() => {
      setButtonClicked(actionKey, false);
    }, 800); // Increased duration for better visual feedback
  };

  // Función utilitaria para truncar texto
  const truncateText = (text, maxLength = 50) => {
    if (!text || typeof text !== "string") return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  // Manejar tooltip de título
  const handleTitleTooltip = (surveyId, e, show, fullTitle) => {
    if (show && fullTitle && fullTitle.length > 50) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTitleTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setTitleTooltipVisible({ id: surveyId, title: fullTitle });
    } else {
      setTitleTooltipVisible(null);
    }
  };

  // Función para obtener el texto del tooltip
  const getTooltipText = (action, role) => {
    switch (action) {
      case "edit":
        return "Editar";
      case "answer":
        return role === "ROLE_ADMIN" || role === "SUPERVISOR"
          ? "Prueba Local"
          : "Responder";
      case "map":
        return "Ver Mapa";
      case "progress":
        return "Análisis";
      case "pollsters":
        return "Asignar Encuestadores";
      case "clone":
        return "Clonar";
      case "deleteAnswers":
        return "Eliminar Respuestas";
      case "delete":
        return "Eliminar Encuesta";
      default:
        return "";
    }
  };

  // Componente de botón con feedback visual
  const ActionButton = ({
    action,
    surveyData,
    icon: Icon,
    text,
    className = "",
    variant = "mobile",
  }) => {
    const buttonKey = getButtonKey(action, surveyData._id);
    const isLoading = buttonLoadingStates[buttonKey];
    const isClicked = buttonClickedStates[buttonKey];

    // Solo aplicar feedback verde en desktop
    const shouldShowSuccessFeedback = variant === "desktop" && isClicked;

    const baseClasses =
      variant === "mobile"
        ? "mobile-action-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-all duration-200 relative overflow-hidden"
        : "p-2.5 rounded-lg transition-all duration-200 cursor-pointer relative overflow-hidden min-w-[38px] min-h-[38px] flex items-center justify-center";

    const iconSize = variant === "mobile" ? "w-3 h-3" : "w-5 h-5";
    const mobileBackground =
      action === "answer"
        ? role === "ROLE_ADMIN" || role === "SUPERVISOR"
          ? "bg-blue-500/80 hover:bg-blue-500"
          : "bg-white/10 hover:bg-white/20"
        : action === "deleteAnswers" || action === "delete"
        ? "bg-red-500/80 hover:bg-red-500"
        : "bg-white/10 hover:bg-white/20";

    const successClasses = shouldShowSuccessFeedback
      ? "bg-green-500 text-white shadow-lg shadow-green-500/25 ring-2 ring-green-400/50"
      : "";

    const loadingClasses = isLoading
      ? "opacity-80 cursor-wait"
      : "hover:scale-105 active:scale-95 hover:ring-2 hover:ring-primary/40";

    const finalClassName =
      variant === "mobile"
        ? `${baseClasses} ${mobileBackground} text-white ${successClasses} ${loadingClasses} ${className}`
        : `${baseClasses} ${className} ${successClasses} ${loadingClasses}`;

    const button = (
      <motion.button
        onClick={(e) => {
          if (variant === "desktop") {
            e.stopPropagation();
          }
          handleAction(action, surveyData);
        }}
        onMouseEnter={
          variant === "desktop" && !isLoading
            ? (e) => handleActionTooltip(`${action}-${surveyData._id}`, e, true)
            : undefined
        }
        onMouseLeave={
          variant === "desktop" && !isLoading
            ? () => handleActionTooltip(null, null, false)
            : undefined
        }
        className={finalClassName}
        disabled={isLoading}
        whileTap={!isLoading ? { scale: 0.95 } : {}}
        whileHover={!isLoading ? { scale: 1.05 } : {}}
        animate={
          shouldShowSuccessFeedback
            ? {
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0],
                transition: {
                  duration: 0.5,
                  ease: "easeInOut",
                },
              }
            : {}
        }
        data-type="action"
      >
        {/* Ripple effect para el click - solo en desktop */}
        {shouldShowSuccessFeedback && (
          <motion.div
            className="absolute inset-0 bg-green-400 rounded-md"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}

        {/* Pulse effect para loading */}
        {isLoading && (
          <motion.div
            className="absolute inset-0 bg-blue-400/30 rounded-md"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        <div className="relative z-10">
          {isLoading ? (
            <Loader2 className={`${iconSize} animate-spin`} />
          ) : (
            <Icon className={iconSize} />
          )}
        </div>

        {text && variant === "mobile" && (
          <span className={`relative z-10 ${isLoading ? "opacity-70" : ""}`}>
            {isLoading
              ? action === "answer"
                ? "Cargando..."
                : action === "clone"
                ? "Clonando..."
                : "..."
              : text}
          </span>
        )}
      </motion.button>
    );

    return button;
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.15 },
    },
    exit: {
      opacity: 0,
      x: 10,
      transition: { duration: 0.15 },
    },
  };

  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2,
        when: "beforeChildren",
        staggerChildren: 0.03,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.15 },
    },
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest(".action-buttons") &&
        !event.target.closest('button[data-type="action"]')
      ) {
        setExpandedActionsId(null);
        setOpenActionTooltipId(null);
      }
      if (!event.target.closest(".survey-card-mobile")) {
        setExpandedCardId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, [expandedActionsId]);

  const toggleActions = (surveyId) => {
    const newId = expandedActionsId === surveyId ? null : surveyId;
    setExpandedActionsId(newId);
  };

  const handleDescriptionTooltip = (surveyId, e, show) => {
    if (e) {
      const buttonRect = e.currentTarget.getBoundingClientRect();
      setDescriptionTooltipPosition({
        x: buttonRect.right + 10,
        y: buttonRect.top + buttonRect.height / 2,
      });
    }
    setOpenDescriptionTooltipId(show ? surveyId : null);
  };

  const handleActionTooltip = (actionId, e, show) => {
    // Limpiar timeout previo
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    if (show) {
      if (e) {
        const buttonRect = e.currentTarget.getBoundingClientRect();
        setActionTooltipPosition({
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.top - 10,
        });
      }
      // Agregar delay de 500ms para mostrar
      tooltipTimeoutRef.current = setTimeout(() => {
        setOpenActionTooltipId(actionId);
      }, 0);
    } else {
      // Ocultar inmediatamente
      setOpenActionTooltipId(null);
    }
  };

  const handleRemainingTooltip = (surveyId, e, show) => {
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setRemainingTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    }
    setOpenRemainingTooltipId(show ? surveyId : null);
  };

  const toggleCardExpansion = (surveyId, e) => {
    if (e.target.closest(".mobile-action-button")) {
      return;
    }
    setExpandedCardId(expandedCardId === surveyId ? null : surveyId);
  };

  const handleAction = async (action, surveyData) => {
    const surveyId = surveyData._id || surveyData.survey?._id;
    if (!surveyId) {
      console.error("No se encontró el ID de la encuesta:", surveyData);
      return;
    }

    const buttonKey = getButtonKey(action, surveyId);

    // Mostrar loading para acciones que requieren tiempo
    if (action === "answer" || action === "clone") {
      setButtonLoading(buttonKey, true);
    }

    try {
      switch (action) {
        case "edit":
          setButtonClicked(buttonKey, true);
          setTimeout(() => {
            router.push(`/dashboard/encuestas/${surveyId}/editar`);
          }, 150);
          break;
        case "answer":
          if (isFinished) {
            setShowFinishedAlert(true);
            setButtonLoading(buttonKey, false);
          } else {
            // Simular un pequeño delay para mostrar feedback
            await new Promise((resolve) => setTimeout(resolve, 300));
            const isTestMode = role === "ROLE_ADMIN" || role === "SUPERVISOR";
            const url = `/dashboard/encuestas/${surveyId}/responder${
              isTestMode ? "?mode=test" : ""
            }`;
            showSuccessFeedback(buttonKey);
            // Cerrar el menú
            setExpandedActionsId(null);
            // Esperar un momento antes de navegar para que se vea el feedback
            setTimeout(() => {
              router.push(url);
            }, 200);
          }
          break;
        case "quotas":
          setButtonClicked(buttonKey, true);
          setTimeout(() => {
            router.push(`/dashboard/encuestas/${surveyId}/cuotas`);
          }, 150);
          break;
        case "progress":
          setButtonClicked(buttonKey, true);
          setTimeout(() => {
            router.push(`/dashboard/encuestas/${surveyId}/progreso`);
          }, 150);
          break;
        case "pollsters":
          setButtonClicked(buttonKey, true);
          setTimeout(() => {
            router.push(`/dashboard/encuestas/${surveyId}/encuestadores`);
          }, 150);
          break;
        case "map":
          setButtonClicked(buttonKey, true);
          setTimeout(() => {
            router.push(`/dashboard/encuestas/${surveyId}/progreso`);
          }, 150);
          break;
        case "clone":
          const result = await surveyService.cloneSurvey(surveyId);
          if (result && result.success) {
            showSuccessFeedback(buttonKey);
            setShowCloneSuccessModal(true);
            if (onSurveyListChange) {
              onSurveyListChange();
            }
          } else {
            toast.error(result?.message || "Error al clonar la encuesta.");
          }
          break;
        case "delete":
          onDelete(surveyId);
          break;
        case "deleteAnswers":
          setSelectedSurveyId(surveyId);
          setShowDeleteAnswersModal(true);
          break;
        default:
          console.log("Acción no reconocida:", action);
      }
    } catch (error) {
      console.error(`Error en la acción ${action}:`, error);
      toast.error(`Error al ejecutar la acción: ${error.message}`);
    } finally {
      // Limpiar loading state
      if (action === "answer" || action === "clone") {
        setButtonLoading(buttonKey, false);
      }
    }
  };

  const handleConfirmDeleteAnswers = async () => {
    if (selectedSurveyId) {
      try {
        setIsConfirmLoading(true);
        await onDeleteAnswers(selectedSurveyId);
      } finally {
        setIsConfirmLoading(false);
        setShowDeleteAnswersModal(false);
        setSelectedSurveyId(null);
      }
    }
  };

  const handleCloneModalClose = () => {
    setShowCloneSuccessModal(false);
    toast.success("Encuesta clonada con éxito");
  };

  const getLocalizedText = (textObj, defaultText = "Sin definir") => {
    if (!textObj) return defaultText;
    if (typeof textObj === "string") return textObj;
    return textObj.es || textObj.default || defaultText;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("es", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "-";
    }
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    try {
      const end = new Date(endDate);
      const now = new Date();
      // normalizar a medianoche para cálculo de días
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const diff = end.getTime() - startOfToday.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days;
    } catch {
      return null;
    }
  };

  const calculateProgress = (totalAnswers, target) => {
    if (!target || target === 0) return "0%";
    const percentage = (totalAnswers / target) * 100;
    // Cap at 100% for display
    return `${Math.min(Math.round(percentage), 100)}%`;
  };

  const getProgressColor = (completed, target) => {
    if (!target) return "bg-gray-400";
    const percentage = Math.min((completed / target) * 100, 100); // Cap at 100% for color
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // If already sorting by this field, toggle the direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // If sorting by a new field, set it as the sort field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedSurveys = [...surveys].sort((a, b) => {
    if (!sortField) return 0;

    let valueA, valueB;

    switch (sortField) {
      case "title":
        valueA = getLocalizedText(a.survey?.title, "").toLowerCase();
        valueB = getLocalizedText(b.survey?.title, "").toLowerCase();
        break;
      case "start":
        valueA = a.surveyInfo?.startDate || "";
        valueB = b.surveyInfo?.startDate || "";
        break;
      case "end":
        valueA = a.surveyInfo?.endDate || "";
        valueB = b.surveyInfo?.endDate || "";
        break;
      case "progress":
        const progressA = a.totalAnswers / (a.surveyInfo?.target || 1);
        const progressB = b.totalAnswers / (b.surveyInfo?.target || 1);
        valueA = isNaN(progressA) ? 0 : progressA;
        valueB = isNaN(progressB) ? 0 : progressB;
        break;
      default:
        return 0;
    }

    // Compare the values based on sort direction
    if (valueA < valueB) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  const renderMobileView = () => {
    return (
      <div className="space-y-3">
        {sortedSurveys.map((item, index) => {
          const surveyData = item;
          const surveyInfo = item.surveyInfo || {};
          const isExpanded = expandedCardId === surveyData._id;

          return (
            <motion.div
              key={surveyData._id}
              layout
              className={`
                survey-card-mobile rounded-lg shadow-sm overflow-hidden cursor-pointer
                ${
                  index % 2 === 0
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--secondary)]"
                }
              `}
              onClick={(e) => toggleCardExpansion(surveyData._id, e)}
              initial={false}
              animate={{ paddingBottom: isExpanded ? "0.75rem" : "0" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-center p-3 gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white truncate">
                    {getLocalizedText(surveyData.survey?.title) || "Sin título"}
                  </h3>
                </div>
                <div className="flex-shrink-0">
                  <ChevronDown
                    className={`w-5 h-5 text-indigo-100 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-3 text-xs text-indigo-100 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-2 text-xs italic">
                      {getLocalizedText(
                        surveyData.survey?.description,
                        "Sin descripción"
                      ) || "Sin descripción"}
                    </div>

                    <div className="flex items-center gap-1.5 mb-2 text-xs">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="flex-1">
                        Inicio: {formatDate(surveyInfo.startDate)}
                      </span>
                      <span className="flex-1 text-right">
                        Fin: {formatDate(surveyInfo.endDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span>
                        Progreso:{" "}
                        {calculateProgress(
                          item.totalAnswers,
                          surveyInfo.target
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-full ${getProgressColor(
                          item.totalAnswers || 0,
                          surveyInfo.target || 0
                        )}`}
                        style={{
                          width: `${Math.min(
                            ((item.totalAnswers || 0) /
                              (surveyInfo.target || 1)) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>

                    <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        {role === "ROLE_ADMIN" && (
                          <>
                            <ActionButton
                              action="edit"
                              surveyData={surveyData}
                              icon={Edit}
                              text="Editar"
                              variant="mobile"
                            />
                          </>
                        )}

                        {role === "ROLE_ADMIN" || role === "SUPERVISOR" ? (
                          <ActionButton
                            action="answer"
                            surveyData={surveyData}
                            icon={TestTube2}
                            text="Prueba Local"
                            variant="mobile"
                          />
                        ) : (
                          <ActionButton
                            action="answer"
                            surveyData={surveyData}
                            icon={Play}
                            text="Responder"
                            variant="mobile"
                          />
                        )}

                        {/* Solo mostrar mapa para pollsters, admins ya tienen mapa integrado en análisis */}
                        {role !== "ROLE_ADMIN" && role !== "SUPERVISOR" && (
                          <ActionButton
                            action="map"
                            surveyData={surveyData}
                            icon={Map}
                            text="Ver Mapa"
                            variant="mobile"
                          />
                        )}

                        {(role === "ROLE_ADMIN" || role === "SUPERVISOR") && (
                          <>
                            <ActionButton
                              action="progress"
                              surveyData={surveyData}
                              icon={BarChart3}
                              text="Progreso"
                              variant="mobile"
                            />
                          </>
                        )}

                        {role === "SUPERVISOR" && (
                          <ActionButton
                            action="pollsters"
                            surveyData={surveyData}
                            icon={Users}
                            text="Asignar Encuestadores"
                            variant="mobile"
                            className="col-span-2"
                          />
                        )}

                        {role === "ROLE_ADMIN" && (
                          <>
                            <ActionButton
                              action="clone"
                              surveyData={surveyData}
                              icon={Copy}
                              text="Clonar"
                              variant="mobile"
                            />

                            <ActionButton
                              action="deleteAnswers"
                              surveyData={surveyData}
                              icon={ClipboardX}
                              text="Eliminar Respuestas"
                              variant="mobile"
                            />

                            <ActionButton
                              action="delete"
                              surveyData={surveyData}
                              icon={Trash2}
                              text="Eliminar Encuesta"
                              variant="mobile"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        <ConfirmModal
          isOpen={showFinishedAlert}
          onClose={() => setShowFinishedAlert(false)}
          onConfirm={() => setShowFinishedAlert(false)}
          title="Encuesta Finalizada"
          confirmText="Entendido"
          showCancelButton={false}
        >
          <p>
            No se pueden ingresar nuevas respuestas en encuestas finalizadas.
          </p>
        </ConfirmModal>
      </div>
    );
  };

  // Render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;

    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 inline-block ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 inline-block ml-1" />
    );
  };

  return (
    <>
      {isMobile ? (
        renderMobileView()
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-[var(--card-border)]">
            <thead>
              <tr>
                {/* Descripción (icono i) en primera columna */}
                <th
                  key="header-desc"
                  className={`px-3 py-3 text-center text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider ${COLUMN_WIDTHS.description}`}
                  title="Descripción"
                >
                  <div className="flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                </th>
                <th
                  key="header-title"
                  className={`px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer ${COLUMN_WIDTHS.title}`}
                  onClick={() => handleSort("title")}
                >
                  Título {renderSortIndicator("title")}
                </th>
                <th
                  key="header-remaining"
                  className={`px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider ${COLUMN_WIDTHS.remaining}`}
                >
                  Restante
                </th>
                <th
                  key="header-progress"
                  className={`px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer ${COLUMN_WIDTHS.progress}`}
                  onClick={() => handleSort("progress")}
                >
                  Casos Recolectados {renderSortIndicator("progress")}
                </th>
                <th
                  key="header-actions"
                  className={`px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider ${COLUMN_WIDTHS.actions}`}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-[var(--card-border)]">
              {sortedSurveys.map((item, index) => {
                const surveyData = item;
                const surveyInfo = item.surveyInfo || {};
                const daysLeft = getDaysRemaining(surveyInfo.endDate);
                return (
                  <motion.tr
                    key={surveyData._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.18,
                      ease: "easeOut",
                      delay: index * 0.02,
                    }}
                    className="table-row-hover table-row-gradient group hover:cursor-pointer hover:bg-primary/5 transition-colors duration-200"
                  >
                    {/* Descripción (botón ojo) ahora primera celda */}
                    <td
                      className={`px-3 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] text-center ${COLUMN_WIDTHS.description}`}
                    >
                      <div className="flex items-center justify-center">
                        <button
                          onClick={(e) =>
                            toggleCardExpansion(surveyData._id, e)
                          }
                          onMouseEnter={(e) =>
                            handleDescriptionTooltip(surveyData._id, e, true)
                          }
                          onMouseLeave={() =>
                            handleDescriptionTooltip(null, null, false)
                          }
                          className="p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          data-type="description"
                          aria-label="Descripción"
                          title="Descripción"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 text-sm text-[var(--text-primary)] ${COLUMN_WIDTHS.title}`}
                      onMouseEnter={(e) => {
                        const fullTitle =
                          getLocalizedText(surveyData.survey?.title) ||
                          "Sin título";
                        handleTitleTooltip(surveyData._id, e, true, fullTitle);
                      }}
                      onMouseLeave={() => handleTitleTooltip(null, null, false)}
                    >
                      <div className="truncate cursor-pointer">
                        {getLocalizedText(surveyData.survey?.title) ||
                          "Sin título"}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm ${COLUMN_WIDTHS.remaining}`}
                    >
                      <button
                        onMouseEnter={(e) =>
                          handleRemainingTooltip(surveyData._id, e, true)
                        }
                        onMouseLeave={() =>
                          handleRemainingTooltip(null, null, false)
                        }
                        className={`px-2 py-1 rounded-md transition-colors cursor-default ${
                          daysLeft !== null && daysLeft >= 0
                            ? "text-[var(--text-primary)] hover:bg-[var(--hover-bg)] hover:text-primary"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {daysLeft === null
                          ? "Sin fecha"
                          : daysLeft < 0
                          ? "Finalizada"
                          : `${daysLeft} día${daysLeft === 1 ? "" : "s"}`}
                      </button>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] ${COLUMN_WIDTHS.progress}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>
                              {item.totalAnswers || 0} /{" "}
                              {surveyInfo.target || 0}
                            </span>
                            <span className="text-[var(--text-secondary)]">
                              (
                              {calculateProgress(
                                item.totalAnswers,
                                surveyInfo.target
                              )}
                              )
                            </span>
                          </div>
                          <motion.div className="w-24 h-1 bg-[var(--card-border)] rounded-full mt-1 overflow-hidden">
                            <motion.div
                              className={`h-full ${getProgressColor(
                                item.totalAnswers || 0,
                                surveyInfo.target || 0
                              )}`}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(
                                  ((item.totalAnswers || 0) /
                                    (surveyInfo.target || 1)) *
                                    100,
                                  100
                                )}%`,
                              }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                          </motion.div>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] relative ${COLUMN_WIDTHS.actions}`}
                    >
                      <div className="flex items-center justify-end relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActions(surveyData._id);
                          }}
                          aria-expanded={expandedActionsId === surveyData._id}
                          className={`transition-colors cursor-pointer flex items-center justify-center rounded-full p-2.5 ${
                            expandedActionsId === surveyData._id
                              ? "bg-primary text-white shadow-md"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          }`}
                          data-type="action"
                        >
                          {expandedActionsId === surveyData._id ? (
                            <ChevronRightCircle className="w-6 h-6" />
                          ) : (
                            <ChevronLeftCircle className="w-6 h-6" />
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedActionsId === surveyData._id && (
                            <motion.div
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: "auto", opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="absolute right-12 top-1/2 -translate-y-1/2 overflow-hidden z-50"
                            >
                              <div className="flex items-center gap-2 px-2 py-2 rounded-xl shadow-xl action-buttons glass-primary border border-primary/20">
                                {role === "ROLE_ADMIN" && (
                                  <>
                                    <ActionButton
                                      action="edit"
                                      surveyData={surveyData}
                                      icon={Edit}
                                      variant="desktop"
                                      className="text-[var(--text-primary)] bg-white/5"
                                    />
                                  </>
                                )}

                                {role === "ROLE_ADMIN" ||
                                role === "SUPERVISOR" ? (
                                  <ActionButton
                                    action="answer"
                                    surveyData={surveyData}
                                    icon={TestTube2}
                                    variant="desktop"
                                    className="text-blue-500 bg-white/5"
                                  />
                                ) : (
                                  <ActionButton
                                    action="answer"
                                    surveyData={surveyData}
                                    icon={Play}
                                    variant="desktop"
                                    className="text-[var(--text-primary)] bg-white/5"
                                  />
                                )}

                                {/* Solo mostrar mapa para pollsters, admins ya tienen mapa integrado en análisis */}
                                {role !== "ROLE_ADMIN" &&
                                  role !== "SUPERVISOR" && (
                                    <ActionButton
                                      action="map"
                                      surveyData={surveyData}
                                      icon={Map}
                                      variant="desktop"
                                      className="text-[var(--text-primary)] bg-white/5"
                                    />
                                  )}

                                {(role === "ROLE_ADMIN" ||
                                  role === "SUPERVISOR") && (
                                  <>
                                    <ActionButton
                                      action="progress"
                                      surveyData={surveyData}
                                      icon={BarChart3}
                                      variant="desktop"
                                      className="text-[var(--text-primary)] bg-white/5"
                                    />
                                  </>
                                )}

                                {role === "SUPERVISOR" && (
                                  <ActionButton
                                    action="pollsters"
                                    surveyData={surveyData}
                                    icon={Users}
                                    variant="desktop"
                                    className="text-[var(--text-primary)] bg-white/5"
                                  />
                                )}

                                {role === "ROLE_ADMIN" && (
                                  <>
                                    <ActionButton
                                      action="clone"
                                      surveyData={surveyData}
                                      icon={Copy}
                                      variant="desktop"
                                      className="text-[var(--text-primary)] bg-white/5"
                                    />

                                    <ActionButton
                                      action="deleteAnswers"
                                      surveyData={surveyData}
                                      icon={ClipboardX}
                                      variant="desktop"
                                      className="text-red-400 bg-white/5"
                                    />

                                    <ActionButton
                                      action="delete"
                                      surveyData={surveyData}
                                      icon={Trash2}
                                      variant="desktop"
                                      className="text-red-500 bg-white/5"
                                    />
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tooltip para títulos truncados */}
      {titleTooltipVisible && (
        <div
          className="fixed z-[9999] p-3 text-xs rounded-md shadow-lg bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] max-w-sm pointer-events-none"
          style={{
            left: `${titleTooltipPosition.x}px`,
            top: `${titleTooltipPosition.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {titleTooltipVisible.title}
        </div>
      )}

      {openDescriptionTooltipId && (
        <div
          className="fixed z-[9999] p-3 text-xs rounded-md shadow-lg bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] max-w-xs pointer-events-none"
          style={{
            left: `${descriptionTooltipPosition.x}px`,
            top: `${descriptionTooltipPosition.y}px`,
            transform: "translate(0, -50%)",
          }}
        >
          {sortedSurveys.find((s) => s._id === openDescriptionTooltipId)
            ? getLocalizedText(
                sortedSurveys.find((s) => s._id === openDescriptionTooltipId)
                  .survey?.description,
                "Sin descripción"
              )
            : "Sin descripción"}
        </div>
      )}

      {openActionTooltipId && (
        <div
          className="fixed z-[9999] p-3 text-xs rounded-md shadow-lg bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] max-w-xs pointer-events-none"
          style={{
            left: `${actionTooltipPosition.x}px`,
            top: `${actionTooltipPosition.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {openActionTooltipId.includes("edit")
            ? "Editar"
            : openActionTooltipId.includes("answer")
            ? role === "ROLE_ADMIN" || role === "SUPERVISOR"
              ? "Prueba Local"
              : "Responder"
            : openActionTooltipId.includes("map")
            ? "Ver Mapa"
            : openActionTooltipId.includes("progress")
            ? "Análisis"
            : openActionTooltipId.includes("pollsters")
            ? "Asignar Encuestadores"
            : openActionTooltipId.includes("clone")
            ? "Clonar"
            : openActionTooltipId.includes("deleteAnswers")
            ? "Eliminar Respuestas"
            : openActionTooltipId.includes("delete")
            ? "Eliminar Encuesta"
            : ""}
        </div>
      )}

      {openRemainingTooltipId && (
        <div
          className="fixed z-[9999] p-3 text-xs rounded-md shadow-lg bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] max-w-xs pointer-events-none"
          style={{
            left: `${remainingTooltipPosition.x}px`,
            top: `${remainingTooltipPosition.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {(() => {
            const s = sortedSurveys.find(
              (x) => x._id === openRemainingTooltipId
            );
            const start = formatDate(s?.surveyInfo?.startDate);
            const end = formatDate(s?.surveyInfo?.endDate);
            return (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span>Inicio: {start}</span>
                <MoveHorizontal className="w-4 h-4 text-primary" />
                <span>Fin: {end}</span>
              </div>
            );
          })()}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteAnswersModal}
        onClose={() => {
          setShowDeleteAnswersModal(false);
          setSelectedSurveyId(null);
        }}
        onConfirm={handleConfirmDeleteAnswers}
        title="Borrar respuestas"
        confirmText="Borrar respuestas"
        cancelText="Cancelar"
        type="warning"
        isLoading={isConfirmLoading}
      >
        <p>
          ¿Estás seguro que deseas borrar todas las respuestas de esta encuesta?
          Esta acción no se puede deshacer.
        </p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={showCloneSuccessModal}
        onClose={handleCloneModalClose}
        onConfirm={handleCloneModalClose}
        title="Encuesta Clonada"
        confirmText="Entendido"
        showCancelButton={false}
      >
        <p>
          Encuesta clonada con éxito. Por favor, revise la sección de
          Borradores.
        </p>
      </ConfirmModal>
    </>
  );
}
