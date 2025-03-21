'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SurveyMap from '@/components/SurveyMap';
import { surveyService } from '@/services/survey.service';
import { authService } from '@/services/auth.service';

export default function MapaEncuesta() {
  const router = useRouter();
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [mostrarTodos, setMostrarTodos] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = authService.getUser();
        if (!userData) {
          router.replace('/login');
          return;
        }

        const response = await surveyService.getSurvey(id);
        setSurvey(response.survey);
        setAnswers(response.answers || []);
        setLoading(false);
      } catch (err) {
        console.error('Error loading survey:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setMostrarTodos(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen p-8">
      <div className="bg-red-50 text-red-500 p-4 rounded-md">
        {error}
      </div>
    </div>
  );

  if (!survey) return (
    <div className="min-h-screen p-8">
      <div className="text-center">
        Encuesta no encontrada
      </div>
    </div>
  );

  // Get unique users from answers
  const uniqueUsers = [...new Set(answers.map(answer => answer.userId))];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{survey.title?.es}</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Filtrar por encuestador</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={mostrarTodos}
              onChange={(e) => {
                setMostrarTodos(e.target.checked);
                if (e.target.checked) {
                  setSelectedUsers([]);
                }
              }}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>Mostrar todos</span>
          </label>
          
          {uniqueUsers.map(userId => (
            <label key={userId} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedUsers.includes(userId)}
                onChange={() => handleUserSelection(userId)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span>Encuestador {userId}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <SurveyMap
          answers={answers}
          mostrarTodos={mostrarTodos}
          selectedUsers={selectedUsers}
        />
      </div>
    </div>
  );
} 