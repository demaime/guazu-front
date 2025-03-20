import { useState } from 'react';
import { MoreVertical, Edit, Settings, Play, ChartBar, BarChart3, Trash2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SurveyList({ surveys, onDelete, onDeleteAnswers, role }) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState(null);

  const toggleMenu = (surveyId) => {
    setOpenMenuId(openMenuId === surveyId ? null : surveyId);
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

  return (
    <div className="overflow-x-auto">
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
              <tr key={item._id} className="hover:bg-[var(--hover-bg)] transition-all">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                  {surveyData.title?.es || 'Sin título'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                  {surveyData.description?.es || 'Sin descripción'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                  {formatDate(surveyInfo.startDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                  {formatDate(surveyInfo.endDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                  {calculateProgress(item.totalAnswers, surveyInfo.target)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)] relative">
                  <button
                    onClick={() => toggleMenu(item._id)}
                    className="p-2 rounded-md hover:bg-[var(--hover-bg)] transition-all"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {openMenuId === item._id && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[var(--card-background)] border border-[var(--card-border)] z-50">
                      <div className="py-1">
                        {/* Admin puede editar y configurar */}
                        {role === 'ROLE_ADMIN' && (
                          <div key={`admin-actions-${item._id}`}>
                            <button
                              key={`edit-${item._id}`}
                              onClick={() => handleAction('edit', item)}
                              className="flex items-center w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </button>
                            <button
                              key={`settings-${item._id}`}
                              onClick={() => handleAction('settings', item)}
                              className="flex items-center w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Configuración
                            </button>
                          </div>
                        )}

                        {/* Todos pueden responder */}
                        <button
                          key={`answer-${item._id}`}
                          onClick={() => handleAction('answer', item)}
                          className="flex items-center w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Responder
                        </button>

                        {/* Admin y Supervisor pueden ver cuotas y progreso */}
                        {(role === 'ROLE_ADMIN' || role === 'SUPERVISOR') && (
                          <div key={`admin-supervisor-actions-${item._id}`}>
                            <button
                              key={`quotas-${item._id}`}
                              onClick={() => handleAction('quotas', item)}
                              className="flex items-center w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                            >
                              <ChartBar className="w-4 h-4 mr-2" />
                              Cuotas
                            </button>
                            <button
                              key={`progress-${item._id}`}
                              onClick={() => handleAction('progress', item)}
                              className="flex items-center w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Progreso
                            </button>
                          </div>
                        )}

                        {/* Solo Supervisor puede asignar encuestadores */}
                        {role === 'SUPERVISOR' && (
                          <button
                            key={`pollsters-${item._id}`}
                            onClick={() => handleAction('pollsters', item)}
                            className="flex items-center w-full px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Asignar Encuestadores
                          </button>
                        )}

                        {/* Admin puede eliminar */}
                        {role === 'ROLE_ADMIN' && (
                          <div key={`admin-delete-actions-${item._id}`}>
                            <button
                              key={`delete-answers-${item._id}`}
                              onClick={() => handleAction('deleteAnswers', item)}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-500 hover:bg-[var(--hover-bg)]"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar Respuestas
                            </button>
                            <button
                              key={`delete-survey-${item._id}`}
                              onClick={() => handleAction('delete', item)}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-500 hover:bg-[var(--hover-bg)]"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar Encuesta
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 