"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";

const QuotaProgressTable = ({ survey, answers, pollsterId = null, hideTitle = false }) => {
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

    // Crear estructura de targets
    const targets = {};
    if (pollsterId) {
      const assignment = quotaAssignments.find(
        (a) => String(a.pollsterId) === String(pollsterId),
      );
      if (assignment) {
        assignment.quotas?.forEach((quota) => {
          quota.segments?.forEach((segment) => {
            const key = segment.name;
            targets[key] = (targets[key] || 0) + (segment.target || 0);
          });
        });
      } else {
        quotaAssignments.forEach((assignment) => {
          assignment.quotas?.forEach((quota) => {
            quota.segments?.forEach((segment) => {
              const key = segment.name;
              targets[key] = (targets[key] || 0) + (segment.target || 0);
            });
          });
        });
      }
    } else {
      quotaAssignments.forEach((assignment) => {
        assignment.quotas?.forEach((quota) => {
          quota.segments?.forEach((segment) => {
            const key = segment.name;
            targets[key] = (targets[key] || 0) + (segment.target || 0);
          });
        });
      });
    }

    console.log(
      "QUOTA_TABLA_DEBUG - targets calculated from quotaAssignments:",
      targets,
    );

    // Calcular progreso actual desde las respuestas
    // CLAVE: Usar los questionId de quotaMetadata para extraer las respuestas correctas
    const progress = {};
    const localAnswers = pollsterId
      ? (answers || []).filter(
          (ans) => String(ans.userId) === String(pollsterId),
        )
      : answers || [];

    localAnswers.forEach((answer, idx) => {
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
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
        : "";
    const genderNormSet = new Set(extractedGenderOptions.map(normalize));
    const ageNormSet = new Set(extractedAgeOptions.map(normalize));
    const progressSum = Object.values(progress).reduce((a, b) => a + b, 0);
    if (progressSum === 0 && localAnswers.length > 0) {
      localAnswers.forEach((answer) => {
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
  }, [survey, answers, pollsterId]);

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
      {!hideTitle && (
        <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2 text-[var(--text-primary)]">
          <Target size={20} className="sm:w-6 sm:h-6 text-[var(--primary)]" />
          Progreso de Cuotas
        </h3>
      )}

      {/* Mobile: Card Layout */}
      <div className="block sm:hidden space-y-3">
        {isCrossTable ? (
          // Tabla cruzada en mobile: mostrar cada combinación como una card
          <>
            {genderOptions.map((genderOption, genderIdx) => (
              <div key={genderIdx} className="space-y-2">
                {genderIdx > 0 && <div className="h-px bg-[var(--card-border)]/20 my-4" />}
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
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {ageOption}
                        </span>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {current}
                          <span className="text-[var(--text-secondary)] font-normal">
                            /{target}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                            ({percentage}%)
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Total general en mobile */}
            <div className="mt-4 p-4 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--primary)]">
                  TOTAL GENERAL
                </span>
                <span className="text-lg font-bold text-[var(--primary)]">
                  {grandTotal.current}
                  <span className="text-[var(--text-secondary)] font-normal text-sm">
                    /{grandTotal.target}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                    ({grandPercentage}%)
                  </span>
                </span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {option}
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {current}
                      <span className="text-[var(--text-secondary)] font-normal">
                        /{target}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                        ({percentage}%)
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Total en mobile */}
            <div className="mt-2 p-4 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--primary)]">
                  TOTAL
                </span>
                <span className="text-lg font-bold text-[var(--primary)]">
                  {grandTotal.current}
                  <span className="text-[var(--text-secondary)] font-normal text-sm">
                    /{grandTotal.target}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                    ({grandPercentage}%)
                  </span>
                </span>
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
                  <tr key={genderIdx} className="border-b border-[var(--card-border)]/30">
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
                            <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                              ({percentage}%)
                            </span>
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
                        <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                          ({rowPercentage}%)
                        </span>
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
                        <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                          ({colPercentage}%)
                        </span>
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
                    <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                      ({grandPercentage}%)
                    </span>
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
                  <tr key={idx} className="border-b border-[var(--card-border)]/30">
                    <td className="bg-[var(--card-background)] p-3 text-sm font-semibold text-[var(--text-primary)]">
                      {option}
                    </td>
                    <td
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
                        <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                          ({percentage}%)
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
                <td className="bg-[var(--primary)]/5 p-3 text-center rounded-br-lg">
                  <div className="text-sm font-bold text-[var(--primary)]">
                    {grandTotal.current}
                    <span className="text-[var(--text-secondary)] font-normal">
                      /{grandTotal.target}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-normal ml-1">
                      ({grandPercentage}%)
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
