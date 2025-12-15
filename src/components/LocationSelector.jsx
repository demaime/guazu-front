"use client";

import { useEffect, useState, useMemo } from "react";
import { georefClient } from "@/services/georef.service";

// Helper para normalizar texto para búsqueda (quita tildes y a minúsculas)
const normalizeText = (text) => {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

export default function LocationSelector({
  value,
  onChange,
  disabled = false,
  country = "AR", // País por defecto Argentina
}) {
  const [provinces, setProvinces] = useState([]);
  const [localities, setLocalities] = useState([]); // Almacena todas las de la prov
  const [filteredLocalities, setFilteredLocalities] = useState([]); // Para mostrar
  const [loading, setLoading] = useState({
    prov: false,
    loc: false,
  });
  const [localidadQuery, setLocalidadQuery] = useState("");
  const [isLocalidadInputFocused, setIsLocalidadInputFocused] = useState(false);

  // Determinar labels según el país
  const locationLabel = useMemo(() => {
    return country === "PY" ? "Departamento" : "Provincia";
  }, [country]);

  const localityLabel = useMemo(() => {
    return country === "PY" ? "Distrito" : "Localidad";
  }, [country]);

  const isCABA = useMemo(
    () =>
      country === "AR" &&
      (value?.province?.id === "ciudad_de_buenos_aires" ||
        value?.province?.name
          ?.toLowerCase()
          .includes("autónoma de buenos aires") ||
        value?.province?.name?.toLowerCase() === "caba"),
    [value?.province, country]
  );

  // Carga inicial de provincias/departamentos según país
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading((s) => ({ ...s, prov: true }));
        const provs = await georefClient.getProvincias(country);
        if (mounted) setProvinces(provs);
      } finally {
        if (mounted) setLoading((s) => ({ ...s, prov: false }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [country]); // Recargar cuando cambia el país

  // Carga de localidades/comunas/distritos cuando cambia la provincia/departamento
  useEffect(() => {
    if (!value?.province?.id) {
      setLocalities([]);
      return;
    }

    let mounted = true;
    (async () => {
      setLoading((s) => ({ ...s, loc: true }));
      try {
        const items = await georefClient.getLocalidades(value.province.id, country);
        if (mounted) setLocalities(items);
      } catch (err) {
        console.error("Error cargando localidades/comunas/distritos", err);
        if (mounted) setLocalities([]);
      } finally {
        if (mounted) setLoading((s) => ({ ...s, loc: false }));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [value?.province?.id, country]);

  // Filtrado de localidades en el cliente (instantáneo)
  useEffect(() => {
    if (!localidadQuery) {
      setFilteredLocalities([]);
      return;
    }

    const normalizedQuery = normalizeText(localidadQuery);
    const queryWords = normalizedQuery.split(" ").filter(Boolean);

    const results = localities
      .filter((loc) => {
        const normalizedName = normalizeText(loc.name);
        // Búsqueda precisa: cada palabra de la consulta debe estar al inicio de alguna palabra en el nombre
        return queryWords.every((qw) =>
          normalizedName.split(" ").some((nameWord) => nameWord.startsWith(qw))
        );
      })
      .slice(0, 100);

    setFilteredLocalities(results);
  }, [localidadQuery, localities]);

  const handleProvinceChange = (e) => {
    const id = e.target.value || "";
    const province = provinces.find((p) => String(p.id) === String(id)) || null;
    setLocalidadQuery("");
    setLocalities([]);
    setFilteredLocalities([]);
    onChange({
      province,
      // Reseteamos todo al cambiar de provincia
      locality: null,
      commune: null,
    });
  };

  const handleLocalidadSelect = (localidad) => {
    setLocalidadQuery(localidad.name);
    setIsLocalidadInputFocused(false);

    const finalSelection = {
      ...value,
      locality: !isCABA ? localidad : null,
      commune: isCABA ? localidad : null,
    };
    onChange(finalSelection);
  };

  const currentSelectionName = isCABA
    ? value?.commune?.name
    : value?.locality?.name;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-white uppercase">
          {locationLabel}
        </label>
        <select
          disabled={disabled || loading.prov}
          className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
          value={value?.province?.id || ""}
          onChange={handleProvinceChange}
        >
          <option value="" disabled>
            {loading.prov ? "Cargando..." : "Seleccionar"}
          </option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-white uppercase">
          {isCABA ? "Comuna" : localityLabel}
        </label>
        <input
          type="text"
          disabled={disabled || !value?.province?.id || loading.loc}
          className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
          placeholder={
            loading.loc
              ? "Cargando..."
              : !value?.province?.id
              ? `Seleccione ${locationLabel.toLowerCase()}`
              : `Buscar ${isCABA ? "comuna" : localityLabel.toLowerCase()}`
          }
          value={localidadQuery || currentSelectionName || ""}
          onFocus={() => {
            setIsLocalidadInputFocused(true);
            // Si el usuario vuelve a hacer foco, mostramos la lista para que pueda cambiar
            if (currentSelectionName) setLocalidadQuery("");
          }}
          onChange={(e) => setLocalidadQuery(e.target.value)}
          onBlur={() => {
            setTimeout(() => setIsLocalidadInputFocused(false), 200);
            // Si el campo queda vacío, reseteamos la selección
            if (!localidadQuery && !currentSelectionName)
              handleLocalidadSelect({ name: "", id: null });
            else if (!localidadQuery && currentSelectionName)
              setLocalidadQuery(currentSelectionName);
          }}
        />

        {isLocalidadInputFocused && filteredLocalities.length > 0 && (
          <ul className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredLocalities.map((loc) => (
              <li
                key={loc.id}
                className="p-2 text-sm text-gray-900 hover:bg-gray-100 cursor-pointer"
                onMouseDown={() => handleLocalidadSelect(loc)}
              >
                {loc.name}
              </li>
            ))}
          </ul>
        )}
        {isLocalidadInputFocused &&
          localidadQuery.length > 0 &&
          filteredLocalities.length === 0 &&
          !loading.loc && (
            <div className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg p-2 text-sm text-gray-500">
              No se encontraron resultados.
            </div>
          )}
      </div>
    </div>
  );
}
