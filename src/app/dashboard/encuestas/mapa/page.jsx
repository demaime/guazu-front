"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SurveyMap from "@/components/SurveyMap";
import CasesTable from "@/components/CasesTable";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

export default function MapaEstable() {
  const router = useRouter();
  const [surveyId, setSurveyId] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [mostrarTodos, setMostrarTodos] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Resolver ID desde storage (misma idea que responder)
  useEffect(() => {
    try {
      const key = "map:surveyId";
      const fromSession =
        typeof window !== "undefined" && window.sessionStorage
          ? window.sessionStorage.getItem(key)
          : null;
      const fromLocal =
        !fromSession && typeof window !== "undefined" && window.localStorage
          ? window.localStorage.getItem(key)
          : null;
      const resolved = fromSession || fromLocal || null;
      setSurveyId(resolved);
      if (!resolved) router.replace("/dashboard/encuestas");
    } catch {
      router.replace("/dashboard/encuestas");
    }
  }, [router]);

  useEffect(() => {
    const loadData = async () => {
      if (!surveyId) return;
      try {
        const userData = authService.getUser();
        setUser(userData);
        if (!userData) {
          router.replace("/login");
          return;
        }

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          // Offline: intentar obtener definición + respuestas locales
          const { getSurveyByIdLocal } = await import("@/services/db/pouch");
          const local = await getSurveyByIdLocal(surveyId);
          if (!local) throw new Error("Sin datos locales para el mapa");
          setSurvey(local.survey || local);
          let answersData = (local.answers || []).map((a) => ({ ...a }));
          if (userData.role === "POLLSTER") {
            answersData = answersData.filter((a) => a.userId === userData._id);
          }
          setAnswers(answersData);
        } else {
          // Online
          const response = await surveyService.getSurveyWithAnswers(surveyId);
          setSurvey(response.survey);
          let answersData = response.answers || [];
          if (userData.role === "POLLSTER") {
            answersData = answersData.filter((a) => a.userId === userData._id);
          }
          setAnswers(answersData);
        }
      } catch (err) {
        setError(err.message || "Error al cargar datos del mapa.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [surveyId, router]);

  const handleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
    setMostrarTodos(false);
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Política: no permitir acceso a /mapa en offline
    if (typeof window !== "undefined") {
      router.replace("/dashboard/encuestas");
    }
    return <LoaderWrapper fullScreen />;
  }

  if (!surveyId || loading) return <LoaderWrapper fullScreen />;
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
    <div className="container mx-auto px-4 py-4 md:py-8">
      <h1 className="text-3xl font-bold mb-2">{survey.title?.es}</h1>
      <h2 className="text-xl font-semibold mb-6 text-text-secondary">
        Mapa de Casos
      </h2>

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
                  const val = e.target.checked;
                  setMostrarTodos(val);
                  if (val) setSelectedUsers([]);
                }}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span>Mostrar todos</span>
            </label>
            {uniqueUsers.map((u) => (
              <label key={u.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(u.id)}
                  onChange={() => handleUserSelection(u.id)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span>{u.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--card-background)] rounded-lg shadow-lg p-3 md:p-6 w-full md:w-3/4 mx-auto">
        {typeof navigator !== "undefined" && !navigator.onLine ? (
          <div className="w-full h-[60vh] flex items-center justify-center text-center text-[var(--text-secondary)] p-6">
            <div>
              <p className="font-medium mb-2">
                Mapa no disponible sin conexión
              </p>
              <p className="text-sm">
                Puedes ver los casos listados más abajo.
              </p>
            </div>
          </div>
        ) : (
          <SurveyMap
            survey={survey}
            answers={answers}
            mostrarTodos={user?.role === "POLLSTER" ? true : mostrarTodos}
            selectedUsers={
              user?.role === "POLLSTER" ? [user._id] : selectedUsers
            }
            height="60vh"
          />
        )}
      </div>

      <div className="mt-6">
        <CasesTable
          survey={survey}
          answers={answers}
          mostrarTodos={user?.role === "POLLSTER" ? true : mostrarTodos}
          selectedUsers={user?.role === "POLLSTER" ? [user._id] : selectedUsers}
        />
      </div>
    </div>
  );
}
