"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SurveyPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // Redirigir a la vista de mapa por defecto
    router.replace(`/dashboard/encuestas/${params.id}/mapa`);
  }, [params.id]);

  return null;
}
