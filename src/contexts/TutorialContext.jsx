"use client";

import { createContext, useContext, useState } from "react";

const TutorialContext = createContext();

export function TutorialProvider({ children }) {
  const [shouldStartTutorial, setShouldStartTutorial] = useState(false);

  const startTutorial = () => {
    console.log("🚀 [TutorialContext] startTutorial - activando");
    setShouldStartTutorial(true);
    // Resetear inmediatamente para que no se active múltiples veces
    setTimeout(() => setShouldStartTutorial(false), 100);
  };

  return (
    <TutorialContext.Provider value={{ shouldStartTutorial, startTutorial }}>
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
