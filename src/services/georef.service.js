"use strict";

// Ya no necesitamos la lógica de la API externa
// import { API_URL } from "@/config/constants";

class GeorefClient {
  async getProvincias() {
    // Apuntamos a nuestra API local, que ahora es súper rápida
    const res = await fetch(`/api/georef/provincias`);
    if (!res.ok) throw new Error("Error obteniendo provincias");
    const data = await res.json();
    return data.data || [];
  }

  async getLocalidades(provinciaId) {
    if (!provinciaId) return [];
    const params = new URLSearchParams();
    params.set("provincia_id", String(provinciaId));

    // Un único endpoint para localidades y comunas
    const res = await fetch(`/api/georef/localidades?${params.toString()}`);
    if (!res.ok) throw new Error("Error obteniendo localidades/comunas");
    const data = await res.json();
    return data.data || [];
  }
}

export const georefClient = new GeorefClient();
