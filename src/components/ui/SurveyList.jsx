import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Edit, Settings, Play, ChartBar, BarChart3, Trash2, Users, Eye, Calendar, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWindowSize } from '@/hooks/useWindowSize';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (descriptionRef.current && !descriptionRef.current.contains(event.target)) {
        if (!event.target.closest('button[data-type="description"]')) {
          setOpenDescriptionId(null);
        }
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        if (!event.target.closest('button[data-type="menu"]')) {
          setOpenMenuId(null);
        }
      }
      if (!event.target.closest(`tr[data-row-id="${expandedActionsId}"]`)) {
        setExpandedActionsId(null);
        setOpenTooltipId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedActionsId]);

  const toggleActions = (surveyId) => {
    setExpandedActionsId(expandedActionsId === surveyId ? null : surveyId);
  };

  const handleTooltip = (actionId, e, show) => {
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({ x: rect.x, y: rect.bottom });
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
    setOpenDescriptionId(openDescriptionId === surveyId ? null : surveyId);
  };

  const handleAction = (action, surveyData) => {
    switch (action) {
      case 'edit':
        router.push(`/dashboard/encuestas/editar/${surveyData._id}`);
        break;
      case 'settings':
        router.push(`/dashboard/encuestas/configuracion/${surveyData._id}`);
        break;
      case 'answer':
        router.push(`/dashboard/encuestas/responder/${surveyData._id}`);
        break;
      case 'quotas':
        router.push(`/dashboard/encuestas/cuotas/${surveyData._id}`);
        break;
      case 'progress':
        router.push(`/dashboard/encuestas/progreso/${surveyData._id}`);
        break;
      case 'pollsters':
        router.push(`/dashboard/encuestas/encuestadores/${surveyData._id}`);
        break;
      case 'delete':
        onDelete(surveyData._id);
        break;
      case 'deleteAnswers':
        onDeleteAnswers(surveyData._id);
        break;
    }
    setOpenMenuId(null);
  };

  // Función auxiliar para obtener el texto localizado
  const getLocalizedText = (textObj, defaultText = 'Sin definir') => {
    if (!textObj) return defaultText;
    return textObj.es || defaultText;
  };

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('es', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '-';
    }
  };

  // Función para calcular el progreso
  const calculateProgress = (totalAnswers, target) => {
    if (!target || target === 0) return '0%';
    const progress = (totalAnswers / target) * 100;
    return `${Math.min(100, Math.round(progress))}%`;
  };

  const renderMobileView = () => {
    return (
      <div className="space-y-3">
        {surveys.map((item, index) => {
          const surveyData = item.survey || {};
          const surveyInfo = item.surveyInfo || {};
          return (
            <div 
              key={item._id} 
              className={`rounded-lg p-3 shadow-sm ${
                index % 2 === 0 
                  ? 'dark:bg-[var(--primary)] bg-[var(--primary-light)]' 
                  : 'dark:bg-[var(--secondary)] bg-[var(--secondary-light)]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {surveyData.title?.es || 'Sin título'}
                </h3>
                <button
                  onClick={(e) => toggleMenu(item._id, e)}
                  className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-all text-[var(--text-primary)]"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-[var(--text-primary)]">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <button
                    onClick={(e) => toggleDescription(item._id, e)}
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
                  <div className="text-xs mb-1">Progreso: {calculateProgress(item.totalAnswers, surveyInfo.target)}</div>
                  <div className={`w-full rounded-full h-1.5 ${
                    index % 2 === 0 ? 'dark:bg-[var(--primary-light)] bg-[var(--primary-dark)]' : 'dark:bg-[var(--secondary-light)] bg-[var(--secondary-dark)]'
                  }`}>
                    <div 
                      className={`h-1.5 rounded-full transition-all ${
                        index % 2 === 0 ? 'dark:bg-[var(--primary)] bg-[var(--primary)]' : 'dark:bg-[var(--secondary)] bg-[var(--secondary)]'
                      }`}
                      style={{ 
                        width: calculateProgress(item.totalAnswers, surveyInfo.target)
                      }}
                    />
                  </div>
                </div>
              </div>

              {openDescriptionId === item._id && (
                <div 
                  ref={descriptionRef}
                  className="mt-3 p-2.5 rounded-md bg-[var(--background)] text-xs text-[var(--text-primary)]"
                >
                  {surveyData.description?.es || 'Sin descripción'}
                </div>
              )}

              {openMenuId === item._id && (
                <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                  <div className="space-y-1.5">
                    {role === 'ROLE_ADMIN' && (
                      <>
                        <button
                          onClick={() => handleAction('edit', item)}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <Edit className="w-3.5 h-3.5 mr-2" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleAction('settings', item)}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <Settings className="w-3.5 h-3.5 mr-2" />
                          Configuración
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleAction('answer', item)}
                      className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                    >
                      <Play className="w-3.5 h-3.5 mr-2" />
                      Responder
                    </button>

                    {(role === 'ROLE_ADMIN' || role === 'SUPERVISOR') && (
                      <>
                        <button
                          onClick={() => handleAction('quotas', item)}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <ChartBar className="w-3.5 h-3.5 mr-2" />
                          Cuotas
                        </button>
                        <button
                          onClick={() => handleAction('progress', item)}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <BarChart3 className="w-3.5 h-3.5 mr-2" />
                          Progreso
                        </button>
                      </>
                    )}

                    {role === 'SUPERVISOR' && (
                      <button
                        onClick={() => handleAction('pollsters', item)}
                        className="flex items-center w-full px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-md"
                      >
                        <Users className="w-3.5 h-3.5 mr-2" />
                        Asignar Encuestadores
                      </button>
                    )}

                    {role === 'ROLE_ADMIN' && (
                      <>
                        <button
                          onClick={() => handleAction('deleteAnswers', item)}
                          className="flex items-center w-full px-3 py-1.5 text-sm text-red-500 hover:bg-[var(--hover-bg)] rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Eliminar Respuestas
                        </button>
                        <button
                          onClick={() => handleAction('delete', item)}
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
      {isMobile ? renderMobileView() : (
        <table className="min-w-full divide-y divide-[var(--card-border)]">
          <thead>
            <tr>
              <th key="header-num" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">#</th>
              <th key="header-title" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Título</th>
              <th key="header-desc" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Descripción</th>
              <th key="header-start" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Inicio</th>
              <th key="header-end" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Fin</th>
              <th key="header-progress" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Progreso</th>
              <th key="header-actions" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--card-background)] divide-y divide-[var(--card-border)]">
            {surveys.map((item, index) => {
              const surveyData = item.survey || {};
              const surveyInfo = item.surveyInfo || {};
              return (
                <tr key={item._id} className="group" data-row-id={item._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    {surveyData.title?.es || 'Sin título'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] relative group-hover:bg-[var(--hover-bg)] group-hover:bg-opacity-100 transition-colors">
                    <div className="flex items-center justify-center relative">
                      <button
                        onClick={(e) => toggleDescription(item._id, e)}
                        className="p-2 rounded-md hover:bg-[var(--hover-bg)] hover:bg-opacity-50 transition-colors"
                        data-type="description"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    
                      {openDescriptionId === item._id && (
                        <div 
                          ref={descriptionRef}
                          className="absolute z-50 w-64 -left-28 bottom-full mb-1 rounded-md shadow-lg dark:bg-[var(--primary-light)] bg-[var(--primary-light)] "
                        >
                          <div className="p-4">
                            <p className="text-sm text-[var(--text-primary)] whitespace-normal">
                              {surveyData.description?.es || 'Sin descripción'}
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
                        onClick={() => toggleActions(item._id)}
                        className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors"
                        data-type="action"
                      >
                        {expandedActionsId === item._id ? (
                          <ChevronLeft className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <AnimatePresence>
                        {expandedActionsId === item._id && (
                          <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 'auto', opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-8 top-0 overflow-hidden"
                          >
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md shadow-lg dark:bg-[var(--card-background)] bg-[var(--card-background)] border border-[var(--card-border)]">
                              {role === 'ROLE_ADMIN' && (
                                <>
                                  <button
                                    data-type="action"
                                    onClick={() => handleAction('edit', item)}
                                    onMouseEnter={(e) => handleTooltip(`edit-${item._id}`, e, true)}
                                    onMouseLeave={() => handleTooltip(null, null, false)}
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)]"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  <button
                                    data-type="action"
                                    onClick={() => handleAction('settings', item)}
                                    onMouseEnter={(e) => handleTooltip(`settings-${item._id}`, e, true)}
                                    onMouseLeave={() => handleTooltip(null, null, false)}
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)]"
                                  >
                                    <Settings className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              <button
                                data-type="action"
                                onClick={() => handleAction('answer', item)}
                                onMouseEnter={(e) => handleTooltip(`answer-${item._id}`, e, true)}
                                onMouseLeave={() => handleTooltip(null, null, false)}
                                className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)]"
                              >
                                <Play className="w-4 h-4" />
                              </button>

                              {(role === 'ROLE_ADMIN' || role === 'SUPERVISOR') && (
                                <>
                                  <button
                                    data-type="action"
                                    onClick={() => handleAction('quotas', item)}
                                    onMouseEnter={(e) => handleTooltip(`quotas-${item._id}`, e, true)}
                                    onMouseLeave={() => handleTooltip(null, null, false)}
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)]"
                                  >
                                    <ChartBar className="w-4 h-4" />
                                  </button>

                                  <button
                                    data-type="action"
                                    onClick={() => handleAction('progress', item)}
                                    onMouseEnter={(e) => handleTooltip(`progress-${item._id}`, e, true)}
                                    onMouseLeave={() => handleTooltip(null, null, false)}
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)]"
                                  >
                                    <BarChart3 className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {role === 'SUPERVISOR' && (
                                <button
                                  data-type="action"
                                  onClick={() => handleAction('pollsters', item)}
                                  onMouseEnter={(e) => handleTooltip(`pollsters-${item._id}`, e, true)}
                                  onMouseLeave={() => handleTooltip(null, null, false)}
                                  className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-primary)]"
                                >
                                  <Users className="w-4 h-4" />
                                </button>
                              )}

                              {role === 'ROLE_ADMIN' && (
                                <>
                                  <button
                                    data-type="action"
                                    onClick={() => handleAction('deleteAnswers', item)}
                                    onMouseEnter={(e) => handleTooltip(`deleteAnswers-${item._id}`, e, true)}
                                    onMouseLeave={() => handleTooltip(null, null, false)}
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    data-type="action"
                                    onClick={() => handleAction('delete', item)}
                                    onMouseEnter={(e) => handleTooltip(`delete-${item._id}`, e, true)}
                                    onMouseLeave={() => handleTooltip(null, null, false)}
                                    className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>

                            {openTooltipId && (
                              <div 
                                ref={tooltipRef}
                                className="absolute z-50 px-2 py-1 text-xs -top-8 rounded-md shadow-lg dark:bg-[var(--primary-dark)] bg-[var(--primary-light)] text-[var(--text-primary)] whitespace-nowrap"
                                style={{ left: tooltipPosition.x }}
                              >
                                {openTooltipId.includes('edit') && 'Editar'}
                                {openTooltipId.includes('settings') && 'Configuración'}
                                {openTooltipId.includes('answer') && 'Responder'}
                                {openTooltipId.includes('quotas') && 'Cuotas'}
                                {openTooltipId.includes('progress') && 'Progreso'}
                                {openTooltipId.includes('pollsters') && 'Asignar Encuestadores'}
                                {openTooltipId.includes('deleteAnswers') && 'Eliminar Respuestas'}
                                {openTooltipId.includes('delete') && 'Eliminar Encuesta'}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
} 