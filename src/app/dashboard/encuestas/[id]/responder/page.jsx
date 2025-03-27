"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "@/services/survey.service";
import { authService } from "@/services/auth.service";
import "survey-core/survey-core.css";

export default function ResponderEncuesta() {
  const router = useRouter();
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [startTime, setStartTime] = useState(null);

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

        const response = await surveyService.getSurvey(id);
        setSurvey(response);
        setStartTime(Date.now());
        setLoading(false);
      } catch (error) {
        console.error("Error al cargar la encuesta:", error);
        setError("Error al cargar la encuesta. Por favor, intente nuevamente.");
        setLoading(false);
      }
    };

    loadData();
  }, [id, router]);

  const handleComplete = async (sender) => {
    try {
      const endTime = Date.now();
      const timeSpent = Math.floor((endTime - startTime) / 1000); // Tiempo en segundos

      // Obtener la ubicación actual
      let location = { lat: null, lng: null };
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (geoError) {
        console.error("Error al obtener la ubicación:", geoError);
      }

      const answerData = {
        surveyId: id,
        userId: user._id,
        fullName: user.fullName,
        answer: sender.data,
        time: timeSpent,
        lat: location.lat,
        lng: location.lng,
        createdAt: new Date().toISOString(),
      };

      // Enviar la respuesta al backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/insert-answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("token"),
          },
          body: JSON.stringify(answerData),
        }
      );

      if (!response.ok) {
        throw new Error("Error al guardar la respuesta");
      }

      // Redirigir al dashboard o mostrar mensaje de éxito
      router.push("/dashboard/encuestas");
    } catch (error) {
      console.error("Error al guardar la respuesta:", error);
      setError("Error al guardar la respuesta. Por favor, intente nuevamente.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Advertencia!</strong>
          <span className="block sm:inline"> No se encontró la encuesta.</span>
        </div>
      </div>
    );
  }

  // Crear el modelo de la encuesta usando la estructura correcta
  const surveyModel = new Model(survey);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">
          {survey.title?.es || survey.title?.default || "Sin título"}
        </h1>
        <div className="prose max-w-none mb-6">
          <p>
            {survey.description?.es ||
              survey.description?.default ||
              "Sin descripción"}
          </p>
        </div>
        <Survey model={surveyModel} onComplete={handleComplete} />
      </div>
    </div>
  );
}
