"use client";

import { SurveyCreationProvider } from './context/SurveyCreationContext';

export default function TemporalLayout({ children }) {
  return (
    <SurveyCreationProvider>
      {children}
    </SurveyCreationProvider>
  );
}



