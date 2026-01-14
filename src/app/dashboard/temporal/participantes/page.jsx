"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  UserCheck,
  Search,
  Star,
  Check,
  MapPin,
  X,
  ChevronDown,
  Scale,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { userService } from "@/services/user.service";
import { surveyService } from "@/services/survey.service";
import ParticipantCard from "@/components/temporal/ParticipantCard";
import LocationSearchFilter from "@/components/temporal/LocationSearchFilter";
import UserAvatar from "@/components/ui/UserAvatar";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { useSurveyCreation } from '../context/SurveyCreationContext';
import { toast } from "react-toastify";

export default function ParticipantesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get('id');
  
  const { surveyData, updateSurveyData } = useSurveyCreation();
  const [isSaving, setIsSaving] = useState(false);

  // Flow state
  const [step, setStep] = useState(1); // 1 = type selection, 2 = participant selection
  const [selectedType, setSelectedType] = useState(null); // "pollsters" or "supervisors"

  // Data state
  const [participants, setParticipants] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState("todos"); // "todos", "ubicacion", "favoritos"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [isLocationFilterExpanded, setIsLocationFilterExpanded] = useState(true); // For collapsible location filter

  // Selection state
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [showSelectedOnMobile, setShowSelectedOnMobile] = useState(false); // For mobile expandable section
  
  // Case assignment state (for pollsters only)
  const [pollsterAssignments, setPollsterAssignments] = useState([]); // [{ pollsterId, assignedCases }]
  const [metaTotal, setMetaTotal] = useState(0); // Meta total from survey config

  // Pagination (aplica a la grilla luego de filtros/búsqueda)
  const participantsPageSize = 24;
  const [participantsPage, setParticipantsPage] = useState(0);

  // UI
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false); // For mobile location selection modal
  const [isSelectedPanelExpanded, setIsSelectedPanelExpanded] = useState(true); // For desktop selected panel
  const [showAddedFlash, setShowAddedFlash] = useState(false); // For flash effect when adding participant
  const contentTopRef = useRef(null);

  // Load data when type is selected
  useEffect(() => {
    if (selectedType && step === 2) {
      loadData();
    }
  }, [selectedType, step]);

  useEffect(() => {
    // Reset pagination al cambiar filtros o pestañas
    setParticipantsPage(0);
  }, [activeTab, searchQuery, selectedProvince, selectedCity, selectedType, step]);

  // Auto-expand location filter when switching to "ubicacion" tab
  useEffect(() => {
    if (activeTab === "ubicacion") {
      setIsLocationFilterExpanded(true);
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1) Cargar participantes del tipo seleccionado
      let loadedParticipants = [];
      if (selectedType === "pollsters") {
        const pollstersData = await userService.getPollsters();
        loadedParticipants = pollstersData.users || [];
      } else {
        const supervisorsData = await userService.getSupervisors();
        loadedParticipants = supervisorsData.supervisors || [];
      }

      setParticipants(loadedParticipants);

      // 2) Cargar favoritos persistidos del usuario actual (para este tipo)
      const favs = await userService.getFavorites(selectedType);
      setFavorites(favs || []);

      // 3) Precargar selección desde la encuesta (para que se vean marcados)
      // Nota: esto NO depende de favoritos, sino de lo guardado en la encuesta.
      if (surveyId) {
        try {
          const existing = await surveyService.getSurvey(surveyId);
          const surveyDoc = existing?.survey || {};
          const surveyInfo = surveyDoc?.surveyInfo || {};
          
          // Usar verificación en cascada para leer IDs guardados
          const savedIds =
            selectedType === "pollsters"
              ? (existing?.survey?.surveyInfo?.userIds ||
                 existing?.survey?.participants?.userIds ||
                 existing?.survey?.userIds ||
                 surveyInfo.userIds ||
                 [])
              : (existing?.survey?.surveyInfo?.supervisorsIds ||
                 existing?.survey?.participants?.supervisorsIds ||
                 existing?.survey?.supervisorsIds ||
                 surveyInfo.supervisorsIds ||
                 []);
          setSelectedParticipants((savedIds || []).map(String));
          
          // 4) Cargar meta total y asignaciones de casos (solo para pollsters)
          if (selectedType === "pollsters") {
            const target = surveyInfo.target || 0;
            setMetaTotal(target);
            
            // Usar verificación en cascada para leer asignaciones de casos
            const savedAssignments = 
              existing?.survey?.participants?.pollsterAssignments ||
              existing?.survey?.pollsterAssignments ||
              surveyInfo.pollsterAssignments || 
              [];
            
            console.log('📥 Cargando asignaciones existentes:', {
              savedAssignments: savedAssignments.length,
              assignments: savedAssignments
            });
            
            setPollsterAssignments(savedAssignments);
          }
        } catch (e) {
          console.warn("No se pudo precargar selección desde la encuesta:", e);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setParticipants([]);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for case assignment
  const handlePollsterAssignmentChange = (pollsterId, assignedCases) => {
    setPollsterAssignments((prev) => {
      const updated = [...prev];
      const existingIndex = updated.findIndex((a) => a.pollsterId === pollsterId);
      
      if (existingIndex >= 0) {
        updated[existingIndex] = { pollsterId, assignedCases };
      } else {
        updated.push({ pollsterId, assignedCases });
      }
      
      return updated;
    });
  };

  const getTotalAssignedCases = () => {
    return pollsterAssignments.reduce(
      (total, assignment) => total + (assignment.assignedCases || 0),
      0
    );
  };

  const getAssignedCases = (pollsterId) => {
    const assignment = pollsterAssignments.find(
      (a) => a.pollsterId === pollsterId
    );
    return assignment ? assignment.assignedCases || 0 : 0;
  };

  const distributeEqually = () => {
    if (!metaTotal || selectedParticipants.length === 0) return;
    
    const casesPerPollster = Math.floor(metaTotal / selectedParticipants.length);
    const remainder = metaTotal % selectedParticipants.length;
    
    const newAssignments = selectedParticipants.map((pollsterId, index) => ({
      pollsterId,
      assignedCases: casesPerPollster + (index === 0 ? remainder : 0),
    }));
    
    setPollsterAssignments(newAssignments);
  };

  // Auto-distribute when pollsters are selected - DISABLED per user request
  // Users want manual control over case assignment
  /*
  useEffect(() => {
    if (selectedType === "pollsters" && selectedParticipants.length > 0 && metaTotal > 0) {
      // Only auto-distribute if there are no existing assignments
      if (pollsterAssignments.length === 0) {
        distributeEqually();
      }
    }
  }, [selectedParticipants.length, metaTotal, selectedType]);
  */

  // Handle type selection
  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(2);
  };

  // Handle back button
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedType(null);
      setParticipants([]);
      setFavorites([]);
      setSelectedParticipants([]);
      setPollsterAssignments([]); // Reset assignments
      setMetaTotal(0); // Reset meta
      setSearchQuery("");
      setSelectedProvince("");
      setSelectedCity("");
      setActiveTab("todos");
    } else {
      router.back();
    }
  };

  const favoriteIds = useMemo(
    () => new Set((favorites || []).map((f) => String(f?._id))),
    [favorites]
  );

  // Handle favorite toggle (persistido en backend)
  const handleFavoriteToggle = async (participantId) => {
    if (!selectedType) return;

    const idStr = String(participantId);
    const isFavorite = favoriteIds.has(idStr);

    // Optimistic UI update
    const snapshot = favorites;
    try {
      if (isFavorite) {
        setFavorites((prev) => (prev || []).filter((f) => String(f?._id) !== idStr));
        await userService.removeFavorite(participantId, selectedType);
      } else {
        const participantObj =
          (participants || []).find((p) => String(p?._id) === idStr) || null;
        setFavorites((prev) => {
          const next = prev ? [...prev] : [];
          if (participantObj && !next.some((f) => String(f?._id) === idStr)) {
            next.push(participantObj);
          }
          return next;
        });
        await userService.addFavorite(participantId, selectedType);
      }

      // Re-sync para asegurar consistencia (y obtener objetos poblados)
      const fresh = await userService.getFavorites(selectedType);
      setFavorites(fresh || []);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setFavorites(snapshot);
      toast.error("No se pudo actualizar favoritos. Intenta nuevamente.");
    }
  };

  // Handle participant selection
  const handleParticipantToggle = (participantId) => {
    setSelectedParticipants((prev) => {
      const isAdding = !prev.includes(String(participantId));
      
      // If adding a participant and panel is collapsed, show flash effect
      if (isAdding && !isSelectedPanelExpanded) {
        setShowAddedFlash(true);
        setTimeout(() => setShowAddedFlash(false), 600); // Flash duration
      }
      
      // If removing a participant, also remove their case assignment
      if (!isAdding && selectedType === "pollsters") {
        setPollsterAssignments((prevAssignments) =>
          prevAssignments.filter((a) => a.pollsterId !== String(participantId))
        );
      }
      
      return isAdding
        ? [...prev, String(participantId)]
        : prev.filter((id) => id !== String(participantId));
    });
  };

  // Get unique provinces with counts
  const provinces = useMemo(() => {
    const provinceMap = new Map();
    participants.forEach((p) => {
      if (p.province) {
        const count = provinceMap.get(p.province) || 0;
        provinceMap.set(p.province, count + 1);
      }
    });
    return Array.from(provinceMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [participants]);

  // Get unique cities within selected province
  const cities = useMemo(() => {
    if (!selectedProvince) return [];

    const cityMap = new Map();
    participants
      .filter((p) => p.province === selectedProvince)
      .forEach((p) => {
        if (p.city) {
          const count = cityMap.get(p.city) || 0;
          cityMap.set(p.city, count + 1);
        }
      });
    return Array.from(cityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, selectedProvince]);

  // Filter participants based on active tab and filters
  const filteredParticipants = useMemo(() => {
    let result = [];

    // Tab filtering
    if (activeTab === "favoritos") {
      result = favorites;
    } else {
      result = participants;
    }

    // Location filtering (only for "ubicacion" tab)
    if (activeTab === "ubicacion") {
      if (selectedProvince) {
        result = result.filter((p) => p.province === selectedProvince);
      }
      if (selectedCity) {
        result = result.filter((p) => p.city === selectedCity);
      }
    }

    // General search (applies to all tabs)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.fullName?.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query)
      );
    }

    // IMPORTANT: Filter out already selected participants from the available list
    const selectedSet = new Set(selectedParticipants);
    result = result.filter((p) => !selectedSet.has(String(p._id)));

    return result;
  }, [
    participants,
    favorites,
    activeTab,
    selectedProvince,
    selectedCity,
    searchQuery,
    selectedParticipants,
  ]);

  const participantsTotalPages = Math.max(
    1,
    Math.ceil(filteredParticipants.length / participantsPageSize)
  );
  const participantsPageSafe = Math.min(
    participantsPage,
    participantsTotalPages - 1
  );
  const paginatedParticipants = useMemo(() => {
    const start = participantsPageSafe * participantsPageSize;
    return filteredParticipants.slice(start, start + participantsPageSize);
  }, [filteredParticipants, participantsPageSafe]);

  // Handle save selection
  const handleSaveSelection = async () => {
    if (!surveyId) {
      toast.error(
        "Error: No se puede guardar participantes sin una encuesta seleccionada"
      );
      return;
    }

    try {
      setIsSaving(true);

      // Cargar encuesta existente
      const existing = await surveyService.getSurvey(surveyId);
      const surveyData = existing?.survey?.survey || existing?.survey;
      const surveyInfo = existing?.survey?.surveyInfo || {};
      const definition = existing?.survey?.surveyDefinition;

      // selectedParticipants ya es un array de IDs (strings)
      const participantIds = selectedParticipants;
      
      // Preservar datos existentes y solo actualizar el tipo que estamos editando
      // Usar verificación en cascada para leer desde múltiples ubicaciones posibles
      let updatedUserIds = 
        existing?.survey?.surveyInfo?.userIds ||
        existing?.survey?.participants?.userIds ||
        existing?.survey?.userIds ||
        surveyInfo.userIds ||
        [];
      let updatedSupervisorsIds = 
        existing?.survey?.surveyInfo?.supervisorsIds ||
        existing?.survey?.participants?.supervisorsIds ||
        existing?.survey?.supervisorsIds ||
        surveyInfo.supervisorsIds ||
        [];
      let updatedPollsterAssignments = 
        existing?.survey?.participants?.pollsterAssignments ||
        existing?.survey?.pollsterAssignments ||
        [];

      console.log('📊 Preservando datos existentes:', {
        selectedType,
        updatedUserIds: updatedUserIds.length,
        updatedSupervisorsIds: updatedSupervisorsIds.length,
        updatedPollsterAssignments: updatedPollsterAssignments.length
      });


      if (selectedType === 'pollsters') {
        updatedUserIds = participantIds;
        updatedPollsterAssignments = pollsterAssignments;
        // Mantener supervisorsIds existentes
      } else if (selectedType === 'supervisors') {
        updatedSupervisorsIds = participantIds;
        // Mantener userIds y pollsterAssignments existentes
      }

      // Preparar datos completos
      const dataToSave = {
        survey: surveyData,
        surveyDefinition: definition,
        surveyInfo: {
          ...surveyInfo,
          userIds: updatedUserIds,
          supervisorsIds: updatedSupervisorsIds,
        },
        participants: {
          userIds: updatedUserIds,
          supervisorsIds: updatedSupervisorsIds,
          pollsterAssignments: updatedPollsterAssignments,
          quotaAssignments: existing?.survey?.participants?.quotaAssignments || []
        }
      };

      console.log('💾 Guardando datos:', {
        selectedType,
        userIds: dataToSave.participants.userIds.length,
        supervisorsIds: dataToSave.participants.supervisorsIds.length,
        pollsterAssignments: dataToSave.participants.pollsterAssignments.length
      });


      // Actualizar en el backend
      await surveyService.createOrUpdateSurvey(dataToSave, surveyId, false);

      toast.success(
        `${selectedParticipants.length} ${
          selectedType === "pollsters" ? "encuestadores" : "supervisores"
        } guardados exitosamente`
      );
      
      // Volver a la lista de encuestas
      router.push('/dashboard/temporal');
    } catch (error) {
      console.error('Error al guardar participantes:', error);
      toast.error(`Error al guardar participantes: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRows = useMemo(() => {
    const byId = new Map();
    (participants || []).forEach((p) => byId.set(String(p?._id), p));
    (favorites || []).forEach((p) => {
      const id = String(p?._id);
      if (!byId.has(id)) byId.set(id, p);
    });
    return (selectedParticipants || []).map((id) => {
      const p = byId.get(String(id));
      return {
        id: String(id),
        fullName: p?.fullName || "—",
        email: p?.email || "—",
        city: p?.city || "",
        province: p?.province || "",
        image: p?.image || null,
      };
    });
  }, [selectedParticipants, participants, favorites]);

  const scrollContentTop = () => {
    // Scrollea dentro del contenedor principal (main-content) hacia el inicio del contenido
    if (contentTopRef.current?.scrollIntoView) {
      contentTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const main = document.querySelector(".main-content");
    if (main && typeof main.scrollTo === "function") {
      main.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Render Step 1: Type Selection
  if (step === 1) {
    return (
      <div className="bg-gradient-to-br from-background via-background to-card-background p-4 sm:p-6 md:p-8 min-h-full flex flex-col">
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-6 sm:mb-8 w-full">
          <button
            onClick={handleBack}
            className="mb-3 sm:mb-4 p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors flex items-center gap-2 text-[var(--text-secondary)]"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Volver</span>
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Seleccionar Participantes
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Elige el tipo de participantes que deseas asignar a tu encuesta
          </p>
        </div>

        {/* Type Selection Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 w-full">
          {/* Pollsters Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleTypeSelect("pollsters")}
            className="group cursor-pointer"
          >
            <div className="relative bg-[var(--card-background)] border-2 border-[var(--primary-light)] hover:border-[var(--primary)] rounded-xl p-5 md:p-6 shadow-md hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-[var(--primary-light)] flex items-center justify-center shadow-md flex-shrink-0">
                  <Users className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-[var(--text-primary)] mb-1.5">
                    Encuestadores
                  </h3>
                  <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                    Asigna encuestadores para recolectar datos en campo
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Supervisors Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleTypeSelect("supervisors")}
            className="group cursor-pointer"
          >
            <div className="relative bg-[var(--card-background)] border-2 border-[var(--secondary-dark)] hover:border-[var(--secondary)] rounded-xl p-5 md:p-6 shadow-md hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-[var(--secondary-dark)] flex items-center justify-center shadow-md flex-shrink-0">
                  <UserCheck className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-[var(--text-primary)] mb-1.5">
                    Supervisores
                  </h3>
                  <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                    Asigna supervisores para monitorear y validar el trabajo
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Render Step 2: Participant Selection
  return (
    <div className="h-full flex flex-col bg-[var(--background)] overflow-hidden">{/* Changed from h-screen to h-full - fits within .main-content */}
      {/* Simplified Header */}
      <div className="flex-shrink-0 bg-[var(--card-background)] border-b border-[var(--card-border)] px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
              Seleccionar{" "}
              {selectedType === "pollsters" ? "Encuestadores" : "Supervisores"}
            </h1>
          </div>
        </div>
      </div>

      {/* Mobile: Expandable Selected Participants Section */}
      <div className="md:hidden flex-shrink-0">
          {/* Mobile: Selected Participants Button - Opens modal */}
          <div className="md:hidden bg-[var(--card-background)] border-b border-[var(--card-border)] p-4">
            <button
              onClick={() => setShowSelectedModal(true)}
              className="w-full flex items-center justify-between p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-lg hover:border-[var(--primary)]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Seleccionados
                  </p>
                  <p className="text-xs text-[var(--text-primary)] dark:text-[var(--text-secondary)]">
                    {selectedParticipants.length} {selectedType === "pollsters" ? "encuestador" : "supervisor"}{selectedParticipants.length !== 1 ? "es" : ""}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-[var(--text-secondary)] -rotate-90" />
            </button>
          </div>
      </div>

      {/* Split Screen Layout - Desktop only, single column on mobile */}
      <div className="flex-1 flex overflow-hidden min-h-0 pb-20">
        {/* Left Column: Selected Participants - Hidden on mobile, collapsible sidebar on desktop */}
        {/* Left Column: Selected Participants - Hidden on mobile, collapsible sidebar on desktop */}
        <div className={`hidden md:flex bg-[var(--card-background)] border-r-4 border-[var(--primary)] flex-col min-h-0 relative transition-all duration-300 ${
          isSelectedPanelExpanded ? 'md:w-1/3' : 'md:w-16'
        }`}>
          {/* +1 Flash effect - appears above the Users icon */}
          <AnimatePresence>
            {showAddedFlash && !isSelectedPanelExpanded && (
              <motion.div
                initial={{ y: 25, opacity: 0, scale: 0.5 }}
                animate={{ y: -15, opacity: 1, scale: 1.2 }}
                exit={{ y: -40, opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              >
                <div className="relative flex items-center">
                  <span className="text-2xl font-black text-yellow-400 drop-shadow-lg" style={{ 
                    textShadow: '0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.6)' 
                  }}>
                    +
                  </span>
                  <span className="text-2xl font-black text-[var(--primary)] drop-shadow-lg" style={{ 
                    textShadow: '0 0 10px rgba(128, 145, 245, 0.8), 0 0 20px rgba(128, 145, 245, 0.6)' 
                  }}>
                    1
                  </span>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.5, 0] }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-[var(--primary)] rounded-full blur-xl opacity-50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Header - Always visible */}
          <div className={`flex-shrink-0 p-3 bg-[var(--primary)]/10 border-b border-[var(--primary)]/30 ${!isSelectedPanelExpanded ? 'cursor-pointer' : ''}`} onClick={!isSelectedPanelExpanded ? () => setIsSelectedPanelExpanded(true) : undefined}>
            {isSelectedPanelExpanded ? (
              <div className="relative">
                <div className="pr-10">
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    Seleccionados
                  </h2>
                  <p className="text-xs text-[var(--text-primary)] mt-1">
                    {selectedParticipants.length} {selectedType === "pollsters" ? "encuestador" : "supervisor"}{selectedParticipants.length !== 1 ? "es" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setIsSelectedPanelExpanded(false)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                  title="Contraer panel"
                >
                  <ChevronDown className="w-4 h-4 text-white rotate-90" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] flex items-center justify-center transition-all hover:scale-110">
                  <ChevronDown className="w-5 h-5 text-white -rotate-90" />
                </div>
              </div>
            )}
          </div>
          
          {/* Vertical Text "SELECCIONADOS" - Only when collapsed */}
          {!isSelectedPanelExpanded && (
            <div className="flex-1 flex items-center justify-center cursor-pointer" onClick={() => setIsSelectedPanelExpanded(true)}>
              <p className="text-xs font-bold text-[var(--text-secondary)] tracking-wider" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                SELECCIONADOS
              </p>
            </div>
          )}
          
          {/* Content - Only visible when expanded */}
          {isSelectedPanelExpanded && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Header with total and distribute button - Only for pollsters */}
              {selectedType === "pollsters" && selectedParticipants.length > 0 && metaTotal > 0 && (
                <div className="flex-shrink-0 p-3 space-y-2 border-b border-[var(--card-border)]">
                  {/* Total and Distribute button in same row */}
                  <div className="flex items-center gap-2">
                    {/* Total indicator */}
                    <div className="flex-1 bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-2.5 py-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-secondary)]">Total asignado:</span>
                        <span className={`font-bold ${
                          getTotalAssignedCases() > metaTotal
                            ? "text-red-600"
                            : getTotalAssignedCases() === metaTotal
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}>
                          {getTotalAssignedCases()} / {metaTotal}
                        </span>
                      </div>
                    </div>

                    {/* Distribute button */}
                    <button
                      onClick={distributeEqually}
                      className="flex-shrink-0 px-3 py-1.5 text-xs bg-[var(--primary-dark)] dark:bg-[var(--primary-light)] text-white dark:text-[var(--primary-dark)] hover:opacity-90 rounded-lg transition-opacity font-medium flex items-center gap-1.5"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      Distribuir
                    </button>
                  </div>
                  
                  {/* Warning message if needed */}
                  {getTotalAssignedCases() !== metaTotal && (
                    <p className={`text-[9px] px-1 ${
                      getTotalAssignedCases() > metaTotal ? "text-red-600" : "text-orange-600"
                    }`}>
                      {getTotalAssignedCases() > metaTotal 
                        ? "⚠️ Excede la meta total" 
                        : `Faltan ${metaTotal - getTotalAssignedCases()} casos por asignar`}
                    </p>
                  )}

                  {/* Column Headers */}
                  <div className="flex items-center gap-2 px-2 pt-2">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                        Nombre
                      </span>
                    </div>
                    <div className="w-14 text-center">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                        Casos
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-3 min-h-0">
                {selectedRows.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-[var(--card-background)] rounded-full flex items-center justify-center mx-auto mb-3 border border-[var(--card-border)]">
                      <Users className="w-6 h-6 text-[var(--text-secondary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Ningún participante seleccionado
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedRows.map((participant) => {
                      const isFavorite = favoriteIds.has(participant.id);
                      return (
                        <div
                          key={participant.id}
                          className="flex items-center gap-2"
                        >
                          {/* Card with hover to remove */}
                          <div className="flex-1 bg-[var(--background)] border border-[var(--card-border)] rounded-lg group hover:border-[var(--primary)]/50 transition-all hover:bg-[var(--hover-bg)] relative overflow-hidden">
                            {/* Remove Overlay - Compact */}
                            <div 
                              onClick={() => handleParticipantToggle(participant.id)}
                              className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-red-50/90 cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 text-red-600">
                                <X className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-semibold">Quitar</span>
                              </div>
                            </div>

                            {/* Content - Card only */}
                            <div className="relative transition-all duration-200 group-hover:blur-[1.5px] group-hover:opacity-50 p-2">
                              <div className="flex items-center gap-2">
                                {/* Photo */}
                                <div className="relative flex-shrink-0">
                                  <UserAvatar
                                    src={participant.image}
                                    alt={`Foto de ${participant.fullName || 'usuario'}`}
                                    size="sm"
                                    className="rounded-lg"
                                  />
                                </div>
                                
                                {/* Info section with star inline */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
                                      {participant.fullName}
                                    </p>
                                    {/* Favorite Star - inline with name */}
                                    {isFavorite && (
                                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                                    {participant.city || participant.province || participant.email}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Cases Input - Outside card, always clickeable */}
                          {selectedType === "pollsters" && metaTotal > 0 && (
                            <div className="flex-shrink-0">
                              <input
                                type="number"
                                min="0"
                                max={metaTotal}
                                value={getAssignedCases(participant.id)}
                                onChange={(e) =>
                                  handlePollsterAssignmentChange(
                                    participant.id,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className={`w-14 px-2 py-1 border rounded text-center text-xs focus:outline-none focus:ring-1 ${
                                  getAssignedCases(participant.id) === 0
                                    ? "bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)] focus:border-[var(--error-border)] focus:ring-[var(--error-border)]"
                                    : "bg-[var(--input-background)] text-[var(--text-primary)] border-[var(--card-border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]"
                                }`}
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Available Participants - Full width on mobile */}
        <div className="flex-1 flex flex-col bg-[var(--background)] min-h-0">
          {/* Integrated Search and Filters - Fixed at top */}
          <div className="flex-shrink-0 p-4 space-y-3 border-b border-[var(--card-border)]">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
            </div>

            {/* Tabs and Controls */}
            <div className="space-y-2">
              {/* Tab buttons row */}
              <div className="flex gap-2 items-center flex-wrap justify-center md:justify-start">
                <button
                  onClick={() => {
                    setActiveTab("todos");
                    setSelectedProvince("");
                    setSelectedCity("");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${
                    activeTab === "todos"
                      ? "bg-[var(--primary-light)] text-white"
                      : "bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] hover:border-[var(--primary)]"
                  }`}
                >
                  Todos ({participants.length - selectedParticipants.length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab("ubicacion");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === "ubicacion"
                      ? "bg-[var(--primary-light)] text-white"
                      : "bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] hover:border-[var(--primary)]"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Por Ubicación
                </button>
                <button
                  onClick={() => {
                    setActiveTab("favoritos");
                    setSelectedProvince("");
                    setSelectedCity("");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === "favoritos"
                      ? "bg-[var(--secondary)] text-white"
                      : "bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] hover:border-[var(--secondary)]"
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  Favoritos ({favorites.length - selectedParticipants.filter(id => favorites.some(fav => String(fav._id) === id)).length})
                </button>

                {/* Link Seleccionar Todos - Solo visible en la pestaña de favoritos */}
                {activeTab === "favoritos" && favorites.length > 0 && (
                  <button
                    onClick={() => {
                      // Obtener IDs de favoritos que aún no están seleccionados
                      const favIds = favorites.map(f => String(f._id));
                      const newSelected = [...new Set([...selectedParticipants, ...favIds])];
                      setSelectedParticipants(newSelected);
                    }}
                    className="ml-2 text-[10px] text-[var(--secondary)] hover:text-[var(--secondary-dark)] underline underline-offset-2 whitespace-nowrap transition-colors"
                  >
                    Seleccionar todos
                  </button>
                )}

                {/* Desktop: Control buttons at the right */}
                {activeTab === "ubicacion" && (
                  <div className="hidden md:flex items-center gap-2 ml-auto">
                    {/* Filter indicator text - only when filters are active and collapsed */}
                    {(selectedProvince || selectedCity) && !isLocationFilterExpanded && (
                      <span className="text-xs text-[var(--text-secondary)] px-2 py-1 bg-[var(--primary)]/10 rounded-lg border border-[var(--primary)]/30">
                        <span className="font-medium text-[var(--primary-contrast)]">
                          {[selectedProvince, selectedCity].filter(Boolean).join(" → ")}
                        </span>
                      </span>
                    )}

                    {/* Clear filters button - only when filters are active */}
                    {(selectedProvince || selectedCity) && (
                      <button
                        onClick={() => {
                          setSelectedProvince("");
                          setSelectedCity("");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs text-[var(--error-text)] hover:text-white bg-[var(--error-bg)] hover:bg-[var(--error-border)] transition-all flex items-center gap-1.5 font-medium"
                      >
                        <X className="w-3.5 h-3.5" />
                        Limpiar filtros
                      </button>
                    )}
                    
                    {/* Chevron toggle button */}
                    <button
                      onClick={() => setIsLocationFilterExpanded(!isLocationFilterExpanded)}
                      className="p-2 rounded-lg bg-[var(--primary-light)] text-white hover:opacity-90 transition-all"
                      title={isLocationFilterExpanded ? "Ocultar filtros" : "Mostrar filtros"}
                    >
                      <motion.div
                        animate={{ rotate: isLocationFilterExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile: Location button row - full width */}
              {activeTab === "ubicacion" && (
                <div className="md:hidden flex items-center gap-2">
                  {/* Button to open location modal */}
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs bg-[var(--background)] border-2 border-[var(--primary)] text-[var(--primary-contrast)] hover:bg-[var(--primary)]/10 transition-all flex items-center justify-center gap-2 font-semibold"
                  >
                    <MapPin className="w-4 h-4" />
                    {selectedProvince || selectedCity ? (
                      <span className="truncate">
                        {[selectedProvince, selectedCity].filter(Boolean).join(", ")}
                      </span>
                    ) : (
                      "Elegir localidad"
                    )}
                  </button>

                  {/* Clear filters button - only when filters are active */}
                  {(selectedProvince || selectedCity) && (
                    <button
                      onClick={() => {
                        setSelectedProvince("");
                        setSelectedCity("");
                      }}
                      className="p-2 rounded-lg text-[var(--error-text)] hover:text-white bg-[var(--error-bg)] hover:bg-[var(--error-border)] transition-all flex-shrink-0"
                      title="Limpiar filtros"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Desktop: Location Filter (expandible) - only visible in desktop */}
            <AnimatePresence initial={false}>
              {activeTab === "ubicacion" && isLocationFilterExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden hidden md:block"
                >
                  <LocationSearchFilter
                    provinces={provinces}
                    cities={cities}
                    selectedProvince={selectedProvince}
                    selectedCity={selectedCity}
                    onProvinceChange={(province) => {
                      setSelectedProvince(province);
                      setSelectedCity("");
                    }}
                    onCityChange={setSelectedCity}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scrollable Content - Takes remaining space */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            <div ref={contentTopRef} />
            
            {/* Loading State */}
            {loading && (
              <LoaderWrapper text="Cargando participantes" />
            )}

            {/* Empty State */}
            {!loading && filteredParticipants.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[var(--card-background)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--card-border)]">
                  {activeTab === "favoritos" ? (
                    <Star className="w-8 h-8 text-[var(--text-secondary)]" />
                  ) : (
                    <Users className="w-8 h-8 text-[var(--text-secondary)]" />
                  )}
                </div>
                <p className="text-[var(--text-secondary)] text-lg mb-2 font-medium">
                  {activeTab === "favoritos"
                    ? "No tienes favoritos aún"
                    : "No se encontraron participantes"}
                </p>
                <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
                  {activeTab === "favoritos"
                    ? "Marca participantes como favoritos para acceder rápidamente a ellos"
                    : searchQuery || selectedProvince || selectedCity
                    ? "Intenta con otros filtros de búsqueda"
                    : ""}
                </p>
              </div>
            )}

            {/* Participant Grid */}
            {!loading && filteredParticipants.length > 0 && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {paginatedParticipants.map((participant) => (
                    <ParticipantCard
                      key={participant._id}
                      participant={participant}
                      isSelected={selectedParticipants.includes(String(participant._id))}
                      isFavorite={favorites.some((fav) => fav._id === participant._id)}
                      onToggleSelect={() => handleParticipantToggle(participant._id)}
                      onToggleFavorite={() => handleFavoriteToggle(participant._id)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {filteredParticipants.length > participantsPageSize && (
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <div className="text-xs text-[var(--text-secondary)]">
                      Página {participantsPageSafe + 1} de {participantsTotalPages} · {filteredParticipants.length} usuarios
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setParticipantsPage((p) => {
                            const next = Math.max(0, p - 1);
                            setTimeout(scrollContentTop, 0);
                            return next;
                          })
                        }
                        disabled={participantsPageSafe <= 0}
                        className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-background)] text-[var(--text-primary)] text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--hover-bg)]"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setParticipantsPage((p) => {
                            const next = Math.min(participantsTotalPages - 1, p + 1);
                            setTimeout(scrollContentTop, 0);
                            return next;
                          })
                        }
                        disabled={participantsPageSafe >= participantsTotalPages - 1}
                        className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-background)] text-[var(--text-primary)] text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--hover-bg)]"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>


      {/* Mobile Selected Participants Modal */}
      <AnimatePresence>
        {showSelectedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowSelectedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--card-background)] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex-shrink-0 p-4 border-b border-[var(--card-border)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Seleccionados
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {selectedParticipants.length} {selectedType === "pollsters" ? "encuestador" : "supervisor"}{selectedParticipants.length !== 1 ? "es" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setShowSelectedModal(false)}
                  className="p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Case Assignment Header - Only for pollsters */}
                {selectedType === "pollsters" && selectedParticipants.length > 0 && metaTotal > 0 && (
                  <div className="mb-4 space-y-2 pb-4 border-b border-[var(--card-border)]">
                    {/* Total and Distribute button in same row */}
                    <div className="flex items-center gap-2">
                      {/* Total indicator */}
                      <div className="flex-1 bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-2.5 py-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-secondary)]">Total asignado:</span>
                          <span className={`font-bold ${
                            getTotalAssignedCases() > metaTotal
                              ? "text-red-600"
                              : getTotalAssignedCases() === metaTotal
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}>
                            {getTotalAssignedCases()} / {metaTotal}
                          </span>
                        </div>
                      </div>

                      {/* Distribute button */}
                      <button
                        onClick={distributeEqually}
                        className="flex-shrink-0 px-3 py-1.5 text-xs bg-[var(--primary-dark)] dark:bg-[var(--primary-light)] text-white dark:text-[var(--primary-dark)] hover:opacity-90 rounded-lg transition-opacity font-medium flex items-center gap-1.5"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        Distribuir
                      </button>
                    </div>
                    
                    {/* Warning message if needed */}
                    {getTotalAssignedCases() !== metaTotal && (
                      <p className={`text-[9px] px-1 ${
                        getTotalAssignedCases() > metaTotal ? "text-red-600" : "text-orange-600"
                      }`}>
                        {getTotalAssignedCases() > metaTotal 
                          ? "⚠️ Excede la meta total" 
                          : `Faltan ${metaTotal - getTotalAssignedCases()} casos por asignar`}
                      </p>
                    )}
                  </div>
                )}
                
                {selectedRows.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--card-border)]">
                      <Users className="w-8 h-8 text-[var(--text-secondary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Ningún participante seleccionado
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedRows.map((participant) => {
                      const isFavorite = favoriteIds.has(participant.id);
                      return (
                        <div
                          key={participant.id}
                          className="bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-2.5 relative overflow-hidden hover:border-[var(--primary)]/50 transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Photo - smaller */}
                            <div className="relative flex-shrink-0">
                              <UserAvatar
                                src={participant.image}
                                alt={`Foto de ${participant.fullName || 'usuario'}`}
                                size="md"
                                className="rounded-lg"
                              />
                            </div>
                            
                            {/* Info section - compact */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                  {participant.fullName}
                                </p>
                                {/* Favorite Star - inline with name */}
                                {isFavorite && (
                                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                )}
                              </div>
                              {(participant.city || participant.province) && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-[var(--text-secondary)]" />
                                  <p className="text-xs text-[var(--text-secondary)] truncate">
                                    {[participant.city, participant.province].filter(Boolean).join(", ")}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* Cases Input - Only for pollsters */}
                            {selectedType === "pollsters" && metaTotal > 0 && (
                              <div className="flex-shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  max={metaTotal}
                                  value={getAssignedCases(participant.id)}
                                  onChange={(e) =>
                                    handlePollsterAssignmentChange(
                                      participant.id,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className={`w-14 px-2 py-1 border rounded text-center text-xs focus:outline-none focus:ring-1 ${
                                    getAssignedCases(participant.id) === 0
                                      ? "bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)] focus:border-[var(--error-border)] focus:ring-[var(--error-border)]"
                                      : "bg-[var(--input-background)] text-[var(--text-primary)] border-[var(--card-border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]"
                                  }`}
                                  placeholder="0"
                                />
                              </div>
                            )}
                            
                            {/* Remove button - Only show if no cases input or for supervisors */}
                            {(!selectedType || selectedType !== "pollsters" || !metaTotal) && (
                              <button
                                onClick={() => handleParticipantToggle(participant.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 self-center"
                                title="Quitar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Remove button for pollsters with cases - smaller */}
                            {selectedType === "pollsters" && metaTotal > 0 && (
                              <button
                                onClick={() => handleParticipantToggle(participant.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 self-start"
                                title="Quitar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex-shrink-0 p-4 border-t border-[var(--card-border)]">
                <button
                  onClick={() => setShowSelectedModal(false)}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-all font-bold"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Mobile Location Selection Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowLocationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--card-background)] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Elegir Localidad
                </h3>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Province Selector */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Provincia
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      setSelectedProvince(e.target.value);
                      setSelectedCity("");
                    }}
                    className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-3 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                  >
                    <option value="">Todas las provincias</option>
                    {provinces.map(({ name, count }) => (
                      <option key={name} value={name}>
                        {name} ({count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* City Selector (only visible when province is selected) */}
                {selectedProvince && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Ciudad
                    </label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg px-3 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                    >
                      <option value="">Todas las ciudades</option>
                      {cities.map(({ name, count }) => (
                        <option key={name} value={name}>
                          {name} ({count})
                        </option>
                      ))}
                    </select>
                  </motion.div>
                )}

                {/* Current Selection Display */}
                {(selectedProvince || selectedCity) && (
                  <div className="p-3 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-lg">
                    <p className="text-sm text-[var(--text-secondary)]">Filtrando por:</p>
                    <p className="font-medium text-[var(--primary)] mt-1">
                      {[selectedProvince, selectedCity].filter(Boolean).join(" → ")}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[var(--card-border)] flex gap-3">
                {(selectedProvince || selectedCity) && (
                  <button
                    onClick={() => {
                      setSelectedProvince("");
                      setSelectedCity("");
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border border-[var(--error-border)] text-[var(--error-text)] hover:bg-[var(--error-bg)] transition-all font-medium"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-all font-bold"
                >
                  Aplicar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Footer - Always visible at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card-background)] border-t border-[var(--card-border)] p-3 sm:p-4 z-50">
        <div className="max-w-7xl mx-auto flex gap-3">
          <button
            onClick={() => router.push('/dashboard/temporal')}
            className="flex-1 px-4 py-2.5 text-sm sm:text-base text-[var(--error-text)] hover:text-[var(--text-primary)] border border-[var(--error-border)] rounded-lg transition-colors bg-[var(--error-bg)] font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveSelection}
            disabled={selectedParticipants.length === 0 || isSaving}
            className="flex-1 px-4 py-2.5 text-sm sm:text-base rounded-lg font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:opacity-90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={18} className="text-white" />
            <span className="text-white">
              {isSaving ? 'Guardando...' : `Guardar Selección (${selectedParticipants.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
