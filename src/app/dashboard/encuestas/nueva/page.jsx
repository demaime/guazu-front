'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import { surveyService } from '@/services/survey.service';
import { userService } from '@/services/user.service';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import "survey-core/survey-core.css";

// Pasos del wizard
const STEPS = {
  BASIC_INFO: 0,
  PARTICIPANTS: 1,
  QUESTIONS: 2,
  PREVIEW: 3
};

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

export default function NuevaEncuesta() {
  const router = useRouter();
  const [[page, direction], setPage] = useState([0, 0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [surveyData, setSurveyData] = useState({
    basicInfo: {
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      target: 100,
    },
    participants: {
      userIds: [],
      supervisorsIds: []
    },
    questions: []
  });

  // Navegación entre pasos
  const paginate = (newDirection) => {
    if (page + newDirection >= 0 && page + newDirection <= 3) {
      setPage([page + newDirection, newDirection]);
    }
  };

  // Validar si se puede avanzar al siguiente paso
  const canProceed = () => {
    switch (page) {
      case STEPS.BASIC_INFO:
        return surveyData.basicInfo.title && 
               surveyData.basicInfo.description && 
               surveyData.basicInfo.startDate && 
               surveyData.basicInfo.endDate && 
               surveyData.basicInfo.target > 0;
      case STEPS.PARTICIPANTS:
        return surveyData.participants.userIds.length > 0;
      case STEPS.QUESTIONS:
        return surveyData.questions.length > 0;
      default:
        return true;
    }
  };

  // Guardar encuesta
  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dataToSave = {
        survey: {
          title: surveyData.basicInfo.title,
          description: surveyData.basicInfo.description,
          pages: [{
            name: "page1",
            elements: surveyData.questions
          }]
        },
        surveyInfo: {
          startDate: surveyData.basicInfo.startDate,
          endDate: surveyData.basicInfo.endDate,
          target: surveyData.basicInfo.target,
          userIds: surveyData.participants.userIds,
          supervisorsIds: surveyData.participants.supervisorsIds
        }
      };

      await surveyService.createOrUpdateSurvey(dataToSave);
      router.push('/dashboard/encuestas');
    } catch (err) {
      console.error('Error saving survey:', err);
      setError(err.message || 'Error al guardar la encuesta');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar usuarios y supervisores
  useEffect(() => {
    const loadUsersAndSupervisors = async () => {
      try {
        const [usersResponse, supervisorsResponse] = await Promise.all([
          userService.getPollsters(),
          userService.getSupervisors()
        ]);
        
        setUsers(usersResponse.users || []);
        setSupervisors(supervisorsResponse.supervisors || []);
      } catch (err) {
        console.error('Error loading users and supervisors:', err);
        setError('Error al cargar usuarios y supervisores');
      }
    };

    loadUsersAndSupervisors();
  }, []);

  // Renderizar paso actual
  const renderStep = () => {
    switch (page) {
      case STEPS.BASIC_INFO:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Información Básica</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Título de la Encuesta
                </label>
                <input
                  type="text"
                  value={surveyData.basicInfo.title}
                  onChange={(e) => setSurveyData(prev => ({
                    ...prev,
                    basicInfo: {
                      ...prev.basicInfo,
                      title: e.target.value
                    }
                  }))}
                  className="w-full p-2 border rounded-md"
                  placeholder="Ej: Encuesta de Satisfacción 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Descripción
                </label>
                <textarea
                  value={surveyData.basicInfo.description}
                  onChange={(e) => setSurveyData(prev => ({
                    ...prev,
                    basicInfo: {
                      ...prev.basicInfo,
                      description: e.target.value
                    }
                  }))}
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  placeholder="Describe el propósito de la encuesta"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={surveyData.basicInfo.startDate}
                    onChange={(e) => setSurveyData(prev => ({
                      ...prev,
                      basicInfo: {
                        ...prev.basicInfo,
                        startDate: e.target.value
                      }
                    }))}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fecha de fin
                  </label>
                  <input
                    type="date"
                    value={surveyData.basicInfo.endDate}
                    onChange={(e) => setSurveyData(prev => ({
                      ...prev,
                      basicInfo: {
                        ...prev.basicInfo,
                        endDate: e.target.value
                      }
                    }))}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Meta de respuestas
                </label>
                <input
                  type="number"
                  value={surveyData.basicInfo.target}
                  onChange={(e) => setSurveyData(prev => ({
                    ...prev,
                    basicInfo: {
                      ...prev.basicInfo,
                      target: parseInt(e.target.value)
                    }
                  }))}
                  className="w-full p-2 border rounded-md"
                  min="1"
                  required
                />
              </div>
            </div>
          </div>
        );

      case STEPS.PARTICIPANTS:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Participantes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Encuestadores
                </label>
                <select
                  multiple
                  value={surveyData.participants.userIds}
                  onChange={(e) => setSurveyData(prev => ({
                    ...prev,
                    participants: {
                      ...prev.participants,
                      userIds: Array.from(e.target.selectedOptions, option => option.value)
                    }
                  }))}
                  className="w-full p-2 border rounded-md"
                  size={6}
                >
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} {user.lastName}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Mantén presionado Ctrl (Cmd en Mac) para seleccionar múltiples encuestadores
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Supervisores
                </label>
                <select
                  multiple
                  value={surveyData.participants.supervisorsIds}
                  onChange={(e) => setSurveyData(prev => ({
                    ...prev,
                    participants: {
                      ...prev.participants,
                      supervisorsIds: Array.from(e.target.selectedOptions, option => option.value)
                    }
                  }))}
                  className="w-full p-2 border rounded-md"
                  size={6}
                >
                  {supervisors.map(supervisor => (
                    <option key={supervisor._id} value={supervisor._id}>
                      {supervisor.name} {supervisor.lastName}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Mantén presionado Ctrl (Cmd en Mac) para seleccionar múltiples supervisores
                </p>
              </div>
            </div>
          </div>
        );

      case STEPS.QUESTIONS:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Preguntas</h2>
            <div className="space-y-4">
              {/* Aquí irá el editor de preguntas */}
              <p>Editor de preguntas en desarrollo...</p>
            </div>
          </div>
        );

      case STEPS.PREVIEW:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Vista Previa</h2>
            <div className="space-y-4">
              {/* Aquí irá la vista previa de la encuesta */}
              <p>Vista previa en desarrollo...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full bg-background">
      {/* Barra superior con progreso */}
      <div className="bg-card-background border-card-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-hover-bg rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-4">
                {page > 0 && (
                  <button
                    onClick={() => paginate(-1)}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Anterior
                  </button>
                )}
                {page < 3 ? (
                  <button
                    onClick={() => paginate(1)}
                    disabled={!canProceed()}
                    className={`px-4 py-2 rounded-md ${
                      canProceed()
                        ? 'btn-primary'
                        : 'bg-gray-200 dark:bg-gray-700 text-text-muted cursor-not-allowed'
                    }`}
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Encuesta</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mensajes de error */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-md"
          >
            {error}
          </motion.div>
        )}

        {/* Indicador de progreso */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            {Object.entries(STEPS).map(([key, value]) => (
              <div
                key={key}
                className={`flex items-center ${
                  value < page ? 'text-primary' : value === page ? 'text-text-primary' : 'text-text-muted'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    value < page
                      ? 'bg-primary text-white'
                      : value === page
                      ? 'bg-card-background border-2 border-primary text-primary'
                      : 'bg-gray-200 dark:bg-gray-700 text-text-muted'
                  }`}
                >
                  {value + 1}
                </div>
                <div className="ml-2 text-sm hidden sm:block">
                  {key.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div
              className="h-1 bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(page / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Contenido del paso actual */}
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="bg-card-background border border-card-border rounded-lg shadow-sm p-6"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
} 