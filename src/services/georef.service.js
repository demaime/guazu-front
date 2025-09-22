import { API_URL } from "@/config/constants";

class GeorefClient {
  async getProvincias(q = "") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(
      `${API_URL}/api/georef/provincias?${params.toString()}`
    );
    if (!res.ok) throw new Error("Error obteniendo provincias");
    const data = await res.json();
    return data.data || [];
  }

  async getMunicipios(provinciaId, q = "") {
    const params = new URLSearchParams();
    params.set("provincia_id", String(provinciaId));
    if (q) params.set("q", q);
    const res = await fetch(
      `${API_URL}/api/georef/municipios?${params.toString()}`
    );
    if (!res.ok) throw new Error("Error obteniendo municipios");
    const data = await res.json();
    return data.data || [];
  }

  async getDepartamentos(provinciaId, q = "") {
    const params = new URLSearchParams();
    params.set("provincia_id", String(provinciaId));
    if (q) params.set("q", q);
    const res = await fetch(
      `${API_URL}/api/georef/departamentos?${params.toString()}`
    );
    if (!res.ok) throw new Error("Error obteniendo departamentos");
    const data = await res.json();
    return data.data || [];
  }

  async getLocalidades({ municipioId, departamentoId, provinciaId, q = "" }) {
    const params = new URLSearchParams();
    if (municipioId) params.set("municipio_id", String(municipioId));
    if (departamentoId) params.set("departamento_id", String(departamentoId));
    if (provinciaId) params.set("provincia_id", String(provinciaId));
    if (q) params.set("q", q);
    const res = await fetch(
      `${API_URL}/api/georef/localidades?${params.toString()}`
    );
    if (!res.ok) throw new Error("Error obteniendo localidades");
    const data = await res.json();
    return data.data || [];
  }

  async getComunasCABA(q = "") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(
      `${API_URL}/api/georef/comunas-caba?${params.toString()}`
    );
    if (!res.ok) throw new Error("Error obteniendo comunas");
    const data = await res.json();
    return data.data || [];
  }
}

export const georefClient = new GeorefClient();
