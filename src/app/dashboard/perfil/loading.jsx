"use client";

import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

export default function PerfilLoading() {
  return (
    <div className="p-4 h-[calc(100vh-64px)] flex items-center justify-center">
      <LoaderWrapper
        size="lg"
        fullScreen={false}
        text="Cargando perfil…"
        className="text-primary"
      />
    </div>
  );
}
