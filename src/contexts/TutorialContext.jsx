"use client";

import { createContext, useContext, useState } from "react";

const TutorialContext = createContext();

export function TutorialProvider({ children }) {
  const [shouldStartTutorial, setShouldStartTutorial] = useState(false);
  const [shouldStartObserveCaseTutorial, setShouldStartObserveCaseTutorial] = useState(false);

  const startTutorial = () => {
    console.log("🚀 [TutorialContext] startTutorial - activando");
    setShouldStartTutorial(true);
    // Resetear inmediatamente para que no se active múltiples veces
    setTimeout(() => setShouldStartTutorial(false), 100);
  };

  const startObserveCaseTutorial = () => {
    console.log("🚀 [TutorialContext] startObserveCaseTutorial - activando");
    setShouldStartObserveCaseTutorial(true);
    // Resetear inmediatamente para que no se active múltiples veces
    setTimeout(() => setShouldStartObserveCaseTutorial(false), 100);
  };

  return (
    <TutorialContext.Provider value={{ 
      shouldStartTutorial, 
      startTutorial,
      shouldStartObserveCaseTutorial,
      startObserveCaseTutorial
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
}
