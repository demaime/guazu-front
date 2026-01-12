import React, { useState } from "react";
import {
  Calendar,
  Users,
  Target,
  MapPin,
  Check,
  AlertCircle,
  Plus,
  X,
  Search,
  User,
  UserCircle,
  UserCheck,
  Users2,
} from "lucide-react";

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

export default function EncuestaConfig() {
  const [config, setConfig] = useState({
    fechaInicio: "2025-10-29",
    fechaFin: "2025-11-12",
    modalidad: "presencial",
    gpsObligatorio: false,
    tieneObjetivo: true,
    metaTotal: 100,
    supervisores: [],
    encuestadores: [],
    cuotasActivas: true,
    categorias: [
      {
        id: 1,
        nombre: "Género",
        editable: false,
        segmentos: [
          { nombre: "Masculino", objetivo: 50, porcentaje: 50, icon: "User" },
          {
            nombre: "Femenino",
            objetivo: 50,
            porcentaje: 50,
            icon: "UserCircle",
          },
        ],
      },
      {
        id: 2,
        nombre: "Rango de edad",
        editable: false,
        segmentos: [
          { nombre: "18-29", objetivo: 25, porcentaje: 25, icon: "UserCheck" },
          { nombre: "30-54", objetivo: 40, porcentaje: 40, icon: "User" },
          { nombre: "55-69", objetivo: 25, porcentaje: 25, icon: "UserCircle" },
          { nombre: "70+", objetivo: 10, porcentaje: 10, icon: "Users2" },
        ],
      },
    ],
    cuotasPorEncuestador: {},
    cuotasDetalladasPorEncuestador: {}, // { encuestadorId: { matriz: [[]] } }
  });

  const [showEncuestadoresModal, setShowEncuestadoresModal] = useState(false);
  const [showSupervisoresModal, setShowSupervisoresModal] = useState(false);
  const [expandedEncuestadores, setExpandedEncuestadores] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTermSupervisores, setSearchTermSupervisores] = useState("");

  const encuestadoresDisponibles = [
    {
      id: 4,
      nombre: "María Serra",
      email: "mariaserra78@gmail.com",
      ciudad: "Santa Fe",
      encuestasActivas: 0,
      masUsado: true,
    },
    {
      id: 5,
      nombre: "María Del Rosso",
      email: "mfdelrosso@gmail.com",
      ciudad: "Santa Fe",
      encuestasActivas: 4,
      masUsado: true,
    },
    {
      id: 1,
      nombre: "Carlos Nicolás Sejas",
      email: "nicosejas@live.com",
      ciudad: "Santa Fe",
      encuestasActivas: 3,
    },
    {
      id: 2,
      nombre: "Luciano Albizzati",
      email: "luciano.albizzati@outlook.com",
      ciudad: "Santa Fe",
      encuestasActivas: 5,
    },
    {
      id: 3,
      nombre: "Ignacio Llapur",
      email: "ignaciollapur@ferz.com.ar",
      ciudad: "Santa Fe",
      encuestasActivas: 2,
    },
    {
      id: 6,
      nombre: "Gimena Masat",
      email: "gimemasat20@gmail.com",
      ciudad: "Santa Fe",
      encuestasActivas: 1,
    },
    {
      id: 7,
      nombre: "Gabriel Bersano",
      email: "gabrielbersano432@gmail.com",
      ciudad: "Rafaela",
      encuestasActivas: 6,
    },
  ];

  const supervisoresDisponibles = [
    {
      id: 1,
      nombre: "Ana Martínez",
      email: "ana.martinez@guazu.com",
      ciudad: "Santa Fe",
      masUsado: true,
    },
    {
      id: 2,
      nombre: "Pedro Gómez",
      email: "pedro.gomez@guazu.com",
      ciudad: "Rafaela",
    },
    {
      id: 3,
      nombre: "Laura Fernández",
      email: "laura.fernandez@guazu.com",
      ciudad: "Santa Fe",
    },
  ];

  const calcularDuracion = () => {
    const inicio = new Date(config.fechaInicio);
    const fin = new Date(config.fechaFin);
    const diff = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const calcularPorDia = () => {
    const dias = calcularDuracion();
    return dias > 0 ? (config.metaTotal / dias).toFixed(1) : 0;
  };

  const updateConfig = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const calcularTotalAsignado = (categoria) => {
    return categoria.segmentos.reduce(
      (sum, seg) => sum + (seg.objetivo || 0),
      0
    );
  };

  const updateSegmento = (categoriaId, segmentoIndex, field, value) => {
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
              (newPorcentaje / 100) * config.metaTotal
            );
            newSegmentos[segmentoIndex] = {
              ...newSegmentos[segmentoIndex],
              porcentaje: newPorcentaje,
              objetivo: newObjetivo,
            };
          } else if (field === "objetivo") {
            const newObjetivo = parseInt(value) || 0;
            const newPorcentaje =
              config.metaTotal > 0
                ? Math.round((newObjetivo / config.metaTotal) * 100)
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
    setConfig((prev) => ({
      ...prev,
      categorias: prev.categorias.map((cat) => {
        if (cat.id === categoriaId) {
          const numSegmentos = cat.segmentos.length;
          const objetivoPorSegmento = Math.floor(
            config.metaTotal / numSegmentos
          );
          const resto = config.metaTotal % numSegmentos;
          return {
            ...cat,
            segmentos: cat.segmentos.map((seg, idx) => ({
              ...seg,
              objetivo: objetivoPorSegmento + (idx === 0 ? resto : 0),
              porcentaje: Math.round(
                ((objetivoPorSegmento + (idx === 0 ? resto : 0)) /
                  config.metaTotal) *
                  100
              ),
            })),
          };
        }
        return cat;
      }),
    }));
  };

  const toggleEncuestador = (encuestador) => {
    setConfig((prev) => {
      const exists = prev.encuestadores.find((e) => e.id === encuestador.id);
      const newEncuestadores = exists
        ? prev.encuestadores.filter((e) => e.id !== encuestador.id)
        : [...prev.encuestadores, encuestador];

      // Inicializar cuota por encuestador si no existe
      const newCuotasPorEncuestador = { ...prev.cuotasPorEncuestador };
      const newCuotasDetalladas = { ...prev.cuotasDetalladasPorEncuestador };

      if (!exists && !newCuotasPorEncuestador[encuestador.id]) {
        const cuotaTotal = Math.floor(
          config.metaTotal / (newEncuestadores.length || 1)
        );
        newCuotasPorEncuestador[encuestador.id] = cuotaTotal;

        // Inicializar matriz género x edad
        const generos = config.categorias[0].segmentos;
        const edades = config.categorias[1].segmentos;

        const matriz = generos.map((gen, gIdx) =>
          edades.map((edad, eIdx) => {
            const porcentaje = (gen.porcentaje / 100) * (edad.porcentaje / 100);
            return Math.round(porcentaje * cuotaTotal);
          })
        );

        newCuotasDetalladas[encuestador.id] = {
          matriz: matriz, // Array 2D: [genero][edad]
        };
      } else if (exists) {
        delete newCuotasDetalladas[encuestador.id];
      }

      return {
        ...prev,
        encuestadores: newEncuestadores,
        cuotasPorEncuestador: newCuotasPorEncuestador,
        cuotasDetalladasPorEncuestador: newCuotasDetalladas,
      };
    });
  };

  const toggleSupervisor = (supervisor) => {
    setConfig((prev) => {
      const exists = prev.supervisores.find((s) => s.id === supervisor.id);
      return {
        ...prev,
        supervisores: exists
          ? prev.supervisores.filter((s) => s.id !== supervisor.id)
          : [...prev.supervisores, supervisor],
      };
    });
  };

  const updateCuotaEncuestador = (encuestadorId, valor) => {
    setConfig((prev) => ({
      ...prev,
      cuotasPorEncuestador: {
        ...prev.cuotasPorEncuestador,
        [encuestadorId]: parseInt(valor) || 0,
      },
    }));
  };

  const updateCuotaMatriz = (encuestadorId, generoIdx, edadIdx, valor) => {
    setConfig((prev) => {
      const newCuotasDetalladas = { ...prev.cuotasDetalladasPorEncuestador };
      const cuotasEnc = { ...newCuotasDetalladas[encuestadorId] };
      const newMatriz = cuotasEnc.matriz.map((row) => [...row]);

      newMatriz[generoIdx][edadIdx] = Math.max(0, parseInt(valor) || 0);
      cuotasEnc.matriz = newMatriz;
      newCuotasDetalladas[encuestadorId] = cuotasEnc;

      // Calcular total
      const total = newMatriz.reduce(
        (sum, row) => sum + row.reduce((rowSum, val) => rowSum + val, 0),
        0
      );

      return {
        ...prev,
        cuotasDetalladasPorEncuestador: newCuotasDetalladas,
        cuotasPorEncuestador: {
          ...prev.cuotasPorEncuestador,
          [encuestadorId]: total,
        },
      };
    });
  };

  const incrementCuotaMatriz = (encuestadorId, generoIdx, edadIdx, delta) => {
    const current =
      config.cuotasDetalladasPorEncuestador[encuestadorId]?.matriz[generoIdx][
        edadIdx
      ] || 0;
    updateCuotaMatriz(encuestadorId, generoIdx, edadIdx, current + delta);
  };

  const toggleExpandEncuestador = (encuestadorId) => {
    setExpandedEncuestadores((prev) => ({
      ...prev,
      [encuestadorId]: !prev[encuestadorId],
    }));
  };

  const distribuirEquitativamenteEncuestadores = () => {
    if (config.encuestadores.length === 0) return;

    const cuotaPorEncuestador = Math.floor(
      config.metaTotal / config.encuestadores.length
    );
    const resto = config.metaTotal % config.encuestadores.length;

    const newCuotas = {};
    config.encuestadores.forEach((enc, idx) => {
      newCuotas[enc.id] = cuotaPorEncuestador + (idx === 0 ? resto : 0);
    });

    setConfig((prev) => ({
      ...prev,
      cuotasPorEncuestador: newCuotas,
    }));
  };

  const duracion = calcularDuracion();
  const porDia = calcularPorDia();

  const encuestadoresFiltrados = encuestadoresDisponibles.filter(
    (e) =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.ciudad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const supervisoresFiltrados = supervisoresDisponibles.filter(
    (s) =>
      s.nombre.toLowerCase().includes(searchTermSupervisores.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTermSupervisores.toLowerCase()) ||
      s.ciudad.toLowerCase().includes(searchTermSupervisores.toLowerCase())
  );

  const totalAsignadoEncuestadores = config.encuestadores.reduce(
    (sum, enc) => sum + (config.cuotasPorEncuestador[enc.id] || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header Fixed */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-4 py-4 sm:px-8 sm:py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Configuración de Encuesta
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Encuesta de Satisfacción Q4 2025
          </p>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-8 pb-24">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* 1. Fechas */}
          <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/50">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={config.fechaInicio}
                  onChange={(e) => updateConfig("fechaInicio", e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fecha de fin
                </label>
                <input
                  type="date"
                  value={config.fechaFin}
                  onChange={(e) => updateConfig("fechaFin", e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {duracion > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-sm">
                <span className="text-blue-300">
                  Duración: <strong>{duracion} días</strong>
                </span>
              </div>
            )}
          </div>

          {/* 2. Modalidad */}
          <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/50">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Tipo de encuesta
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "presencial", label: "Presencial", icon: "🏠" },
                { value: "online", label: "Online", icon: "💻" },
                { value: "hibrida", label: "Híbrida", icon: "🔄" },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => updateConfig("modalidad", value)}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    config.modalidad === value
                      ? "border-green-500 bg-green-500/20"
                      : "border-slate-600 bg-slate-700/30 hover:border-slate-500 active:border-slate-500"
                  }`}
                >
                  <div className="text-2xl sm:text-3xl mb-1">{icon}</div>
                  <div className="font-semibold text-sm sm:text-base">
                    {label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. GPS Obligatorio */}
          {(config.modalidad === "presencial" ||
            config.modalidad === "hibrida") && (
            <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium flex items-center gap-2">
                    <MapPin size={18} className="text-green-400" />
                    Ubicación GPS Obligatoria
                  </label>
                  <p className="text-sm text-slate-400 mt-1">
                    {config.gpsObligatorio
                      ? "Los encuestadores no podrán enviar respuestas sin coordenadas GPS."
                      : "Se intentará obtener la ubicación pero se permitirá enviar sin coordenadas en caso de error."}
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateConfig("gpsObligatorio", !config.gpsObligatorio)
                  }
                  className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ml-4 ${
                    config.gpsObligatorio ? "bg-green-500" : "bg-slate-600"
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
          )}

          {/* 4. Objetivo */}
          <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <label className="font-medium">¿Tiene objetivo de casos?</label>
              <button
                onClick={() =>
                  updateConfig("tieneObjetivo", !config.tieneObjetivo)
                }
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  config.tieneObjetivo ? "bg-blue-500" : "bg-slate-600"
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
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Meta total de encuestas{" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={config.metaTotal}
                  onChange={(e) =>
                    updateConfig("metaTotal", parseInt(e.target.value) || 0)
                  }
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Ingrese la meta"
                  min="1"
                />
                {config.metaTotal > 0 && duracion > 0 && (
                  <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 text-sm">
                    <span className="text-purple-300">
                      Promedio: <strong>{porDia} encuestas/día</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Supervisores */}
          <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold mb-1">Supervisores</h3>
                <p className="text-sm text-slate-400">
                  Asigna supervisores para monitorear el progreso
                </p>
              </div>
              <button
                onClick={() => setShowSupervisoresModal(true)}
                className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Users size={18} />
                Seleccionar
              </button>
            </div>

            {config.supervisores.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-700/20 rounded-lg border border-slate-600/50">
                <Users size={48} className="mx-auto mb-2 opacity-30" />
                <p>No has seleccionado supervisores aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {config.supervisores.map((sup) => (
                  <div
                    key={sup.id}
                    className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-300 font-bold flex-shrink-0">
                        {sup.nombre
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{sup.nombre}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {sup.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSupervisor(sup)}
                      className="text-red-400 hover:text-red-300 p-1 ml-2"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                <div className="text-sm text-slate-400 mt-2">
                  <strong>{config.supervisores.length}</strong> supervisor
                  {config.supervisores.length !== 1 ? "es" : ""} seleccionado
                  {config.supervisores.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>

          {/* 6. Encuestadores */}
          <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold mb-1">Encuestadores</h3>
                <p className="text-sm text-slate-400">
                  Selecciona los encuestadores que participarán
                </p>
              </div>
              <button
                onClick={() => setShowEncuestadoresModal(true)}
                className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Users size={18} />
                Seleccionar
              </button>
            </div>

            {config.encuestadores.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-700/20 rounded-lg border border-slate-600/50">
                <Users size={48} className="mx-auto mb-2 opacity-30" />
                <p>No has seleccionado encuestadores aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {config.encuestadores.map((enc) => (
                  <div
                    key={enc.id}
                    className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-300 font-bold flex-shrink-0">
                        {enc.nombre
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{enc.nombre}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {enc.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleEncuestador(enc)}
                      className="text-red-400 hover:text-red-300 p-1 ml-2"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                <div className="text-sm text-slate-400 mt-2">
                  <strong>{config.encuestadores.length}</strong> encuestador
                  {config.encuestadores.length !== 1 ? "es" : ""} seleccionado
                  {config.encuestadores.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>

          {/* 7. Cuotas */}
          {config.modalidad !== "online" && (
            <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold mb-1">Sistema de Cuotas</h3>
                  <p className="text-sm text-slate-400">
                    Las cuotas ayudan a balancear tu muestra
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateConfig("cuotasActivas", !config.cuotasActivas)
                  }
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    config.cuotasActivas ? "bg-purple-500" : "bg-slate-600"
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
                <div className="space-y-4">
                  {config.tieneObjetivo && (
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                      <div className="text-sm text-slate-300 mb-2">
                        Meta total
                      </div>
                      <div className="text-3xl font-bold text-purple-400">
                        {config.metaTotal} encuestas
                      </div>
                    </div>
                  )}

                  {config.categorias.map((categoria) => {
                    const totalAsignado = calcularTotalAsignado(categoria);
                    const isCompleto = totalAsignado === config.metaTotal;
                    const excedido = totalAsignado > config.metaTotal;

                    return (
                      <div
                        key={categoria.id}
                        className="bg-slate-700/30 rounded-lg p-4 border border-slate-600"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-base sm:text-lg">
                            {categoria.nombre}
                          </h3>
                          <button
                            onClick={() =>
                              distribuirEquitativamente(categoria.id)
                            }
                            className="text-xs bg-purple-500/20 hover:bg-purple-500/30 active:bg-purple-500/30 text-purple-300 px-3 py-1 rounded transition-colors whitespace-nowrap"
                          >
                            Distribuir ⚖️
                          </button>
                        </div>

                        <div className="space-y-3">
                          {categoria.segmentos.map((segmento, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <IconRenderer
                                  iconName={segmento.icon}
                                  size={18}
                                  className="text-purple-400"
                                />
                              </div>
                              <div className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium">
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
                                className="w-16 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-center focus:outline-none focus:border-purple-500"
                                min="0"
                                max="100"
                              />
                              <span className="text-slate-400 text-sm flex-shrink-0">
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
                                className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-center focus:outline-none focus:border-purple-500"
                                min="0"
                              />
                            </div>
                          ))}
                        </div>

                        {config.tieneObjetivo && (
                          <div
                            className={`mt-4 p-3 rounded-lg border ${
                              isCompleto
                                ? "bg-green-500/10 border-green-500/30"
                                : excedido
                                ? "bg-red-500/10 border-red-500/30"
                                : "bg-yellow-500/10 border-yellow-500/30"
                            }`}
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span
                                className={`flex items-center gap-2 ${
                                  isCompleto
                                    ? "text-green-300"
                                    : excedido
                                    ? "text-red-300"
                                    : "text-yellow-300"
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
                                {totalAsignado} / {config.metaTotal}
                              </span>
                            </div>
                            {!isCompleto && (
                              <div className="text-xs mt-1 text-slate-400">
                                {excedido
                                  ? `Excede en ${
                                      totalAsignado - config.metaTotal
                                    } encuestas`
                                  : `Faltan ${
                                      config.metaTotal - totalAsignado
                                    } encuestas por asignar`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Distribución por Encuestador */}
                  {config.encuestadores.length > 0 && (
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-base sm:text-lg">
                          Distribución por Encuestador
                        </h3>
                        <button
                          onClick={distribuirEquitativamenteEncuestadores}
                          className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 active:bg-cyan-500/30 text-cyan-300 px-3 py-1 rounded transition-colors whitespace-nowrap"
                        >
                          Distribuir ⚖️
                        </button>
                      </div>

                      <div className="space-y-3">
                        {config.encuestadores.map((enc) => {
                          const isExpanded = expandedEncuestadores[enc.id];
                          const cuotasDetalladas =
                            config.cuotasDetalladasPorEncuestador[enc.id];

                          return (
                            <div
                              key={enc.id}
                              className="bg-slate-800/50 rounded-lg border border-slate-600"
                            >
                              {/* Header del encuestador */}
                              <div className="flex items-center gap-3 p-3">
                                <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-300 font-bold text-sm flex-shrink-0">
                                  {enc.nombre
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <div className="flex-1 text-sm font-medium truncate">
                                  {enc.nombre}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-400">
                                    {config.cuotasPorEncuestador[enc.id] || 0}{" "}
                                    casos
                                  </span>
                                  <button
                                    onClick={() =>
                                      toggleExpandEncuestador(enc.id)
                                    }
                                    className="text-slate-400 hover:text-white p-1 transition-colors"
                                  >
                                    {isExpanded ? "▼" : "▶"}
                                  </button>
                                </div>
                              </div>

                              {/* Cuotas detalladas expandibles */}
                              {isExpanded && cuotasDetalladas && (
                                <div className="px-2 sm:px-3 pb-3 border-t border-slate-700 pt-3">
                                  {/* Vista MÓVIL - Matriz transpuesta: columnas=género, filas=edad */}
                                  <div className="block sm:hidden">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr>
                                          <th className="p-1"></th>
                                          {config.categorias[0].segmentos.map(
                                            (genero, gIdx) => (
                                              <th key={gIdx} className="p-1">
                                                <div className="flex flex-col items-center gap-1">
                                                  <IconRenderer
                                                    iconName={genero.icon}
                                                    size={28}
                                                    className="text-cyan-400"
                                                  />
                                                  <span className="text-xs text-slate-300 font-medium">
                                                    {genero.nombre}
                                                  </span>
                                                </div>
                                              </th>
                                            )
                                          )}
                                          <th className="p-1">
                                            <div className="text-xs text-slate-300 font-medium">
                                              Total
                                            </div>
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {config.categorias[1].segmentos.map(
                                          (edad, eIdx) => {
                                            const totalFila =
                                              cuotasDetalladas.matriz.reduce(
                                                (sum, row) => sum + row[eIdx],
                                                0
                                              );
                                            return (
                                              <tr key={eIdx}>
                                                <td className="p-1">
                                                  <div className="flex flex-col items-center gap-1">
                                                    <IconRenderer
                                                      iconName={edad.icon}
                                                      size={20}
                                                      className="text-cyan-400"
                                                    />
                                                    <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
                                                      {edad.nombre}
                                                    </span>
                                                  </div>
                                                </td>
                                                {config.categorias[0].segmentos.map(
                                                  (_, gIdx) => {
                                                    const valor =
                                                      cuotasDetalladas.matriz[
                                                        gIdx
                                                      ][eIdx];
                                                    const isCompleto =
                                                      valor > 0;
                                                    return (
                                                      <td
                                                        key={gIdx}
                                                        className="p-1"
                                                      >
                                                        <div
                                                          className={`rounded-xl border-2 p-2 transition-all ${
                                                            isCompleto
                                                              ? "bg-cyan-500/10 border-cyan-500/50"
                                                              : "bg-slate-800/50 border-slate-700"
                                                          }`}
                                                        >
                                                          <div className="flex flex-col items-center gap-1.5">
                                                            <div className="text-3xl font-bold">
                                                              {valor}
                                                            </div>
                                                            <div className="flex gap-1">
                                                              <button
                                                                onClick={() =>
                                                                  incrementCuotaMatriz(
                                                                    enc.id,
                                                                    gIdx,
                                                                    eIdx,
                                                                    -1
                                                                  )
                                                                }
                                                                disabled={
                                                                  valor === 0
                                                                }
                                                                className="w-11 h-11 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-xl font-bold flex items-center justify-center transition-colors touch-manipulation"
                                                              >
                                                                −
                                                              </button>
                                                              <button
                                                                onClick={() =>
                                                                  incrementCuotaMatriz(
                                                                    enc.id,
                                                                    gIdx,
                                                                    eIdx,
                                                                    1
                                                                  )
                                                                }
                                                                className="w-11 h-11 bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 rounded-xl text-xl font-bold flex items-center justify-center transition-colors touch-manipulation"
                                                              >
                                                                +
                                                              </button>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </td>
                                                    );
                                                  }
                                                )}
                                                <td className="p-1">
                                                  <div className="text-center font-mono font-bold text-cyan-400 text-xl">
                                                    {totalFila}
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          }
                                        )}
                                        <tr className="border-t-2 border-slate-600">
                                          <td className="p-1">
                                            <div className="text-xs font-medium text-slate-300">
                                              Total
                                            </div>
                                          </td>
                                          {config.categorias[0].segmentos.map(
                                            (_, gIdx) => {
                                              const totalColumna =
                                                cuotasDetalladas.matriz[
                                                  gIdx
                                                ].reduce(
                                                  (sum, val) => sum + val,
                                                  0
                                                );
                                              return (
                                                <td key={gIdx} className="p-1">
                                                  <div className="text-center font-mono font-bold text-cyan-400 text-xl">
                                                    {totalColumna}
                                                  </div>
                                                </td>
                                              );
                                            }
                                          )}
                                          <td className="p-1">
                                            <div className="text-center font-mono font-bold text-purple-400 text-2xl">
                                              {config.cuotasPorEncuestador[
                                                enc.id
                                              ] || 0}
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Vista DESKTOP - Matriz original: columnas=edad, filas=género */}
                                  <div className="hidden sm:block">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr>
                                          <th className="p-2 w-24"></th>
                                          {config.categorias[1].segmentos.map(
                                            (edad, eIdx) => (
                                              <th key={eIdx} className="p-2">
                                                <div className="flex flex-col items-center gap-1">
                                                  <IconRenderer
                                                    iconName={edad.icon}
                                                    size={24}
                                                    className="text-cyan-400"
                                                  />
                                                  <span className="text-sm text-slate-300 font-medium">
                                                    {edad.nombre}
                                                  </span>
                                                </div>
                                              </th>
                                            )
                                          )}
                                          <th className="p-2">
                                            <div className="text-sm text-slate-300 font-medium">
                                              Total
                                            </div>
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {config.categorias[0].segmentos.map(
                                          (genero, gIdx) => {
                                            const totalFila =
                                              cuotasDetalladas.matriz[
                                                gIdx
                                              ].reduce(
                                                (sum, val) => sum + val,
                                                0
                                              );
                                            return (
                                              <tr key={gIdx}>
                                                <td className="p-2">
                                                  <div className="flex flex-col items-center gap-1">
                                                    <IconRenderer
                                                      iconName={genero.icon}
                                                      size={24}
                                                      className="text-cyan-400"
                                                    />
                                                    <span className="text-sm font-medium text-slate-300 whitespace-nowrap">
                                                      {genero.nombre}
                                                    </span>
                                                  </div>
                                                </td>
                                                {cuotasDetalladas.matriz[
                                                  gIdx
                                                ].map((valor, eIdx) => {
                                                  const isCompleto = valor > 0;
                                                  return (
                                                    <td
                                                      key={eIdx}
                                                      className="p-1"
                                                    >
                                                      <div
                                                        className={`rounded-xl border-2 p-3 transition-all ${
                                                          isCompleto
                                                            ? "bg-cyan-500/10 border-cyan-500/50"
                                                            : "bg-slate-800/50 border-slate-700"
                                                        }`}
                                                      >
                                                        <div className="flex flex-col items-center gap-2">
                                                          <div className="text-3xl font-bold">
                                                            {valor}
                                                          </div>
                                                          <div className="flex gap-1">
                                                            <button
                                                              onClick={() =>
                                                                incrementCuotaMatriz(
                                                                  enc.id,
                                                                  gIdx,
                                                                  eIdx,
                                                                  -1
                                                                )
                                                              }
                                                              disabled={
                                                                valor === 0
                                                              }
                                                              className="w-12 h-12 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-2xl font-bold flex items-center justify-center transition-colors"
                                                            >
                                                              −
                                                            </button>
                                                            <button
                                                              onClick={() =>
                                                                incrementCuotaMatriz(
                                                                  enc.id,
                                                                  gIdx,
                                                                  eIdx,
                                                                  1
                                                                )
                                                              }
                                                              className="w-12 h-12 bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 rounded-lg text-2xl font-bold flex items-center justify-center transition-colors"
                                                            >
                                                              +
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </td>
                                                  );
                                                })}
                                                <td className="p-2">
                                                  <div className="text-center font-mono font-bold text-cyan-400 text-2xl">
                                                    {totalFila}
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          }
                                        )}
                                        <tr className="border-t-2 border-slate-600">
                                          <td className="p-2">
                                            <div className="text-sm font-medium text-slate-300">
                                              Total
                                            </div>
                                          </td>
                                          {config.categorias[1].segmentos.map(
                                            (_, eIdx) => {
                                              const totalColumna =
                                                cuotasDetalladas.matriz.reduce(
                                                  (sum, row) => sum + row[eIdx],
                                                  0
                                                );
                                              return (
                                                <td key={eIdx} className="p-2">
                                                  <div className="text-center font-mono font-bold text-cyan-400 text-2xl">
                                                    {totalColumna}
                                                  </div>
                                                </td>
                                              );
                                            }
                                          )}
                                          <td className="p-2">
                                            <div className="text-center font-mono font-bold text-purple-400 text-3xl">
                                              {config.cuotasPorEncuestador[
                                                enc.id
                                              ] || 0}
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {config.tieneObjetivo && (
                        <div
                          className={`mt-4 p-3 rounded-lg border ${
                            totalAsignadoEncuestadores === config.metaTotal
                              ? "bg-green-500/10 border-green-500/30"
                              : totalAsignadoEncuestadores > config.metaTotal
                              ? "bg-red-500/10 border-red-500/30"
                              : "bg-yellow-500/10 border-yellow-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span
                              className={`flex items-center gap-2 ${
                                totalAsignadoEncuestadores === config.metaTotal
                                  ? "text-green-300"
                                  : totalAsignadoEncuestadores >
                                    config.metaTotal
                                  ? "text-red-300"
                                  : "text-yellow-300"
                              }`}
                            >
                              {totalAsignadoEncuestadores ===
                              config.metaTotal ? (
                                <Check size={16} />
                              ) : (
                                <AlertCircle size={16} />
                              )}
                              Total asignado a encuestadores
                            </span>
                            <span className="font-mono font-bold">
                              {totalAsignadoEncuestadores} / {config.metaTotal}
                            </span>
                          </div>
                          {totalAsignadoEncuestadores !== config.metaTotal && (
                            <div className="text-xs mt-1 text-slate-400">
                              {totalAsignadoEncuestadores > config.metaTotal
                                ? `Excede en ${
                                    totalAsignadoEncuestadores -
                                    config.metaTotal
                                  } casos`
                                : `Faltan ${
                                    config.metaTotal -
                                    totalAsignadoEncuestadores
                                  } casos por asignar`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Simple */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-4 z-40">
        <div className="max-w-5xl mx-auto flex gap-3">
          <button className="flex-1 px-6 py-3 text-slate-300 hover:text-white border border-slate-600 rounded-lg transition-colors">
            Cancelar
          </button>
          <button className="flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
            Guardar
            <Check size={18} />
          </button>
        </div>
      </div>

      {/* Modal Encuestadores */}
      {showEncuestadoresModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          onClick={() => setShowEncuestadoresModal(false)}
        >
          <div
            className="bg-slate-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-3xl h-[85vh] sm:h-[80vh] flex flex-col border-t sm:border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0 bg-slate-800">
              <h2 className="text-xl font-bold">Seleccionar Encuestadores</h2>
              <button
                onClick={() => setShowEncuestadoresModal(false)}
                className="text-slate-400 hover:text-white p-2 -m-2"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-700 flex-shrink-0 bg-slate-800">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="space-y-2">
                {encuestadoresFiltrados.map((enc) => {
                  const isSelected = config.encuestadores.find(
                    (e) => e.id === enc.id
                  );
                  return (
                    <label
                      key={enc.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-cyan-500/20 border-cyan-500"
                          : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50 active:bg-slate-700/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => toggleEncuestador(enc)}
                        className="w-5 h-5 rounded border-slate-500 text-cyan-500 focus:ring-cyan-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="font-medium">{enc.nombre}</div>
                          {enc.masUsado && (
                            <span className="text-yellow-400 flex-shrink-0">
                              ⭐
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {enc.email}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                        <MapPin size={12} />
                        {enc.ciudad}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800">
              <div className="text-sm text-slate-400 mb-3">
                {config.encuestadores.length} seleccionado
                {config.encuestadores.length !== 1 ? "s" : ""}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEncuestadoresModal(false)}
                  className="flex-1 px-6 py-2.5 text-slate-300 hover:text-white border border-slate-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowEncuestadoresModal(false);
                    setSearchTerm("");
                  }}
                  className="flex-1 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Supervisores */}
      {showSupervisoresModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          onClick={() => setShowSupervisoresModal(false)}
        >
          <div
            className="bg-slate-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-3xl h-[85vh] sm:h-[80vh] flex flex-col border-t sm:border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0 bg-slate-800">
              <h2 className="text-xl font-bold">Seleccionar Supervisores</h2>
              <button
                onClick={() => setShowSupervisoresModal(false)}
                className="text-slate-400 hover:text-white p-2 -m-2"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-700 flex-shrink-0 bg-slate-800">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={searchTermSupervisores}
                  onChange={(e) => setSearchTermSupervisores(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="space-y-2">
                {supervisoresFiltrados.map((sup) => {
                  const isSelected = config.supervisores.find(
                    (s) => s.id === sup.id
                  );
                  return (
                    <label
                      key={sup.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-cyan-500/20 border-cyan-500"
                          : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50 active:bg-slate-700/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => toggleSupervisor(sup)}
                        className="w-5 h-5 rounded border-slate-500 text-cyan-500 focus:ring-cyan-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="font-medium">{sup.nombre}</div>
                          {sup.masUsado && (
                            <span className="text-yellow-400 flex-shrink-0">
                              ⭐
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {sup.email}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                        <MapPin size={12} />
                        {sup.ciudad}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800">
              <div className="text-sm text-slate-400 mb-3">
                {config.supervisores.length} seleccionado
                {config.supervisores.length !== 1 ? "s" : ""}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSupervisoresModal(false)}
                  className="flex-1 px-6 py-2.5 text-slate-300 hover:text-white border border-slate-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowSupervisoresModal(false);
                    setSearchTermSupervisores("");
                  }}
                  className="flex-1 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
