"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  MapPin,
  Check,
  AlertCircle,
  ChevronDown,
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
  Pencil,
  BarChart3,
  Shuffle,
} from "lucide-react";
import { useSurveyCreation } from "../context/SurveyCreationContext";
import { surveyService } from "@/services/survey.service";
import { userService } from "@/services/user.service";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import QuotaDistributionModal from "../nueva/components/Modals/QuotaDistributionModal";
import PollsterSelectionModal from "../nueva/components/Modals/PollsterSelectionModal";
import SupervisorSelectionModal from "../nueva/components/Modals/SupervisorSelectionModal";

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
    goalType: "cases", // 'cases' o 'quotas'
    metaTotal: 100,
    categorias: [],
  });

  const [tienePreguntasCuota, setTienePreguntasCuota] = useState(false);
  const [quotaStructure, setQuotaStructure] = useState(null);

  // Función helper para detectar preguntas cuota
  const detectarPreguntasCuota = (surveyDefinition) => {
    if (!surveyDefinition?.modulos) return false;
    const todasLasPreguntas = surveyDefinition.modulos.flatMap(
      (m) => m.preguntas || [],
    );
    return todasLasPreguntas.some(
      (p) => p.tipo === "cuota-genero" || p.tipo === "cuota-edad",
    );
  };

  // Función para detectar estructura de cuotas y extraer opciones
  const detectQuotaStructure = (surveyDefinition) => {
    if (!surveyDefinition?.modulos) return null;

    const todasLasPreguntas = surveyDefinition.modulos.flatMap(
      (m) => m.preguntas || [],
    );
    const genderQuestion = todasLasPreguntas.find(
      (p) => p.tipo === "cuota-genero",
    );
    const ageQuestion = todasLasPreguntas.find((p) => p.tipo === "cuota-edad");

    if (!genderQuestion && !ageQuestion) return null;

    // Extraer solo el texto de las opciones (las opciones son objetos {id, value, text})
    const extractOptionTexts = (options) => {
      if (!options || !Array.isArray(options)) return [];
      return options.map((opt) => {
        // Si es un objeto, extraer el texto
        if (typeof opt === "object" && opt !== null) {
          return opt.text || opt.value || opt.label || String(opt);
        }
        // Si ya es un string, usarlo directamente
        return String(opt);
      });
    };

    const structure = {
      hasGender: !!genderQuestion,
      hasAge: !!ageQuestion,
      genderOptions: extractOptionTexts(genderQuestion?.opciones),
      ageOptions: extractOptionTexts(ageQuestion?.opciones),
      isCrossTable: !!genderQuestion && !!ageQuestion,
    };

    return structure;
  };

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
          goalType: surveyData.goalType || "cases",
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
      const surveyDefinition = response?.survey?.surveyDefinition;

      const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return !isNaN(date.getTime()) ? date.toISOString().split("T")[0] : "";
      };

      // Detectar si hay preguntas cuota en el formulario
      const hasCuotas = detectarPreguntasCuota(surveyDefinition);
      setTienePreguntasCuota(hasCuotas);

      // Detectar estructura de cuotas (opciones de género/edad)
      const structure = detectQuotaStructure(surveyDefinition);
      setQuotaStructure(structure);

      // Determinar goalType basado en los datos existentes
      let goalType = "cases"; // default

      // Si hay preguntas cuota, FORZAR a 'quotas'
      if (hasCuotas) {
        goalType = "quotas";
      } else {
        // Si no hay cuotas, usar el goalType guardado o inferirlo
        const hasQuotas = (surveyInfo.quotas || []).length > 0;
        goalType = surveyInfo.goalType || (hasQuotas ? "quotas" : "cases");
      }

      setConfig({
        fechaInicio: formatDateForInput(surveyInfo.startDate),
        fechaFin: formatDateForInput(surveyInfo.endDate),
        metaTotal: surveyInfo.target || 0,
        gpsObligatorio: surveyInfo.requireGps || false,
        goalType: goalType,
        categorias: (surveyInfo.quotas || []).map((q, catIdx) => {
          // Calcular el total de objetivos de esta categoría para poder calcular porcentajes
          const totalObjetivos = q.segments.reduce(
            (sum, s) => sum + (s.target || 0),
            0,
          );
          return {
            id: Date.now() + Math.random(),
            nombre: q.category,
            segmentos: q.segments.map((s, segIdx) => ({
              id: Date.now() + Math.random(),
              // Preservar segmentId si existe, o generar uno nuevo para datos legacy
              segmentId:
                s.segmentId ||
                `seg_legacy_${catIdx}_${segIdx}_${Math.random().toString(36).substr(2, 9)}`,
              nombre: s.name,
              objetivo: s.target,
              // Calcular porcentaje basado en el objetivo del segmento respecto al total
              porcentaje:
                totalObjetivos > 0
                  ? Math.round((s.target / totalObjetivos) * 100)
                  : 0,
              icon: "User",
            })),
          };
        }),
      });

      // Cargar distribución existente si hay
      // quotaAssignments está en surveyInfo, pollsterAssignments en participants
      const surveyInfoData = response?.survey?.surveyInfo;
      const participantsData = response?.survey?.participants;
      if (
        surveyInfoData?.quotaAssignments?.length > 0 ||
        participantsData?.pollsterAssignments?.length > 0
      ) {
        setCurrentDistribution({
          quotaAssignments: surveyInfoData?.quotaAssignments || [],
          pollsterAssignments: participantsData?.pollsterAssignments || [],
        });
      }

      // Cargar asignaciones de casos por encuestador
      if (participantsData?.pollsterAssignments?.length > 0) {
        setPollsterAssignments(participantsData.pollsterAssignments);
      }

      // Cargar participantes asignados - buscar en múltiples ubicaciones posibles
      const userIds =
        response?.survey?.surveyInfo?.userIds ||
        response?.survey?.participants?.userIds ||
        response?.survey?.userIds ||
        surveyInfo.userIds ||
        participantsData?.userIds ||
        [];

      const supervisorsIds =
        response?.survey?.surveyInfo?.supervisorsIds ||
        response?.survey?.participants?.supervisorsIds ||
        response?.survey?.supervisorsIds ||
        surveyInfo.supervisorsIds ||
        participantsData?.supervisorsIds ||
        [];

      setAssignedPollsters((userIds || []).map(String));
      setAssignedSupervisors((supervisorsIds || []).map(String));

      // Cargar detalles de encuestadores
      if (userIds && userIds.length > 0) {
        await loadPollsterDetails(userIds.map(String));
      }

      // Cargar distribución de cuotas existente

      const quotaAssignments =
        participantsData?.quotaAssignments ||
        surveyInfoData?.quotaAssignments ||
        [];
      if (quotaAssignments.length > 0) {
        const loadedQuotaData = {};

        quotaAssignments.forEach((assignment) => {
          const pollsterId = String(assignment.pollsterId);
          loadedQuotaData[pollsterId] = {};

          // Reconstruir los datos de distribución desde quotas/segments
          if (assignment.quotas && Array.isArray(assignment.quotas)) {
            assignment.quotas.forEach((quota) => {
              // Cada quota tiene category y segments
              if (quota.segments && Array.isArray(quota.segments)) {
                quota.segments.forEach((segment) => {
                  // Detectar si es tabla cruzada o simple basándose en el nombre del segmento
                  const nameParts = segment.name.split(" - ");

                  if (nameParts.length === 2) {
                    // Tabla cruzada: "Masculino - 18-35"
                    const [gender, age] = nameParts;
                    const key = `${gender}_${age}`;
                    loadedQuotaData[pollsterId][key] = segment.target || 0;
                  } else {
                    // Tabla simple: solo género o edad
                    loadedQuotaData[pollsterId][segment.name] =
                      segment.target || 0;
                  }
                });
              }
            });
          }
        });

        setQuotaDistributionData(loadedQuotaData);
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
  const [editingSegmentName, setEditingSegmentName] = useState(null); // {categoriaId, segmentoIndex}
  const [quotaDistributionData, setQuotaDistributionData] = useState({}); // {pollsterId: {segmentKey: value}}

  // Estados para modales de participantes
  const [showPollsterModal, setShowPollsterModal] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [assignedPollsters, setAssignedPollsters] = useState([]);
  const [assignedSupervisors, setAssignedSupervisors] = useState([]);
  const [pollsterDetails, setPollsterDetails] = useState({}); // {id: {nombre, apellido}}

  const updateConfig = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Función para cargar detalles de encuestadores
  const loadPollsterDetails = async (pollsterIds) => {
    if (!pollsterIds || pollsterIds.length === 0) {
      setPollsterDetails({});
      return;
    }

    try {
      // Cargar todos los encuestadores del backend
      const pollstersResponse = await userService.getPollsters();
      const allPollsters = pollstersResponse.users || [];

      const details = {};
      pollsterIds.forEach((id) => {
        // Buscar el encuestador en la lista cargada
        const pollster = allPollsters.find((p) => String(p._id) === String(id));
        if (pollster) {
          details[id] = {
            nombre: pollster.nombre || pollster.name || "",
            apellido: pollster.apellido || pollster.lastName || "",
            foto: pollster.foto || pollster.photo || pollster.avatar || null,
          };
        } else {
          details[id] = {
            nombre: "Encuestador",
            apellido: "",
            foto: null,
          };
        }
      });
      setPollsterDetails(details);
    } catch (error) {
      console.error("Error loading pollster details:", error);
      // Fallback a placeholders en caso de error
      const details = {};
      pollsterIds.forEach((id, index) => {
        details[id] = {
          nombre: `Encuestador ${index + 1}`,
          apellido: "",
          foto: null,
        };
      });
      setPollsterDetails(details);
    }
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
      0,
    );
  };

  const calcularTotalDeCuotas = () => {
    if (config.categorias.length === 0) return 0;
    // Encontrar la categoría con mayor total (ya que las cuotas deben cumplirse simultáneamente)
    const totales = config.categorias.map((cat) => calcularTotalAsignado(cat));
    return Math.max(...totales, 0);
  };

  const obtenerMetaEfectiva = () => {
    if (config.goalType === "cases" && config.metaTotal > 0) {
      return config.metaTotal;
    }
    // Si es por cuotas, usar el total de cuotas como mínimo
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
              Math.max(0, parseInt(value) || 0),
            );
            const newObjetivo = Math.round(
              (newPorcentaje / 100) * metaEfectiva,
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
                  100,
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
        {
          nombre: "",
          objetivo: 0,
          porcentaje: 0,
          icon: "User",
          segmentId: `seg_${Date.now()}_${prev.segmentos.length}_${Math.random().toString(36).substr(2, 9)}`,
        },
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
        i === index ? { ...seg, [field]: value } : seg,
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
        segmentos: plantilla.segmentos.map((seg, idx) => ({
          ...seg,
          segmentId: `seg_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
        })),
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
      s.nombre.trim(),
    );
    if (segmentosValidos.length < 2) {
      setValidationMessage(
        "Debes agregar al menos 2 segmentos para crear una cuota. Una categoría con un solo segmento no tiene sentido para distribuir cuotas.",
      );
      setShowValidationModal(true);
      return;
    }

    // Generar segmentId único para cada segmento
    const segmentosConId = segmentosValidos.map((s, idx) => ({
      ...s,
      segmentId:
        s.segmentId ||
        `seg_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    const nuevaCat = {
      id: Date.now(),
      nombre: nuevaCategoria.nombre,
      editable: true,
      segmentos: segmentosConId,
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
          "Debes asignar participantes antes de poder distribuir las cuotas",
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
        userIds.includes(pollster._id),
      );

      if (encuestadoresData.length === 0) {
        setValidationMessage(
          "Debes asignar participantes antes de poder distribuir las cuotas",
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
      // NOTA: quotaAssignments va en surveyInfo (como define el modelo),
      // pollsterAssignments va en participants (para asignación de casos)
      const dataToSave = {
        survey: surveyData,
        surveyDefinition: definition,
        surveyInfo: {
          ...surveyInfo,
          quotaAssignments: distributionData.quotaAssignments, // Asignaciones de cuotas por encuestador
        },
        participants: {
          userIds: surveyInfo.userIds || [],
          supervisorsIds: surveyInfo.supervisorsIds || [],
          pollsterAssignments: distributionData.pollsterAssignments, // Asignación de casos por encuestador
        },
      };

      // Actualizar en el backend
      await surveyService.createOrUpdateSurvey(dataToSave, surveyId, false);

      toast.success("Distribución de cuotas guardada exitosamente");
      setShowQuotaDistributionModal(false);

      // Actualizar distribución actual
      setCurrentDistribution({
        ...dataToSave.participants,
        quotaAssignments: distributionData.quotaAssignments,
      });
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
          segmentId: seg.segmentId, // Incluir ID para sincronización robusta
          name: seg.nombre,
          target: seg.objetivo,
          current: 0,
        })),
      }));

      // Preparar datos completos manteniendo preguntas existentes
      // NOTA: quotaAssignments va en surveyInfo, pollsterAssignments va en participants
      const dataToSave = {
        survey: surveyData,
        surveyDefinition: definition,
        surveyInfo: {
          ...surveyInfo,
          startDate: config.fechaInicio,
          endDate: config.fechaFin,
          goalType: config.goalType,
          target: config.goalType === "cases" ? config.metaTotal : 0,
          requireGps: config.gpsObligatorio,
          quotas: config.goalType === "quotas" ? quotas : [],
          quotaAssignments:
            existing?.survey?.surveyInfo?.quotaAssignments || [],
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
        },
      };

      // Actualizar en el backend - PUBLISHED, no draft
      await surveyService.createOrUpdateSurvey(dataToSave, surveyId, false);

      toast.success("Configuración guardada exitosamente");
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
      setShowValidationModal(false);
      setShowGoToParticipantsOption(false);
    }
  };

  // Funciones para manejar modales de participantes
  const handleSavePollsters = async (pollsterIds) => {
    setAssignedPollsters(pollsterIds);
    // Cargar detalles de encuestadores
    await loadPollsterDetails(pollsterIds);
    setShowPollsterModal(false);
  };

  const handleSaveSupervisors = async (supervisorIds) => {
    setAssignedSupervisors(supervisorIds);
    setShowSupervisorModal(false);
  };

  // Funciones para distribución de casos
  const handleCaseAssignment = (pollsterId, cases) => {
    setPollsterAssignments((prev) => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(
        (a) => a.pollsterId === pollsterId,
      );

      if (existingIndex >= 0) {
        updated[existingIndex] = {
          pollsterId,
          assignedCases: parseInt(cases) || 0,
        };
      } else {
        updated.push({ pollsterId, assignedCases: parseInt(cases) || 0 });
      }

      return updated;
    });
  };

  const getTotalAssignedCases = () => {
    return pollsterAssignments.reduce(
      (total, assignment) => total + (assignment.assignedCases || 0),
      0,
    );
  };

  const getAssignedCases = (pollsterId) => {
    const assignment = pollsterAssignments.find(
      (a) => a.pollsterId === pollsterId,
    );
    return assignment ? assignment.assignedCases || 0 : 0;
  };

  const updatePollsterCases = (pollsterId, cases) => {
    setPollsterAssignments((prev) => {
      const existing = prev.find((a) => a.pollsterId === pollsterId);
      if (existing) {
        return prev.map((a) =>
          a.pollsterId === pollsterId ? { ...a, assignedCases: cases } : a,
        );
      } else {
        return [...prev, { pollsterId, assignedCases: cases }];
      }
    });
  };

  const distributeEqually = () => {
    const metaEfectiva = obtenerMetaEfectiva();
    if (!metaEfectiva || assignedPollsters.length === 0) return;

    const casesPerPollster = Math.floor(
      metaEfectiva / assignedPollsters.length,
    );
    const remainder = metaEfectiva % assignedPollsters.length;

    const newAssignments = assignedPollsters.map((pollsterId, index) => ({
      pollsterId,
      assignedCases: casesPerPollster + (index === 0 ? remainder : 0),
    }));

    setPollsterAssignments(newAssignments);
    toast.success("Casos distribuidos equitativamente");
  };

  const saveCaseDistribution = async () => {
    try {
      setIsSaving(true);

      const existing = await surveyService.getSurvey(surveyId);
      const surveyData = existing?.survey?.survey || existing?.survey;
      const surveyInfo = existing?.survey?.surveyInfo || {};
      const definition = existing?.survey?.surveyDefinition;

      const dataToSave = {
        survey: surveyData,
        surveyDefinition: definition,
        surveyInfo: {
          ...surveyInfo,
          metaMode: config.goalType === "cases" ? "casos" : "cuotas", // Guardar metaMode
        },
        participants: {
          userIds: assignedPollsters,
          supervisorsIds: assignedSupervisors,
          pollsterAssignments: pollsterAssignments,
          quotaAssignments:
            existing?.survey?.participants?.quotaAssignments || [],
        },
      };

      await surveyService.createOrUpdateSurvey(dataToSave, surveyId, false);
      toast.success("Distribución de casos guardada exitosamente");
    } catch (error) {
      console.error("Error al guardar distribución de casos:", error);
      toast.error("Error al guardar distribución: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Verificar si hay distribución guardada
  const hasDistribution = currentDistribution?.quotaAssignments?.length > 0;
  const distributedPollstersCount =
    currentDistribution?.pollsterAssignments?.length || 0;

  // Funciones para distribución de cuotas
  const updateQuotaValue = (pollsterId, segmentKey, value) => {
    setQuotaDistributionData((prev) => ({
      ...prev,
      [pollsterId]: {
        ...(prev[pollsterId] || {}),
        [segmentKey]: parseInt(value) || 0,
      },
    }));
  };

  const getQuotaValue = (pollsterId, segmentKey) => {
    return quotaDistributionData[pollsterId]?.[segmentKey] || 0;
  };

  // Calcular total de una fila (género) para un pollster en tabla cruzada
  const getRowTotal = (pollsterId, genderOption) => {
    if (!quotaStructure?.ageOptions) return 0;
    return quotaStructure.ageOptions.reduce((sum, ageOption) => {
      const key = `${genderOption}_${ageOption}`;
      return sum + getQuotaValue(pollsterId, key);
    }, 0);
  };

  // Calcular total de una columna (edad) para un pollster en tabla cruzada
  const getColumnTotal = (pollsterId, ageOption) => {
    if (!quotaStructure?.genderOptions) return 0;
    return quotaStructure.genderOptions.reduce((sum, genderOption) => {
      const key = `${genderOption}_${ageOption}`;
      return sum + getQuotaValue(pollsterId, key);
    }, 0);
  };

  // Calcular total general de un pollster
  const getPollsterQuotaTotal = (pollsterId) => {
    if (!quotaStructure) return 0;

    if (quotaStructure.isCrossTable) {
      // Tabla cruzada: sumar todas las celdas
      return quotaStructure.genderOptions.reduce((total, genderOption) => {
        return (
          total +
          quotaStructure.ageOptions.reduce((sum, ageOption) => {
            const key = `${genderOption}_${ageOption}`;
            return sum + getQuotaValue(pollsterId, key);
          }, 0)
        );
      }, 0);
    } else {
      // Tabla simple: sumar todos los segmentos
      const options = quotaStructure.hasGender
        ? quotaStructure.genderOptions
        : quotaStructure.ageOptions;
      return options.reduce((sum, option) => {
        return sum + getQuotaValue(pollsterId, option);
      }, 0);
    }
  };

  // Calcular total general de todos los pollsters
  const getTotalQuotaDistribution = () => {
    return assignedPollsters.reduce((total, pollsterId) => {
      return total + getPollsterQuotaTotal(pollsterId);
    }, 0);
  };

  // Preparar quotaAssignments para el backend
  const prepareQuotaAssignments = () => {
    if (!quotaStructure || assignedPollsters.length === 0) return [];

    return assignedPollsters
      .map((pollsterId) => {
        const pollsterData = quotaDistributionData[pollsterId] || {};

        const quotas = [];

        if (quotaStructure.isCrossTable) {
          // Tabla cruzada: crear UNA cuota con categoría "Género y Edad" y todos los segmentos
          const segments = [];

          quotaStructure.genderOptions.forEach((genderOption) => {
            quotaStructure.ageOptions.forEach((ageOption) => {
              const key = `${genderOption}_${ageOption}`;
              const value = pollsterData[key] || 0;

              if (value > 0) {
                segments.push({
                  name: `${genderOption} - ${ageOption}`,
                  target: value,
                  current: 0,
                });
              }
            });
          });

          if (segments.length > 0) {
            quotas.push({
              category: "Género y Edad",
              segments: segments,
            });
          }
        } else {
          // Tabla simple: crear UNA cuota con la categoría correspondiente
          const category = quotaStructure.hasGender ? "Género" : "Edad";
          const options = quotaStructure.hasGender
            ? quotaStructure.genderOptions
            : quotaStructure.ageOptions;

          const segments = [];
          options.forEach((option) => {
            const value = pollsterData[option] || 0;

            if (value > 0) {
              segments.push({
                name: option,
                target: value,
                current: 0,
              });
            }
          });

          if (segments.length > 0) {
            quotas.push({
              category: category,
              segments: segments,
            });
          }
        }

        return {
          pollsterId,
          quotas: quotas,
        };
      })
      .filter((assignment) => assignment.quotas.length > 0);
  };

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
                        ? "GPS obligatorio. En caso de error o fallas con la señal, el caso no se registra"
                        : "GPS no obligatorio. En caso de error o fallas con la señal, el caso se registra sin coordenadas"}
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
                      config.gpsObligatorio
                        ? "transform translate-x-5 sm:translate-x-6"
                        : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 3. Tipo de Meta */}
            <div className="bg-[var(--card-background)] rounded-lg border-2 border-[var(--card-border)] hover:border-[var(--primary)] transition-all p-4 sm:p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-base sm:text-lg text-[var(--text-primary)] mb-2">
                  Tipo de Meta
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Selecciona cómo deseas establecer el objetivo de tu encuesta
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Opción: Objetivo de Casos */}
                <button
                  onClick={() =>
                    !tienePreguntasCuota && updateConfig("goalType", "cases")
                  }
                  disabled={tienePreguntasCuota}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    config.goalType === "cases"
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm"
                      : tienePreguntasCuota
                        ? "border-[var(--card-border)] bg-[var(--card-background)] opacity-60 cursor-not-allowed"
                        : "border-[var(--card-border)] bg-[var(--card-background)] opacity-50 hover:opacity-100 hover:border-[var(--primary)]/50"
                  }`}
                  title={
                    tienePreguntasCuota
                      ? "Tu encuesta tiene preguntas de tipo cuota, no es posible seleccionar meta por casos"
                      : ""
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 transition-all ${
                        config.goalType === "cases"
                          ? "bg-[var(--primary)] shadow-sm"
                          : "bg-[var(--card-border)]"
                      }`}
                    >
                      <Target
                        size={20}
                        className={
                          config.goalType === "cases"
                            ? "text-white"
                            : "text-[var(--text-secondary)]"
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`font-semibold text-sm sm:text-base ${
                            config.goalType === "cases"
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          Objetivo de Casos
                        </h4>
                        {config.goalType === "cases" && (
                          <div className="w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center flex-shrink-0">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                      <p
                        className={`text-xs sm:text-sm ${
                          config.goalType === "cases"
                            ? "text-[var(--text-secondary)]"
                            : "text-[var(--text-secondary)]/70"
                        }`}
                      >
                        Define una meta numérica para tu encuesta
                      </p>

                      {/* Mensaje de advertencia si hay preguntas cuota */}
                      {tienePreguntasCuota && (
                        <div
                          className="mt-2 p-2 rounded text-xs flex items-center gap-1.5"
                          style={{
                            backgroundColor: "var(--warning-bg)",
                            border: "1px solid var(--warning-border)",
                            color: "var(--warning)",
                          }}
                        >
                          <AlertCircle size={14} className="flex-shrink-0" />
                          <span>Tu encuesta tiene preguntas de tipo cuota</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Opción: Sistema de Cuotas */}
                <button
                  onClick={() => updateConfig("goalType", "quotas")}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    config.goalType === "quotas"
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm"
                      : "border-[var(--card-border)] bg-[var(--card-background)] opacity-50 hover:opacity-100 hover:border-[var(--primary)]/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 transition-all ${
                        config.goalType === "quotas"
                          ? "bg-[var(--primary)] shadow-sm"
                          : "bg-[var(--card-border)]"
                      }`}
                    >
                      <PieChart
                        size={20}
                        className={
                          config.goalType === "quotas"
                            ? "text-white"
                            : "text-[var(--text-secondary)]"
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`font-semibold text-sm sm:text-base ${
                            config.goalType === "quotas"
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          Sistema de Cuotas
                        </h4>
                        {config.goalType === "quotas" && (
                          <div className="w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center flex-shrink-0">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                      <p
                        className={`text-xs sm:text-sm ${
                          config.goalType === "quotas"
                            ? "text-[var(--text-secondary)]"
                            : "text-[var(--text-secondary)]/70"
                        }`}
                      >
                        Balancea tu muestra por segmentos
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Contenido específico según el tipo seleccionado */}
              {config.goalType === "cases" && (
                <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
                  <div className="max-w-md mx-auto">
                    <label className="block text-center text-sm font-medium text-[var(--text-secondary)] mb-3">
                      Meta total de encuestas{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={config.metaTotal || ""}
                        onChange={(e) =>
                          updateConfig(
                            "metaTotal",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 border-2 border-[var(--primary)]/30 rounded-xl px-6 py-5 text-[var(--primary)] text-center text-4xl font-bold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                        min="1"
                      />
                      <div className="text-center mt-2 text-xs text-[var(--text-secondary)]">
                        Número de encuestas objetivo
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Asignación de Participantes */}
            <div className="bg-[var(--card-background)] rounded-lg border-2 border-[var(--card-border)] hover:border-[var(--primary)] transition-all p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                  <Users2 size={20} className="text-[var(--primary)]" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg text-[var(--text-primary)]">
                  Participantes Asignados
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Botón Encuestadores */}
                <button
                  onClick={() => setShowPollsterModal(true)}
                  className="flex items-center gap-4 p-4 bg-[var(--card-background)] border-2 border-[var(--primary-light)] hover:border-[var(--primary)] rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  <div className="w-14 h-14 rounded-xl bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                    <Users2 size={24} className="text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-bold text-[var(--text-primary)] mb-1">
                      Encuestadores
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {assignedPollsters.length} asignados
                    </p>
                  </div>
                </button>

                {/* Botón Supervisores */}
                <button
                  onClick={() => setShowSupervisorModal(true)}
                  className="flex items-center gap-4 p-4 bg-[var(--card-background)] border-2 border-[var(--secondary-dark)] hover:border-[var(--secondary)] rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  <div className="w-14 h-14 rounded-xl bg-[var(--secondary-dark)] flex items-center justify-center flex-shrink-0">
                    <UserCheck size={24} className="text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-bold text-[var(--text-primary)] mb-1">
                      Supervisores
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {assignedSupervisors.length} asignados
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 6. Distribución de Casos/Cuotas */}
            {config.goalType && (
              <div className="bg-[var(--card-background)] rounded-lg border-2 border-[var(--card-border)] hover:border-[var(--primary)] transition-all p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                    <BarChart3 size={20} className="text-[var(--primary)]" />
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg text-[var(--text-primary)]">
                    {config.goalType === "cases"
                      ? "Distribución de Casos"
                      : "Distribución de Cuotas"}
                  </h3>
                </div>

                {/* Distribución por Casos */}
                {config.goalType === "cases" &&
                  (assignedPollsters.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 bg-[var(--primary)]/5 border border-[var(--card-border)] rounded-lg">
                      <AlertCircle
                        size={20}
                        className="flex-shrink-0 text-[var(--text-secondary)]"
                      />
                      <p className="text-[var(--text-secondary)]">
                        Es necesario seleccionar los participantes antes de
                        distribuir los casos
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Botón Distribuir Equitativamente */}
                      <div className="flex justify-end">
                        <button
                          onClick={distributeEqually}
                          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <Shuffle size={16} />
                          Distribuir Equitativamente
                        </button>
                      </div>

                      {/* Lista de encuestadores con inputs */}
                      <div className="space-y-2">
                        {assignedPollsters.map((pollsterId) => {
                          const details = pollsterDetails[pollsterId];
                          return (
                            <div
                              key={pollsterId}
                              className="flex items-center gap-3 p-3 bg-[var(--hover-bg)] rounded-lg border border-[var(--card-border)]"
                            >
                              <div className="flex-1 flex items-center gap-3">
                                {/* Foto del encuestador */}
                                {details?.foto ? (
                                  <img
                                    src={details.foto}
                                    alt={`${details.nombre} ${details.apellido}`}
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-semibold text-sm flex-shrink-0">
                                    <Users2 size={16} />
                                  </div>
                                )}
                                <span className="font-medium text-[var(--text-primary)] text-sm">
                                  {details
                                    ? `${details.nombre} ${details.apellido}`.trim() ||
                                      "Encuestador"
                                    : "Encuestador"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-[var(--text-secondary)]">
                                  Casos:
                                </label>
                                <input
                                  type="number"
                                  value={getAssignedCases(pollsterId) || ""}
                                  onChange={(e) =>
                                    updatePollsterCases(
                                      pollsterId,
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  className="w-20 px-3 py-2 bg-[var(--primary)]/5 border border-[var(--primary)]/30 rounded-lg text-[var(--primary)] text-center font-semibold focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0"
                                  min="0"
                                  max={config.metaTotal}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Total asignado */}
                      <div className="flex items-center justify-between p-4 bg-[var(--primary)]/5 border-2 border-[var(--primary)]/30 rounded-lg">
                        <span className="font-semibold text-[var(--text-primary)]">
                          Total Asignado:
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-2xl font-bold ${
                              getTotalAssignedCases() > config.metaTotal
                                ? "text-[var(--error-text)]"
                                : "text-[var(--primary)]"
                            }`}
                          >
                            {getTotalAssignedCases()}
                          </span>
                          <span className="text-[var(--text-secondary)]">
                            / {config.metaTotal}
                          </span>
                        </div>
                      </div>

                      {getTotalAssignedCases() > config.metaTotal && (
                        <div className="flex items-center gap-2 p-3 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg text-[var(--error-text)] text-sm">
                          <AlertCircle size={16} className="flex-shrink-0" />
                          <span>
                            El total asignado excede la meta. Ajusta los valores
                            antes de guardar.
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                {/* Distribución por Cuotas */}
                {config.goalType === "quotas" && (
                  <div>
                    {!quotaStructure ? (
                      <div className="flex items-center gap-3 p-4 bg-[var(--primary)]/5 border border-[var(--warning-border)] rounded-lg">
                        <AlertCircle
                          size={20}
                          className="flex-shrink-0 text-[var(--warning)]"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-[var(--text-primary)]">
                            Es necesario crear las preguntas de tipo cuota en el
                            formulario para poder configurar la distribución
                          </p>
                          <p className="text-sm mt-1 text-[var(--text-secondary)]">
                            Ve a la sección de creación de formulario y agrega
                            preguntas de tipo "Cuota Género" o "Cuota Edad"
                          </p>
                        </div>
                      </div>
                    ) : assignedPollsters.length === 0 ? (
                      <div className="flex items-center gap-3 p-4 bg-[var(--primary)]/5 border border-[var(--card-border)] rounded-lg">
                        <AlertCircle
                          size={20}
                          className="flex-shrink-0 text-[var(--text-secondary)]"
                        />
                        <p className="text-[var(--text-secondary)]">
                          Es necesario seleccionar los participantes antes de
                          distribuir las cuotas
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Tablas por encuestador */}
                        {assignedPollsters.map((pollsterId, pollsterIndex) => {
                          const details = pollsterDetails[pollsterId];
                          const pollsterName = details
                            ? `${details.nombre} ${details.apellido}`.trim() ||
                              "Encuestador"
                            : "Encuestador";

                          return (
                            <div
                              key={pollsterId}
                              className="border-2 border-[var(--card-border)] rounded-lg p-4"
                            >
                              {/* Header del encuestador */}
                              <div className="flex items-center gap-3 mb-4 pb-3">
                                {details?.foto ? (
                                  <img
                                    src={details.foto}
                                    alt={pollsterName}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-semibold flex-shrink-0">
                                    <Users2 size={20} />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h4 className="font-bold text-[var(--text-primary)]">
                                    {pollsterName}
                                  </h4>
                                  <p className="text-sm text-[var(--text-secondary)]">
                                    Total:{" "}
                                    <span className="font-semibold text-[var(--primary)]">
                                      {getAssignedCases(pollsterId) || 0}
                                    </span>{" "}
                                    casos
                                  </p>
                                </div>
                              </div>

                              {/* Tabla de distribución */}
                              {quotaStructure.isCrossTable ? (
                                // Tabla de doble entrada (Género Y Edad)
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr>
                                        <th className="border border-[var(--card-border)] bg-[var(--card-background)] p-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                                          {/* Esquina superior izquierda vacía */}
                                        </th>
                                        {quotaStructure.ageOptions.map(
                                          (ageOption, idx) => (
                                            <th
                                              key={idx}
                                              className="border border-[var(--card-border)] bg-[var(--card-background)] p-2 text-center text-sm font-semibold text-[var(--text-primary)]"
                                            >
                                              {ageOption}
                                            </th>
                                          ),
                                        )}
                                        <th className="border border-[var(--card-border)] bg-[var(--primary)]/10 p-2 text-center text-sm font-bold text-[var(--primary)]">
                                          TOTAL
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {quotaStructure.genderOptions.map(
                                        (genderOption, genderIdx) => (
                                          <tr key={genderIdx}>
                                            <td className="border border-[var(--card-border)] bg-[var(--card-background)] p-2 text-sm font-semibold text-[var(--text-primary)]">
                                              {genderOption}
                                            </td>
                                            {quotaStructure.ageOptions.map(
                                              (ageOption, ageIdx) => {
                                                const cellKey = `${genderOption}_${ageOption}`;
                                                return (
                                                  <td
                                                    key={ageIdx}
                                                    className="border border-[var(--card-border)] bg-[var(--card-background)] p-1"
                                                  >
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      placeholder="0"
                                                      value={
                                                        getQuotaValue(
                                                          pollsterId,
                                                          cellKey,
                                                        ) || ""
                                                      }
                                                      onChange={(e) =>
                                                        updateQuotaValue(
                                                          pollsterId,
                                                          cellKey,
                                                          e.target.value,
                                                        )
                                                      }
                                                      className="w-full px-2 py-1.5 bg-[var(--input-background)] border border-[var(--card-border)] rounded text-center text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                      onFocus={(e) =>
                                                        e.target.select()
                                                      }
                                                    />
                                                  </td>
                                                );
                                              },
                                            )}
                                            <td className="border border-[var(--card-border)] bg-[var(--primary)]/5 p-2 text-center text-sm font-bold text-[var(--primary)]">
                                              {getRowTotal(
                                                pollsterId,
                                                genderOption,
                                              )}
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                      {/* Fila de totales */}
                                      <tr>
                                        <td className="border border-[var(--card-border)] bg-[var(--primary)]/10 p-2 text-sm font-bold text-[var(--primary)]">
                                          Total
                                        </td>
                                        {quotaStructure.ageOptions.map(
                                          (ageOption, idx) => (
                                            <td
                                              key={idx}
                                              className="border border-[var(--card-border)] bg-[var(--primary)]/5 p-2 text-center text-sm font-bold text-[var(--primary)]"
                                            >
                                              {getColumnTotal(
                                                pollsterId,
                                                ageOption,
                                              )}
                                            </td>
                                          ),
                                        )}
                                        <td className="border border-[var(--card-border)] bg-[var(--primary)]/10 p-2 text-center text-sm font-bold text-[var(--primary)]">
                                          {getPollsterQuotaTotal(pollsterId)}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                // Tabla simple (Género O Edad)
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr>
                                        <th className="border border-[var(--card-border)] bg-[var(--card-background)] p-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                                          {quotaStructure.hasGender
                                            ? "Género"
                                            : "Edad"}
                                        </th>
                                        <th className="border border-[var(--card-border)] bg-[var(--card-background)] p-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                                          Casos
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(quotaStructure.hasGender
                                        ? quotaStructure.genderOptions
                                        : quotaStructure.ageOptions
                                      ).map((option, idx) => {
                                        const cellKey = `${pollsterId}_${option}`;
                                        return (
                                          <tr key={idx}>
                                            <td className="border border-[var(--card-border)] bg-[var(--card-background)] p-2 text-sm font-medium text-[var(--text-primary)]">
                                              {option}
                                            </td>
                                            <td className="border border-[var(--card-border)] bg-[var(--card-background)] p-1">
                                              <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={
                                                  getQuotaValue(
                                                    pollsterId,
                                                    option,
                                                  ) || ""
                                                }
                                                onChange={(e) =>
                                                  updateQuotaValue(
                                                    pollsterId,
                                                    option,
                                                    e.target.value,
                                                  )
                                                }
                                                className="w-full px-2 py-1.5 bg-[var(--input-background)] border border-[var(--card-border)] rounded text-center text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                onFocus={(e) =>
                                                  e.target.select()
                                                }
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {/* Fila de total */}
                                      <tr>
                                        <td className="border border-[var(--card-border)] bg-[var(--primary)]/10 p-2 text-sm font-bold text-[var(--primary)]">
                                          Total
                                        </td>
                                        <td className="border border-[var(--card-border)] bg-[var(--primary)]/5 p-2 text-center text-sm font-bold text-[var(--primary)]">
                                          {getPollsterQuotaTotal(pollsterId)}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Resumen global */}
                        <div className="flex items-center justify-between p-4 bg-[var(--primary)]/5 border-2 border-[var(--primary)]/30 rounded-lg">
                          <span className="font-semibold text-[var(--text-primary)]">
                            Total General Asignado:
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-[var(--primary)]">
                              {getTotalQuotaDistribution()}
                            </span>
                            <span className="text-[var(--text-secondary)]">
                              casos
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra inferior pegada al scroll container (evita hardcodes del sidebar) */}
      <div className="sticky bottom-0 bg-[var(--card-background)] border-t border-[var(--card-border)] px-4 py-3 z-20 shadow-xl">
        <div className="max-w-5xl mx-auto flex gap-2 sm:gap-3">
          <button
            onClick={() => router.push("/dashboard/encuestas")}
            className="flex-1 px-6 py-3 text-[var(--error-text)] hover:bg-[var(--error-bg)]/80 border border-[var(--error-border)] rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              // Validar que haya ID
              if (!surveyId) {
                setValidationMessage(
                  "No se puede guardar configuración sin una encuesta seleccionada",
                );
                setShowValidationModal(true);
                return;
              }

              // Validar fechas
              if (!config.fechaInicio || !config.fechaFin) {
                setValidationMessage(
                  "Debes seleccionar fechas de inicio y fin",
                );
                setShowValidationModal(true);
                return;
              }

              // Validar que la fecha de fin sea posterior a la de inicio
              if (new Date(config.fechaFin) < new Date(config.fechaInicio)) {
                setValidationMessage(
                  "La fecha de fin debe ser posterior a la fecha de inicio",
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
                    "Debes agregar al menos una categoría de cuota",
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
                      `La categoría "${categoria.nombre}" debe tener un total de ${metaEfectiva} (actualmente: ${totalAsignado})`,
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
                const { prepareDataForBackend } =
                  await import("../utils/transformToSurveyJS");

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
                    target: tienePreguntasCuota
                      ? getTotalQuotaDistribution()
                      : config.tieneObjetivo
                        ? config.metaTotal
                        : 0,
                    requireGps: config.gpsObligatorio,
                    quotas: config.cuotasActivas ? quotas : [],
                    quotaAssignments: tienePreguntasCuota
                      ? prepareQuotaAssignments()
                      : existing?.survey?.surveyInfo?.quotaAssignments ||
                        existing?.survey?.participants?.quotaAssignments ||
                        [],
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
                  },
                };

                // Actualizar en el backend - PUBLISHED, no draft
                await surveyService.createOrUpdateSurvey(
                  dataToSave,
                  surveyId,
                  false,
                );

                toast.success("Configuración guardada exitosamente");
                router.push("/dashboard/encuestas");
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
                    <VenusAndMars
                      size={16}
                      className="text-[var(--primary)] sm:w-5 sm:h-5"
                    />
                    <span className="text-[var(--text-primary)] text-[10px] sm:text-sm">
                      Género
                    </span>
                  </button>
                  <button
                    onClick={() => aplicarPlantilla("edad")}
                    className={`px-2 sm:px-3 py-2 bg-[var(--card-background)] hover:bg-[var(--hover-bg)] rounded-lg font-medium text-[var(--text-primary)] transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 ${
                      plantillaSeleccionada === "edad"
                        ? "border-2 border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                        : "border border-[var(--card-border)]"
                    }`}
                  >
                    <Calendar
                      size={16}
                      className="text-[var(--primary)] sm:w-5 sm:h-5"
                    />
                    <span className="text-[var(--text-primary)] text-[10px] sm:text-sm">
                      Edad
                    </span>
                  </button>
                  <button
                    onClick={() => aplicarPlantilla("educacion")}
                    className={`px-2 sm:px-3 py-2 bg-[var(--card-background)] hover:bg-[var(--hover-bg)] rounded-lg font-medium text-[var(--text-primary)] transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 ${
                      plantillaSeleccionada === "educacion"
                        ? "border-2 border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                        : "border border-[var(--card-border)]"
                    }`}
                  >
                    <University
                      size={16}
                      className="text-[var(--primary)] sm:w-5 sm:h-5"
                    />
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
                    <BadgePlus
                      size={16}
                      className="text-yellow-500 sm:w-5 sm:h-5"
                    />
                    <span className="text-[var(--text-primary)] text-[10px] sm:text-sm">
                      NUEVA
                    </span>
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
                      "Guardar"
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

      {/* Modal de Selección de Encuestadores */}
      <PollsterSelectionModal
        open={showPollsterModal}
        onClose={() => setShowPollsterModal(false)}
        surveyId={surveyId}
        onSave={handleSavePollsters}
        initialData={{
          pollsters: assignedPollsters,
        }}
      />

      {/* Modal de Selección de Supervisores */}
      <SupervisorSelectionModal
        open={showSupervisorModal}
        onClose={() => setShowSupervisorModal(false)}
        surveyId={surveyId}
        onSave={handleSaveSupervisors}
        initialData={{
          supervisors: assignedSupervisors,
        }}
      />
    </div>
  );
}
