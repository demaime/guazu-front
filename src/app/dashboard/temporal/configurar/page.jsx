"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { useSurveyCreation } from '../context/SurveyCreationContext';
import { surveyService } from '@/services/survey.service';

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
  const surveyId = searchParams.get('id');
  
  const { surveyData, updateSurveyData } = useSurveyCreation();
  const [isLoading, setIsLoading] = useState(!!surveyId);
  const [isSaving, setIsSaving] = useState(false);

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
        setConfig(prev => ({
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
      
      setConfig({
        fechaInicio: surveyInfo.startDate || '',
        fechaFin: surveyInfo.endDate || '',
        metaTotal: surveyInfo.target || 0,
        gpsObligatorio: surveyInfo.requireGps || false,
        tieneObjetivo: (surveyInfo.target || 0) > 0,
        cuotasActivas: (surveyInfo.quotas || []).length > 0,
        categorias: (surveyInfo.quotas || []).map(q => ({
          id: Date.now() + Math.random(),
          nombre: q.category,
          segmentos: q.segments.map(s => ({
            id: Date.now() + Math.random(),
            nombre: s.name,
            objetivo: s.target,
            porcentaje: 0,
            icon: 'User'
          }))
        }))
      });
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      alert('Error al cargar la configuración: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre: "",
    segmentos: [{ nombre: "", objetivo: 0, porcentaje: 0, icon: "User" }],
  });

  const updateConfig = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const calcularDuracion = () => {
    if (!config.fechaInicio || !config.fechaFin) return 0;
    const inicio = new Date(config.fechaInicio);
    const fin = new Date(config.fechaFin);
    const diff = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const calcularPorDia = () => {
    const dias = calcularDuracion();
    return dias > 0 ? (config.metaTotal / dias).toFixed(1) : 0;
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
          const objetivoPorSegmento = Math.floor(
            metaEfectiva / numSegmentos
          );
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

  const guardarCategoria = () => {
    if (!nuevaCategoria.nombre.trim()) {
      setValidationMessage("Debes ingresar un nombre para la categoría");
      setShowValidationModal(true);
      return;
    }

    const segmentosValidos = nuevaCategoria.segmentos.filter(
      (s) => s.nombre.trim()
    );
    if (segmentosValidos.length === 0) {
      setValidationMessage("Debes agregar al menos un segmento");
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

    setNuevaCategoria({
      nombre: "",
      segmentos: [{ nombre: "", objetivo: 0, porcentaje: 0, icon: "User" }],
    });
    setShowCategoriaModal(false);
  };

  const eliminarCategoria = (categoriaId) => {
    setConfig((prev) => ({
      ...prev,
      categorias: prev.categorias.filter((cat) => cat.id !== categoriaId),
    }));
  };

  const duracion = calcularDuracion();
  const porDia = calcularPorDia();

  if (isLoading) {
    return (
      <div className="min-h-full bg-[var(--background)] flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Cargando configuración...</p>
          </div>
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
            <div className="bg-[var(--card-background)] rounded-xl border border-[var(--secondary-light)] shadow-sm overflow-hidden">
              <div className="bg-[var(--primary-dark)] px-6 py-4 border-b border-[var(--card-border)] flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Calendar size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-lg text-white">
                  Período de Ejecución
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={config.fechaInicio}
                      onChange={(e) => updateConfig("fechaInicio", e.target.value)}
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
            <div className="bg-[var(--card-background)] rounded-xl border border-[var(--secondary-light)] shadow-sm overflow-hidden">
              <div className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="p-2 bg-[var(--primary)]/10 rounded-lg mt-1 flex-shrink-0">
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
                  className={`relative w-14 h-8 rounded-full transition-all flex-shrink-0 ${
                    config.gpsObligatorio
                      ? "bg-[var(--primary-light)] hover:opacity-90"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      config.gpsObligatorio ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

          {/* 3. Objetivo */}
          <div className="bg-[var(--card-background)] rounded-xl border border-[var(--secondary-light)] shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
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
                  className={`relative w-14 h-8 rounded-full transition-all flex-shrink-0 ${
                    config.tieneObjetivo
                      ? "bg-[var(--primary-light)] hover:opacity-90"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      config.tieneObjetivo ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              {config.tieneObjetivo && (
                <div className="pl-[52px]">
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
                  {config.metaTotal > 0 && duracion > 0 && (
                    <div className="mt-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/30 rounded-lg px-3 py-2 text-sm">
                      <span className="text-[var(--secondary)]">
                        Promedio: <strong>{porDia} encuestas/día</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

            {/* 4. Sistema de Cuotas */}
            <div className="bg-[var(--card-background)] rounded-xl border border-[var(--secondary-light)] shadow-sm overflow-hidden">
              <div className="bg-[var(--primary-dark)] px-6 py-4 border-b border-[var(--card-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <PieChart size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      Sistema de Cuotas
                    </h3>
                    <p className="text-xs text-white/80">
                      Balancea tu muestra por segmentos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateConfig("cuotasActivas", !config.cuotasActivas)
                  }
                  className={`relative w-14 h-8 rounded-full transition-all flex-shrink-0 ${
                    config.cuotasActivas
                      ? "bg-[var(--primary-light)] hover:opacity-90"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      config.cuotasActivas ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

            {config.cuotasActivas && (
              <div className="p-6 space-y-4">
                {/* Meta efectiva - solo mostrar si NO hay objetivo */}
                {!config.tieneObjetivo && (
                  <div className="bg-[var(--input-background)] rounded-lg p-4 border border-[var(--card-border)]">
                    <div className="text-sm text-[var(--text-secondary)] mb-2">
                      Meta mínima (basada en cuotas)
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                      {obtenerMetaEfectiva()} encuestas
                    </div>
                    {config.categorias.length > 0 && (
                      <div className="mt-2 text-xs text-[var(--text-secondary)]">
                        💡 Sin límite superior - Las cuotas definen el mínimo
                        requerido
                      </div>
                    )}
                  </div>
                )}

                {/* Botón para agregar categoría */}
                <button
                  onClick={() => setShowCategoriaModal(true)}
                  className="w-full bg-[var(--secondary)]/10 hover:bg-[var(--secondary)]/20 border-2 border-dashed border-[var(--secondary)]/50 rounded-lg px-4 py-3 text-[var(--text-brand-secondary)] font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Agregar Categoría de Cuota
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
                      className="bg-[var(--input-background)] rounded-lg p-4 border border-[var(--card-border)]"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-base sm:text-lg text-[var(--text-primary)]">
                          {categoria.nombre}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              distribuirEquitativamente(categoria.id)
                            }
                            className="text-xs bg-[var(--secondary)]/20 hover:bg-[var(--secondary)]/30 text-[var(--secondary)] px-3 py-1 rounded transition-colors whitespace-nowrap"
                          >
                            Distribuir ⚖️
                          </button>
                          <button
                            onClick={() => eliminarCategoria(categoria.id)}
                            className="text-[var(--error-text)] hover:text-[var(--error-border)] p-1"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {categoria.segmentos.map((segmento, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[var(--secondary)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <IconRenderer
                                iconName={segmento.icon}
                                size={18}
                                className="text-[var(--secondary)]"
                              />
                            </div>
                            <div className="flex-1 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] font-medium">
                              {segmento.nombre}
                            </div>
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
                              className="w-16 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg px-2 py-2 text-[var(--text-primary)] text-center focus:outline-none focus:border-[var(--secondary)]"
                              min="0"
                              max="100"
                            />
                            <span className="text-[var(--text-secondary)] text-sm flex-shrink-0">
                              %
                            </span>
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
                              className="w-20 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg px-2 py-2 text-[var(--text-primary)] text-center focus:outline-none focus:border-[var(--secondary)]"
                              min="0"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Validación */}
                      <div
                        className={`mt-4 p-3 rounded-lg border ${
                          isCompleto
                            ? "bg-[var(--success-bg)] border-[var(--success-border)]"
                            : excedido
                            ? "bg-[var(--error-bg)] border-[var(--error-border)]"
                            : "bg-[var(--warning-bg)] border-[var(--warning-border)]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className={`flex items-center gap-2 ${
                              isCompleto
                                ? "text-[var(--success)]"
                                : excedido
                                ? "text-[var(--error-text)]"
                                : "text-[var(--warning)]"
                            }`}
                          >
                            {isCompleto ? (
                              <Check size={16} />
                            ) : (
                              <AlertCircle size={16} />
                            )}
                            Total asignado
                          </span>
                          <span className="font-mono font-bold">
                            {totalAsignado} / {obtenerMetaEfectiva()}
                          </span>
                        </div>
                        {!isCompleto && (
                          <div className="text-xs mt-1 text-[var(--text-secondary)]">
                            {excedido
                              ? `Excede en ${
                                  totalAsignado - obtenerMetaEfectiva()
                                } encuestas`
                              : `Faltan ${
                                  obtenerMetaEfectiva() - totalAsignado
                                } encuestas por asignar`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {config.categorias.length === 0 && (
                  <div className="text-center py-8 text-[var(--text-secondary)]">
                    <p className="text-sm">
                      No has creado categorías de cuotas aún
                    </p>
                    <p className="text-xs mt-1">
                      Haz clic en "Agregar Categoría de Cuota" para comenzar
                    </p>
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
            onClick={() => router.push('/dashboard/temporal')}
            className="flex-1 px-6 py-3 text-[var(--error-text)] hover:bg-[var(--error-bg)]/80 border border-[var(--error-border)] rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              // Validar que haya ID
              if (!surveyId) {
                setValidationMessage("No se puede guardar configuración sin una encuesta seleccionada");
                setShowValidationModal(true);
                return;
              }

              // Validar fechas
              if (!config.fechaInicio || !config.fechaFin) {
                setValidationMessage("Debes seleccionar fechas de inicio y fin");
                setShowValidationModal(true);
                return;
              }

              // Validar que la fecha de fin sea posterior a la de inicio
              if (new Date(config.fechaFin) < new Date(config.fechaInicio)) {
                setValidationMessage("La fecha de fin debe ser posterior a la fecha de inicio");
                setShowValidationModal(true);
                return;
              }

              // Validar meta si tiene objetivo
              if (config.tieneObjetivo && (!config.metaTotal || config.metaTotal <= 0)) {
                setValidationMessage("La meta debe ser mayor a 0");
                setShowValidationModal(true);
                return;
              }

              // Validar cuotas si están activas
              if (config.cuotasActivas) {
                if (config.categorias.length === 0) {
                  setValidationMessage("Debes agregar al menos una categoría de cuota");
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
                const { prepareDataForBackend } = await import('../utils/transformToSurveyJS');

                // Preparar cuotas en formato del backend
                const quotas = config.categorias.map(cat => ({
                  category: cat.nombre,
                  segments: cat.segmentos.map(seg => ({
                    name: seg.nombre,
                    target: seg.objetivo,
                    current: 0
                  }))
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
                  },
                  participants: existing?.survey?.participants || {
                    userIds: surveyInfo.userIds || [],
                    supervisorsIds: surveyInfo.supervisorsIds || [],
                    pollsterAssignments: [],
                    quotaAssignments: []
                  }
                };

                // Actualizar en el backend
                await surveyService.createOrUpdateSurvey(dataToSave, surveyId, true);

                alert("✅ Configuración guardada exitosamente");
                router.push('/dashboard/temporal');
              } catch (error) {
                console.error('Error al guardar configuración:', error);
                setValidationMessage("Error al guardar: " + error.message);
                setShowValidationModal(true);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg transition-colors font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
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
                onClick={() => setShowCategoriaModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 -m-2"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Nombre de la categoría{" "}
                  <span className="text-red-500">*</span>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Segmentos <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={agregarSegmentoNuevo}
                    className="text-xs bg-[var(--secondary)]/20 hover:bg-[var(--secondary)]/30 text-[var(--secondary)] px-3 py-1 rounded transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </div>

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
                      {nuevaCategoria.segmentos.length > 1 && (
                        <button
                          onClick={() => eliminarSegmentoNuevo(idx)}
                          className="text-[var(--error-text)] hover:text-[var(--error-border)] p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--card-border)] flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowCategoriaModal(false)}
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
          onClick={() => setShowValidationModal(false)}
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
              <button
                onClick={() => setShowValidationModal(false)}
                className="w-full px-6 py-3 bg-[var(--secondary)] hover:bg-[var(--secondary-dark)] rounded-lg transition-colors font-semibold text-white"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
