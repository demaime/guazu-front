"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Logo en base64 para carga directa
const LOGO_BASE64 =
  "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";

// Create styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    padding: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: "1px solid #E0E0E0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 120,
    marginRight: 10,
  },
  headerTitle: {
    color: "#1F2937",
    fontSize: 10,
  },
  documentTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1E40AF",
  },
  description: {
    fontSize: 12,
    marginBottom: 20,
    color: "#4B5563",
  },
  infoSection: {
    marginBottom: 25,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 5,
    borderLeft: "4px solid #3B82F6",
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoContainer: {
    width: "31%",
    marginRight: "2%",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 3,
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: 11,
    color: "#1F2937",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 15,
    color: "#1F2937",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 4,
  },
  questionContainer: {
    marginBottom: 20,
    borderBottom: "1px solid #E5E7EB",
    paddingBottom: 15,
  },
  questionHeader: {
    flexDirection: "row",
    marginBottom: 7,
  },
  questionNumber: {
    backgroundColor: "#3B82F6",
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    padding: 4,
    borderRadius: 4,
    marginRight: 8,
    textAlign: "center",
    minWidth: 25,
  },
  questionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    flex: 1,
    color: "#1F2937",
  },
  obligatoryTag: {
    fontSize: 9,
    color: "#EF4444",
    borderRadius: 2,
    marginLeft: 5,
  },
  questionMeta: {
    marginLeft: 33,
    marginBottom: 6,
  },
  questionType: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 4,
    backgroundColor: "#F3F4F6",
    padding: "2 5",
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  questionDescription: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 8,
    marginLeft: 33,
  },
  dependencyInfo: {
    fontSize: 10,
    color: "#2563EB",
    marginBottom: 8,
    marginLeft: 33,
    fontStyle: "italic",
  },
  optionsContainer: {
    marginLeft: 33,
    marginTop: 4,
  },
  optionLabel: {
    fontSize: 10,
    color: "#4B5563",
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  optionMarker: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3B82F6",
    marginRight: 6,
  },
  conditionalMarker: {
    color: "#2563EB",
    fontSize: 9,
    fontWeight: "bold",
    marginLeft: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 9,
    color: "#9CA3AF",
    borderTop: "1px solid #E5E7EB",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageNumber: {
    fontSize: 9,
    color: "#9CA3AF",
  },
});

// Función para traducir el tipo de pregunta a español
const translateQuestionType = (type) => {
  const types = {
    text: "Texto",
    radiogroup: "Opción Única",
    checkbox: "Selección Múltiple",
    dropdown: "Lista Desplegable",
    rating: "Calificación",
    boolean: "Sí/No",
    comment: "Comentario",
    expression: "Expresión",
    html: "HTML",
    matrix: "Matriz",
    matrixdropdown: "Matriz Desplegable",
    matrixdynamic: "Matriz Dinámica",
    multipletext: "Múltiples Textos",
    panel: "Panel",
    paneldynamic: "Panel Dinámico",
    file: "Archivo",
  };
  return types[type] || type;
};

// Función para buscar información de dependencias (preguntas que dependen de esta)
const findDependencies = (question, allQuestions) => {
  const dependencies = [];

  if (!allQuestions || !Array.isArray(allQuestions) || !question)
    return dependencies;

  allQuestions.forEach((q) => {
    // Si esta pregunta tiene una condición de visualización basada en otra
    if (q.visibleIf && q.visibleIf.includes(question.id)) {
      dependencies.push({
        id: q.id,
        title: q.title,
        condition: q.visibleIf,
      });
    }

    // Si tiene opciones que llevan a otra pregunta
    if (q.options && Array.isArray(q.options)) {
      q.options.forEach((option) => {
        if (option.nextQuestionId === question.id) {
          dependencies.push({
            id: q.id,
            title: q.title,
            fromOption: option.text || option.value || "Opción desconocida",
          });
        }
      });
    }
  });

  return dependencies;
};

// Función para buscar información sobre el padre de una pregunta
const findParentInfo = (question, allQuestions, surveyData) => {
  if (!allQuestions || !Array.isArray(allQuestions) || !question) return null;

  // Buscar si hay alguna pregunta que en sus opciones apunte a esta
  for (const q of allQuestions) {
    if (q.options && Array.isArray(q.options)) {
      for (const option of q.options) {
        if (option.nextQuestionId === question.id) {
          // Usar la misma lógica para el número de pregunta que se usa en el componente
          const qIndex = allQuestions.findIndex((item) => item.id === q.id);
          const displayNumber =
            q.displayNumber ||
            (surveyData?.questionNumberMap &&
              surveyData.questionNumberMap[q.id]) ||
            `${qIndex + 1}`;

          return {
            id: q.id,
            title: q.title,
            option: option.text || option.value || "Opción desconocida",
            number: displayNumber,
          };
        }
      }
    }
  }

  return null;
};

const SurveyPDF = ({ surveyData }) => {
  const basicInfo = surveyData.basicInfo || {};
  const questions = surveyData.questions || [];
  const today = new Date().toLocaleDateString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              src={`data:image/png;base64,${LOGO_BASE64}`}
              style={styles.logo}
            />
          </View>
          <Text style={styles.headerTitle}>Generado el {today}</Text>
        </View>

        <Text style={styles.documentTitle}>
          {basicInfo.title || "Sin título"}
        </Text>
        <Text style={styles.description}>
          {basicInfo.description || "Sin descripción"}
        </Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Periodo de la encuesta</Text>
              <Text style={styles.infoValue}>
                {basicInfo.startDate
                  ? new Date(basicInfo.startDate).toLocaleDateString()
                  : "N/A"}{" "}
                -{" "}
                {basicInfo.endDate
                  ? new Date(basicInfo.endDate).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Meta de respuestas</Text>
              <Text style={styles.infoValue}>
                {basicInfo.target || 0} respuestas
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Participantes</Text>
              <Text style={styles.infoValue}>
                {surveyData.participants?.userIds?.length || 0} encuestadores
                {surveyData.participants?.supervisorsIds?.length > 0
                  ? `, ${surveyData.participants.supervisorsIds.length} supervisores`
                  : ""}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Preguntas de la encuesta</Text>

        {questions.map((question, index) => {
          // Buscar información sobre el padre de esta pregunta (si existe)
          const parentInfo = findParentInfo(question, questions, surveyData);
          // Buscar información sobre las preguntas que dependen de esta
          const childQuestions = findDependencies(question, questions);

          const displayNumber =
            question.displayNumber ||
            (surveyData.questionNumberMap &&
              surveyData.questionNumberMap[question.id]) ||
            `${index + 1}`;

          return (
            <View key={index} style={styles.questionContainer}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>{displayNumber}</Text>
                <Text style={styles.questionTitle}>
                  {question.title}
                  {question.required && (
                    <Text style={styles.obligatoryTag}> *Obligatoria</Text>
                  )}
                </Text>
              </View>

              <View style={styles.questionMeta}>
                <Text style={styles.questionType}>
                  {translateQuestionType(question.type)}
                </Text>
              </View>

              {question.description && (
                <Text style={styles.questionDescription}>
                  {question.description}
                </Text>
              )}

              {parentInfo && (
                <Text style={styles.dependencyInfo}>
                  - Se muestra si en pregunta {parentInfo.number || "?"} se
                  selecciona "{parentInfo.option}"
                </Text>
              )}

              {question.options && question.options.length > 0 && (
                <View style={styles.optionsContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { fontWeight: "bold", marginBottom: 6 },
                    ]}
                  >
                    Opciones:
                  </Text>
                  {question.options.map((option, optIndex) => {
                    // Determinar si esta opción lleva a otra pregunta
                    const leadsTo =
                      typeof option === "object" && option.nextQuestionId
                        ? questions.find((q) => q.id === option.nextQuestionId)
                        : null;

                    const optionText =
                      typeof option === "string"
                        ? option
                        : option.text || option.value || "Opción sin texto";

                    return (
                      <View key={optIndex} style={styles.optionRow}>
                        <View style={styles.optionMarker} />
                        <Text style={styles.optionLabel}>
                          {optionText}
                          {leadsTo && (
                            <Text style={styles.conditionalMarker}>
                              {` → P${leadsTo.displayNumber || "?"}`}
                            </Text>
                          )}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {question.rows && question.rows.length > 0 && (
                <View style={styles.optionsContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { fontWeight: "bold", marginBottom: 6 },
                    ]}
                  >
                    Filas:
                  </Text>
                  {question.rows.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.optionRow}>
                      <View style={styles.optionMarker} />
                      <Text style={styles.optionLabel}>
                        {typeof row === "string"
                          ? row
                          : row.text || row.value || "Fila sin texto"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {question.columns && question.columns.length > 0 && (
                <View style={styles.optionsContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { fontWeight: "bold", marginBottom: 6 },
                    ]}
                  >
                    Columnas:
                  </Text>
                  {question.columns.map((col, colIndex) => (
                    <View key={colIndex} style={styles.optionRow}>
                      <View style={styles.optionMarker} />
                      <Text style={styles.optionLabel}>
                        {typeof col === "string"
                          ? col
                          : col.text || col.value || "Columna sin texto"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {childQuestions.length > 0 && (
                <View style={styles.optionsContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { fontWeight: "bold", marginBottom: 6, color: "#2563EB" },
                    ]}
                  >
                    Determina la visualización de:
                  </Text>
                  {childQuestions.map((childQ, childIndex) => (
                    <View key={childIndex} style={styles.optionRow}>
                      <View
                        style={[
                          styles.optionMarker,
                          { backgroundColor: "#2563EB" },
                        ]}
                      />
                      <Text style={[styles.optionLabel, { color: "#2563EB" }]}>
                        Pregunta{" "}
                        {questions.find((q) => q.id === childQ.id)
                          ?.displayNumber ||
                          (surveyData.questionNumberMap &&
                            surveyData.questionNumberMap[childQ.id]) ||
                          "?"}
                        {childQ.fromOption
                          ? ` (si se selecciona "${childQ.fromOption}")`
                          : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text>{basicInfo.title || "Encuesta"}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default SurveyPDF;
