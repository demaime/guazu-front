import React from "react";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import { nestedJSONtoJson } from "../../utils/flatterJSON";
import { FileSpreadsheet, FileDown } from "lucide-react";

const ExportControls = ({ answers, titleSurvey = "guazu-datos" }) => {
  const fileExtension = ".xlsx";

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
  };

  const hasAnswers = answers && answers.length > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <button
        onClick={() => exportToFile("xlsx")}
        disabled={!hasAnswers}
        className="bg-primary hover:bg-primary-dark text-white flex items-center justify-center px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <FileDown className="mr-2 h-5 w-5" />
        <span>Exportar a XLSX</span>
      </button>
      <button
        onClick={() => exportToFile("csv")}
        disabled={!hasAnswers}
        className="bg-primary hover:bg-primary-dark text-white flex items-center justify-center px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <FileDown className="mr-2 h-5 w-5" />
        <span>Exportar a CSV</span>
      </button>
    </div>
  );
};

export default ExportControls;
