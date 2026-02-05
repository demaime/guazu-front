"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";

const QuotaProgressTable = ({ survey, answers }) => {
  // Calcular datos de cuotas
  const quotaData = useMemo(() => {
    console.log("QUOTA_TABLA_DEBUG - Component rendered");
    console.log("QUOTA_TABLA_DEBUG - survey:", survey);
    console.log("QUOTA_TABLA_DEBUG - answers:", answers);
    console.log("QUOTA_TABLA_DEBUG - survey.surveyInfo:", survey?.surveyInfo);
    console.log(
      "QUOTA_TABLA_DEBUG - quotaMetadata:",
      survey?.surveyInfo?.quotaMetadata,
    );
    console.log(
      "QUOTA_TABLA_DEBUG - quotas (old system):",
      survey?.surveyInfo?.quotas,
    );
    console.log("QUOTA_TABLA_DEBUG - metaMode:", survey?.surveyInfo?.metaMode);
    console.log(
      "QUOTA_TABLA_DEBUG - surveyDefinition:",
      survey?.surveyDefinition,
    );

    // Intentar obtener quotaMetadata
    let metadata = survey?.surveyInfo?.quotaMetadata;
    let dimensions = metadata?.dimensions || [];

    console.log("QUOTA_TABLA_DEBUG - metadata:", metadata);
    console.log("QUOTA_TABLA_DEBUG - dimensions from metadata:", dimensions);

    // FALLBACK: Si dimensions está vacío, intentar detectar desde surveyDefinition
    if (dimensions.length === 0 && survey?.surveyDefinition?.modulos) {
      console.log(
        "QUOTA_TABLA_DEBUG - Dimensions empty, trying fallback from surveyDefinition",
      );

      const detectedDimensions = [];
      survey.surveyDefinition.modulos.forEach((modulo) => {
        modulo.preguntas?.forEach((pregunta) => {
          if (pregunta.tipo === "cuota-genero") {
            detectedDimensions.push({
              category: "género",
              questionId: pregunta.value || pregunta.id,
              options: (pregunta.opciones || []).map(
                (opt) => opt.value || opt.text,
              ),
            });
          } else if (pregunta.tipo === "cuota-edad") {
            detectedDimensions.push({
              category: "edad",
              questionId: pregunta.value || pregunta.id,
              options: (pregunta.opciones || []).map(
                (opt) => opt.value || opt.text,
              ),
            });
          }
        });
      });

      console.log(
        "QUOTA_TABLA_DEBUG - Detected dimensions from surveyDefinition:",
        detectedDimensions,
      );
      dimensions = detectedDimensions;
    }

    if (dimensions.length === 0) {
      console.log(
        "QUOTA_TABLA_DEBUG - No dimensions found even after fallback, returning null",
      );
      return null;
    }

    // Encontrar dimensiones de género y edad
    const genderDimension = dimensions.find((d) => d.category === "género");
    const ageDimension = dimensions.find((d) => d.category === "edad");

    console.log("QUOTA_TABLA_DEBUG - genderDimension:", genderDimension);
    console.log("QUOTA_TABLA_DEBUG - ageDimension:", ageDimension);

    if (!genderDimension && !ageDimension) {
      console.log(
        "QUOTA_TABLA_DEBUG - No gender or age dimension found, returning null",
      );
      return null;
    }

    const isCrossTable = !!genderDimension && !!ageDimension;
    console.log("QUOTA_TABLA_DEBUG - isCrossTable:", isCrossTable);

    // Obtener los questionId de las preguntas de cuota
    const genderQuestionId = genderDimension?.questionId;
    const ageQuestionId = ageDimension?.questionId;

    console.log("QUOTA_TABLA_DEBUG - genderQuestionId:", genderQuestionId);
    console.log("QUOTA_TABLA_DEBUG - ageQuestionId:", ageQuestionId);

    // Obtener targets desde surveyInfo.quotaAssignments (nuevo sistema)
    const quotaAssignments = survey.surveyInfo?.quotaAssignments || [];
    console.log(
      "QUOTA_TABLA_DEBUG - quotaAssignments from surveyInfo:",
      quotaAssignments,
    );
    console.log(
      "QUOTA_TABLA_DEBUG - quotaAssignments length:",
      quotaAssignments.length,
    );

    if (quotaAssignments.length > 0) {
      console.log("QUOTA_TABLA_DEBUG - First assignment:", quotaAssignments[0]);
      console.log(
        "QUOTA_TABLA_DEBUG - First assignment quotas:",
        quotaAssignments[0]?.quotas,
      );
    }

    // Crear estructura de targets sumando todos los assignments de todos los pollsters
    const targets = {};

    quotaAssignments.forEach((assignment, assignmentIdx) => {
      console.log(
        `QUOTA_TABLA_DEBUG - Processing assignment ${assignmentIdx}:`,
        assignment,
      );

      assignment.quotas?.forEach((quota, quotaIdx) => {
        console.log(
          `QUOTA_TABLA_DEBUG - Processing quota ${quotaIdx} for assignment ${assignmentIdx}:`,
          quota,
        );

        quota.segments?.forEach((segment, segmentIdx) => {
          console.log(
            `QUOTA_TABLA_DEBUG - Processing segment ${segmentIdx}:`,
            segment,
          );

          // Para tabla cruzada, el key es "Género - Edad"
          // Para tabla simple, el key es solo el nombre del segmento
          const key = segment.name;

          if (!targets[key]) {
            targets[key] = 0;
          }
          targets[key] += segment.target || 0;

          console.log(
            `QUOTA_TABLA_DEBUG - Added target for "${key}": ${segment.target}, total now: ${targets[key]}`,
          );
        });
      });
    });

    console.log(
      "QUOTA_TABLA_DEBUG - targets calculated from quotaAssignments:",
      targets,
    );

    // Calcular progreso actual desde las respuestas
    // CLAVE: Usar los questionId de quotaMetadata para extraer las respuestas correctas
    const progress = {};

    answers.forEach((answer, idx) => {
      if (idx === 0) {
        console.log("QUOTA_TABLA_DEBUG - First answer structure:", answer);
        console.log("QUOTA_TABLA_DEBUG - First answer.answer:", answer.answer);
      }

      // Las respuestas están en answer.answer según el modelo del backend
      const answerData = answer.answer;

      if (!answerData) {
        console.log(
          "QUOTA_TABLA_DEBUG - No answer.answer found for this response",
        );
        return;
      }

      // Extraer valores de cuota usando los questionId
      const genderValue = genderQuestionId
        ? answerData[genderQuestionId]
        : null;
      const ageValue = ageQuestionId ? answerData[ageQuestionId] : null;

      if (idx === 0) {
        console.log("QUOTA_TABLA_DEBUG - answerData:", answerData);
        console.log("QUOTA_TABLA_DEBUG - genderQuestionId:", genderQuestionId);
        console.log("QUOTA_TABLA_DEBUG - ageQuestionId:", ageQuestionId);
        console.log(
          "QUOTA_TABLA_DEBUG - First answer genderValue:",
          genderValue,
        );
        console.log("QUOTA_TABLA_DEBUG - First answer ageValue:", ageValue);
      }

      if (isCrossTable) {
        // Tabla cruzada: combinar género y edad
        if (genderValue && ageValue) {
          const key = `${genderValue} - ${ageValue}`;
          progress[key] = (progress[key] || 0) + 1;
        }
      } else {
        // Tabla simple: solo género O edad
        if (genderValue) {
          progress[genderValue] = (progress[genderValue] || 0) + 1;
        } else if (ageValue) {
          progress[ageValue] = (progress[ageValue] || 0) + 1;
        }
      }
    });

    console.log("QUOTA_TABLA_DEBUG - progress calculated:", progress);

    // Extraer opciones únicas desde los nombres de los segmentos
    const genderOptionsSet = new Set();
    const ageOptionsSet = new Set();

    quotaAssignments.forEach((assignment) => {
      assignment.quotas?.forEach((quota) => {
        quota.segments?.forEach((segment) => {
          // Los nombres de segmentos tienen formato "Género - Edad" para tabla cruzada
          // o solo "Género" o "Edad" para tabla simple
          const parts = segment.name.split(" - ");

          if (parts.length === 2) {
            // Tabla cruzada: "Masculino - 18-35"
            genderOptionsSet.add(parts[0].trim());
            ageOptionsSet.add(parts[1].trim());
          } else if (parts.length === 1) {
            // Tabla simple: solo género o edad
            if (genderDimension) {
              genderOptionsSet.add(parts[0].trim());
            } else if (ageDimension) {
              ageOptionsSet.add(parts[0].trim());
            }
          }
        });
      });
    });

    const extractedGenderOptions = Array.from(genderOptionsSet);
    const extractedAgeOptions = Array.from(ageOptionsSet);

    console.log(
      "QUOTA_TABLA_DEBUG - Extracted gender options from segments:",
      extractedGenderOptions,
    );
    console.log(
      "QUOTA_TABLA_DEBUG - Extracted age options from segments:",
      extractedAgeOptions,
    );

    const normalize = (s) =>
      typeof s === "string"
        ? s
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .trim()
        : "";
    const genderNormSet = new Set(extractedGenderOptions.map(normalize));
    const ageNormSet = new Set(extractedAgeOptions.map(normalize));
    const progressSum = Object.values(progress).reduce((a, b) => a + b, 0);
    if (progressSum === 0 && answers.length > 0) {
      answers.forEach((answer) => {
        const vals = Object.values(answer.answer || {}).map((v) =>
          typeof v === "string" ? v : String(v),
        );
        let g = null;
        let a = null;
        for (const v of vals) {
          const nv = normalize(v);
          if (!g && genderNormSet.has(nv)) g = v;
          if (!a && ageNormSet.has(nv)) a = v;
          if (g && a) break;
        }
        if (isCrossTable) {
          if (g && a) {
            const key = `${g} - ${a}`;
            progress[key] = (progress[key] || 0) + 1;
          }
        } else {
          const single = g || a;
          if (single) {
            progress[single] = (progress[single] || 0) + 1;
          }
        }
      });
      console.log(
        "QUOTA_TABLA_DEBUG - progress fallback calculated:",
        progress,
      );
    }

    const result = {
      isCrossTable,
      genderOptions: extractedGenderOptions,
      ageOptions: extractedAgeOptions,
      hasGender: !!genderDimension,
      hasAge: !!ageDimension,
      targets,
      progress,
    };

    console.log("QUOTA_TABLA_DEBUG - Final quotaData:", result);
    return result;
  }, [survey, answers]);

  if (!quotaData) return null;

  const {
    isCrossTable,
    genderOptions,
    ageOptions,
    hasGender,
    hasAge,
    targets,
    progress,
  } = quotaData;

  // Función para obtener el progreso de una celda
  const getCellProgress = (gender, age) => {
    if (isCrossTable) {
      // Para tabla cruzada, buscar por combinación "Género - Edad"
      const key = `${gender} - ${age}`;
      return progress[key] || 0;
    } else {
      // Para tabla simple, buscar directamente
      const key = gender || age;
      return progress[key] || 0;
    }
  };

  // Función para obtener el target de una celda
  const getCellTarget = (gender, age) => {
    if (isCrossTable) {
      const key = `${gender} - ${age}`;
      return targets[key] || 0;
    } else {
      const key = gender || age;
      return targets[key] || 0;
    }
  };

  // Calcular totales por fila (género)
  const getRowTotal = (gender) => {
    let current = 0;
    let target = 0;
    ageOptions.forEach((age) => {
      current += getCellProgress(gender, age);
      target += getCellTarget(gender, age);
    });
    return { current, target };
  };

  // Calcular totales por columna (edad)
  const getColumnTotal = (age) => {
    let current = 0;
    let target = 0;
    genderOptions.forEach((gender) => {
      current += getCellProgress(gender, age);
      target += getCellTarget(gender, age);
    });
    return { current, target };
  };

  // Calcular total general
  const getGrandTotal = () => {
    let current = 0;
    let target = 0;

    if (isCrossTable) {
      genderOptions.forEach((gender) => {
        ageOptions.forEach((age) => {
          current += getCellProgress(gender, age);
          target += getCellTarget(gender, age);
        });
      });
    } else {
      const options = hasGender ? genderOptions : ageOptions;
      options.forEach((option) => {
        current += getCellProgress(option, null);
        target += getCellTarget(option, null);
      });
    }

    return { current, target };
  };

  const grandTotal = getGrandTotal();
  const grandPercentage =
    grandTotal.target > 0
      ? Math.round((grandTotal.current / grandTotal.target) * 100)
      : 0;

  return (
    <div className="bg-[var(--card-background)] rounded-xl border border-[var(--card-border)] p-4 sm:p-6 mb-6">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2 text-[var(--text-primary)]">
        <Target size={20} className="sm:w-6 sm:h-6 text-[var(--primary)]" />
        Progreso de Cuotas
      </h3>

      {/* Mobile: Card Layout */}
      <div className="block sm:hidden space-y-3">
        {isCrossTable ? (
          // Tabla cruzada en mobile: mostrar cada combinación como una card
          <>
            {genderOptions.map((genderOption, genderIdx) => (
              <div key={genderIdx} className="space-y-2">
                <div className="text-sm font-bold text-[var(--primary)] mb-2">
                  {genderOption}
                </div>
                {ageOptions.map((ageOption, ageIdx) => {
                  const current = getCellProgress(genderOption, ageOption);
                  const target = getCellTarget(genderOption, ageOption);
                  const percentage =
                    target > 0 ? Math.round((current / target) * 100) : 0;
                  const isComplete = current >= target && target > 0;

                  return (
                    <div
                      key={ageIdx}
                      className={`p-3 rounded-lg border ${
                        isComplete
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-[var(--input-background)] border-[var(--card-border)]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {ageOption}
                        </span>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {current}
                          <span className="text-[var(--text-secondary)] font-normal">
                            /{target}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--card-border)]/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isComplete
                              ? "bg-gradient-to-r from-green-500 to-green-600"
                              : "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]"
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1 text-right">
                        {percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Total general en mobile */}
            <div className="mt-4 p-4 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[var(--primary)]">
                  TOTAL GENERAL
                </span>
                <span className="text-lg font-bold text-[var(--primary)]">
                  {grandTotal.current}
                  <span className="text-[var(--text-secondary)] font-normal text-sm">
                    /{grandTotal.target}
                  </span>
                </span>
              </div>
              <div className="h-2 bg-[var(--card-border)]/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] transition-all"
                  style={{ width: `${Math.min(grandPercentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1 text-right">
                {grandPercentage}%
              </div>
            </div>
          </>
        ) : (
          // Tabla simple en mobile
          <>
            {(hasGender ? genderOptions : ageOptions).map((option, idx) => {
              const current = getCellProgress(option, null);
              const target = getCellTarget(option, null);
              const percentage =
                target > 0 ? Math.round((current / target) * 100) : 0;
              const isComplete = current >= target && target > 0;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    isComplete
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-[var(--input-background)] border-[var(--card-border)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {option}
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {current}
                      <span className="text-[var(--text-secondary)] font-normal">
                        /{target}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--card-border)]/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isComplete
                          ? "bg-gradient-to-r from-green-500 to-green-600"
                          : "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]"
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1 text-right">
                    {percentage}%
                  </div>
                </div>
              );
            })}
            {/* Total en mobile */}
            <div className="mt-2 p-4 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[var(--primary)]">
                  TOTAL
                </span>
                <span className="text-lg font-bold text-[var(--primary)]">
                  {grandTotal.current}
                  <span className="text-[var(--text-secondary)] font-normal text-sm">
                    /{grandTotal.target}
                  </span>
                </span>
              </div>
              <div className="h-2 bg-[var(--card-border)]/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] transition-all"
                  style={{ width: `${Math.min(grandPercentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1 text-right">
                {grandPercentage}%
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden sm:block overflow-x-auto">
        {isCrossTable ? (
          // Tabla de doble entrada (Género Y Edad)
          <table className="w-full">
            <thead>
              <tr>
                <th className="bg-[var(--primary)]/15 p-3 text-left text-sm font-semibold text-[var(--text-primary)] rounded-tl-lg"></th>
                {ageOptions.map((ageOption, idx) => (
                  <th
                    key={idx}
                    className="bg-[var(--primary)]/15 p-3 text-center text-sm font-semibold text-[var(--text-primary)]"
                  >
                    {ageOption}
                  </th>
                ))}
                <th className="bg-[var(--primary)]/10 p-3 text-center text-sm font-bold text-[var(--primary)] rounded-tr-lg">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {genderOptions.map((genderOption, genderIdx) => {
                const rowTotal = getRowTotal(genderOption);
                const rowPercentage =
                  rowTotal.target > 0
                    ? Math.round((rowTotal.current / rowTotal.target) * 100)
                    : 0;

                return (
                  <tr key={genderIdx}>
                    <td className="bg-[var(--card-background)] p-3 text-sm font-semibold text-[var(--text-primary)]">
                      {genderOption}
                    </td>
                    {ageOptions.map((ageOption, ageIdx) => {
                      const current = getCellProgress(genderOption, ageOption);
                      const target = getCellTarget(genderOption, ageOption);
                      const percentage =
                        target > 0 ? Math.round((current / target) * 100) : 0;
                      const isComplete = current >= target && target > 0;

                      return (
                        <td
                          key={ageIdx}
                          className={`p-3 text-center align-middle ${
                            isComplete
                              ? "bg-green-500/10"
                              : "bg-[var(--card-background)]"
                          }`}
                        >
                          <div className="text-sm font-bold text-[var(--text-primary)]">
                            {current}
                            <span className="text-[var(--text-secondary)] font-normal">
                              /{target}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 bg-[var(--card-border)]/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isComplete
                                  ? "bg-gradient-to-r from-green-500 to-green-600"
                                  : "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]"
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {percentage}%
                          </div>
                        </td>
                      );
                    })}
                    <td className="bg-[var(--primary)]/5 p-3 text-center">
                      <div className="text-sm font-bold text-[var(--primary)]">
                        {rowTotal.current}
                        <span className="text-[var(--text-secondary)] font-normal">
                          /{rowTotal.target}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {rowPercentage}%
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Fila de totales */}
              <tr>
                <td className="bg-[var(--primary)]/10 p-3 text-sm font-bold text-[var(--primary)] rounded-bl-lg">
                  TOTAL
                </td>
                {ageOptions.map((ageOption, idx) => {
                  const colTotal = getColumnTotal(ageOption);
                  const colPercentage =
                    colTotal.target > 0
                      ? Math.round((colTotal.current / colTotal.target) * 100)
                      : 0;

                  return (
                    <td
                      key={idx}
                      className="bg-[var(--primary)]/5 p-3 text-center"
                    >
                      <div className="text-sm font-bold text-[var(--primary)]">
                        {colTotal.current}
                        <span className="text-[var(--text-secondary)] font-normal">
                          /{colTotal.target}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {colPercentage}%
                      </div>
                    </td>
                  );
                })}
                <td className="bg-[var(--primary)]/10 p-3 text-center rounded-br-lg">
                  <div className="text-sm font-bold text-[var(--primary)]">
                    {grandTotal.current}
                    <span className="text-[var(--text-secondary)] font-normal">
                      /{grandTotal.target}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {grandPercentage}%
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          // Tabla simple (Género O Edad)
          <table className="w-full">
            <thead>
              <tr>
                <th className="bg-[var(--background)] p-3 text-left text-sm font-semibold text-[var(--text-primary)] rounded-tl-lg">
                  {hasGender ? "Género" : "Edad"}
                </th>
                <th className="bg-[var(--background)] p-3 text-center text-sm font-semibold text-[var(--text-primary)]">
                  Actual
                </th>
                <th className="bg-[var(--background)] p-3 text-center text-sm font-semibold text-[var(--text-primary)]">
                  Objetivo
                </th>
                <th className="bg-[var(--background)] p-3 text-center text-sm font-semibold text-[var(--text-primary)] rounded-tr-lg">
                  Progreso
                </th>
              </tr>
            </thead>
            <tbody>
              {(hasGender ? genderOptions : ageOptions).map((option, idx) => {
                const current = getCellProgress(option, null);
                const target = getCellTarget(option, null);
                const percentage =
                  target > 0 ? Math.round((current / target) * 100) : 0;
                const isComplete = current >= target && target > 0;

                return (
                  <tr key={idx}>
                    <td className="bg-[var(--card-background)] p-3 text-sm font-semibold text-[var(--text-primary)]">
                      {option}
                    </td>
                    <td className="bg-[var(--card-background)] p-3 text-center text-sm font-bold text-[var(--text-primary)]">
                      {current}
                    </td>
                    <td className="bg-[var(--card-background)] p-3 text-center text-sm font-bold text-[var(--text-primary)]">
                      {target}
                    </td>
                    <td
                      className={`p-3 align-middle ${
                        isComplete
                          ? "bg-green-500/10"
                          : "bg-[var(--card-background)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[var(--card-border)]/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isComplete
                                ? "bg-gradient-to-r from-green-500 to-green-600"
                                : "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]"
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)] min-w-[3rem] text-right">
                          {percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Fila de total */}
              <tr>
                <td className="bg-[var(--primary)]/10 p-3 text-sm font-bold text-[var(--primary)] rounded-bl-lg">
                  TOTAL
                </td>
                <td className="bg-[var(--primary)]/5 p-3 text-center text-sm font-bold text-[var(--primary)]">
                  {grandTotal.current}
                </td>
                <td className="bg-[var(--primary)]/5 p-3 text-center text-sm font-bold text-[var(--primary)]">
                  {grandTotal.target}
                </td>
                <td className="bg-[var(--primary)]/5 p-3 rounded-br-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[var(--card-border)]/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] transition-all"
                        style={{ width: `${Math.min(grandPercentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-[var(--primary)] min-w-[3rem] text-right">
                      {grandPercentage}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default QuotaProgressTable;
