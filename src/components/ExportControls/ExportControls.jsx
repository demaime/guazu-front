import React, { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import { nestedJSONtoJson } from "../../utils/flatterJSON";
import { FileSpreadsheet, FileDown, ChevronDown } from "lucide-react";

const ExportControls = ({
  answers,
  titleSurvey = "guazu-datos",
  surveyId,
  preFiltered = false,
  surveyData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [excludedCases, setExcludedCases] = useState([]);
  const [exportFormat, setExportFormat] = useState("text"); // 'text' | 'numeric'
  const dropdownRef = useRef(null);
  const fileExtension = ".xlsx";

  // Función helper para generar "fingerprint" de un texto (solo alfanuméricos minúsculas)
  const getFingerprint = (text) => {
    if (typeof text !== "string") return "";
    return text.toLowerCase().replace(/[^a-z0-9]/g, ""); // Eliminar todo lo que no sea letra o número
  };

  // Mapa de preguntas para buscar valores configurados
  const questionsMap = useMemo(() => {
    // Detectar dónde están las páginas (puede ser surveyData.pages o surveyData.survey.pages)
    const pages = surveyData?.pages || surveyData?.survey?.pages;

    console.log("📊 ExportControls - surveyData structure:", {
      hasDirectPages: !!surveyData?.pages,
      hasNestedPages: !!surveyData?.survey?.pages,
      pagesLength: pages?.length,
    });

    if (!pages) return {};
    const map = {};

    const processElements = (elements) => {
      if (!elements) return;
      elements.forEach((element) => {
        // Si es un panel, procesar sus elementos recursivamente
        if (element.type === "panel" || element.type === "paneldynamic") {
          processElements(element.elements);
          if (element.templateElements)
            processElements(element.templateElements);
        }

        // Agregar al mapa (siempre, incluso si es panel, para tener la referencia)
        map[element.name] = element;
        // También mapear por valueName si existe
        if (element.valueName) {
          map[element.valueName] = element;
        }

        // También mapear por title (texto de la pregunta)
        if (element.title) {
          if (typeof element.title === "string") {
            map[element.title] = element;
            // Agregar fingerprint para búsquedas robustas
            const fingerprint = getFingerprint(element.title);
            if (fingerprint) {
              map[fingerprint] = element;
            }
          } else if (typeof element.title === "object") {
            // Mapear todos los valores localizados
            Object.values(element.title).forEach((t) => {
              if (t && typeof t === "string") {
                map[t] = element;
                // Agregar fingerprint
                const fingerprint = getFingerprint(t);
                if (fingerprint) {
                  map[fingerprint] = element;
                }
              }
            });
          }
        }
      });
    };

    try {
      pages.forEach((page) => {
        processElements(page.elements);
      });
      console.log(
        "✅ ExportControls - questions map built:",
        Object.keys(map).length,
        "questions",
      );
    } catch (e) {
      console.error("Error building questions map:", e);
    }
    return map;
  }, [surveyData]);

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

  // Resolver texto visible al valor/código definido en la encuesta
  const resolveToValue = (value, questionName, preFoundQuestion = null) => {
    // 1. Intentar buscar en la definición de la encuesta
    // Usar la pregunta ya encontrada o buscarla
    const question =
      preFoundQuestion || (questionName ? questionsMap[questionName] : null);

    if (question) {
      const findValueForOption = (optionText) => {
        if (!question.choices) return null;

        // Función helper para limpiar texto (quitar "1. " del inicio)
        const cleanString = (str) => {
          if (typeof str !== "string") return str;
          const match = str.match(/^\d+\.\s*(.+)$/);
          const clean = match ? match[1] : str;
          return clean.replace(/\s+/g, " ").trim();
        };

        // Limpiar el texto de entrada (por si viene como "1. Opción")
        const cleanInput = cleanString(optionText);

        const choice = question.choices.find((c) => {
          // Manejar opciones que son objetos (ej: {value: 1, text: "Opción"})
          if (typeof c === "object") {
            // Chequear text (puede ser string o objeto localizado)
            if (c.text) {
              if (typeof c.text === "object") {
                // Chequear default y es
                const textValues = Object.values(c.text).map((t) =>
                  cleanString(t),
                );
                if (
                  textValues.includes(cleanInput) ||
                  textValues.includes(optionText)
                )
                  return true;
              } else {
                const cleanChoiceText = cleanString(c.text);
                if (cleanChoiceText === cleanInput || c.text === optionText) {
                  return true;
                }
              }
            }
            // Chequear value si es string y coincide con el texto
            // Usar comparación laxa (==) para manejar "1" vs 1
            if (c.value == cleanInput || c.value == optionText) return true;
            return false;
          }

          // Manejar opciones simples (ej: "Opción")
          const cleanChoice = cleanString(c);
          return cleanChoice === cleanInput || c === optionText;
        });

        if (choice) {
          return typeof choice === "object" ? choice.value : choice;
        }
        return null;
      };

      if (Array.isArray(value)) {
        const mapped = value.map((v) => {
          // Si el elemento es un objeto (ej: paneldynamic), extraer sus valores aunque la pregunta esté mapeada
          if (typeof v === "object" && v !== null) {
            return Object.values(v)
              .map((val) => {
                if (typeof val === "string") {
                  const match = val.match(/^(\d+)\./);
                  return match ? match[1] : val;
                }
                return val;
              })
              .join(" - ");
          }
          const found = findValueForOption(v);
          return found !== null ? found : v;
        });
        return mapped.join(", ");
      }

      const found = findValueForOption(value);
      if (found !== null) return found;
    }

    // 2. Fallback: intentar extraer prefijo de formato "X. Texto"
    const extractPrefix = (str) => {
      if (typeof str !== "string") return str;
      const match = str.match(/^([^.]+)\.\s/);
      return match ? match[1].trim() : str;
    };

    if (typeof value === "string") {
      return extractPrefix(value);
    }

    if (Array.isArray(value)) {
      const mapped = value.map((v) => {
        if (typeof v === "object" && v !== null) {
          return Object.values(v)
            .map((val) => extractPrefix(val))
            .join(" - ");
        }
        return extractPrefix(v);
      });
      return mapped.join(", ");
    }

    if (typeof value === "object" && value !== null) {
      const converted = {};
      Object.keys(value).forEach((key) => {
        converted[key] = extractPrefix(value[key]);
      });
      return converted;
    }

    return value;
  };

  // Helper para extraer texto de campos que pueden ser string u objeto localizado
  const extractText = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") return val.default || val.es || Object.values(val)[0] || "";
    return String(val);
  };

  // Procesar respuesta usando answerRaw (formato nuevo con variables + codes)
  const processWithRaw = (answerRaw, format) => {
    const data = {};
    Object.entries(answerRaw).forEach(([varName, rawValue]) => {
      const question = questionsMap[varName];

      if (typeof rawValue === "object" && rawValue !== null && !Array.isArray(rawValue)) {
        // Matriz: expandir cada fila como columna separada (variable_filaVariable)
        Object.entries(rawValue).forEach(([rowVar, colVal]) => {
          const colKey = `${varName}_${rowVar}`;
          if (format === "text" && question) {
            const colText = question.columns?.find((c) => String(c.value) === String(colVal));
            data[colKey] = colText ? extractText(colText.text) || colVal : colVal;
          } else {
            data[colKey] = colVal;
          }
        });
      } else if (Array.isArray(rawValue)) {
        // Opción múltiple
        if (format === "text" && question?.choices) {
          data[varName] = rawValue
            .map((v) => {
              const ch = question.choices.find((c) => String(c.value) === String(v));
              return ch ? extractText(ch.text) || v : v;
            })
            .join(", ");
        } else {
          data[varName] = rawValue.join(", ");
        }
      } else {
        // Valor simple (texto libre, opción única, numérica, fecha)
        if (format === "text" && question?.choices) {
          const ch = question.choices.find((c) => String(c.value) === String(rawValue));
          data[varName] = ch ? extractText(ch.text) || rawValue : rawValue;
        } else {
          data[varName] = rawValue;
        }
      }
    });
    return data;
  };

  // Procesar respuesta usando answer (formato viejo, texto plano) — fallback
  const processWithAnswer = (answer, format) => {
    const data = {};
    const normalizeKey = (k) => k ? String(k).replace(/\s+/g, " ").trim() : "";
    const getLocalFingerprint = (k) => k ? String(k).toLowerCase().replace(/[^a-z0-9]/g, "") : "";

    Object.keys(answer).forEach((key) => {
      const question =
        questionsMap[key] ||
        questionsMap[normalizeKey(key)] ||
        questionsMap[getLocalFingerprint(key)];

      const outputKey = question ? (question.valueName || question.name) : key;
      let outputValue = answer[key];

      if (format === "numeric") {
        outputValue = resolveToValue(outputValue, key, question);
      }

      // Matriz (objeto no-array): intentar expandir en columnas separadas
      if (typeof outputValue === "object" && outputValue !== null && !Array.isArray(outputValue)) {
        if (question?.rows) {
          Object.entries(outputValue).forEach(([rowText, colVal]) => {
            const rowLower = rowText.toLowerCase().trim();
            const row = question.rows.find((r) => {
              const rText = extractText(r.text);
              return (rText && rText.toLowerCase().trim() === rowLower)
                || String(r.value).toLowerCase().trim() === rowLower;
            });
            const rowVar = row ? row.value : rowText;
            let cellValue = typeof colVal === "object" ? JSON.stringify(colVal) : colVal;
            // En formato numérico, resolver texto de columna a su valor
            if (format === "numeric" && question.columns && typeof cellValue === "string") {
              const cellLower = cellValue.toLowerCase().trim();
              const col = question.columns.find((c) => {
                const cText = extractText(c.text);
                return (cText && cText.toLowerCase().trim() === cellLower)
                  || String(c.value).toLowerCase().trim() === cellLower;
              });
              if (col) cellValue = col.value;
            }
            data[`${outputKey}_${rowVar}`] = cellValue;
          });
        } else {
          data[outputKey] = Object.values(outputValue)
            .map((val) => (typeof val === "object" && val !== null ? JSON.stringify(val) : val))
            .join(", ");
        }
        return;
      }

      // Array: aplanar a string
      if (Array.isArray(outputValue)) {
        outputValue = outputValue
          .map((v) => {
            if (typeof v === "object" && v !== null) {
              return Object.values(v)
                .map((val) => (typeof val === "object" && val !== null ? JSON.stringify(val) : val))
                .join(" - ");
            }
            return v;
          })
          .join(", ");
      }

      data[outputKey] = outputValue;
    });
    return data;
  };

  const processDataForExport = (answers, format = "text") => {
    const processedAnswers = [];
    if (!answers) return processedAnswers;

    answers.forEach((item) => {
      if (!item.answer) return;

      const fecha = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";
      const hora = item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : "";

      const answerData = item.answerRaw
        ? processWithRaw(item.answerRaw, format)
        : processWithAnswer(item.answer, format);

      const quotaData =
        item.quotaAnswers && typeof item.quotaAnswers === "object"
          ? item.quotaAnswers
          : {};

      processedAnswers.push(
        nestedJSONtoJson({
          creado: `${fecha}-${hora}`,
          encuestador: item.fullName,
          latitud: item.lat,
          longitud: item.lng,
          caso: item._id,
          time: item.time,
          ...quotaData,
          ...answerData,
        }),
      );
    });
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
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-64 sm:w-80 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg shadow-xl z-[2000] overflow-hidden">
          {/* Contador de casos */}
          {(preFiltered || excludedCount > 0) && (
            <div className="px-4 py-2 bg-blue-50 border-b border-[var(--card-border)] text-xs">
              <p className="text-blue-900 font-medium">
                Se exportarán {includedCases} caso
                {includedCases !== 1 ? "s" : ""}
              </p>
              {!preFiltered && excludedCount > 0 && (
                <p className="text-blue-700 mt-0.5">
                  {excludedCount} caso{excludedCount !== 1 ? "s" : ""} excluido
                  {excludedCount !== 1 ? "s" : ""} en Editar Base
                </p>
              )}
              {preFiltered && (
                <p className="text-blue-700 mt-0.5">Según filtros aplicados</p>
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
                ? 'Etiquetas legibles (ej: "1. Muy buena")'
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
