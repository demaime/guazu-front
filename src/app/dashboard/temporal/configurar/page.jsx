"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  MapPin,
  Check,
  AlertCircle,
  X,
  ArrowLeft,
  Plus,
  Trash2,
  User,
  UserCircle,
  UserCheck,
  Users2,
  Calendar,
  Target,
  PieChart,
  Info,
  VenusAndMars,
  University,
  BadgePlus,
  Loader2,
  Scale,
} from "lucide-react";
import { useSurveyCreation } from "../context/SurveyCreationContext";
import { surveyService } from "@/services/survey.service";
import { userService } from "@/services/user.service";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import QuotaDistributionModal from "../nueva/components/Modals/QuotaDistributionModal";

const IconRenderer = ({ iconName, size = 18, className = "" }) => {
  const icons = {
    User,
    UserCircle,
    UserCheck,
    Users2,
  };
  const Icon = icons[iconName];
  return Icon ? <Icon size={size} className={className} /> : null;
};

export default function ConfigurarEncuesta() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");

  const { surveyData, updateSurveyData } = useSurveyCreation();
  const [isLoading, setIsLoading] = useState(!!surveyId);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDistribution, setIsLoadingDistribution] = useState(false);

  const [config, setConfig] = useState({
    fechaInicio: "",
    fechaFin: "",
    gpsObligatorio: false,
    tieneObjetivo: true,
    metaTotal: 100,
    cuotasActivas: true,
    categorias: [],
  });

  // Cargar encuesta existente si hay ID
  useEffect(() => {
    const loadData = async () => {
      if (surveyId) {
        await loadSurveyConfig(surveyId);
      } else if (surveyData.fechaInicio) {
        // Cargar del contexto si no hay ID
        setConfig((prev) => ({
          ...prev,
          fechaInicio: surveyData.fechaInicio,
          fechaFin: surveyData.fechaFin,
          metaTotal: surveyData.metaTotal,
          gpsObligatorio: surveyData.gpsObligatorio,
          tieneObjetivo: surveyData.tieneObjetivo,
          cuotasActivas: surveyData.cuotasActivas,
          categorias: surveyData.categorias || [],
        }));
        setIsLoading(false);
      } else {
        // Encuesta nueva sin datos previos
        setIsLoading(false);
      }
    };
    loadData();
  }, [surveyId]);

  const loadSurveyConfig = async (id) => {
    try {
      setIsLoading(true);
      const response = await surveyService.getSurvey(id);
      const surveyInfo = response?.survey?.surveyInfo || {};

      const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return !isNaN(date.getTime()) ? date.toISOString().split("T")[0] : "";
      };

      setConfig({
        fechaInicio: formatDateForInput(surveyInfo.startDate),
        fechaFin: formatDateForInput(surveyInfo.endDate),
        metaTotal: surveyInfo.target || 0,
        gpsObligatorio: surveyInfo.requireGps || false,
        tieneObjetivo: (surveyInfo.target || 0) > 0,
        cuotasActivas: (surveyInfo.quotas || []).length > 0,
        categorias: (surveyInfo.quotas || []).map((q) => ({
          id: Date.now() + Math.random(),
          nombre: q.category,
          segmentos: q.segments.map((s) => ({
            id: Date.now() + Math.random(),
            nombre: s.name,
            objetivo: s.target,
            porcentaje: 0,
            icon: "User",
          })),
        })),
      });

      // Cargar distribución existente si hay
      const participants = response?.survey?.participants;
      if (participants?.quotaAssignments?.length > 0) {
        setCurrentDistribution(participants);
      }
      
      // Cargar asignaciones de casos por encuestador
      if (participants?.pollsterAssignments?.length > 0) {
        setPollsterAssignments(participants.pollsterAssignments);
      }
    } catch (error) {
      console.error("Error al cargar configuración:", error);
      toast.error("Error al cargar la configuración: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [showGoToParticipantsOption, setShowGoToParticipantsOption] =
    useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre: "",
    segmentos: [
      { nombre: "", objetivo: 0, porcentaje: 0, icon: "User" },
      { nombre: "", objetivo: 0, porcentaje: 0, icon: "User" },
    ],
  });
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);

  // Estados para distribución de cuotas
  const [showQuotaDistributionModal, setShowQuotaDistributionModal] =
    useState(false);
  const [encuestadoresParaDistribucion, setEncuestadoresParaDistribucion] =
    useState([]);
  const [currentDistribution, setCurrentDistribution] = useState(null);
  const [pollsterAssignments, setPollsterAssignments] = useState([]); // Case assignments per pollster

  const updateConfig = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const calcularDuracion = () => {
    if (!config.fechaInicio || !config.fechaFin) return 0;
    const inicio = new Date(config.fechaInicio);
    const fin = new Date(config.fechaFin);
    // Validar fechas invalidas
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return 0;

    const diff = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const calcularTotalAsignado = (categoria) => {
    return categoria.segmentos.reduce(
      (sum, seg) => sum + (seg.objetivo || 0),
      0
    );
  };

  const calcularTotalDeCuotas = () => {
    if (config.categorias.length === 0) return 0;
    // Encontrar la categoría con mayor total (ya que las cuotas deben cumplirse simultáneamente)
    const totales = config.categorias.map((cat) => calcularTotalAsignado(cat));
    return Math.max(...totales, 0);
  };

  const obtenerMetaEfectiva = () => {
    if (config.tieneObjetivo && config.metaTotal > 0) {
      return config.metaTotal;
    }
    // Si no hay objetivo pero hay cuotas, usar el total de cuotas como mínimo
    const totalCuotas = calcularTotalDeCuotas();
    return totalCuotas > 0 ? totalCuotas : 0; // Default 0 si no hay nada
  };

  const updateSegmento = (categoriaId, segmentoIndex, field, value) => {
    const metaEfectiva = obtenerMetaEfectiva();

    setConfig((prev) => ({
      ...prev,
      categorias: prev.categorias.map((cat) => {
        if (cat.id === categoriaId) {
          const newSegmentos = [...cat.segmentos];

          if (field === "porcentaje") {
            const newPorcentaje = Math.min(
              100,
              Math.max(0, parseInt(value) || 0)
            );
            const newObjetivo = Math.round(
              (newPorcentaje / 100) * metaEfectiva
            );
            newSegmentos[segmentoIndex] = {
              ...newSegmentos[segmentoIndex],
              porcentaje: newPorcentaje,
              objetivo: newObjetivo,
            };
          } else if (field === "objetivo") {
            const newObjetivo = parseInt(value) || 0;
            const newPorcentaje =
              metaEfectiva > 0
                ? Math.round((newObjetivo / metaEfectiva) * 100)
                : 0;
            newSegmentos[segmentoIndex] = {
              ...newSegmentos[segmentoIndex],
              objetivo: newObjetivo,
              porcentaje: newPorcentaje,
            };
          } else {
            newSegmentos[segmentoIndex] = {
              ...newSegmentos[segmentoIndex],
              [field]: value,
            };
          }

          return { ...cat, segmentos: newSegmentos };
        }
        return cat;
      }),
    }));
  };

  const distribuirEquitativamente = (categoriaId) => {
    const metaEfectiva = obtenerMetaEfectiva();

    setConfig((prev) => ({
      ...prev,
      categorias: prev.categorias.map((cat) => {
        if (cat.id === categoriaId) {
          const numSegmentos = cat.segmentos.length;
          const objetivoPorSegmento = Math.floor(metaEfectiva / numSegmentos);
          const resto = metaEfectiva % numSegmentos;
          return {
            ...cat,
            segmentos: cat.segmentos.map((seg, idx) => ({
              ...seg,
              objetivo: objetivoPorSegmento + (idx === 0 ? resto : 0),
              porcentaje: Math.round(
                ((objetivoPorSegmento + (idx === 0 ? resto : 0)) /
                  metaEfectiva) *
                  100
              ),
            })),
          };
        }
        return cat;
      }),
    }));
  };

  const agregarSegmentoNuevo = () => {
    setNuevaCategoria((prev) => ({
      ...prev,
      segmentos: [
        ...prev.segmentos,
        { nombre: "", objetivo: 0, porcentaje: 0, icon: "User" },
      ],
    }));
  };

  const eliminarSegmentoNuevo = (index) => {
    setNuevaCategoria((prev) => ({
      ...prev,
      segmentos: prev.segmentos.filter((_, i) => i !== index),
    }));
  };

  const updateSegmentoNuevo = (index, field, value) => {
    setNuevaCategoria((prev) => ({
      ...prev,
      segmentos: prev.segmentos.map((seg, i) =>
        i === index ? { ...seg, [field]: value } : seg
      ),
    }));
  };

  // Plantillas rápidas predefinidas
  const plantillasRapidas = {
    genero: {
      nombre: "Género",
      segmentos: [
        { nombre: "Masculino", objetivo: 0, porcentaje: 50, icon: "User" },
        { nombre: "Femenino", objetivo: 0, porcentaje: 50, icon: "User" },
      ],
    },
    edad: {
      nombre: "Edad",
      segmentos: [
        { nombre: "18-29", objetivo: 0, porcentaje: 25, icon: "User" },
        { nombre: "30-54", objetivo: 0, porcentaje: 40, icon: "User" },
        { nombre: "55-69", objetivo: 0, porcentaje: 25, icon: "User" },
        { nombre: "70+", objetivo: 0, porcentaje: 10, icon: "User" },
      ],
    },
    educacion: {
      nombre: "Nivel Educativo",
      segmentos: [
        { nombre: "Primaria", objetivo: 0, porcentaje: 20, icon: "User" },
        { nombre: "Secundaria", objetivo: 0, porcentaje: 40, icon: "User" },
        { nombre: "Terciaria", objetivo: 0, porcentaje: 20, icon: "User" },
        { nombre: "Universitaria", objetivo: 0, porcentaje: 20, icon: "User" },
      ],
    },
  };

  const aplicarPlantilla = (tipo) => {
    const plantilla = plantillasRapidas[tipo];
    if (plantilla) {
      setNuevaCategoria({
        nombre: plantilla.nombre,
        segmentos: plantilla.segmentos.map((seg) => ({ ...seg })),
      });
      setPlantillaSeleccionada(tipo);
    }
  };

  const cerrarModalCategoria = () => {
    setNuevaCategoria({
      nombre: "",
      segmentos: [
        { nombre: "", objetivo: 0, porcentaje: 0, icon: "User" },
        { nombre: "", objetivo: 0, porcentaje: 0, icon: "User" },
      ],
    });
    setPlantillaSeleccionada(null);
    setShowCategoriaModal(false);
  };

  const guardarCategoria = () => {
    if (!nuevaCategoria.nombre.trim()) {
      setValidationMessage("Debes ingresar un nombre para la categoría");
      setShowValidationModal(true);
      return;
    }

    const segmentosValidos = nuevaCategoria.segmentos.filter((s) =>
      s.nombre.trim()
    );
    if (segmentosValidos.length < 2) {
      setValidationMessage(
        "Debes agregar al menos 2 segmentos para crear una cuota. Una categoría con un solo segmento no tiene sentido para distribuir cuotas."
      );
      setShowValidationModal(true);
      return;
    }

    const nuevaCat = {
      id: Date.now(),
      nombre: nuevaCategoria.nombre,
      editable: true,
      segmentos: segmentosValidos,
    };

    setConfig((prev) => ({
      ...prev,
      categorias: [...prev.categorias, nuevaCat],
    }));

    cerrarModalCategoria();
    
    // Distribuir automáticamente de manera equitativa
    setTimeout(() => {
      distribuirEquitativamente(nuevaCat.id);
    }, 100);
  };

  const eliminarCategoria = (categoriaId) => {
    setConfig((prev) => ({
      ...prev,
      categorias: prev.categorias.filter((cat) => cat.id !== categoriaId),
    }));
  };

  // Manejar apertura del modal de distribución
  const handleDistribuirCuotas = async () => {
    // 1. Verificar que hay encuesta seleccionada
    if (!surveyId) {
      setValidationMessage("Error: No hay encuesta seleccionada");
      setShowValidationModal(true);
      return;
    }

    setIsLoadingDistribution(true);
    try {
      // 2. Cargar encuesta y obtener los IDs de encuestadores asignados
      const existing = await surveyService.getSurvey(surveyId);

      const userIds =
        existing?.survey?.surveyInfo?.userIds ||
        existing?.survey?.userIds ||
        [];

      if (userIds.length === 0) {
        setValidationMessage(
          "Debes asignar participantes antes de poder distribuir las cuotas"
        );
        setShowGoToParticipantsOption(true);
        setShowValidationModal(true);
        return;
      }

      // 3. Cargar TODOS los pollsters y filtrar los asignados a esta encuesta
      const pollstersResponse = await userService.getPollsters();
      const allPollsters = pollstersResponse.users || [];

      // Filtrar solo los encuestadores que están asignados a esta encuesta
      const encuestadoresData = allPollsters.filter((pollster) =>
        userIds.includes(pollster._id)
      );

      if (encuestadoresData.length === 0) {
        setValidationMessage(
          "Debes asignar participantes antes de poder distribuir las cuotas"
        );
        setShowGoToParticipantsOption(true);
        setShowValidationModal(true);
        return;
      }

      // 4. Cargar distribución actual si existe
      const currentDist = existing?.survey?.participants || null;
      setCurrentDistribution(currentDist);

      // 5. Abrir modal con datos
      setEncuestadoresParaDistribucion(encuestadoresData);
      setShowQuotaDistributionModal(true);
    } catch (error) {
      console.error("Error al preparar distribución:", error);
      setValidationMessage("Error al cargar datos: " + error.message);
      setShowValidationModal(true);
    } finally {
      setIsLoadingDistribution(false);
    }
  };

  // Guardar distribución de cuotas
  const handleSaveDistribution = async (distributionData) => {
    try {
      setIsSaving(true);

      // Cargar encuesta existente
      const existing = await surveyService.getSurvey(surveyId);
      const surveyData = existing?.survey?.survey || existing?.survey;
      const surveyInfo = existing?.survey?.surveyInfo || {};
      const definition = existing?.survey?.surveyDefinition;

      // Preparar datos completos manteniendo todo lo demás
      const dataToSave = {
        survey: surveyData,
        surveyDefinition: definition,
        surveyInfo: {
          ...surveyInfo,
        },
        participants: {
          userIds: surveyInfo.userIds || [],
          supervisorsIds: surveyInfo.supervisorsIds || [],
          pollsterAssignments: distributionData.pollsterAssignments,
          quotaAssignments: distributionData.quotaAssignments,
        },
      };

      // Actualizar en el backend
      await surveyService.createOrUpdateSurvey(dataToSave, surveyId, false);

      toast.success("Distribución de cuotas guardada exitosamente");
      setShowQuotaDistributionModal(false);

      // Actualizar distribución actual
      setCurrentDistribution(dataToSave.participants);
    } catch (error) {
      console.error("Error al guardar distribución:", error);
      toast.error("Error al guardar distribución: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Función para guardar y redirigir a participantes
  const handleGuardarYAsignarParticipantes = async () => {
    setIsSaving(true);
    try {
      // Cargar encuesta existente
      const existing = await surveyService.getSurvey(surveyId);
      const surveyData = existing?.survey?.survey || existing?.survey;
      const surveyInfo = existing?.survey?.surveyInfo || {};
      const definition = existing?.survey?.surveyDefinition;

      // Preparar cuotas en formato del backend
      const quotas = config.categorias.map((cat) => ({
        category: cat.nombre,
        segments: cat.segmentos.map((seg) => ({
          name: seg.nombre,
          target: seg.objetivo,
          current: 0,
        })),
      }));

      // Preparar datos completos manteniendo preguntas existentes
      const dataToSave = {
        survey: surveyData,
        surveyDefinition: definition,
        surveyInfo: {
          ...surveyInfo,
          startDate: config.fechaInicio,
          endDate: config.fechaFin,
          target: config.tieneObjetivo ? config.metaTotal : 0,
          requireGps: config.gpsObligatorio,
          quotas: config.cuotasActivas ? quotas : [],
          userIds:
            existing?.survey?.surveyInfo?.userIds ||
            existing?.survey?.userIds ||
            [],
          supervisorsIds:
            existing?.survey?.surveyInfo?.supervisorsIds ||
            existing?.survey?.supervisorsIds ||
            [],
        },
        participants: {
          userIds:
            existing?.survey?.surveyInfo?.userIds ||
            existing?.survey?.userIds ||
            [],
          supervisorsIds:
            existing?.survey?.surveyInfo?.supervisorsIds ||
            existing?.survey?.supervisorsIds ||
            [],
          pollsterAssignments:
            existing?.survey?.participants?.pollsterAssignments ||
            existing?.survey?.pollsterAssignments ||
            [],
          quotaAssignments:
            existing?.survey?.participants?.quotaAssignments ||
            existing?.survey?.quotaAssignments ||
            [],
        },
      };

      // Actualizar en el backend - PUBLISHED, no draft
      await surveyService.createOrUpdateSurvey(dataToSave, surveyId, false);

      toast.success("Configuración guardada exitosamente");

      // Redirigir a participantes
      router.push(`/dashboard/temporal/participantes?id=${surveyId}`);
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
      setShowValidationModal(false);
      setShowGoToParticipantsOption(false);
    }
  };

  // Verificar si hay distribución guardada
  const hasDistribution = currentDistribution?.quotaAssignments?.length > 0;
  const distributedPollstersCount =
    currentDistribution?.pollsterAssignments?.length || 0;

  const duracion = calcularDuracion();

  if (isLoading) {
    return (
      <div className="min-h-full bg-[var(--background)] flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <LoaderWrapper text="Cargando configuración..." size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--background)] flex flex-col">
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-6 p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors flex items-center gap-2 text-[var(--text-secondary)]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>

          <div className="space-y-4">
            {/* 1. Fechas de Ejecución */}
            <div className="bg-[var(--card-background)] rounded-lg border-2 border-[var(--card-border)] hover:border-[var(--primary)] transition-all p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                  <Calendar size={20} className="text-[var(--primary)]" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg text-[var(--text-primary)]">
                  Período de Ejecución
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={config.fechaInicio}
                      onChange={(e) =>
                        updateConfig("fechaInicio", e.target.value)
                      }
                      className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Fecha de fin
                    </label>
                    <input
                      type="date"
                      value={config.fechaFin}
                      onChange={(e) => updateConfig("fechaFin", e.target.value)}
                      className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                  </div>
                </div>

                {duracion > 0 && (
                  <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm">
                    <span className="text-[var(--primary)]">
                      Duración: <strong>{duracion} días</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. GPS Obligatorio */}
            <div className="bg-[var(--card-background)] rounded-lg border-2 border-[var(--card-border)] hover:border-[var(--primary)] transition-all p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="p-2 bg-[var(--primary)]/10 rounded-lg flex-shrink-0">
                    <MapPin size={20} className="text-[var(--primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="font-semibold text-base sm:text-lg text-[var(--text-primary)] block">
                      Ubicación GPS Obligatoria
                    </label>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {config.gpsObligatorio
                        ? "Los encuestadores no podrán enviar respuestas sin coordenadas GPS."
                        : "Se intentará obtener la ubicación pero se permitirá enviar sin coordenadas en caso de error."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateConfig("gpsObligatorio", !config.gpsObligatorio)
                  }
                  className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-all flex-shrink-0 ${
                    config.gpsObligatorio
                      ? "bg-[var(--primary)] hover:opacity-90"
                      : "bg-[var(--card-border)] hover:bg-[var(--text-secondary)]/30"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-sm transition-transform ${
                      config.gpsObligatorio ? "transform translate-x-5 sm:translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 3. Objetivo */}
            <div className="bg-[var(--card-background)] rounded-lg border-2 border-[var(--card-border)] hover:border-[var(--primary)] transition-all p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-[var(--primary)]/10 rounded-lg flex-shrink-0">
                    <Target size={20} className="text-[var(--primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="font-semibold text-base sm:text-lg text-[var(--text-primary)] block">
                      Objetivo de Casos
                    </label>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Define una meta numérica para tu encuesta
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateConfig("tieneObjetivo", !config.tieneObjetivo)
                  }
                  className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-all flex-shrink-0 ${
                    config.tieneObjetivo
                      ? "bg-[var(--primary)] hover:opacity-90"
                      : "bg-[var(--card-border)] hover:bg-[var(--text-secondary)]/30"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-sm transition-transform ${
                      config.tieneObjetivo ? "transform translate-x-5 sm:translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              {config.tieneObjetivo && (
                <div className="pl-11 sm:pl-[52px] pt-2">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Meta total de encuestas{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={config.metaTotal}
                    onChange={(e) =>
                      updateConfig("metaTotal", parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                    placeholder="Ingrese la meta"
                    min="1"
                  />
                </div>
              )}
            </div>

            {/* 4. Sistema de Cuotas */}
            <div className="bg-[var(--card-background)] rounded-lg border-2 border-[var(--card-border)] hover:border-[var(--primary)] transition-all p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-[var(--primary)]/10 rounded-lg flex-shrink-0">
                    <PieChart size={20} className="text-[var(--primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base sm:text-lg text-[var(--text-primary)] truncate">
                      Sistema de Cuotas
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] truncate">
                      Balancea tu muestra por segmentos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateConfig("cuotasActivas", !config.cuotasActivas)
                  }
                  className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-all flex-shrink-0 ${
                    config.cuotasActivas
                      ? "bg-[var(--primary)] hover:opacity-90"
                      : "bg-[var(--card-border)] hover:bg-[var(--text-secondary)]/30"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-sm transition-transform ${
                      config.cuotasActivas
                        ? "transform translate-x-5 sm:translate-x-6"
                        : ""
                    }`}
                  />
                </button>
              </div>

              {config.cuotasActivas && (
                <div className="space-y-3 sm:space-y-4">
                  {/* Meta efectiva - solo mostrar si NO hay objetivo */}
                  {!config.tieneObjetivo && (
                    <div className="bg-[var(--input-background)] rounded-lg p-3 sm:p-4 border border-[var(--card-border)]">
                      <div className="text-xs sm:text-sm text-[var(--text-secondary)] mb-1 sm:mb-2">
                        Meta mínima (basada en cuotas)
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                        {obtenerMetaEfectiva()} encuestas
                      </div>
                      {config.categorias.length > 0 && (
                        <div className="mt-2 text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Info size={14} className="flex-shrink-0" />
                          <span>Sin límite superior - Las cuotas definen el mínimo requerido</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botón para agregar categoría */}
                  <button
                    onClick={() => setShowCategoriaModal(true)}
                    className="w-full bg-[var(--secondary)]/10 hover:bg-[var(--secondary)]/20 border-2 border-dashed border-[var(--secondary)]/50 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--text-brand-secondary)] font-medium text-sm sm:text-base transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">
                      Agregar Categoría de Cuota
                    </span>
                    <span className="sm:hidden">Agregar Cuota</span>
                  </button>

                  {/* Lista de categorías */}
                  {config.categorias.map((categoria) => {
                    const totalAsignado = calcularTotalAsignado(categoria);
                    const metaEfectiva = obtenerMetaEfectiva();
                    const isCompleto = totalAsignado === metaEfectiva;
                    const excedido = totalAsignado > metaEfectiva;

                    return (
                      <div
                        key={categoria.id}
                        className="bg-[var(--input-background)] rounded-lg p-3 sm:p-4 border border-[var(--card-border)]"
                      >
                        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                          <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-[var(--text-primary)] truncate">
                            {categoria.nombre}
                          </h3>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() =>
                                distribuirEquitativamente(categoria.id)
                              }
                              className="text-xs bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] px-2 sm:px-3 py-1 rounded transition-colors whitespace-nowrap flex items-center gap-1"
                            >
                              <Scale size={14} className="sm:w-3.5 sm:h-3.5" />
                              Distribuir
                            </button>
                            <button
                              onClick={() => eliminarCategoria(categoria.id)}
                              className="text-[var(--error-text)] hover:text-[var(--error-border)] p-1"
                            >
                              <Trash2
                                size={16}
                                className="sm:w-[18px] sm:h-[18px]"
                              />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 sm:space-y-3">
                          {categoria.segmentos.map((segmento, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 sm:gap-3"
                            >
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <IconRenderer
                                  iconName={segmento.icon}
                                  size={16}
                                  className="text-[var(--primary)] sm:w-[18px] sm:h-[18px]"
                                />
                              </div>
                              <div className="flex-1 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[var(--text-primary)] font-medium text-sm sm:text-base truncate min-w-0">
                                {segmento.nombre}
                              </div>
                              {/* Input de porcentaje con % integrado */}
                              <div className="relative flex-shrink-0">
                                <input
                                  type="number"
                                  value={segmento.porcentaje}
                                  onChange={(e) =>
                                    updateSegmento(
                                      categoria.id,
                                      idx,
                                      "porcentaje",
                                      e.target.value
                                    )
                                  }
                                  className="w-14 sm:w-16 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg pl-2 pr-6 sm:pr-7 py-1.5 sm:py-2 text-[var(--text-primary)] text-center text-sm sm:text-base focus:outline-none focus:border-[var(--secondary)]"
                                  min="0"
                                  max="100"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-xs sm:text-sm pointer-events-none">
                                  %
                                </span>
                              </div>
                              <input
                                type="number"
                                value={segmento.objetivo}
                                onChange={(e) =>
                                  updateSegmento(
                                    categoria.id,
                                    idx,
                                    "objetivo",
                                    e.target.value
                                  )
                                }
                                className="font-bold w-14 sm:w-20 bg-[color:var(--primary-dark)] dark:bg-[color:var(--primary-light)] border border-[color:var(--primary)] rounded-lg px-1 sm:px-2 py-1.5 sm:py-2 text-white dark:text-[color:var(--primary-dark)] text-center text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
                                min="0"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Validación */}
                        <div
                          className={`mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg border ${
                            isCompleto
                              ? "bg-[var(--success-bg)] border-[var(--success-border)]"
                              : excedido
                              ? "bg-[var(--error-bg)] border-[var(--error-border)]"
                              : "bg-[var(--warning-bg)] border-[var(--warning-border)]"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                            <span
                              className={`flex items-center gap-1.5 sm:gap-2 ${
                                isCompleto
                                  ? "text-[var(--success)]"
                                  : excedido
                                  ? "text-[var(--error-text)]"
                                  : "text-[var(--warning)]"
                              }`}
                            >
                              {isCompleto ? (
                                <Check
                                  size={14}
                                  className="sm:w-4 sm:h-4 flex-shrink-0"
                                />
                              ) : (
                                <AlertCircle
                                  size={14}
                                  className="sm:w-4 sm:h-4 flex-shrink-0"
                                />
                              )}
                              <span className="hidden sm:inline">
                                Total asignado
                              </span>
                              <span className="sm:hidden">Total</span>
                            </span>
                            <span className="font-mono font-bold whitespace-nowrap">
                              {totalAsignado} / {obtenerMetaEfectiva()}
                            </span>
                          </div>
                          {!isCompleto && (
                            <div className="text-xs mt-1 text-[var(--text-secondary)]">
                              {excedido
                                ? `Excede en ${
                                    totalAsignado - obtenerMetaEfectiva()
                                  }`
                                : `Faltan ${
                                    obtenerMetaEfectiva() - totalAsignado
                                  }`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {config.categorias.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-[var(--text-secondary)] px-4">
                      <p className="text-xs sm:text-sm">
                        No has creado categorías de cuotas aún
                      </p>
                      <p className="text-xs mt-1">
                        <span className="hidden sm:inline">
                          Haz clic en "Agregar Categoría de Cuota" para comenzar
                        </span>
                        <span className="sm:hidden">
                          Toca "Agregar Cuota" para comenzar
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Botón de Distribución por Encuestador */}
                  {config.categorias.length > 0 && (
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-[var(--card-border)]">
                      <button
                        onClick={handleDistribuirCuotas}
                        disabled={isSaving || isLoadingDistribution}
                        className="w-full py-2.5 sm:py-3 px-3 sm:px-4 bg-[var(--secondary)] hover:bg-[var(--secondary-dark)] text-white rounded-lg transition-colors font-semibold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoadingDistribution ? (
                          <>
                            <Loader2
                              size={18}
                              className="sm:w-5 sm:h-5 animate-spin"
                            />
                            Cargando encuestadores...
                          </>
                        ) : (
                          <>
                            <PieChart size={18} className="sm:w-5 sm:h-5" />
                            Distribuir por Encuestador
                          </>
                        )}
                      </button>

                      {/* Resumen de distribución si existe */}
                      {hasDistribution && (
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-[var(--success-bg)] border border-[var(--success-border)] rounded-lg">
                          <p className="text-xs sm:text-sm text-[var(--success)] flex items-center gap-1.5">
                            <Check size={14} className="flex-shrink-0" />
                            <span>Cuotas distribuidas entre {distributedPollstersCount} encuestador{distributedPollstersCount !== 1 ? "es" : ""}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra inferior pegada al scroll container (evita hardcodes del sidebar) */}
      <div className="sticky bottom-0 bg-[var(--card-background)] border-t border-[var(--card-border)] px-4 py-3 z-20 shadow-xl">
        <div className="max-w-5xl mx-auto flex gap-2 sm:gap-3">
          <button
            onClick={() => router.push("/dashboard/temporal")}
            className="flex-1 px-6 py-3 text-[var(--error-text)] hover:bg-[var(--error-bg)]/80 border border-[var(--error-border)] rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              // Validar que haya ID
              if (!surveyId) {
                setValidationMessage(
                  "No se puede guardar configuración sin una encuesta seleccionada"
                );
                setShowValidationModal(true);
                return;
              }

              // Validar fechas
              if (!config.fechaInicio || !config.fechaFin) {
                setValidationMessage(
                  "Debes seleccionar fechas de inicio y fin"
                );
                setShowValidationModal(true);
                return;
              }

              // Validar que la fecha de fin sea posterior a la de inicio
              if (new Date(config.fechaFin) < new Date(config.fechaInicio)) {
                setValidationMessage(
                  "La fecha de fin debe ser posterior a la fecha de inicio"
                );
                setShowValidationModal(true);
                return;
              }

              // Validar meta si tiene objetivo
              if (
                config.tieneObjetivo &&
                (!config.metaTotal || config.metaTotal <= 0)
              ) {
                setValidationMessage("La meta debe ser mayor a 0");
                setShowValidationModal(true);
                return;
              }

              // Validar cuotas si están activas
              if (config.cuotasActivas) {
                if (config.categorias.length === 0) {
                  setValidationMessage(
                    "Debes agregar al menos una categoría de cuota"
                  );
                  setShowValidationModal(true);
                  return;
                }

                // Validar que todas las categorías tengan segmentos completos
                const metaEfectiva = obtenerMetaEfectiva();
                for (const categoria of config.categorias) {
                  const totalAsignado = calcularTotalAsignado(categoria);
                  if (totalAsignado !== metaEfectiva) {
                    setValidationMessage(
                      `La categoría "${categoria.nombre}" debe tener un total de ${metaEfectiva} (actualmente: ${totalAsignado})`
                    );
                    setShowValidationModal(true);
                    return;
                  }
                }
              }

              try {
                setIsSaving(true);

                // Cargar encuesta existente
                const existing = await surveyService.getSurvey(surveyId);
                const surveyData = existing?.survey?.survey || existing?.survey;
                const surveyInfo = existing?.survey?.surveyInfo || {};
                const definition = existing?.survey?.surveyDefinition;

                // Importar transformador
                const { prepareDataForBackend } = await import(
                  "../utils/transformToSurveyJS"
                );

                // Preparar cuotas en formato del backend
                const quotas = config.categorias.map((cat) => ({
                  category: cat.nombre,
                  segments: cat.segmentos.map((seg) => ({
                    name: seg.nombre,
                    target: seg.objetivo,
                    current: 0,
                  })),
                }));

                // Preparar datos completos manteniendo preguntas existentes
                const dataToSave = {
                  survey: surveyData,
                  surveyDefinition: definition,
                  surveyInfo: {
                    ...surveyInfo,
                    startDate: config.fechaInicio,
                    endDate: config.fechaFin,
                    target: config.tieneObjetivo ? config.metaTotal : 0,
                    requireGps: config.gpsObligatorio,
                    quotas: config.cuotasActivas ? quotas : [],
                    // CRÍTICO: Preservar participantes existentes
                    userIds:
                      existing?.survey?.surveyInfo?.userIds ||
                      existing?.survey?.userIds ||
                      [],
                    supervisorsIds:
                      existing?.survey?.surveyInfo?.supervisorsIds ||
                      existing?.survey?.supervisorsIds ||
                      [],
                  },
                  participants: {
                    userIds:
                      existing?.survey?.surveyInfo?.userIds ||
                      existing?.survey?.userIds ||
                      [],
                    supervisorsIds:
                      existing?.survey?.surveyInfo?.supervisorsIds ||
                      existing?.survey?.supervisorsIds ||
                      [],
                    pollsterAssignments:
                      existing?.survey?.participants?.pollsterAssignments ||
                      existing?.survey?.pollsterAssignments ||
                      [],
                    quotaAssignments:
                      existing?.survey?.participants?.quotaAssignments ||
                      existing?.survey?.quotaAssignments ||
                      [],
                  },
                };

                // Actualizar en el backend - PUBLISHED, no draft
                await surveyService.createOrUpdateSurvey(
                  dataToSave,
                  surveyId,
                  false
                );

                toast.success("Configuración guardada exitosamente");
                router.push("/dashboard/temporal");
              } catch (error) {
                console.error("Error al guardar configuración:", error);
                setValidationMessage("Error al guardar: " + error.message);
                setShowValidationModal(true);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg transition-colors font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? "Guardando..." : "Guardar"}
            {!isSaving && <Check size={18} />}
          </button>
        </div>
      </div>

      {/* Modal Crear Categoría */}
      {showCategoriaModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          onClick={() => setShowCategoriaModal(false)}
        >
          <div
            className="bg-[var(--card-background)] rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col border-t sm:border border-[var(--card-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)] flex-shrink-0">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Nueva Categoría de Cuota
              </h2>
              <button
                onClick={cerrarModalCategoria}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 -m-2"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Plantillas Rápidas */}
              <div className="bg-[var(--background)] rounded-lg p-3 border border-[var(--card-border)]">
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Plantillas rápidas:
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => aplicarPlantilla("genero")}
                    className={`px-2 sm:px-3 py-2 bg-[var(--card-background)] hover:bg-[var(--hover-bg)] rounded-lg font-medium text-[var(--text-primary)] transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 ${
                      plantillaSeleccionada === "genero"
                        ? "border-2 border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                        : "border border-[var(--card-border)]"
                    }`}
                  >
                    <VenusAndMars size={16} className="text-[var(--primary)] sm:w-5 sm:h-5" />
                    <span className="text-[var(--text-primary)] text-[10px] sm:text-sm">Género</span>
                  </button>
                  <button
                    onClick={() => aplicarPlantilla("edad")}
                    className={`px-2 sm:px-3 py-2 bg-[var(--card-background)] hover:bg-[var(--hover-bg)] rounded-lg font-medium text-[var(--text-primary)] transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 ${
                      plantillaSeleccionada === "edad"
                        ? "border-2 border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                        : "border border-[var(--card-border)]"
                    }`}
                  >
                    <Calendar size={16} className="text-[var(--primary)] sm:w-5 sm:h-5" />
                    <span className="text-[var(--text-primary)] text-[10px] sm:text-sm">Edad</span>
                  </button>
                  <button
                    onClick={() => aplicarPlantilla("educacion")}
                    className={`px-2 sm:px-3 py-2 bg-[var(--card-background)] hover:bg-[var(--hover-bg)] rounded-lg font-medium text-[var(--text-primary)] transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 ${
                      plantillaSeleccionada === "educacion"
                        ? "border-2 border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                        : "border border-[var(--card-border)]"
                    }`}
                  >
                    <University size={16} className="text-[var(--primary)] sm:w-5 sm:h-5" />
                    <span className="text-[var(--text-primary)] text-[10px] sm:text-sm leading-tight">
                      Educación
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      // Resetear a categoría vacía con 2 segmentos mínimos
                      setNuevaCategoria({
                        nombre: "",
                        segmentos: [
                          {
                            nombre: "",
                            objetivo: 0,
                            porcentaje: 0,
                            icon: "User",
                          },
                          {
                            nombre: "",
                            objetivo: 0,
                            porcentaje: 0,
                            icon: "User",
                          },
                        ],
                      });
                      setPlantillaSeleccionada("nueva");
                    }}
                    className={`px-2 sm:px-3 py-2 bg-[var(--card-background)] hover:bg-[var(--hover-bg)] rounded-lg font-medium transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 ${
                      plantillaSeleccionada === "nueva"
                        ? "border-2 border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                        : "border border-[var(--card-border)]"
                    }`}
                  >
                    <BadgePlus size={16} className="text-yellow-500 sm:w-5 sm:h-5" />
                    <span className="text-[var(--text-primary)] text-[10px] sm:text-sm">NUEVA</span>
                  </button>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Haz click para usar una plantilla predefinida o crear una
                  nueva
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Nombre de la categoría <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nuevaCategoria.nombre}
                  onChange={(e) =>
                    setNuevaCategoria((prev) => ({
                      ...prev,
                      nombre: e.target.value,
                    }))
                  }
                  className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--secondary)]"
                  placeholder="Ej: Género, Edad, Ubicación, Estudios..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Segmentos <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={agregarSegmentoNuevo}
                    className="text-xs bg-[var(--primary-light)] hover:bg-[var(--primary)] text-[var(--primary-dark)] hover:text-white px-3 py-1 rounded transition-colors flex items-center gap-1 font-medium shadow-sm"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  Mínimo 2 segmentos requeridos
                </p>

                <div className="space-y-2">
                  {nuevaCategoria.segmentos.map((segmento, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={segmento.nombre}
                        onChange={(e) =>
                          updateSegmentoNuevo(idx, "nombre", e.target.value)
                        }
                        className="flex-1 bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--secondary)]"
                        placeholder={`Segmento ${idx + 1}`}
                      />
                      {nuevaCategoria.segmentos.length > 2 && (
                        <button
                          onClick={() => eliminarSegmentoNuevo(idx)}
                          className="text-[var(--error-text)] hover:text-[var(--error-border)] p-2"
                          title="Eliminar segmento"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {nuevaCategoria.segmentos.length <= 2 && (
                        <div
                          className="text-[var(--text-secondary)] p-2"
                          title="Se requieren al menos 2 segmentos"
                        >
                          <Trash2 size={16} className="opacity-30" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--card-border)] flex gap-3 flex-shrink-0">
              <button
                onClick={cerrarModalCategoria}
                className="flex-1 px-6 py-2.5 text-[var(--error-text)] hover:text-[var(--text-primary)] border border-[var(--error-border)] rounded-lg transition-colors bg-[var(--error-bg)] hover:bg-[var(--error-bg)]/80"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCategoria}
                className="flex-1 px-6 py-2.5 bg-[var(--secondary)] hover:bg-[var(--secondary-dark)] rounded-lg transition-colors font-semibold text-white"
              >
                Crear Categoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Validación */}
      {showValidationModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => {
            setShowValidationModal(false);
            setShowGoToParticipantsOption(false);
          }}
        >
          <div
            className="bg-[var(--card-background)] rounded-xl w-full max-w-md mx-4 border border-[var(--card-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[var(--warning)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-[var(--warning)]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Atención
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Revisa la información ingresada
                  </p>
                </div>
              </div>
              <p className="text-[var(--text-primary)] mb-6">
                {validationMessage}
              </p>
              {showGoToParticipantsOption ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowValidationModal(false);
                      setShowGoToParticipantsOption(false);
                    }}
                    className="flex-1 px-6 py-3 bg-[var(--card-background)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-lg transition-colors font-semibold text-[var(--text-primary)]"
                  >
                    Continuar aquí
                  </button>
                  <button
                    onClick={handleGuardarYAsignarParticipantes}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg transition-colors font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar y asignar participantes"
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    setShowGoToParticipantsOption(false);
                  }}
                  className="w-full px-6 py-3 bg-[var(--secondary)] hover:bg-[var(--secondary-dark)] rounded-lg transition-colors font-semibold text-white"
                >
                  Aceptar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Distribución de Cuotas */}
      {showQuotaDistributionModal && (
        <QuotaDistributionModal
          open={showQuotaDistributionModal}
          onClose={() => setShowQuotaDistributionModal(false)}
          encuestadores={encuestadoresParaDistribucion}
          categorias={config.categorias}
          metaTotal={obtenerMetaEfectiva()}
          pollsterAssignments={pollsterAssignments}
          initialDistribution={currentDistribution}
          onSave={handleSaveDistribution}
        />
      )}
    </div>
  );
}
