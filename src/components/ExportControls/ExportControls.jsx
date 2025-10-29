import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import { nestedJSONtoJson } from "../../utils/flatterJSON";
import { FileSpreadsheet, FileDown, ChevronDown } from "lucide-react";

const ExportControls = ({ answers, titleSurvey = "guazu-datos" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fileExtension = ".xlsx";

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

  const processDataForExport = (answers) => {
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

          processedAnswers.push(
            nestedJSONtoJson({
              creado: `${fecha}-${hora}`,
              encuestador: item.fullName,
              latitud: item.lat,
              longitud: item.lng,
              caso: item._id,
              time: item.time,
              ...item.answer,
            })
          );
        }
      });
    }
    return processedAnswers;
  };

  const exportToFile = (fileType) => {
    if (!answers || answers.length === 0) {
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
    const baseFileName = `${
      titleSurvey || "guazu-datos"
    } - ${formattedDate} - ${formattedTime}`;

    const dataToExport = processDataForExport(answers);
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
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-64 sm:w-72 bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg shadow-xl z-50 overflow-hidden">
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
