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
} from "lucide-react";
import { motion } from "framer-motion";
import { userService } from "@/services/user.service";
import { surveyService } from "@/services/survey.service";
import ParticipantCard from "@/components/temporal/ParticipantCard";
import LocationSearchFilter from "@/components/temporal/LocationSearchFilter";
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

  // Selection state
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // Pagination (aplica a la grilla luego de filtros/búsqueda)
  const participantsPageSize = 24;
  const [participantsPage, setParticipantsPage] = useState(0);

  // UI
  const [showSelectedModal, setShowSelectedModal] = useState(false);
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
          const savedIds =
            selectedType === "pollsters"
              ? (surveyDoc.userIds || surveyInfo.userIds || [])
              : (surveyDoc.supervisorsIds || surveyInfo.supervisorsIds || []);
          setSelectedParticipants((savedIds || []).map(String));
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
    setSelectedParticipants((prev) =>
      prev.includes(String(participantId))
        ? prev.filter((id) => id !== String(participantId))
        : [...prev, String(participantId)]
    );
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
      
      let updatedUserIds = surveyInfo.userIds || [];
      let updatedSupervisorsIds = surveyInfo.supervisorsIds || [];

      if (selectedType === 'pollsters') {
        updatedUserIds = participantIds;
      } else if (selectedType === 'supervisors') {
        updatedSupervisorsIds = participantIds;
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
          pollsterAssignments: [],
          quotaAssignments: []
        }
      };

      // Actualizar en el backend
      await surveyService.createOrUpdateSurvey(dataToSave, surveyId, true);

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
      <div className=" bg-gradient-to-br from-background via-background to-card-background p-4 md:p-8">
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-8">
          <button
            onClick={handleBack}
            className="mb-4 p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors flex items-center gap-2 text-[var(--text-secondary)]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Seleccionar Participantes
          </h1>
          <p className="text-[var(--text-secondary)]">
            Elige el tipo de participantes que deseas asignar a tu encuesta
          </p>
        </div>

        {/* Type Selection Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pollsters Card */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleTypeSelect("pollsters")}
            className="group cursor-pointer"
          >
            <div className="relative h-full bg-gradient-to-br from-card-background to-card-background/80 backdrop-blur-sm border border-[var(--card-border)] rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

              <div className="relative z-10">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300">
                  <Users className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-[var(--primary)] transition-colors duration-300">
                  Encuestadores
                </h3>

                <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                  Asigna encuestadores para recolectar datos en campo
                </p>

                <div className="flex items-center text-[var(--primary)] font-medium opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="mr-2">Seleccionar</span>
                  <ArrowLeft className="w-5 h-5 rotate-180" />
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
            <div className="relative h-full bg-gradient-to-br from-card-background to-card-background/80 backdrop-blur-sm border border-[var(--card-border)] rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--secondary)] to-[var(--secondary-dark)] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />

              <div className="relative z-10">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[var(--secondary)] to-[var(--secondary-dark)] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300">
                  <UserCheck className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-[var(--secondary)] transition-colors duration-300">
                  Supervisores
                </h3>

                <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                  Asigna supervisores para monitorear y validar el trabajo
                </p>

                <div className="flex items-center text-[var(--secondary)] font-medium opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="mr-2">Seleccionar</span>
                  <ArrowLeft className="w-5 h-5 rotate-180" />
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

      {/* Split Screen Layout - Takes remaining space with padding for fixed footer */}
      <div className="flex-1 flex overflow-hidden min-h-0 pb-20">{/* pb-20 = ~80px for footer */}
        {/* Left Column: Selected Participants (1/3) */}
        <div className="w-full md:w-1/3 bg-[var(--card-background)] border-r border-[var(--card-border)] flex flex-col min-h-0">
          <div className="flex-shrink-0 p-4 border-b border-[var(--card-border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              Seleccionados
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {selectedParticipants.length} {selectedType === "pollsters" ? "encuestador" : "supervisor"}{selectedParticipants.length !== 1 ? "es" : ""}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {selectedRows.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-3 border border-[var(--card-border)]">
                  <Users className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Ningún participante seleccionado
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRows.map((participant) => {
                  const isFavorite = favoriteIds.has(participant.id);
                  return (
                    <div
                      key={participant.id}
                      className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-3 group hover:border-[var(--primary)]/50 transition-colors relative"
                    >
                      {/* Favorite Star */}
                      {isFavorite && (
                        <div className="absolute top-2 right-2">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                          {participant.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {participant.fullName}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {participant.email}
                          </p>
                          {(participant.city || participant.province) && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 text-[var(--text-secondary)]" />
                              <p className="text-xs text-[var(--text-secondary)] truncate">
                                {[participant.city, participant.province].filter(Boolean).join(", ")}
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleParticipantToggle(participant.id)}
                          className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2"
                          title="Quitar"
                        >
                          <X className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Available Participants (2/3) */}
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

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
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
                Todos ({participants.length})
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
                Favoritos ({favorites.length})
              </button>
            </div>

            {/* Location Filter (only visible in "ubicacion" tab) */}
            {activeTab === "ubicacion" && (
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
                onClearFilters={() => {
                  setSelectedProvince("");
                  setSelectedCity("");
                }}
              />
            )}
          </div>

          {/* Scrollable Content - Takes remaining space */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            <div ref={contentTopRef} />
            
            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-[var(--text-secondary)]">Cargando...</p>
              </div>
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
