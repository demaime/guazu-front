"use client";

import { createContext, useContext, useState } from 'react';

// Crear el contexto
const SurveyCreationContext = createContext();

// Provider que envuelve las páginas y provee el estado compartido
export function SurveyCreationProvider({ children }) {
  const [surveyData, setSurveyData] = useState({
    // Datos de /nueva
    titulo: "",
    descripcion: "",
    modulos: [],
    
    // Datos de /configurar
    fechaInicio: "",
    fechaFin: "",
    metaTotal: 0,
    gpsObligatorio: false,
    tieneObjetivo: true,
    cuotasActivas: false,
    categorias: [],
    
    // Datos de /participantes
    encuestadoresIds: [],
    supervisoresIds: []
  });

  // Función para actualizar cualquier parte de los datos
  const updateSurveyData = (newData) => {
    setSurveyData(prev => ({ ...prev, ...newData }));
  };

  // Función para resetear todo (después de guardar)
  const resetSurveyData = () => {
    setSurveyData({
      titulo: "",
      descripcion: "",
      modulos: [],
      fechaInicio: "",
      fechaFin: "",
      metaTotal: 0,
      gpsObligatorio: false,
      tieneObjetivo: true,
      cuotasActivas: false,
      categorias: [],
      encuestadoresIds: [],
      supervisoresIds: []
    });
  };

  return (
    <SurveyCreationContext.Provider 
      value={{ 
        surveyData, 
        updateSurveyData, 
        resetSurveyData 
      }}
    >
      {children}
    </SurveyCreationContext.Provider>
  );
}

// Hook personalizado para usar el contexto fácilmente
export function useSurveyCreation() {
  const context = useContext(SurveyCreationContext);
  
  if (!context) {
    throw new Error('useSurveyCreation debe usarse dentro de SurveyCreationProvider');
  }
  
  return context;
}



