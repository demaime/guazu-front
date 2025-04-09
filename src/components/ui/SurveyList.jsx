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
  MoreVertical,
  Map,
  ClipboardX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useWindowSize } from "@/hooks/useWindowSize";
import { motion, AnimatePresence } from "framer-motion";

export function SurveyList({ surveys, onDelete, onDeleteAnswers, role }) {
  const router = useRouter();
  const { isMobile } = useWindowSize();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openDescriptionId, setOpenDescriptionId] = useState(null);
  const [expandedActionsId, setExpandedActionsId] = useState(null);
  const [openTooltipId, setOpenTooltipId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const descriptionRef = useRef(null);
  const menuRef = useRef(null);
  const tooltipRef = useRef(null);

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
        descriptionRef.current &&
        !descriptionRef.current.contains(event.target)
      ) {
        if (!event.target.closest('button[data-type="description"]')) {
          setOpenDescriptionId(null);
        }
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        if (!event.target.closest('button[data-type="menu"]')) {
          setOpenMenuId(null);
        }
      }
      if (
        !event.target.closest(".action-buttons") &&
        !event.target.closest('button[data-type="action"]')
      ) {
        setExpandedActionsId(null);
        setOpenTooltipId(null);
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

  const toggleMenu = (surveyId, e) => {
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({ x: rect.x, y: rect.bottom });
    }
    setOpenMenuId(openMenuId === surveyId ? null : surveyId);
  };

  const toggleDescription = (surveyId, e) => {
    e.stopPropagation();
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({ x: rect.x, y: rect.bottom });
    }
    const newId = openDescriptionId === surveyId ? null : surveyId;
    setOpenDescriptionId(newId);
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
      case "settings":
        router.push(`/dashboard/encuestas/${surveyId}/configuracion`);
        break;
      case "answer":
        router.push(`/dashboard/encuestas/${surveyId}/responder`);
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
        onDeleteAnswers(surveyId);
        break;
    }
    setExpandedActionsId(null);
    setOpenTooltipId(null);
  };

  const getLocalizedText = (textObj, defaultText = "Sin definir") => {
    if (!textObj) return defaultText;
    if (typeof textObj === "string") return textObj;
    return textObj.es || defaultText;
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

  const renderMobileView = () => {
    return (
      <div className="space-y-3">
        {surveys.map((item, index) => {
          const surveyData = item;
          const surveyInfo = item.surveyInfo || {};
          return (
            <div
              key={surveyData._id}
              className={`rounded-lg p-3 shadow-sm ${
                index % 2 === 0
                  ? "dark:bg-[var(--primary)] bg-[var(--primary-light)]"
                  : "dark:bg-[var(--secondary)] bg-[var(--secondary-light)]"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {getLocalizedText(surveyData.survey?.title) || "Sin título"}
                </h3>
                <button
                  onClick={(e) => toggleMenu(surveyData._id, e)}
                  className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-all text-[var(--text-primary)]"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-[var(--text-primary)]">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <button
                    onClick={(e) => toggleDescription(surveyData._id, e)}
                    className="text-left hover:text-[var(--text-primary)] transition-colors"
                  >
                    Ver descripción
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Inicio: {formatDate(surveyInfo.startDate)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Fin: {formatDate(surveyInfo.endDate)}</span>
                </div>

                <div className="mt-2">
                  <div className="text-xs mb-1">
                    Progreso:{" "}
                    {calculateProgress(item.totalAnswers, surveyInfo.target)}
                  </div>
                  <div
                    className={`w-full rounded-full h-1.5 ${
                      index % 2 === 0
                        ? "dark:bg-[var(--primary-light)] bg-[var(--primary-dark)]"
                        : "dark:bg-[var(--secondary-light)] bg-[var(--secondary-dark)]"
                    }`}
                  >
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        index % 2 === 0
                          ? "dark:bg-[var(--primary)] bg-[var(--primary)]"
                          : "dark:bg-[var(--secondary)] bg-[var(--secondary)]"
                      }`}
                      style={{
                        width: calculateProgress(
                          item.totalAnswers,
                          surveyInfo.target
                        ),
                      }}
                    />
                  </div>
                </div>
              </div>

              {openDescriptionId === surveyData._id && (
                <div
                  ref={descriptionRef}
                  className="mt-3 p-2.5 rounded-md bg-[var(--background)] text-xs text-[var(--text-primary)]"
                >
                  {getLocalizedText(surveyData.survey?.description) ||
                    "Sin descripción"}
                </div>
              )}

              {openMenuId === surveyData._id && (
                <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                  <div className="space-y-1.5">
                    {role === "ROLE_ADMIN" && (
                      <>
                        <button
                          onClick={() => handleAction("edit", surveyData)}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <Edit className="w-3.5 h-3.5 mr-2" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleAction("settings", surveyData)}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <Settings className="w-3.5 h-3.5 mr-2" />
                          Configuración
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleAction("answer", surveyData)}
                      className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                    >
                      <Play className="w-3.5 h-3.5 mr-2" />
                      Responder
                    </button>

                    <button
                      onClick={() => handleAction("map", surveyData)}
                      className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                    >
                      <Map className="w-3.5 h-3.5 mr-2" />
                      Ver Mapa
                    </button>

                    {(role === "ROLE_ADMIN" || role === "SUPERVISOR") && (
                      <>
                        <button
                          onClick={() => handleAction("quotas", surveyData)}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <ChartBar className="w-3.5 h-3.5 mr-2" />
                          Cuotas
                        </button>
                        <button
                          onClick={() => handleAction("progress", surveyData)}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <BarChart3 className="w-3.5 h-3.5 mr-2" />
                          Progreso
                        </button>
                      </>
                    )}

                    {role === "SUPERVISOR" && (
                      <button
                        onClick={() => handleAction("pollsters", surveyData)}
                        className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                      >
                        <Users className="w-3.5 h-3.5 mr-2" />
                        Asignar Encuestadores
                      </button>
                    )}

                    {role === "ROLE_ADMIN" && (
                      <>
                        <button
                          onClick={() =>
                            handleAction("deleteAnswers", surveyData)
                          }
                          className="flex items-center w-full px-3 py-1.5 text-sm text-red-500 hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <ClipboardX className="w-3.5 h-3.5 mr-2" />
                          Eliminar Respuestas
                        </button>
                        <button
                          onClick={() => handleAction("delete", surveyData)}
                          className="flex items-center w-full px-3 py-1.5 text-sm text-red-500 hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Eliminar Encuesta
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
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
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Título
              </th>
              <th
                key="header-desc"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Descripción
              </th>
              <th
                key="header-start"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Inicio
              </th>
              <th
                key="header-end"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Fin
              </th>
              <th
                key="header-progress"
                className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Progreso
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
            {surveys.map((item, index) => {
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
                        onClick={(e) => toggleDescription(surveyData._id, e)}
                        className="p-2 rounded-md hover:bg-[var(--hover-bg)] hover:bg-opacity-50 transition-colors"
                        data-type="description"
                      >
                        <Eye className="w-5 h-5" />
                      </button>

                      {openDescriptionId === surveyData._id && (
                        <div
                          ref={descriptionRef}
                          className="absolute z-50 w-64 -left-28 bottom-full mb-1 rounded-md shadow-lg dark:bg-[var(--primary)] bg-[var(--primary)] border border-[var(--card-border)]"
                        >
                          <div className="p-2">
                            <p className="text-sm text-gray-100 whitespace-normal">
                              {getLocalizedText(
                                surveyData.survey?.description
                              ) || "Sin descripción"}
                            </p>
                          </div>
                        </div>
                      )}
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

                                  <button
                                    data-type="action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAction("settings", surveyData);
                                    }}
                                    onMouseEnter={(e) =>
                                      handleTooltip(
                                        `settings-${surveyData._id}`,
                                        e,
                                        true
                                      )
                                    }
                                    onMouseLeave={() =>
                                      handleTooltip(null, null, false)
                                    }
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)] cursor-pointer"
                                  >
                                    <Settings className="w-4 h-4" />
                                  </button>
                                </>
                              )}

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
                                      handleAction("quotas", surveyData);
                                    }}
                                    onMouseEnter={(e) =>
                                      handleTooltip(
                                        `quotas-${surveyData._id}`,
                                        e,
                                        true
                                      )
                                    }
                                    onMouseLeave={() =>
                                      handleTooltip(null, null, false)
                                    }
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)] cursor-pointer"
                                  >
                                    <ChartBar className="w-4 h-4" />
                                  </button>

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
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--secondary-light)] cursor-pointer"
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
                                  : openTooltipId.includes("settings")
                                  ? "Configuración"
                                  : openTooltipId.includes("answer")
                                  ? "Responder"
                                  : openTooltipId.includes("map")
                                  ? "Ver Mapa"
                                  : openTooltipId.includes("quotas")
                                  ? "Cuotas"
                                  : openTooltipId.includes("progress")
                                  ? "Progreso"
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
    </div>
  );
}
