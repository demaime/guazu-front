"use client";

import { useEffect, useMemo, useState } from "react";
import { georefClient } from "@/services/georef.service";

export default function LocationSelector({
  value,
  onChange,
  disabled = false,
}) {
  const [provinces, setProvinces] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [loading, setLoading] = useState({
    prov: false,
    muni: false,
    depto: false,
    loc: false,
    comuna: false,
  });

  const isCABA = useMemo(
    () =>
      value?.province?.id === "02" ||
      value?.province?.name
        ?.toLowerCase()
        .includes("autónoma de buenos aires") ||
      value?.province?.name?.toLowerCase() === "caba",
    [value]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading((s) => ({ ...s, prov: true }));
        const provs = await georefClient.getProvincias();
        if (mounted) setProvinces(provs);
      } finally {
        if (mounted) setLoading((s) => ({ ...s, prov: false }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Cuando cambia provincia, limpiar niveles inferiores
    setMunicipios([]);
    setDepartamentos([]);
    setLocalidades([]);
    setComunas([]);
    if (!value?.province?.id) return;

    (async () => {
      if (isCABA) {
        setLoading((s) => ({ ...s, comuna: true }));
        try {
          const cms = await georefClient.getComunasCABA();
          setComunas(cms);
        } finally {
          setLoading((s) => ({ ...s, comuna: false }));
        }
        return;
      }

      // Intentar municipios; si no hay, usar departamentos
      setLoading((s) => ({ ...s, muni: true }));
      try {
        const munis = await georefClient.getMunicipios(value.province.id);
        setMunicipios(munis);
      } catch {
        setMunicipios([]);
      } finally {
        setLoading((s) => ({ ...s, muni: false }));
      }

      if (!municipios || municipios.length === 0) {
        setLoading((s) => ({ ...s, depto: true }));
        try {
          const deptos = await georefClient.getDepartamentos(value.province.id);
          setDepartamentos(deptos);
        } finally {
          setLoading((s) => ({ ...s, depto: false }));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.province?.id]);

  useEffect(() => {
    // Cuando cambia municipio/departamento, cargar localidades
    setLocalidades([]);
    if (isCABA) return; // En CABA no usamos localidades

    const municipioId = value?.municipality?.id || null;
    const departamentoId = value?.department?.id || null;
    if (!municipioId && !departamentoId && !value?.province?.id) return;

    (async () => {
      setLoading((s) => ({ ...s, loc: true }));
      try {
        const locs = await georefClient.getLocalidades({
          municipioId,
          departamentoId,
          provinciaId: value?.province?.id,
        });
        setLocalidades(locs);
      } finally {
        setLoading((s) => ({ ...s, loc: false }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.municipality?.id, value?.department?.id]);

  const handleProvinceChange = (e) => {
    const id = e.target.value || "";
    const province = provinces.find((p) => String(p.id) === String(id)) || null;
    onChange({
      province,
      municipality: null,
      department: null,
      locality: null,
      commune: null,
    });
  };

  const handleMunicipioChange = (e) => {
    const id = e.target.value || "";
    const municipality =
      municipios.find((m) => String(m.id) === String(id)) || null;
    onChange({ ...value, municipality, department: null, locality: null });
  };

  const handleDepartamentoChange = (e) => {
    const id = e.target.value || "";
    const department =
      departamentos.find((d) => String(d.id) === String(id)) || null;
    onChange({ ...value, department, municipality: null, locality: null });
  };

  const handleLocalidadChange = (e) => {
    const id = e.target.value || "";
    const locality =
      localidades.find((l) => String(l.id) === String(id)) || null;
    onChange({ ...value, locality });
  };

  const handleComunaChange = (e) => {
    const id = e.target.value || "";
    const commune = comunas.find((c) => String(c.id) === String(id)) || null;
    onChange({ ...value, commune });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-white uppercase">
          Provincia
        </label>
        <select
          disabled={disabled || loading.prov}
          className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
          value={value?.province?.id || ""}
          onChange={handleProvinceChange}
        >
          <option value="" disabled>
            {loading.prov ? "Cargando..." : "Seleccionar provincia"}
          </option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {isCABA ? (
        <div>
          <label className="block text-sm font-medium text-white uppercase">
            Comuna
          </label>
          <select
            disabled={disabled || !value?.province?.id || loading.comuna}
            className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
            value={value?.commune?.id || ""}
            onChange={handleComunaChange}
          >
            <option value="" disabled>
              {loading.comuna ? "Cargando..." : "Seleccionar comuna"}
            </option>
            {comunas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-white uppercase">
              Municipio
            </label>
            <select
              disabled={disabled || !value?.province?.id || loading.muni}
              className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
              value={value?.municipality?.id || ""}
              onChange={handleMunicipioChange}
            >
              <option value="" disabled>
                {loading.muni ? "Cargando..." : "Seleccionar municipio"}
              </option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {(!municipios || municipios.length === 0) && (
            <div>
              <label className="block text-sm font-medium text-white uppercase">
                Departamento
              </label>
              <select
                disabled={disabled || !value?.province?.id || loading.depto}
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                value={value?.department?.id || ""}
                onChange={handleDepartamentoChange}
              >
                <option value="" disabled>
                  {loading.depto ? "Cargando..." : "Seleccionar departamento"}
                </option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white uppercase">
              Localidad
            </label>
            <select
              disabled={
                disabled ||
                !value?.province?.id ||
                (!value?.municipality?.id && !value?.department?.id) ||
                loading.loc
              }
              className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
              value={value?.locality?.id || ""}
              onChange={handleLocalidadChange}
            >
              <option value="" disabled>
                {loading.loc ? "Cargando..." : "Seleccionar localidad"}
              </option>
              {localidades.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
