"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Star,
  X,
  MapPin,
  Check,
} from "lucide-react";
import { userService } from "@/services/user.service";
import { surveyService } from "@/services/survey.service";
import ParticipantCard from "@/components/temporal/ParticipantCard";
import LocationSearchFilter from "@/components/temporal/LocationSearchFilter";
import UserAvatar from "@/components/ui/UserAvatar";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { toast } from "react-toastify";

export default function PollsterSelectionModal({
  open,
  onClose,
  surveyId,
  onSave,
  initialData = {}
}) {
  // Data state
  const [pollsters, setPollsters] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Selection state
  const [selectedPollsters, setSelectedPollsters] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination
  const pollstersPageSize = 24;
  const [pollstersPage, setPollstersPage] = useState(0);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Reset pagination when filters change
  useEffect(() => {
    setPollstersPage(0);
  }, [activeTab, searchQuery, selectedProvince, selectedCity]);

  // Load initial selection from initialData
  useEffect(() => {
    if (open && initialData) {
      const ids = initialData.pollsters || [];
      setSelectedPollsters(Array.isArray(ids) ? ids.map(String) : []);
    }
  }, [open, initialData]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedProvince("");
      setSelectedCity("");
      setActiveTab("todos");
      setPollstersPage(0);
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load pollsters
      const pollstersData = await userService.getPollsters();
      setPollsters(pollstersData.users || []);

      // Load favorites
      const favs = await userService.getFavorites("pollsters");
      setFavorites(favs || []);

      // Load existing selection from survey if surveyId is provided
      if (surveyId) {
        try {
          const existing = await surveyService.getSurvey(surveyId);
          const surveyInfo = existing?.survey?.surveyInfo || {};
          
          const savedIds =
            existing?.survey?.surveyInfo?.userIds ||
            existing?.survey?.participants?.userIds ||
            existing?.survey?.userIds ||
            surveyInfo.userIds ||
            [];
          setSelectedPollsters((savedIds || []).map(String));
        } catch (e) {
          console.warn("Could not load existing selection:", e);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setPollsters([]);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const favoriteIds = useMemo(
    () => new Set((favorites || []).map((f) => String(f?._id))),
    [favorites]
  );

  const handleFavoriteToggle = async (pollsterId) => {
    const idStr = String(pollsterId);
    const isFavorite = favoriteIds.has(idStr);

    const snapshot = favorites;
    try {
      if (isFavorite) {
        setFavorites((prev) => (prev || []).filter((f) => String(f?._id) !== idStr));
        await userService.removeFavorite(pollsterId, "pollsters");
      } else {
        const pollsterObj =
          (pollsters || []).find((p) => String(p?._id) === idStr) || null;
        setFavorites((prev) => {
          const next = prev ? [...prev] : [];
          if (pollsterObj && !next.some((f) => String(f?._id) === idStr)) {
            next.push(pollsterObj);
          }
          return next;
        });
        await userService.addFavorite(pollsterId, "pollsters");
      }

      const fresh = await userService.getFavorites("pollsters");
      setFavorites(fresh || []);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setFavorites(snapshot);
      toast.error("No se pudo actualizar favoritos. Intenta nuevamente.");
    }
  };

  const handlePollsterToggle = (pollsterId) => {
    setSelectedPollsters((prev) => {
      const currentSelection = Array.isArray(prev) ? prev : [];
      const isAdding = !currentSelection.includes(String(pollsterId));
      return isAdding
        ? [...currentSelection, String(pollsterId)]
        : currentSelection.filter((id) => id !== String(pollsterId));
    });
  };

  const handleSelectAll = () => {
    if (activeTab === "favoritos") {
      const favoriteIds = (favorites || []).map((f) => String(f._id));
      setSelectedPollsters((prev) => {
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

    if (isSaving) return;

    setIsSaving(true);
    try {
      const existing = await surveyService.getSurvey(surveyId);
      const surveyData = existing?.survey?.survey || existing?.survey;
      const surveyInfo = existing?.survey?.surveyInfo || {};
      const definition = existing?.survey?.surveyDefinition;

      const updatedSupervisorsIds = 
        existing?.survey?.surveyInfo?.supervisorsIds ||
        existing?.survey?.participants?.supervisorsIds ||
        existing?.survey?.supervisorsIds ||
        surveyInfo.supervisorsIds ||
        [];

      const dataToSave = {
        survey: surveyData,
        surveyDefinition: definition,
        surveyInfo: {
          ...surveyInfo,
          userIds: selectedPollsters,
          supervisorsIds: updatedSupervisorsIds,
        },
        participants: {
          userIds: selectedPollsters,
          supervisorsIds: updatedSupervisorsIds,
          pollsterAssignments: existing?.survey?.participants?.pollsterAssignments || [],
          quotaAssignments: existing?.survey?.participants?.quotaAssignments || []
        }
      };

      await surveyService.createOrUpdateSurvey(dataToSave, surveyId, false);
      
      toast.success(`${selectedPollsters.length} encuestadores asignados exitosamente`);
      
      // Call onSave callback BEFORE closing to update parent state
      if (onSave) {
        onSave(selectedPollsters);
      }
      
      // Close modal after state update
      onClose();
    } catch (error) {
      console.error('Error saving pollsters:', error);
      toast.error(`Error al guardar encuestadores: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Get unique provinces
  const provinces = useMemo(() => {
    const provinceMap = new Map();
    pollsters.forEach((p) => {
      if (p.province) {
        const count = provinceMap.get(p.province) || 0;
        provinceMap.set(p.province, count + 1);
      }
    });
    return Array.from(provinceMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pollsters]);

  // Get unique cities
  const cities = useMemo(() => {
    if (!selectedProvince) return [];

    const cityMap = new Map();
    pollsters
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
  }, [pollsters, selectedProvince]);

  // Filter pollsters
  const filteredPollsters = useMemo(() => {
    let result = [];

    if (activeTab === "favoritos") {
      result = favorites;
    } else {
      result = pollsters;
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

    const selectedSet = new Set(selectedPollsters);
    result = result.filter((p) => !selectedSet.has(String(p._id)));

    return result;
  }, [
    pollsters,
    favorites,
    activeTab,
    selectedProvince,
    selectedCity,
    searchQuery,
    selectedPollsters,
  ]);

  const pollstersTotalPages = Math.max(
    1,
    Math.ceil(filteredPollsters.length / pollstersPageSize)
  );
  const pollstersPageSafe = Math.min(
    pollstersPage,
    pollstersTotalPages - 1
  );
  const paginatedPollsters = useMemo(() => {
    const start = pollstersPageSafe * pollstersPageSize;
    return filteredPollsters.slice(start, start + pollstersPageSize);
  }, [filteredPollsters, pollstersPageSafe]);

  const selectedRows = useMemo(() => {
    const byId = new Map();
    (pollsters || []).forEach((p) => byId.set(String(p?._id), p));
    (favorites || []).forEach((p) => {
      const id = String(p?._id);
      if (!byId.has(id)) byId.set(id, p);
    });
    return (selectedPollsters || []).map((id) => {
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
  }, [selectedPollsters, pollsters, favorites]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-background)] rounded-xl w-full max-w-7xl h-[90vh] flex flex-col border border-[var(--card-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Seleccionar Encuestadores
          </h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel: Selected Pollsters */}
          <div className="w-1/3 bg-gradient-to-br from-[var(--primary)]/8 via-[var(--primary)]/4 to-transparent border-r border-[var(--card-border)] flex flex-col min-h-0">
            <div className="flex-shrink-0 p-4 bg-gradient-to-r from-[var(--primary)]/15 to-[var(--primary)]/10 backdrop-blur-sm border-b border-[var(--card-border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Seleccionados
              </h3>
              <p className="text-xs text-[var(--text-primary)] mt-1">
                {selectedPollsters.length} encuestador{selectedPollsters.length !== 1 ? "es" : ""}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <LoaderWrapper text="Cargando..." size="sm" />
              ) : selectedRows.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <p className="text-sm">No hay encuestadores seleccionados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRows.map((pollster) => (
                    <div
                      key={pollster.id}
                      className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-xl p-3 flex items-center gap-3 group hover:border-[var(--primary)]/40 transition-all hover:shadow-md relative overflow-hidden"
                    >
                      <UserAvatar
                        src={pollster.image}
                        alt={pollster.fullName}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {pollster.fullName}
                        </p>
                        {pollster.city && (
                          <p className="text-xs text-[var(--text-secondary)] truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {pollster.city}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handlePollsterToggle(pollster.id)}
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

          {/* Right Panel: Available Pollsters */}
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
                  Todos ({pollsters.length})
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

              <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
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

            {/* Pollsters Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <LoaderWrapper text="Cargando encuestadores..." size="lg" />
              ) : filteredPollsters.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <p>No se encontraron encuestadores</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paginatedPollsters.map((pollster) => (
                      <ParticipantCard
                        key={pollster._id}
                        participant={pollster}
                        isSelected={false}
                        isFavorite={favoriteIds.has(String(pollster._id))}
                        onToggleSelect={() => handlePollsterToggle(pollster._id)}
                        onToggleFavorite={() => handleFavoriteToggle(pollster._id)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {pollstersTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => setPollstersPage((p) => Math.max(0, p - 1))}
                        disabled={pollstersPage === 0}
                        className="px-3 py-1 rounded bg-[var(--background)] border border-[var(--card-border)] disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-[var(--text-secondary)]">
                        Página {pollstersPageSafe + 1} de {pollstersTotalPages}
                      </span>
                      <button
                        onClick={() => setPollstersPage((p) => Math.min(pollstersTotalPages - 1, p + 1))}
                        disabled={pollstersPage >= pollstersTotalPages - 1}
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
            disabled={selectedPollsters.length === 0 || isSaving}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              `Guardar (${selectedPollsters.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
