"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  MapPin,
  BarChart3,
  Play,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";

export const SurveyCard = ({
  survey,
  userRole,
  onResponder,
  onVer,
  onEditar,
  onEliminar,
  onProgreso,
  onMapa,
}) => {
  const isAdmin = userRole === "ROLE_ADMIN" || userRole === "SUPERVISOR";
  const isPollster = userRole === "POLLSTER";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const surveyTitle =
    survey.survey?.title?.es ||
    survey.survey?.title ||
    survey.title ||
    "Encuesta sin título";
  const surveyDescription =
    survey.survey?.description || survey.description || "";

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
          {surveyTitle}
        </h3>
        {surveyDescription && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {surveyDescription}
          </p>
        )}
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        {survey.surveyInfo?.startDate && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3 mr-1" />
            <span>
              {formatDate(survey.surveyInfo.startDate)} -{" "}
              {formatDate(survey.surveyInfo.endDate)}
            </span>
          </div>
        )}

        {survey.surveyInfo?.location && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="w-3 h-3 mr-1" />
            <span>{survey.surveyInfo.location}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Responder - Para todos */}
        <button
          onClick={onResponder}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
        >
          <Play className="w-3 h-3" />
          Responder
        </button>

        {/* Ver - Para todos */}
        <button
          onClick={onVer}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-3 h-3" />
          Ver
        </button>

        {/* Progreso - Para admins */}
        {isAdmin && (
          <button
            onClick={onProgreso}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
          >
            <BarChart3 className="w-3 h-3" />
            Progreso
          </button>
        )}

        {/* Editar - Para admins */}
        {isAdmin && (
          <button
            onClick={onEditar}
            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
          >
            <Edit className="w-3 h-3" />
            Editar
          </button>
        )}

        {/* Eliminar - Para admins */}
        {isAdmin && (
          <button
            onClick={onEliminar}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Eliminar
          </button>
        )}
      </div>


    </motion.div>
  );
};
