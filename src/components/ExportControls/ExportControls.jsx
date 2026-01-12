import React, { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import { nestedJSONtoJson } from "../../utils/flatterJSON";
import { FileSpreadsheet, FileDown, ChevronDown } from "lucide-react";

const ExportControls = ({ answers, titleSurvey = "guazu-datos", surveyId, preFiltered = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [excludedCases, setExcludedCases] = useState([]);
  const [exportFormat, setExportFormat] = useState("text"); // 'text' | 'numeric'
  const dropdownRef = useRef(null);
  const fileExtension = ".xlsx";

  // Cargar casos excluidos desde localStorage (solo si no viene preFiltered)
  useEffect(() => {
    if (!surveyId || preFiltered) return;
    
    try {
      const key = `survey:${surveyId}:excluded-cases`;
      const stored = localStorage.getItem(key);
      setExcludedCases(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error("Error reading excluded cases for export:", e);
      setExcludedCases([]);
    }
  }, [surveyId, preFiltered]);

  // Sincronizar con cambios en otras pestañas (solo si no viene preFiltered)
  useEffect(() => {
    if (!surveyId || preFiltered) return;

    const handleStorageChange = (e) => {
      const key = `survey:${surveyId}:excluded-cases`;
      if (e.key === key && e.newValue) {
        try {
          setExcludedCases(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Error syncing excluded cases:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [surveyId, preFiltered]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar answers excluidos (solo si no viene preFiltered)
  const filteredAnswers = useMemo(() => {
    if (!answers) return [];
    if (preFiltered) return answers; // Si ya viene filtrado, usar directamente
    if (excludedCases.length === 0) return answers;
    return answers.filter((item) => !excludedCases.includes(item._id));
  }, [answers, excludedCases, preFiltered]);

  // Función para convertir valores a numéricos
  const convertToNumeric = (value) => {
    // Manejar strings: extraer número de formato "1. Texto"
    if (typeof value === "string") {
      const match = value.match(/^(\d+)\./);
      return match ? parseInt(match[1]) : value;
    }
    
    // Manejar arrays (multiple choice): convertir cada elemento
    if (Array.isArray(value)) {
      const numbers = value.map(v => {
        const match = v.match(/^(\d+)\./);
        return match ? match[1] : v;
      });
      return numbers.join(", ");
    }
    
    // Manejar objetos (matrix): convertir cada valor del objeto
    if (typeof value === "object" && value !== null) {
      const converted = {};
      Object.keys(value).forEach(key => {
        const cellValue = value[key];
        if (typeof cellValue === "string") {
          const match = cellValue.match(/^(\d+)\./);
          converted[key] = match ? parseInt(match[1]) : cellValue;
        } else {
          converted[key] = cellValue;
        }
      });
      return converted;
    }
    
    return value;
  };

  const processDataForExport = (answers, format = "text") => {
    let processedAnswers = [];
    if (answers) {
      answers.forEach((item) => {
        if (item.answer) {
          const fecha = item.createdAt
            ? new Date(item.createdAt).toLocaleDateString()
            : "";
          const hora = item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString()
            : "";

          // Convertir respuestas si se seleccionó formato numérico
          const answerData = format === "numeric" 
            ? Object.keys(item.answer).reduce((acc, key) => {
                acc[key] = convertToNumeric(item.answer[key]);
                return acc;
              }, {})
            : item.answer;

          // NOTA: Las respuestas de cuotas se incluyen automáticamente en answerData
          // porque QuotaQuestions.jsx las guarda con el nombre de la categoría como key
          // Ejemplo: answer["Género"] = "Masculino", answer["Edad"] = "18-29"
          processedAnswers.push(
            nestedJSONtoJson({
              creado: `${fecha}-${hora}`,
              encuestador: item.fullName,
              latitud: item.lat,
              longitud: item.lng,
              caso: item._id,
              time: item.time,
              ...answerData, // Incluye todas las respuestas (preguntas + cuotas)
            })
          );
        }
      });
    }
    return processedAnswers;
  };

  const exportToFile = (fileType) => {
    // Usar filteredAnswers en lugar de answers
    if (!filteredAnswers || filteredAnswers.length === 0) {
      return;
    }

    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString("es-ES", { month: "long" });
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");

    const formattedDate = `${day}_${month}_${year}`;
    const formattedTime = `${hours}:${minutes}hs`;
    const formatSuffix = exportFormat === "numeric" ? " (valores)" : " (texto)";
    const baseFileName = `${
      titleSurvey || "guazu-datos"
    }${formatSuffix} - ${formattedDate} - ${formattedTime}`;

    // Usar filteredAnswers con el formato seleccionado
    const dataToExport = processDataForExport(filteredAnswers, exportFormat);
    const ws = XLSX.utils.json_to_sheet(dataToExport);

    if (fileType === "xlsx") {
      const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      });
      const fileName = baseFileName + fileExtension;
      FileSaver.saveAs(data, fileName);
    } else if (fileType === "csv") {
      const csvOutput = XLSX.utils.sheet_to_csv(ws);
      const data = new Blob(["\uFEFF" + csvOutput], {
        type: "text/csv;charset=utf-8;",
      });
      const fileName = baseFileName + ".csv";
      FileSaver.saveAs(data, fileName);
    }

    setIsOpen(false);
  };

  const hasAnswers = answers && answers.length > 0;
  const totalCases = answers ? answers.length : 0;
  const includedCases = filteredAnswers.length;
  const excludedCount = excludedCases.length;

  const exportOptions = [
    {
      label: "Excel (XLSX)",
      type: "xlsx",
      icon: <FileSpreadsheet className="h-4 w-4" />,
      description: "Formato compatible con Microsoft Excel",
    },
    {
      label: "CSV",
      type: "csv",
      icon: <FileDown className="h-4 w-4" />,
      description: "Formato universal de texto separado por comas",
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!hasAnswers}
        className="bg-primary hover:bg-primary-dark text-white flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base"
      >
        <FileDown className="h-4 w-4 sm:h-5 sm:w-5" />
        <span>Exportar</span>
        <ChevronDown
          className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && hasAnswers && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-64 sm:w-80 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Contador de casos */}
          {(preFiltered || excludedCount > 0) && (
            <div className="px-4 py-2 bg-blue-50 border-b border-[var(--card-border)] text-xs">
              <p className="text-blue-900 font-medium">
                Se exportarán {includedCases} caso{includedCases !== 1 ? "s" : ""}
              </p>
              {!preFiltered && excludedCount > 0 && (
                <p className="text-blue-700 mt-0.5">
                  {excludedCount} caso{excludedCount !== 1 ? "s" : ""} excluido{excludedCount !== 1 ? "s" : ""} en Editar Base
                </p>
              )}
              {preFiltered && (
                <p className="text-blue-700 mt-0.5">
                  Según filtros aplicados
                </p>
              )}
            </div>
          )}

          {/* Selector de formato */}
          <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--background)]">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              Formato de datos:
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setExportFormat("text")}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  exportFormat === "text"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] hover:bg-[var(--hover-bg)]"
                }`}
              >
                Texto
              </button>
              <button
                onClick={() => setExportFormat("numeric")}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  exportFormat === "numeric"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card-background)] text-[var(--text-primary)] border border-[var(--card-border)] hover:bg-[var(--hover-bg)]"
                }`}
              >
                Valores
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2">
              {exportFormat === "text" 
                ? "Etiquetas legibles (ej: \"1. Muy buena\")"
                : "Números consecutivos (ej: 1, 2, 3...)"}
            </p>
          </div>

          {/* Opciones de exportación */}
          {exportOptions.map((option, index) => (
            <button
              key={option.type}
              onClick={() => exportToFile(option.type)}
              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-left ${
                index !== exportOptions.length - 1
                  ? "border-b border-[var(--card-border)]"
                  : ""
              }`}
            >
              <div className="mt-0.5 text-[var(--primary)]">{option.icon}</div>
              <div className="flex-1">
                <div className="font-medium text-[var(--text-primary)]">
                  {option.label}
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportControls;
