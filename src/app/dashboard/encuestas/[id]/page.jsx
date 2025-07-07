"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SurveyPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // Redirigir a la vista de progreso/análisis por defecto
    router.replace(`/dashboard/encuestas/${params.id}/progreso`);
  }, [params.id]);

  return null;
}
