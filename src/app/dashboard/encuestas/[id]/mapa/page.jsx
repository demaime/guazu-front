"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import SurveyMap from "@/components/SurveyMap";
import CasesTable from "@/components/CasesTable";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";

export default function MapaEncuesta() {
  const router = useRouter();
  const { id } = useParams();
  console.log("ID de la encuesta:", id);

  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [mostrarTodos, setMostrarTodos] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = authService.getUser();
        setUser(userData);

        if (!userData) {
          console.log("No hay usuario autenticado, redirigiendo a login");
          router.replace("/login");
          return;
        }

        console.log("Usuario actual:", userData);
        const response = await surveyService.getSurveyWithAnswers(id);
        console.log("Respuesta del servicio (combinada):", response);

        setSurvey(response.survey);
        let answersData = response.answers || [];
        console.log("Respuestas sin filtrar:", answersData);

        // Si es encuestador, solo mostrar sus propias encuestas
        if (userData.role === "POLLSTER") {
          answersData = answersData.filter((answer) => {
            console.log("Comparando:", answer.userId, userData._id);
            return answer.userId === userData._id;
          });
          console.log("Respuestas filtradas para encuestador:", answersData);
        }

        setAnswers(answersData);
        setLoading(false);
      } catch (err) {
        console.error("Error loading survey data for map:", err);
        setError(err.message || "Error al cargar datos del mapa.");
        setLoading(false);
      }
    };

    loadData();
  }, [id, router]);

  const handleUserSelection = (userId) => {
    console.log("Selección de usuario cambiada:", userId);
    setSelectedUsers((prev) => {
      const newSelection = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      console.log("Nueva selección de usuarios:", newSelection);
      return newSelection;
    });
    setMostrarTodos(false);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen p-8">
        <div className="bg-red-50 text-red-500 p-4 rounded-md">{error}</div>
      </div>
    );

  if (!survey)
    return (
      <div className="min-h-screen p-8">
        <div className="text-center">Encuesta no encontrada</div>
      </div>
    );

  // Obtener encuestadores únicos con sus nombres completos
  const uniqueUsers = answers.reduce((acc, answer) => {
    if (!acc.find((u) => u.id === answer.userId)) {
      acc.push({
        id: answer.userId,
        name: answer.fullName || `Encuestador ${answer.userId}`,
      });
    }
    return acc;
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{survey.title?.es}</h1>
      <h2 className="text-xl font-semibold mb-6 text-text-secondary">
        Mapa de Casos
      </h2>

      {/* Solo mostrar filtros si no es encuestador */}
      {user?.role !== "POLLSTER" && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Filtrar por encuestador
          </h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={mostrarTodos}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  console.log("Mostrar todos cambiado a:", newValue);
                  setMostrarTodos(newValue);
                  if (newValue) {
                    setSelectedUsers([]);
                  }
                }}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span>Mostrar todos</span>
            </label>

            {uniqueUsers.map((user) => (
              <label key={user.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleUserSelection(user.id)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span>{user.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--card-background)] rounded-lg shadow-lg p-6 w-3/4 mx-auto">
        <SurveyMap
          survey={survey}
          answers={answers}
          mostrarTodos={user?.role === "POLLSTER" ? true : mostrarTodos}
          selectedUsers={user?.role === "POLLSTER" ? [user._id] : selectedUsers}
        />
      </div>

      {/* Tabla de casos debajo del mapa */}
      <CasesTable
        survey={survey}
        answers={answers}
        mostrarTodos={user?.role === "POLLSTER" ? true : mostrarTodos}
        selectedUsers={user?.role === "POLLSTER" ? [user._id] : selectedUsers}
      />
    </div>
  );
}
