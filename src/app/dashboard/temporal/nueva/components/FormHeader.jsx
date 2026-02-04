"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  List,
  Search,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function FormHeader({
  titulo,
  setTitulo,
  descripcion,
  setDescripcion,
  tituloFocused,
  setTituloFocused,
  indiceHistorial,
  historial,
  deshacer,
  rehacer,
  modulos,
  indiceAbierto,
  setIndiceAbierto,
  busquedaIndice,
  setBusquedaIndice,
  obtenerTodasLasPreguntas,
  onQuestionClick,
}) {
  const router = useRouter();
  const indiceRef = useRef(null);

  // Cerrar el índice cuando se hace clic fuera de él
  useEffect(() => {
    if (!indiceAbierto) return;

    const handleClickOutside = (event) => {
      if (indiceRef.current && !indiceRef.current.contains(event.target)) {
        setIndiceAbierto(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [indiceAbierto, setIndiceAbierto]);

  return (
    <>
      {/* Header con botón de retorno */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/temporal")}
          className="p-2 rounded-lg bg-[color:var(--card-background)] border border-[color:var(--card-border)] text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] transition-colors"
          title="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Editor de Formularios</h1>
      </div>

      {/* Título y descripción */}
      <div className="bg-[color:var(--card-background)] rounded-lg p-4 shadow-lg mb-4 border border-[color:var(--card-border)]">
        <textarea
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.target.blur();
            }
          }}
          onFocus={() => setTituloFocused(true)}
          onBlur={() => setTituloFocused(false)}
          placeholder="Título del formulario"
          rows={1}
          data-titulo-encuesta
          className={`w-full text-xl font-bold text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] outline-none mb-2 bg-transparent border-none resize-none overflow-hidden leading-tight ${
            tituloFocused
              ? "ring-2 ring-[color:var(--primary)] rounded px-2 py-1"
              : "focus:ring-0"
          }`}
          style={{
            minHeight: "1.5rem",
            height: "auto",
          }}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
        />
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
          rows={1}
          className="w-full text-xs text-[color:var(--text-secondary)] placeholder-[color:var(--text-muted)] outline-none bg-transparent border-none focus:ring-0 resize-none overflow-hidden"
          style={{
            minHeight: "1rem",
            height: "auto",
          }}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
        />
      </div>

      {/* Barra de herramientas */}
      <div className="flex gap-2 mb-4 sticky top-0 z-30 p-1 bg-[color:var(--card-background)]">
        <div className="flex gap-1 bg-[color:var(--card-background)] rounded-lg border border-[color:var(--card-border)] shadow-lg items-center justify-around px-1">
          <button
            onClick={deshacer}
            disabled={indiceHistorial <= 0}
            className="px-3 py-1 h-10 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={rehacer}
            disabled={indiceHistorial >= historial.length - 1}
            className="px-3 py-1 h-10 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </button>
        </div>

        {modulos.length > 0 && (
          <div className="flex-1" ref={indiceRef}>
            <button
              onClick={() => setIndiceAbierto(!indiceAbierto)}
              className="w-full h-12 px-3 bg-[color:var(--card-background)] border border-[color:var(--card-border)] rounded-lg text-left text-sm text-[color:var(--text-primary)] hover:border-[color:var(--primary)] transition-all flex items-center justify-between shadow-lg"
            >
              <span className="flex items-center gap-2">
                <List size={16} />
                <span>
                  Índice de preguntas ({obtenerTodasLasPreguntas().length})
                </span>
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${indiceAbierto ? "rotate-180" : ""}`}
              />
            </button>

            {indiceAbierto && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[color:var(--card-background)] border border-[color:var(--card-border)] rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-[color:var(--card-border)] sticky top-0 bg-[color:var(--card-background)]">
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                      />
                      <input
                        type="text"
                        value={busquedaIndice}
                        onChange={(e) => setBusquedaIndice(e.target.value)}
                        placeholder="Buscar pregunta..."
                        className="w-full pl-9 pr-3 py-1.5 bg-[color:var(--input-background)] border border-[color:var(--card-border)] rounded text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] text-xs focus:border-[color:var(--primary)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-96">
                    {obtenerTodasLasPreguntas()
                      .filter((p) => {
                        if (!busquedaIndice) return true;
                        const searchLower = busquedaIndice.toLowerCase();
                        return (
                          p.text.toLowerCase().includes(searchLower) ||
                          p.value.toLowerCase().includes(searchLower) ||
                          p.numero.toString().includes(searchLower)
                        );
                      })
                      .map((pregunta) => (
                        <button
                          key={pregunta.id}
                          onClick={() => onQuestionClick(pregunta)}
                          className={`w-full px-3 py-2 text-left text-xs hover:bg-[color:var(--hover-bg)] transition-colors border-b border-[color:var(--card-border)] ${
                            pregunta.tieneCondiciones ? "pl-6" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[color:var(--text-muted)] font-semibold w-6">
                              P{pregunta.numero}
                            </span>
                            <span className="text-[color:var(--text-secondary)] font-mono text-xs bg-[color:var(--hover-bg)] px-1.5 py-0.5 rounded">
                              {pregunta.value}
                            </span>
                            <span className="text-[color:var(--text-primary)] truncate flex-1">
                              {pregunta.text}
                            </span>
                            {pregunta.tieneCondiciones && (
                              <span className="text-purple-400 text-xs">🔗</span>
                            )}
                          </div>
                          <div className="text-[color:var(--text-muted)] text-xs mt-0.5 ml-8">
                            {pregunta.moduloNombre}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
