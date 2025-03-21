'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SurveyMap from '@/components/SurveyMap';
import axios from 'axios';

export default function SurveyDetail() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [mostrarTodos, setMostrarTodos] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSurveyData = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/surveys/${id}`);
        setSurvey(response.data);
        setAnswers(response.data.answers || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching survey:', error);
        setLoading(false);
      }
    };

    fetchSurveyData();
  }, [id]);

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setMostrarTodos(false);
  };

  if (loading) return <div>Loading...</div>;
  if (!survey) return <div>Survey not found</div>;

  // Get unique users from answers
  const uniqueUsers = [...new Set(answers.map(answer => answer.userId))];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{survey.title}</h1>
      
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