"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  Search,
  Star,
  X,
  ChevronDown,
  MapPin,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { userService } from "@/services/user.service";
import { surveyService } from "@/services/survey.service";
import ParticipantCard from "@/components/temporal/ParticipantCard";
import LocationSearchFilter from "@/components/temporal/LocationSearchFilter";
import UserAvatar from "@/components/ui/UserAvatar";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { toast } from "react-toastify";

export default function ParticipantSelectionModal({
  open,
  onClose,
  surveyId,
  type, // "pollsters" or "supervisors"
  onSave,
  initialData = {}
}) {
  // Flow state - if type is provided, start at step 2 (selection)
  const [step, setStep] = useState(2); // Always start at step 2 since we're passing type from config
  const [selectedType, setSelectedType] = useState(type || null);

  // Data state
  const [participants, setParticipants] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Selection state
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination
  const participantsPageSize = 24;
  const [participantsPage, setParticipantsPage] = useState(0);

  // Update selectedType when type prop changes or modal opens
  useEffect(() => {
    if (open && type) {
      console.log('🔍 Modal opened with type:', type);
      setSelectedType(type);
      setStep(2);
    }
  }, [type, open]);

  // Load initial data when type changes
  useEffect(() => {
    if (selectedType && open) {
      console.log('📊 Loading data for type:', selectedType);
      loadData();
    }
  }, [selectedType, open]);

  // Reset pagination when filters change
  useEffect(() => {
    setParticipantsPage(0);
  }, [activeTab, searchQuery, selectedProvince, selectedCity]);

  // Load initial selection from initialData
  useEffect(() => {
    if (open && initialData && selectedType) {
      const ids = selectedType === "pollsters" 
        ? (initialData.pollsters || [])
        : (initialData.supervisors || []);
      setSelectedParticipants(Array.isArray(ids) ? ids.map(String) : []);
    }
  }, [open, initialData, selectedType]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedProvince("");
      setSelectedCity("");
      setActiveTab("todos");
      setParticipantsPage(0);
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1) Load participants of selected type
      let loadedParticipants = [];
      if (selectedType === "pollsters") {
        const pollstersData = await userService.getPollsters();
        loadedParticipants = pollstersData.users || [];
      } else {
        const supervisorsData = await userService.getSupervisors();
        loadedParticipants = supervisorsData.supervisors || [];
      }

      setParticipants(loadedParticipants);

      // 2) Load favorites
      const favs = await userService.getFavorites(selectedType);
      setFavorites(favs || []);

      // 3) Load existing selection from survey if surveyId is provided
      if (surveyId) {
        try {
          const existing = await surveyService.getSurvey(surveyId);
          const surveyInfo = existing?.survey?.surveyInfo || {};
          
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
        } catch (e) {
          console.warn("Could not load existing selection:", e);
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

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2 && !type) {
      // Only allow going back to step 1 if type wasn't provided as prop
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
      onClose();
    }
  };

  const favoriteIds = useMemo(
    () => new Set((favorites || []).map((f) => String(f?._id))),
    [favorites]
  );

  const handleFavoriteToggle = async (participantId) => {
    if (!selectedType) return;

    const idStr = String(participantId);
    const isFavorite = favoriteIds.has(idStr);

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

      const fresh = await userService.getFavorites(selectedType);
      setFavorites(fresh || []);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setFavorites(snapshot);
      toast.error("No se pudo actualizar favoritos. Intenta nuevamente.");
    }
  };

  const handleParticipantToggle = (participantId) => {
    setSelectedParticipants((prev) => {
      // Ensure prev is always an array
      const currentSelection = Array.isArray(prev) ? prev : [];
      const isAdding = !currentSelection.includes(String(participantId));
      return isAdding
        ? [...currentSelection, String(participantId)]
        : currentSelection.filter((id) => id !== String(participantId));
    });
  };

  const handleSelectAll = () => {
    if (activeTab === "favoritos") {
      const favoriteIds = (favorites || []).map((f) => String(f._id));
      setSelectedParticipants((prev) => {
        const currentSelection = Array.isArray(prev) ? prev : [];
        const newIds = favoriteIds.filter((id) => !currentSelection.includes(id));
        return [...currentSelection, ...newIds];
      });
    }
  };

  const handleSave = async () => {
    if (!surveyId) {
      toast.error("Error: No se puede guardar sin una encuesta seleccionada");
      return;
    }

    if (isSaving) return; // Prevent double-click

    setIsSaving(true);
    try {
      // Load existing survey
      const existing = await surveyService.getSurvey(surveyId);
      const surveyData = existing?.survey?.survey || existing?.survey;
      const surveyInfo = existing?.survey?.surveyInfo || {};
      const definition = existing?.survey?.surveyDefinition;

      // Preserve existing data and only update the type we're editing
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

      if (selectedType === 'pollsters') {
        updatedUserIds = selectedParticipants;
      } else if (selectedType === 'supervisors') {
        updatedSupervisorsIds = selectedParticipants;
      }

      // Prepare complete data
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
          pollsterAssignments: existing?.survey?.participants?.pollsterAssignments || [],
          quotaAssignments: existing?.survey?.participants?.quotaAssignments || []
        }
      };

      // Update in backend
      await surveyService.createOrUpdateSurvey(dataToSave, surveyId, false);
      
      // Call onSave callback with selected IDs
      if (onSave) {
        onSave(selectedParticipants);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving participants:', error);
      toast.error(`Error al guardar participantes: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Get unique provinces
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

  // Get unique cities
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

  // Filter participants
  const filteredParticipants = useMemo(() => {
    let result = [];

    if (activeTab === "favoritos") {
      result = favorites;
    } else {
      result = participants;
    }

    if (activeTab === "ubicacion") {
      if (selectedProvince) {
        result = result.filter((p) => p.province === selectedProvince);
      }
      if (selectedCity) {
        result = result.filter((p) => p.city === selectedCity);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.fullName?.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query)
      );
    }

    // Filter out already selected participants
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

  if (!open) return null;

  // Render Step 1: Type Selection (only if type wasn't provided)
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--card-background)] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[var(--card-border)]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Seleccionar Tipo de Participantes
            </h2>
            <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-[var(--text-secondary)] mb-6">
              Elige el tipo de participantes que deseas asignar a tu encuesta
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pollsters Card */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTypeSelect("pollsters")}
                className="group cursor-pointer"
              >
                <div className="relative bg-[var(--card-background)] border-2 border-[var(--primary-light)] hover:border-[var(--primary)] rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-[var(--primary-light)] flex items-center justify-center shadow-md flex-shrink-0">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1.5">
                        Encuestadores
                      </h3>
                      <p className="text-base text-[var(--text-secondary)] leading-relaxed">
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
                <div className="relative bg-[var(--card-background)] border-2 border-[var(--secondary-dark)] hover:border-[var(--secondary)] rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-[var(--secondary-dark)] flex items-center justify-center shadow-md flex-shrink-0">
                      <UserCheck className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1.5">
                        Supervisores
                      </h3>
                      <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                        Asigna supervisores para monitorear y validar el trabajo
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Step 2: Participant Selection
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-background)] rounded-xl w-full max-w-7xl h-[90vh] flex flex-col border border-[var(--card-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            {!type && (
              <button
                onClick={handleBack}
                className="p-1.5 hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-[var(--text-primary)] rotate-90" />
              </button>
            )}
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Seleccionar {selectedType === "pollsters" ? "Encuestadores" : "Supervisores"}
            </h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel: Selected Participants */}
          <div className="w-1/3 bg-gradient-to-br from-[var(--primary)]/8 via-[var(--primary)]/4 to-transparent border-r border-[var(--card-border)] flex flex-col min-h-0">
            <div className="flex-shrink-0 p-4 bg-gradient-to-r from-[var(--primary)]/15 to-[var(--primary)]/10 backdrop-blur-sm border-b border-[var(--card-border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Seleccionados
              </h3>
              <p className="text-xs text-[var(--text-primary)] mt-1">
                {selectedParticipants.length} {selectedType === "pollsters" ? "encuestador" : "supervisor"}{selectedParticipants.length !== 1 ? "es" : ""}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <LoaderWrapper text="Cargando..." size="sm" />
              ) : selectedRows.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <p className="text-sm">No hay participantes seleccionados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRows.map((participant) => (
                    <div
                      key={participant.id}
                      className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-xl p-3 flex items-center gap-3 group hover:border-[var(--primary)]/40 transition-all hover:shadow-md relative overflow-hidden"
                    >
                      <UserAvatar
                        src={participant.image}
                        alt={participant.fullName}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {participant.fullName}
                        </p>
                        {participant.city && (
                          <p className="text-xs text-[var(--text-secondary)] truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {participant.city}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleParticipantToggle(participant.id)}
                        className="p-1.5 rounded-full hover:bg-gradient-to-br hover:from-red-500 hover:to-red-600 text-red-500 hover:text-white transition-all hover:shadow-md"
                        title="Quitar"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Available Participants */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filters */}
            <div className="flex-shrink-0 p-4 border-b border-[var(--card-border)] space-y-3">
              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("todos")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "todos"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  Todos ({participants.length})
                </button>
                <button
                  onClick={() => setActiveTab("ubicacion")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "ubicacion"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  Ubicación
                </button>
                <button
                  onClick={() => setActiveTab("favoritos")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "favoritos"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  Favoritos ({favorites.length})
                </button>
                {activeTab === "favoritos" && favorites.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="ml-auto px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex items-center gap-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white hover:opacity-90 hover:shadow-md"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Seleccionar todos
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Location Filter */}
              {activeTab === "ubicacion" && (
                <LocationSearchFilter
                  provinces={provinces}
                  cities={cities}
                  selectedProvince={selectedProvince}
                  selectedCity={selectedCity}
                  onProvinceChange={setSelectedProvince}
                  onCityChange={setSelectedCity}
                />
              )}
            </div>

            {/* Participants Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <LoaderWrapper text="Cargando participantes..." size="lg" />
              ) : filteredParticipants.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <p>No se encontraron participantes</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paginatedParticipants.map((participant) => (
                      <ParticipantCard
                        key={participant._id}
                        participant={participant}
                        isSelected={false}
                        isFavorite={favoriteIds.has(String(participant._id))}
                        onToggleSelect={() => handleParticipantToggle(participant._id)}
                        onToggleFavorite={() => handleFavoriteToggle(participant._id)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {participantsTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => setParticipantsPage((p) => Math.max(0, p - 1))}
                        disabled={participantsPage === 0}
                        className="px-3 py-1 rounded bg-[var(--background)] border border-[var(--card-border)] disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-[var(--text-secondary)]">
                        Página {participantsPageSafe + 1} de {participantsTotalPages}
                      </span>
                      <button
                        onClick={() => setParticipantsPage((p) => Math.min(participantsTotalPages - 1, p + 1))}
                        disabled={participantsPage >= participantsTotalPages - 1}
                        className="px-3 py-1 rounded bg-[var(--background)] border border-[var(--card-border)] disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--card-border)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={selectedParticipants.length === 0 || isSaving}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              `Guardar (${selectedParticipants.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
