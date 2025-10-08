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
  Clock,
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
  const [openRemainingTooltipId, setOpenRemainingTooltipId] = useState(null);
  const [remainingTooltipPosition, setRemainingTooltipPosition] = useState({
    x: 0,
    y: 0,
  });
  const tooltipTimeoutRef = useRef(null);

  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Estados para tooltips de título (solo desktop)
  const [titleTooltipVisible, setTitleTooltipVisible] = useState(null);
  const [titleTooltipPosition, setTitleTooltipPosition] = useState({
    x: 0,
    y: 0,
  });

  // Estado para botón loading individual
  const [loadingAction, setLoadingAction] = useState(null);

  // Constantes para anchos de columnas
  const COLUMN_WIDTHS = {
    description: "w-16",
    title: "w-2/5",
    remaining: "w-20",
    progress: "w-1/4",
    actions: "w-20",
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

  // Componente de botón simplificado
  const ActionButton = ({
    action,
    surveyData,
    icon: Icon,
    text,
    className = "",
    variant = "mobile",
  }) => {
    const iconSize = variant === "mobile" ? "w-3 h-3" : "w-4 h-4";

    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAction(action, surveyData);
    };

    if (variant === "mobile") {
      // Nuevo estilo de botón usando solo la paleta del proyecto
      const newMobileBackground =
        action === "answer"
          ? "bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
          : action === "deleteAnswers" || action === "delete"
          ? "bg-red-500 hover:bg-red-600"
          : action === "edit"
          ? "bg-[var(--primary-light)] hover:bg-[var(--primary-dark)]"
          : action === "clone"
          ? "bg-[var(--secondary)] hover:bg-[var(--primary)]"
          : action === "progress"
          ? "bg-[var(--primary-dark)] hover:bg-[var(--primary)]"
          : action === "map"
          ? "bg-[var(--secondary)] hover:bg-[var(--primary)]"
          : action === "pollsters"
          ? "bg-[var(--primary-light)] hover:bg-[var(--primary-dark)]"
          : "bg-[var(--secondary)] hover:bg-[var(--primary)]";

      return (
        <button
          onClick={handleClick}
          className={`mobile-action-button flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all duration-200 relative overflow-hidden ${newMobileBackground} text-white hover:shadow-md hover:-translate-y-0.5 ${className}`}
          data-type="action"
          aria-label={getTooltipText(action, role)}
        >
          <Icon className={`${iconSize} pointer-events-none`} />
          {text && (
            <span className="font-medium pointer-events-none">{text}</span>
          )}
        </button>
      );
    }

    // Desktop circular button - estable y con tooltip CSS (sin estado)
    const getButtonStyles = () => {
      const baseStyles =
        "w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 relative";

      if (action === "edit") {
        return `${baseStyles} bg-[var(--primary-light)] text-white hover:bg-[var(--primary-dark)]`;
      } else if (action === "answer") {
        return `${baseStyles} bg-[var(--primary-light)] text-white hover:bg-[var(--primary-dark)]`;
      } else if (action === "map") {
        return `${baseStyles} bg-[var(--primary-light)] text-white hover:bg-[var(--primary-dark)]`;
      } else if (action === "progress") {
        return `${baseStyles} bg-[var(--primary-light)] text-white hover:bg-[var(--primary-dark)]`;
      } else if (action === "pollsters") {
        return `${baseStyles} bg-[var(--primary-light)] text-white hover:bg-[var(--primary-dark)]`;
      } else if (action === "clone") {
        return `${baseStyles} bg-[var(--primary-light)] text-white hover:bg-[var(--primary-dark)]`;
      } else if (action === "deleteAnswers") {
        return `${baseStyles} bg-red-400/60 text-white hover:bg-red-500/90`;
      } else if (action === "delete") {
        return `${baseStyles} bg-red-400 text-white hover:bg-red-500`;
      } else {
        return `${baseStyles} bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]`;
      }
    };

    const isCurrentLoading = loadingAction === `${action}-${surveyData._id}`;
    const isAnyLoading = loadingAction !== null;
    const isDisabled = isAnyLoading && !isCurrentLoading;

    return (
      <div className={`relative group/btn ${className}`}>
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className={`${getButtonStyles()} ${
            isDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          aria-label={getTooltipText(action, role)}
          type="button"
        >
          {isCurrentLoading ? (
            <Loader2 className={`${iconSize} animate-spin`} />
          ) : (
            <Icon className={iconSize} />
          )}
        </button>
        <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover/btn:opacity-100 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow">
          {getTooltipText(action, role)}
        </span>
      </div>
    );
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
  }, []);

  // Limpiar loading state al desmontar el componente
  useEffect(() => {
    return () => {
      setLoadingAction(null);
    };
  }, []);

  // Eliminado expand/collapse de acciones (fila fija de botones)

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

  // Tooltips de acciones: ahora CSS (group-hover)

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

    const isFinished = surveyData.status === "finished";
    const actionKey = `${action}-${surveyId}`;

    // Mostrar loading en el botón específico
    setLoadingAction(actionKey);

    try {
      switch (action) {
        case "edit":
          router.push(`/dashboard/encuestas/${surveyId}/editar`);
          break;

        case "answer":
          if (isFinished) {
            setShowFinishedAlert(true);
            setLoadingAction(null);
            return;
          }
          const isTestMode = role === "ROLE_ADMIN" || role === "SUPERVISOR";
          // Guardar el surveyId para la pantalla estable de respuesta
          try {
            if (typeof window !== "undefined") {
              const key = "responder:surveyId";
              const value = String(surveyId);
              if (window.sessionStorage)
                window.sessionStorage.setItem(key, value);
              else if (window.localStorage)
                window.localStorage.setItem(key, value);
            }
          } catch {}
          const url = `/dashboard/encuestas/responder${
            isTestMode ? "?mode=test" : ""
          }`;
          router.push(url);
          break;

        case "quotas":
          router.push(`/dashboard/encuestas/${surveyId}/cuotas`);
          break;

        case "progress":
          router.push(`/dashboard/encuestas/${surveyId}/progreso`);
          break;

        case "pollsters":
          // Ruta legacy eliminada. Reservado para ADMIN si en el futuro existe UI.
          router.push(`/dashboard/encuestadores`);
          break;

        case "map":
          router.push(`/dashboard/encuestas/${surveyId}/progreso`);
          break;

        case "clone":
          const result = await surveyService.cloneSurvey(surveyId);
          if (result && result.success) {
            if (onSurveyListChange) {
              onSurveyListChange();
            }
            toast.success(
              "Encuesta clonada exitosamente. Revise la lista de borradores"
            );
          } else {
            toast.error(result?.message || "Error al clonar la encuesta.");
          }
          setLoadingAction(null);
          break;

        case "delete":
          onDelete(surveyId);
          setLoadingAction(null);
          break;

        case "deleteAnswers":
          setSelectedSurveyId(surveyId);
          setShowDeleteAnswersModal(true);
          setLoadingAction(null);
          break;

        default:
          console.log("Acción no reconocida:", action);
          setLoadingAction(null);
      }
    } catch (error) {
      console.error(`Error en la acción ${action}:`, error);
      toast.error(`Error al ejecutar la acción: ${error.message}`);
      setLoadingAction(null);
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
      <div className="space-y-4">
        {sortedSurveys.map((item, index) => {
          const surveyData = item;
          const surveyInfo = item.surveyInfo || {};

          // Determinar color del borde superior basado en el progreso
          const getStatusColor = () => {
            const progressPercentage = Math.min(
              ((item.totalAnswers || 0) / (surveyInfo.target || 1)) * 100,
              100
            );
            if (progressPercentage >= 80)
              return "from-[var(--primary-light)] to-[var(--primary)]";
            if (progressPercentage >= 50)
              return "from-[var(--primary)] to-[var(--primary-dark)]";
            return "from-[var(--secondary)] to-[var(--primary)]";
          };

          return (
            <motion.div
              key={surveyData._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[var(--card-background)] rounded-xl shadow-sm border border-[var(--card-border)] overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Header con borde colorido - similar a PollsterSurvey */}
              <div className={`bg-gradient-to-r ${getStatusColor()} p-2 px-4`}>
                <div className="flex justify-between items-center">
                  <div className="text-white text-xs font-medium">
                    Progreso:{" "}
                    {calculateProgress(item.totalAnswers, surveyInfo.target)}
                  </div>
                  <div className="text-white text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(surveyInfo.endDate)}
                  </div>
                </div>
              </div>

              {/* Contenido del header - título y descripción */}
              <div className="p-4 pb-2">
                <h3 className="text-base font-semibold leading-tight mb-2 text-[var(--text-primary)] line-clamp-2">
                  {getLocalizedText(surveyData.survey?.title) || "Sin título"}
                </h3>
                {getLocalizedText(surveyData.survey?.description) && (
                  <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-3">
                    {getLocalizedText(surveyData.survey?.description)}
                  </p>
                )}
              </div>

              {/* Contenido principal */}
              <div className="px-4 pb-4">
                {/* Información de fechas y progreso */}
                <div className="flex items-center justify-between mb-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(surveyInfo.startDate)}
                  </span>
                  <span>
                    {item.totalAnswers || 0} / {surveyInfo.target || 0}{" "}
                    respuestas
                  </span>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-[var(--card-border)] rounded-full h-2 mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
                      item.totalAnswers || 0,
                      surveyInfo.target || 0
                    )}`}
                    style={{
                      width: `${Math.min(
                        ((item.totalAnswers || 0) / (surveyInfo.target || 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-wrap gap-2">
                  {role === "ROLE_ADMIN" && (
                    <ActionButton
                      action="edit"
                      surveyData={surveyData}
                      icon={Edit}
                      text="Editar"
                      variant="mobile"
                      className="flex-1 min-w-[100px]"
                    />
                  )}

                  {role === "ROLE_ADMIN" || role === "SUPERVISOR" ? (
                    <ActionButton
                      action="answer"
                      surveyData={surveyData}
                      icon={TestTube2}
                      text="Prueba"
                      variant="mobile"
                      className="flex-1 min-w-[90px]"
                    />
                  ) : (
                    <ActionButton
                      action="answer"
                      surveyData={surveyData}
                      icon={Play}
                      text="Responder"
                      variant="mobile"
                      className="flex-1 min-w-[110px]"
                    />
                  )}

                  {/* Solo mostrar mapa para pollsters */}
                  {role !== "ROLE_ADMIN" && role !== "SUPERVISOR" && (
                    <ActionButton
                      action="map"
                      surveyData={surveyData}
                      icon={Map}
                      text="Mapa"
                      variant="mobile"
                      className="flex-1 min-w-[80px]"
                    />
                  )}

                  {(role === "ROLE_ADMIN" || role === "SUPERVISOR") && (
                    <ActionButton
                      action="progress"
                      surveyData={surveyData}
                      icon={BarChart3}
                      text="Progreso"
                      variant="mobile"
                      className="flex-1 min-w-[90px]"
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
                        className="flex-1 min-w-[80px]"
                      />

                      <ActionButton
                        action="deleteAnswers"
                        surveyData={surveyData}
                        icon={ClipboardX}
                        text="Eliminar Respuestas"
                        variant="mobile"
                        className="w-full mt-2"
                      />

                      <ActionButton
                        action="delete"
                        surveyData={surveyData}
                        icon={Trash2}
                        text="Eliminar Encuesta"
                        variant="mobile"
                        className="w-full"
                      />
                    </>
                  )}
                </div>
              </div>
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
        <div>
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
                    className="survey-table-row group transition-all duration-200"
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
                          className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--primary-light)] text-[var(--primary-dark)] hover:bg-[var(--primary-dark)] hover:text-[var(--primary-light)] transition-colors duration-100 cursor-pointer"
                          data-type="description"
                          aria-label="Descripción"
                          title="Descripción"
                        >
                          <Eye className="w-5 h-5 pointer-events-none" />
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
                      <div className="truncate">
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
                      className={`px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] ${COLUMN_WIDTHS.actions}`}
                    >
                      <div className="relative flex items-center justify-end">
                        <div className="group relative">
                          {/* Etiqueta visible por defecto */}
                          <span className="inline-block px-3 py-1 rounded-full bg-[var(--primary-dark)] text-gray-50 text-xs font-medium transition-opacity group-hover:opacity-0 select-none">
                            Ver acciones
                          </span>

                          {/* Contenedor de botones: aparece al hover/focus */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity overflow-visible">
                            {role === "ROLE_ADMIN" && (
                              <ActionButton
                                action="edit"
                                surveyData={surveyData}
                                icon={Edit}
                                variant="desktop"
                              />
                            )}

                            {role === "ROLE_ADMIN" || role === "SUPERVISOR" ? (
                              <ActionButton
                                action="answer"
                                surveyData={surveyData}
                                icon={TestTube2}
                                variant="desktop"
                              />
                            ) : (
                              <ActionButton
                                action="answer"
                                surveyData={surveyData}
                                icon={Play}
                                variant="desktop"
                              />
                            )}

                            {role !== "ROLE_ADMIN" && role !== "SUPERVISOR" && (
                              <ActionButton
                                action="map"
                                surveyData={surveyData}
                                icon={Map}
                                variant="desktop"
                              />
                            )}

                            {(role === "ROLE_ADMIN" ||
                              role === "SUPERVISOR") && (
                              <ActionButton
                                action="progress"
                                surveyData={surveyData}
                                icon={BarChart3}
                                variant="desktop"
                              />
                            )}

                            {role === "ROLE_ADMIN" && (
                              <>
                                <ActionButton
                                  action="clone"
                                  surveyData={surveyData}
                                  icon={Copy}
                                  variant="desktop"
                                />
                                <ActionButton
                                  action="deleteAnswers"
                                  surveyData={surveyData}
                                  icon={ClipboardX}
                                  variant="desktop"
                                />
                                <ActionButton
                                  action="delete"
                                  surveyData={surveyData}
                                  icon={Trash2}
                                  variant="desktop"
                                />
                              </>
                            )}
                          </div>
                        </div>
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

      {/* Tooltips de acciones manejados por CSS en cada botón */}

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
    </>
  );
}
