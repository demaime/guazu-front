"use strict";

import { API_URL } from "@/config/constants";

class GeorefClient {
  async getProvincias(country = "AR") {
    // Apuntamos a nuestra API de backend con soporte multi-país
    const params = new URLSearchParams();
    params.set("country", country);
    
    const res = await fetch(`${API_URL}/api/georef/provincias?${params.toString()}`);
    if (!res.ok) throw new Error("Error obteniendo provincias/departamentos");
    const data = await res.json();
    return data.data || [];
  }

  async getLocalidades(provinciaId, country = "AR") {
    if (!provinciaId) return [];
    const params = new URLSearchParams();
    params.set("provincia_id", String(provinciaId));
    params.set("country", country);

    // Un único endpoint para localidades, comunas y distritos
    const res = await fetch(
      `${API_URL}/api/georef/localidades?${params.toString()}`
    );
    if (!res.ok) throw new Error("Error obteniendo localidades/comunas/distritos");
    const data = await res.json();
    return data.data || [];
  }
}

export const georefClient = new GeorefClient();
