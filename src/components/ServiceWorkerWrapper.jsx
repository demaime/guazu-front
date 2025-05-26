"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Importar dinámicamente el componente ServiceWorkerInit solo en el cliente
const ServiceWorkerInit = dynamic(() => import("./ServiceWorkerInit"), {
  ssr: false,
});

export default function ServiceWorkerWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Solo renderizar el componente ServiceWorkerInit en el cliente
  if (!isClient) return null;

  return <ServiceWorkerInit />;
}
