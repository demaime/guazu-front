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
  Calendar,
  Map,
  ClipboardX,
  ChevronDown,
  TestTube2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useWindowSize } from "@/hooks/useWindowSize";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "./ConfirmModal";

export function SurveyList({
  surveys,
  onDelete,
  onDeleteAnswers,
  role,
  isFinished,
}) {
  const router = useRouter();
  const { isMobile } = useWindowSize();
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [expandedActionsId, setExpandedActionsId] = useState(null);
  const [openTooltipId, setOpenTooltipId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);
  const [showFinishedAlert, setShowFinishedAlert] = useState(false);
  const [showDeleteAnswersModal, setShowDeleteAnswersModal] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

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
        setOpenTooltipId(null);
      }
      if (!event.target.closest(".survey-card-mobile")) {
        setExpandedCardId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedActionsId]);

  const toggleActions = (surveyId) => {
    const newId = expandedActionsId === surveyId ? null : surveyId;
    setExpandedActionsId(newId);
  };

  const handleTooltip = (actionId, e, show) => {
    if (e) {
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const actionButtons = e.currentTarget.closest(".action-buttons");
      if (actionButtons) {
        setTooltipPosition({
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.top - 10,
        });
      }
    }
    setOpenTooltipId(show ? actionId : null);
  };

  const toggleCardExpansion = (surveyId, e) => {
    if (e.target.closest(".mobile-action-button")) {
      return;
    }
    setExpandedCardId(expandedCardId === surveyId ? null : surveyId);
  };

  const handleAction = (action, surveyData) => {
    const surveyId = surveyData._id || surveyData.survey?._id;
    if (!surveyId) {
      console.error("No se encontró el ID de la encuesta:", surveyData);
      return;
    }

    switch (action) {
      case "edit":
        router.push(`/dashboard/encuestas/${surveyId}/editar`);
        break;
      case "answer":
        if (isFinished) {
          setShowFinishedAlert(true);
        } else {
          const isTestMode = role === "ROLE_ADMIN" || role === "SUPERVISOR";
          const url = `/dashboard/encuestas/${surveyId}/responder${
            isTestMode ? "?mode=test" : ""
          }`;
          router.push(url);
        }
        break;
      case "quotas":
        router.push(`/dashboard/encuestas/${surveyId}/cuotas`);
        break;
      case "progress":
        router.push(`/dashboard/encuestas/${surveyId}/progreso`);
        break;
      case "pollsters":
        router.push(`/dashboard/encuestas/${surveyId}/encuestadores`);
        break;
      case "map":
        router.push(`/dashboard/encuestas/${surveyId}/mapa`);
        break;
      case "delete":
        onDelete(surveyId);
        break;
      case "deleteAnswers":
        setSelectedSurveyId(surveyId);
        setShowDeleteAnswersModal(true);
        break;
    }
    setExpandedActionsId(null);
    setOpenTooltipId(null);
  };

  const handleConfirmDeleteAnswers = () => {
    if (selectedSurveyId) {
      onDeleteAnswers(selectedSurveyId);
      setShowDeleteAnswersModal(false);
      setSelectedSurveyId(null);
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

  const calculateProgress = (totalAnswers, target) => {
    if (!target || target === 0) return "0%";
    const progress = (totalAnswers / target) * 100;
    return `${Math.min(100, Math.round(progress))}%`;
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
              <div className="flex justify-between items-center p-3">
                <h3 className="text-base font-semibold text-white mr-2 truncate">
                  {getLocalizedText(surveyData.survey?.title) || "Sin título"}
                </h3>
                <ChevronDown
                  className={`w-5 h-5 text-indigo-100 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
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
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{
                          width: calculateProgress(
                            item.totalAnswers,
                            surveyInfo.target
                          ),
                        }}
                      ></div>
                    </div>

                    <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        {role === "ROLE_ADMIN" && (
                          <>
                            <button
                              onClick={() => handleAction("edit", surveyData)}
                              className="mobile-action-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                            >
                              <Edit className="w-3 h-3" />
                              Editar
                            </button>
                          </>
                        )}

                        {role === "ROLE_ADMIN" || role === "SUPERVISOR" ? (
                          <button
                            onClick={() => handleAction("answer", surveyData)}
                            className="mobile-action-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-blue-500/80 hover:bg-blue-500 text-white rounded-md transition-colors"
                          >
                            <TestTube2 className="w-3 h-3" />
                            Prueba Local
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction("answer", surveyData)}
                            className="mobile-action-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            Responder
                          </button>
                        )}

                        <button
                          onClick={() => handleAction("map", surveyData)}
                          className="mobile-action-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                        >
                          <Map className="w-3 h-3" />
                          Ver Mapa
                        </button>

                        {(role === "ROLE_ADMIN" || role === "SUPERVISOR") && (
                          <>
                            <button
                              onClick={() =>
                                handleAction("progress", surveyData)
                              }
                              className="mobile-action-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                            >
                              <BarChart3 className="w-3 h-3" />
                              Progreso
                            </button>
                          </>
                        )}

                        {role === "SUPERVISOR" && (
                          <button
                            onClick={() =>
                              handleAction("pollsters", surveyData)
                            }
                            className="mobile-action-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors col-span-2"
                          >
                            <Users className="w-3 h-3" />
                            Asignar Encuestadores
                          </button>
                        )}

                        {role === "ROLE_ADMIN" && (
                          <>
                            <button
                              onClick={() =>
                                handleAction("deleteAnswers", surveyData)
                              }
                              className="mobile-action-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-red-500/80 hover:bg-red-500 text-white rounded-md transition-colors"
                            >
                              <ClipboardX className="w-3 h-3" />
                              Eliminar Respuestas
                            </button>
                            <button
                              onClick={() => handleAction("delete", surveyData)}
                              className="mobile-action-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-red-500/80 hover:bg-red-500 text-white rounded-md transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Eliminar Encuesta
                            </button>
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
          message="No se pueden ingresar nuevas respuestas en encuestas finalizadas."
          confirmText="Entendido"
          showCancelButton={false}
        />
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
        <table className="min-w-full divide-y divide-[var(--card-border)]">
          <thead>
            <tr>
              <th
                key="header-num"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                #
              </th>
              <th
                key="header-title"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("title")}
              >
                Título {renderSortIndicator("title")}
              </th>
              <th
                key="header-desc"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Descripción
              </th>
              <th
                key="header-start"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("start")}
              >
                Inicio {renderSortIndicator("start")}
              </th>
              <th
                key="header-end"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("end")}
              >
                Fin {renderSortIndicator("end")}
              </th>
              <th
                key="header-progress"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("progress")}
              >
                Progreso {renderSortIndicator("progress")}
              </th>
              <th
                key="header-actions"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--card-background)] divide-y divide-[var(--card-border)]">
            {sortedSurveys.map((item, index) => {
              const surveyData = item;
              const surveyInfo = item.surveyInfo || {};
              return (
                <motion.tr
                  key={surveyData._id}
                  variants={rowVariants}
                  className="table-row-hover"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    {getLocalizedText(surveyData.survey?.title) || "Sin título"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] relative group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    <div className="flex items-center justify-center relative">
                      <button
                        onClick={(e) => toggleCardExpansion(surveyData._id, e)}
                        className="p-2 rounded-md hover:bg-[var(--hover-bg)] hover:bg-opacity-50 transition-colors"
                        data-type="description"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    {formatDate(surveyInfo.startDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    {formatDate(surveyInfo.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    {calculateProgress(item.totalAnswers, surveyInfo.target)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] relative group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    <div className="flex items-center justify-end relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActions(surveyData._id);
                        }}
                        className="hover:bg-[var(--hover-bg)] transition-colors cursor-pointer flex items-center justify-center text-[var(--text-primary)]"
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
                            className="absolute right-8 top-0 overflow-hidden z-50"
                          >
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md shadow-lg dark:bg-[var(--card-background)] bg-[var(--card-background)] border border-[var(--card-border)] action-buttons">
                              {role === "ROLE_ADMIN" && (
                                <>
                                  <button
                                    data-type="action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAction("edit", surveyData);
                                    }}
                                    onMouseEnter={(e) =>
                                      handleTooltip(
                                        `edit-${surveyData._id}`,
                                        e,
                                        true
                                      )
                                    }
                                    onMouseLeave={() =>
                                      handleTooltip(null, null, false)
                                    }
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)] cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {role === "ROLE_ADMIN" ||
                              role === "SUPERVISOR" ? (
                                <button
                                  data-type="action"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction("answer", surveyData);
                                  }}
                                  onMouseEnter={(e) =>
                                    handleTooltip(
                                      `answer-${surveyData._id}`,
                                      e,
                                      true
                                    )
                                  }
                                  onMouseLeave={() =>
                                    handleTooltip(null, null, false)
                                  }
                                  className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-blue-500 cursor-pointer"
                                >
                                  <TestTube2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  data-type="action"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction("answer", surveyData);
                                  }}
                                  onMouseEnter={(e) =>
                                    handleTooltip(
                                      `answer-${surveyData._id}`,
                                      e,
                                      true
                                    )
                                  }
                                  onMouseLeave={() =>
                                    handleTooltip(null, null, false)
                                  }
                                  className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)] cursor-pointer"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                data-type="action"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/dashboard/encuestas/${surveyData._id}/mapa`
                                  );
                                }}
                                onMouseEnter={(e) =>
                                  handleTooltip(
                                    `map-${surveyData._id}`,
                                    e,
                                    true
                                  )
                                }
                                onMouseLeave={() =>
                                  handleTooltip(null, null, false)
                                }
                                className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)] cursor-pointer"
                              >
                                <Map className="w-4 h-4" />
                              </button>

                              {(role === "ROLE_ADMIN" ||
                                role === "SUPERVISOR") && (
                                <>
                                  <button
                                    data-type="action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAction("progress", surveyData);
                                    }}
                                    onMouseEnter={(e) =>
                                      handleTooltip(
                                        `progress-${surveyData._id}`,
                                        e,
                                        true
                                      )
                                    }
                                    onMouseLeave={() =>
                                      handleTooltip(null, null, false)
                                    }
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)] cursor-pointer"
                                  >
                                    <BarChart3 className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {role === "SUPERVISOR" && (
                                <button
                                  data-type="action"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction("pollsters", surveyData);
                                  }}
                                  onMouseEnter={(e) =>
                                    handleTooltip(
                                      `pollsters-${surveyData._id}`,
                                      e,
                                      true
                                    )
                                  }
                                  onMouseLeave={() =>
                                    handleTooltip(null, null, false)
                                  }
                                  className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)] cursor-pointer"
                                >
                                  <Users className="w-4 h-4" />
                                </button>
                              )}

                              {role === "ROLE_ADMIN" && (
                                <>
                                  <button
                                    data-type="action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAction("deleteAnswers", surveyData);
                                    }}
                                    onMouseEnter={(e) =>
                                      handleTooltip(
                                        `deleteAnswers-${surveyData._id}`,
                                        e,
                                        true
                                      )
                                    }
                                    onMouseLeave={() =>
                                      handleTooltip(null, null, false)
                                    }
                                    className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-red-400 cursor-pointer"
                                  >
                                    <ClipboardX className="w-4 h-4" />
                                  </button>

                                  <button
                                    data-type="action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAction("delete", surveyData);
                                    }}
                                    onMouseEnter={(e) =>
                                      handleTooltip(
                                        `delete-${surveyData._id}`,
                                        e,
                                        true
                                      )
                                    }
                                    onMouseLeave={() =>
                                      handleTooltip(null, null, false)
                                    }
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-red-500 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>

                            {openTooltipId && (
                              <div
                                ref={tooltipRef}
                                className="fixed z-[9999] px-2 py-1 text-xs rounded-md shadow-lg bg-gray-900 text-white dark:bg-[var(--card-background)] dark:text-[var(--text-primary)] dark:border dark:border-[var(--card-border)] whitespace-nowrap pointer-events-none"
                                style={{
                                  left: `${tooltipPosition.x}px`,
                                  top: `${tooltipPosition.y}px`,
                                  transform: "translate(-50%, -100%)",
                                }}
                              >
                                {openTooltipId.includes("edit")
                                  ? "Editar"
                                  : openTooltipId.includes("answer")
                                  ? role === "ROLE_ADMIN" ||
                                    role === "SUPERVISOR"
                                    ? "Prueba Local"
                                    : "Responder"
                                  : openTooltipId.includes("map")
                                  ? "Ver Mapa"
                                  : openTooltipId.includes("progress")
                                  ? "Análisis"
                                  : openTooltipId.includes("pollsters")
                                  ? "Asignar Encuestadores"
                                  : openTooltipId.includes("deleteAnswers")
                                  ? "Eliminar Respuestas"
                                  : openTooltipId.includes("delete")
                                  ? "Eliminar Encuesta"
                                  : ""}
                              </div>
                            )}
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
      )}

      <ConfirmModal
        isOpen={showDeleteAnswersModal}
        onClose={() => {
          setShowDeleteAnswersModal(false);
          setSelectedSurveyId(null);
        }}
        onConfirm={handleConfirmDeleteAnswers}
        title="Borrar respuestas"
        message="¿Estás seguro que deseas borrar todas las respuestas de esta encuesta? Esta acción no se puede deshacer."
        confirmText="Borrar respuestas"
        cancelText="Cancelar"
        type="warning"
      />
    </>
  );
}
