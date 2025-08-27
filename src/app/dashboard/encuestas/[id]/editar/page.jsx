"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { surveyService } from "@/services/survey.service";
import { Loader } from "@/components/ui/Loader";
import NuevaEncuesta from "../../nueva/page";

export default function EditarEncuesta() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const data = await surveyService.getSurvey(params.id);
        if (!data || !data.survey) {
          throw new Error("No se encontró la encuesta");
        }
        setSurvey(data.survey);
      } catch (err) {
        console.error("Error loading survey:", err);
        setError(err.message || "Error al cargar la encuesta");
      } finally {
        setIsLoading(false);
      }
    };

    loadSurvey();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size="xl" className="text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500 mb-2">Error</h2>
          <p className="text-text-secondary">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Función auxiliar para extraer el texto del objeto de idiomas
  const getLocalizedText = (textObj) => {
    if (!textObj) return "";
    if (typeof textObj === "string") return textObj;
    // Si es un objeto, intentamos obtener el texto en español o el primer valor disponible
    if (textObj.es) return textObj.es;
    if (typeof textObj === "object") {
      const firstValue = Object.values(textObj)[0];
      return typeof firstValue === "string" ? firstValue : "";
    }
    return "";
  };

  // Función para analizar visibleIf y reconstruir showCondition { logic, rules }
  const parseVisibleIfConditions = (elements) => {
    const map = {}; // { questionId: showCondition }

    const condRegex =
      /\{([^}]+)\}\s*(contains|notcontains|=|!=|>=|<=|>|<)\s*(?:'([^']*)'|([0-9]+(?:\.[0-9]+)?))/g;

    elements.forEach((element) => {
      // Si la pregunta sigue un camino, NO reconstruimos reglas: su visibilidad es heredada
      if (element?.pathSourceQuestionId) {
        return;
      }
      const expr = element.visibleIf;
      if (!expr || typeof expr !== "string") return;

      try {
        // Determinar la lógica de grupo de forma simple
        let logic = "or";
        const hasAnd = expr.toLowerCase().includes(" and ");
        const hasOr = expr.toLowerCase().includes(" or ");
        if (hasAnd && !hasOr) logic = "and";
        if (!hasAnd && hasOr) logic = "or";
        if (hasAnd && hasOr) {
          // Mezcla: por simplicidad asumimos AND (se podrá ajustar manualmente en UI)
          logic = "and";
        }

        // Extraer todas las condiciones atómicas SIN agrupar por parentId/operator
        // para que cada cláusula del visibleIf se refleje como una regla independiente.
        const rules = [];
        let m;
        while ((m = condRegex.exec(expr)) !== null) {
          const parentId = m[1];
          const operator = m[2];
          const strVal = m[3];
          const numVal = m[4];
          const value = numVal !== undefined ? Number(numVal) : strVal;
          if (
            parentId &&
            operator &&
            (strVal !== undefined || numVal !== undefined)
          ) {
            const opMap = {
              contains: "contains",
              notcontains: "not_contains",
              "=": "equals",
              "!=": "not_equals",
              ">": "gt",
              ">=": "gte",
              "<": "lt",
              "<=": "lte",
            };
            const norm = opMap[operator] || "equals";
            rules.push({
              parentQuestionId: parentId,
              operator: norm,
              values:
                value !== undefined && value !== null && value !== ""
                  ? [value]
                  : [],
            });
          }
        }
        if (rules.length > 0) {
          map[element.name] = { logic, rules };
        }
      } catch (err) {
        console.warn("Error parsing visibleIf condition:", expr, err);
      }
    });

    return map;
  };

  // Función para aplanar el árbol en el orden correcto
  const flattenQuestionTree = (nodes, hierarchyMap) => {
    let result = [];

    for (const node of nodes) {
      const hierarchyNode = hierarchyMap[node.id];
      result.push(node);

      // Si tiene hijos, procesar recursivamente
      if (
        hierarchyNode &&
        hierarchyNode.children &&
        hierarchyNode.children.length > 0
      ) {
        result = result.concat(
          flattenQuestionTree(hierarchyNode.children, hierarchyMap)
        );
      }
    }

    return result;
  };

  // Función para crear una estructura jerárquica de preguntas
  const createHierarchicalStructure = (questions) => {
    // Validación para evitar errores
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return { hierarchyMap: {}, numberMap: {} };
    }

    // Mapa para almacenar la jerarquía de preguntas
    const hierarchyMap = {};

    // Primero identificamos las preguntas raíz (sin padre)
    const rootQuestions = questions.filter((q) => {
      // Verificamos si esta pregunta es destino de alguna pregunta condicional
      const isChild = questions.some(
        (parentQ) =>
          parentQ &&
          parentQ.isConditional &&
          parentQ.options &&
          parentQ.options.some((opt) => opt && opt.nextQuestionId === q.id)
      );
      return !isChild;
    });

    // Si no hay preguntas raíz, devolver las preguntas originales
    if (rootQuestions.length === 0) {
      const defaultMap = {};
      questions.forEach((q, idx) => {
        defaultMap[q.id] = `${idx + 1}`;
      });
      return { hierarchyMap: {}, numberMap: defaultMap };
    }

    // Función recursiva para construir el árbol
    const buildQuestionTree = (question, parentNumber = "") => {
      if (!question || !question.id) return null;

      // Asignar número basado en el padre
      let currentNumber;

      if (parentNumber && hierarchyMap[parentNumber]) {
        currentNumber = `${parentNumber}.${
          hierarchyMap[parentNumber].children.length + 1
        }`;
      } else {
        const rootIndex = rootQuestions.findIndex((q) => q.id === question.id);
        currentNumber = `${rootIndex !== -1 ? rootIndex + 1 : 1}`;
      }

      // Almacenar información jerárquica
      hierarchyMap[question.id] = {
        question,
        children: [],
        number: currentNumber,
      };

      // Si es pregunta condicional, buscar sus hijos
      if (question.isConditional && question.options) {
        question.options.forEach((opt) => {
          if (opt && opt.nextQuestionId) {
            const childQuestion = questions.find(
              (q) => q && q.id === opt.nextQuestionId
            );
            if (childQuestion) {
              // Añadir a la lista de hijos
              hierarchyMap[question.id].children.push(childQuestion);
              // Construir subárbol recursivamente
              buildQuestionTree(childQuestion, currentNumber);
            }
          }
        });
      }

      return hierarchyMap[question.id];
    };

    // Construir el árbol para cada pregunta raíz
    rootQuestions.forEach((q) => buildQuestionTree(q));

    // Crear el mapa de numeración para todas las preguntas
    const numberMap = {};
    Object.entries(hierarchyMap).forEach(([id, data]) => {
      numberMap[id] = data.number;
    });

    // Si no todas las preguntas están en el árbol, asignarles números
    questions.forEach((q) => {
      if (!numberMap[q.id]) {
        numberMap[q.id] = `${Object.keys(numberMap).length + 1}`;
      }
    });

    return { hierarchyMap, numberMap };
  };

  // Extraer y construir los datos iniciales para el editor
  let elements = [];
  if (survey.survey?.pages && Array.isArray(survey.survey.pages)) {
    if (survey.survey.pages.length > 1) {
      // Concatenar elementos de todas las páginas
      elements = survey.survey.pages.reduce((acc, page) => {
        if (page && Array.isArray(page.elements)) {
          return acc.concat(page.elements);
        }
        return acc;
      }, []);
    } else if (survey.survey.pages.length === 1) {
      // Usar elementos de la única página existente
      elements = survey.survey.pages[0]?.elements || [];
    }
  }

  const conditionalRelations = parseVisibleIfConditions(elements);

  // Procesar las preguntas primero para mantener referencias
  const processedQuestions = elements.map((question) => {
    // Reconstruir showCondition si existe visibleIf
    const showCondition = conditionalRelations[question.name] || null;
    // Restaurar metadato de camino si viene en el JSON de SurveyJS
    const pathSourceQuestionId = question.pathSourceQuestionId || "";
    try {
      if (pathSourceQuestionId) {
        console.log(
          "[Editor] pathSourceQuestionId detectado",
          question.name,
          "->",
          pathSourceQuestionId
        );
      }
    } catch {}

    return {
      id: question.name,
      type: (() => {
        if (question.type === "checkbox") return "multiple_choice";
        if (question.type === "radiogroup") return "single_choice";
        // Reinterpretar inputs HTML generados
        if (question.type === "text") {
          const it = (question.inputType || "").toLowerCase();
          if (it === "date") return "date";
          if (it === "time") return "time";
          if (it === "email") return "email";
          if (it === "number") return "number";
          if (it === "tel") return "phone";
        }
        return question.type;
      })(),
      title: getLocalizedText(question.title),
      description: getLocalizedText(question.description) || "",
      required: question.isRequired || false,
      // Agregar showCondition si existe
      ...(showCondition && { showCondition }),
      // Inicialmente, marca como no condicional - actualizaremos después
      isConditional: false,
      pathSourceQuestionId,
      options: (question.choices || []).map((choice) => ({
        id: choice.value || choice.id,
        text: getLocalizedText(choice.text),
        // Sin nextQuestionId inicialmente
      })),
      matrixRows: (question.rows || []).map((row) => ({
        id: row.value || row.id,
        text: getLocalizedText(row.text),
      })),
      matrixColumns: (question.columns || []).map((col) => ({
        id: col.value || col.id,
        text: getLocalizedText(col.text),
      })),
      rateMin: question.rateMin,
      rateMax: question.rateMax,
    };
  });

  // Relaciones condicionales para jerarquía: omitimos enlace explícito (puede no ser árbol)

  // Crear la estructura jerárquica y obtener la numeración
  const { numberMap } = createHierarchicalStructure(processedQuestions);

  // Guardar la numeración jerárquica para usarla en la interfaz
  const questionNumberMap = numberMap;

  const initialData = {
    basicInfo: {
      title: getLocalizedText(survey.survey?.title) || "",
      description: getLocalizedText(survey.survey?.description) || "",
      startDate: survey.surveyInfo?.startDate
        ? new Date(survey.surveyInfo.startDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      endDate: survey.surveyInfo?.endDate
        ? new Date(survey.surveyInfo.endDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      target: survey.surveyInfo?.target ?? 0,
    },
    participants: {
      userIds: survey.userIds || [],
      supervisorsIds: survey.supervisorsIds || [],
      pollsterAssignments:
        survey.pollsterAssignments ||
        survey.surveyInfo?.pollsterAssignments ||
        [], // ✅ CORREGIDO: buscar en raíz primero, luego en surveyInfo
    },
    questions: processedQuestions,
    quotas: survey.surveyInfo?.quotas || [],
  };

  return (
    <NuevaEncuesta
      isEditing={true}
      surveyId={params.id}
      initialData={initialData}
    />
  );
}
