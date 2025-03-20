'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { surveyService } from '@/services/survey.service';
import { authService } from '@/services/auth.service';
import { SurveyList } from '@/components/ui/SurveyList';
import { Plus } from 'lucide-react';

export default function Encuestas() {
  const router = useRouter();
  const [surveys, setSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = authService.getUser();
        if (!userData) {
          router.replace('/login');
          return;
        }
        setUser(userData);

        const response = await surveyService.getAllSurveys();
        console.log('Response from service:', response);
        
        // Asegurarnos de que surveys es un array
        const surveysData = Array.isArray(response.surveys) ? response.surveys : [];
        console.log('Surveys to set:', surveysData);
        setSurveys(surveysData);
      } catch (err) {
        console.error('Error loading surveys:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleDelete = async (surveyId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta encuesta?')) {
      try {
        await surveyService.deleteSurvey(surveyId);
        setSurveys(surveys.filter(survey => survey._id !== surveyId));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDeleteAnswers = async (surveyId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar todas las respuestas de esta encuesta?')) {
      try {
        await surveyService.deleteAnswers(surveyId);
        const response = await surveyService.getAllSurveys();
        const newSurveysData = Array.isArray(response.surveys) ? response.surveys : [];
        setSurveys(newSurveysData);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] px-5 py-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Encuestas</h1>
          {user?.role === 'ROLE_ADMIN' && (
            <button
              onClick={() => router.push('/dashboard/encuestas/nueva')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva Encuesta
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {!Array.isArray(surveys) || surveys.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--text-secondary)] mb-4">
              {user?.role === 'ROLE_ADMIN'
                ? 'No hay encuestas creadas. ¡Crea tu primera encuesta!'
                : 'No tienes encuestas asignadas. Por favor, consulta con el administrador.'}
            </p>
            {user?.role === 'ROLE_ADMIN' && (
              <button
                onClick={() => router.push('/dashboard/encuestas/nueva')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-5 h-5" />
                Crear Encuesta
              </button>
            )}
          </div>
        ) : (
          <SurveyList
            surveys={surveys}
            onDelete={handleDelete}
            onDeleteAnswers={handleDeleteAnswers}
            role={user?.role}
          />
        )}
      </div>
    </div>
  );
} 