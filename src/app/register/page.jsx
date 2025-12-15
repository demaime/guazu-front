"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { authService } from "@/services/auth.service";
import LocationSelector from "@/components/LocationSelector";
import { Loader } from "@/components/ui/Loader"; // Asumiendo que tienes un componente Loader

// Normalizador de nombres y apellidos ("María del Carmen", "O'Connor", "San Martín")
function normalizePersonName(input) {
  try {
    if (!input && input !== 0) return "";
    const raw = String(input).trim().replace(/\s+/g, " ");
    if (raw === "") return "";

    const lowerConnectors = new Set([
      "de",
      "del",
      "la",
      "las",
      "los",
      "y",
      "e",
      "o",
      "u",
      "da",
      "di",
      "do",
      "van",
      "von",
    ]);

    const capitalizeToken = (token) => {
      const hyphenParts = token.split("-").map((part) => {
        const hasApostrophe = part.includes("'") || part.includes("’");
        if (hasApostrophe) {
          const apo = part.includes("’") ? "’" : "'";
          return part
            .split(apo)
            .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ""))
            .join(apo);
        }
        return part ? part.charAt(0).toUpperCase() + part.slice(1) : "";
      });
      return hyphenParts.join("-");
    };

    const tokens = raw.toLowerCase().split(" ");
    return tokens
      .map((tk, idx) => {
        if (idx > 0 && lowerConnectors.has(tk)) return tk;
        return capitalizeToken(tk);
      })
      .join(" ");
  } catch (_) {
    return String(input || "").trim();
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dni: "",
    city: "",
    province: "",
    cellular: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("AR"); // País seleccionado
  const [location, setLocation] = useState({
    province: null,
    municipality: null,
    department: null,
    locality: null,
    commune: null,
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(""); // Limpiar error al empezar a escribir
    setSuccessMessage(""); // Limpiar mensaje de éxito
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleNameBlur = () => {
    setFormData((prev) => ({ ...prev, name: normalizePersonName(prev.name) }));
  };

  const handleLastNameBlur = () => {
    setFormData((prev) => ({
      ...prev,
      lastName: normalizePersonName(prev.lastName),
    }));
  };

  const computeCityFromLocation = (loc) => {
    if (selectedCountry === "PY") {
      // Para Paraguay, siempre es el distrito
      return loc?.locality?.name || "";
    }

    // Para Argentina
    const provName = loc?.province?.name?.toLowerCase() || "";
    const isCaba =
      loc?.province?.id === "ciudad_de_buenos_aires" ||
      provName.includes("autónoma de buenos aires") ||
      provName === "caba";
    if (isCaba) return loc?.commune?.name || "";
    return (
      loc?.locality?.name ||
      loc?.municipality?.name ||
      loc?.department?.name ||
      ""
    );
  };

  const handleLocationChange = (loc) => {
    setLocation(loc);
    setFormData((prev) => ({
      ...prev,
      province: loc?.province?.name || "",
      city: computeCityFromLocation(loc),
    }));
    setFieldErrors((prev) => ({
      ...prev,
      province: undefined,
      city: undefined,
    }));
  };

  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setSelectedCountry(newCountry);
    // Reset location cuando cambia el país
    setLocation({
      province: null,
      municipality: null,
      department: null,
      locality: null,
      commune: null,
    });
    setFormData((prev) => ({
      ...prev,
      province: "",
      city: "",
    }));
  };

  const validateForm = () => {
    const { name, lastName, email, password, confirmPassword, dni, city } =
      formData;
    const newErrors = {};

    if (!name) newErrors.name = "Ingrese su nombre para continuar.";
    if (!lastName) newErrors.lastName = "Ingrese su apellido para continuar.";
    if (!email) newErrors.email = "Ingrese un email para crear la cuenta.";
    if (!password)
      newErrors.password = "Cree una contraseña para proteger su cuenta.";
    if (!confirmPassword)
      newErrors.confirmPassword =
        "Confirme la contraseña para evitar errores de tipeo.";

    if (!dni || isNaN(Number(dni)) || Number(dni) <= 0) {
      newErrors.dni =
        "El número de documento debe ser un número positivo, sin puntos ni letras.";
    }

    const locationLabel =
      selectedCountry === "PY" ? "departamento" : "provincia";

    if (!location?.province?.id) {
      newErrors.city = `Seleccione un ${locationLabel}.`;
    } else if (selectedCountry === "AR") {
      const provName = location?.province?.name?.toLowerCase() || "";
      const isCaba =
        location?.province?.id === "ciudad_de_buenos_aires" ||
        provName.includes("autónoma de buenos aires") ||
        provName === "caba";
      if (isCaba) {
        if (!location?.commune?.id) newErrors.city = "Seleccione una comuna.";
      } else {
        if (
          !location?.locality?.id &&
          !location?.municipality?.id &&
          !location?.department?.id
        ) {
          newErrors.city = "Seleccione municipio/departamento y localidad.";
        }
      }
    } else if (selectedCountry === "PY") {
      if (!location?.locality?.id) {
        newErrors.city = "Seleccione un distrito.";
      }
    }

    if (password && confirmPassword && password !== confirmPassword) {
      const msg = "Verifique que las contraseñas sean idénticas.";
      newErrors.password = msg;
      newErrors.confirmPassword = msg;
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email =
        "El email no tiene un formato válido. Ej: usuario@dominio.com";
    }

    // Reglas del backend: 6-10 chars, mayúscula, minúscula, número, sin espacios
    if (password) {
      const rules = [
        {
          test: (v) => v.length >= 6,
          msg: "Debe tener un mínimo de 6 caracteres",
        },
        {
          test: (v) => v.length <= 10,
          msg: "Debe tener un máximo de 10 caracteres",
        },
        {
          test: (v) => /[A-Z]/.test(v),
          msg: "Debe tener al menos una mayúscula",
        },
        {
          test: (v) => /[a-z]/.test(v),
          msg: "Debe tener al menos una minúscula",
        },
        { test: (v) => /\d/.test(v), msg: "Debe tener al menos un número" },
        { test: (v) => !/\s/.test(v), msg: "No debe contener espacios" },
      ];
      const firstFailed = rules.find((r) => !r.test(password));
      if (firstFailed) newErrors.password = firstFailed.msg;
    }

    setFieldErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setError("");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Normalizar antes de enviar (sin depender solo del onBlur)
      const normalizedName = normalizePersonName(formData.name);
      const normalizedLastName = normalizePersonName(formData.lastName);
      const payload = {
        name: normalizedName,
        lastName: normalizedLastName,
        email: formData.email,
        password: formData.password,
        documentNumber: String(formData.dni), // Nuevo campo genérico
        dni: Number(formData.dni), // Mantener por retrocompatibilidad
        country: selectedCountry, // País seleccionado
        city: computeCityFromLocation(location) || formData.city,
        province: location?.province?.name || formData.province,
        cellular: formData.cellular,
      };
      await authService.register(payload);
      // Mensaje de éxito basado en la funcionalidad antigua
      setSuccessMessage(
        "¡Cuenta creada! Revisa tu email para activar la cuenta."
      );
      // Opcional: Redirigir después de un tiempo o dejar al usuario en la página
      // setTimeout(() => router.push('/login'), 5000);
      setFormData({
        name: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        dni: "",
        city: "",
        province: "",
        cellular: "",
      }); // Limpiar formulario
    } catch (err) {
      if (err && err.field) {
        const mismatch = /coincid|idéntic/.test(
          (err.message || "").toLowerCase()
        );
        if (
          mismatch &&
          (err.field === "confirmPassword" || err.field === "password")
        ) {
          setFieldErrors({
            password: err.message,
            confirmPassword: err.message,
          });
        } else {
          setFieldErrors({ [err.field]: err.message });
        }
        setError("");
      } else {
        if (
          err?.message &&
          [
            "mínimo",
            "máximo",
            "mayúscula",
            "minúscula",
            "número",
            "espacios",
            "coincid",
          ].some((k) => err.message.toLowerCase().includes(k))
        ) {
          const isConfirm = /coincid|idéntic/.test(err.message.toLowerCase());
          if (isConfirm) {
            setFieldErrors({
              password: err.message,
              confirmPassword: err.message,
            });
          } else {
            setFieldErrors({ password: err.message });
          }
          setError("");
        } else {
          setError("");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Animaciones de Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const getInputClass = (fieldName) => {
    const base =
      "mt-1 block w-full px-3 py-2 bg-white/60 border rounded-md shadow-sm focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-500 sm:text-sm";
    return fieldErrors[fieldName]
      ? `${base} border-red-500 focus:ring-red-500`
      : `${base} border-transparent focus:ring-white/80 focus:border-transparent`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-4"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg md:max-w-2xl p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl"
      >
        <motion.h2
          variants={itemVariants}
          className="text-3xl font-bold text-center text-white"
        >
          Crear Cuenta
        </motion.h2>

        {successMessage ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/80 text-white rounded-md text-center"
          >
            {successMessage}
            <p className="mt-2">
              <Link
                href="/login"
                className="font-medium underline hover:text-green-100"
              >
                Ir a Iniciar Sesión
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-white uppercase"
              >
                Nombre
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className={getInputClass("name")}
                placeholder="Ingrese su nombre"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleNameBlur}
              />
              {fieldErrors.name && (
                <p
                  role="alert"
                  className="mt-1 inline-flex items-center px-2 py-1 rounded-full bg-red-700 text-white text-xs font-medium"
                >
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-white uppercase"
              >
                Apellido
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className={getInputClass("lastName")}
                placeholder="Ingrese su apellido"
                value={formData.lastName}
                onChange={handleChange}
                onBlur={handleLastNameBlur}
              />
              {fieldErrors.lastName && (
                <p
                  role="alert"
                  className="mt-1 inline-flex items-center px-2 py-1 rounded-full bg-red-700 text-white text-xs font-medium"
                >
                  {fieldErrors.lastName}
                </p>
              )}
            </div>

            {/* Selector de País */}
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-white uppercase"
              >
                País
              </label>
              <select
                id="country"
                name="country"
                value={selectedCountry}
                onChange={handleCountryChange}
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 sm:text-sm"
              >
                <option value="AR">Argentina</option>
                <option value="PY">Paraguay</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white uppercase"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={getInputClass("email")}
                placeholder="Ingrese su email"
                value={formData.email}
                onChange={handleChange}
              />
              {fieldErrors.email && (
                <p
                  role="alert"
                  className="mt-1 inline-flex items-center px-2 py-1 rounded-full bg-red-700 text-white text-xs font-medium"
                >
                  {fieldErrors.email}
                </p>
              )}

              {/* Fila Documento y Celular */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <label
                    htmlFor="dni"
                    className="block text-sm font-medium text-white uppercase"
                  >
                    N° de Documento / Cédula
                  </label>
                  <input
                    id="dni"
                    name="dni"
                    type="number"
                    required
                    className={getInputClass("dni")}
                    placeholder={
                      selectedCountry === "PY"
                        ? "Ingrese su cédula"
                        : "Ingrese su DNI"
                    }
                    value={formData.dni}
                    onChange={handleChange}
                  />
                  {fieldErrors.dni && (
                    <p
                      role="alert"
                      className="mt-1 inline-flex items-center px-2 py-1 rounded-full bg-red-700 text-white text-xs font-medium"
                    >
                      {fieldErrors.dni}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white uppercase">
                    Celular
                  </label>
                  <input
                    name="cellular"
                    type="tel"
                    className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                    value={formData.cellular}
                    onChange={handleChange}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* Fila Provincia/Departamento y Localidad/Distrito */}
              <div className="pt-4">
                <LocationSelector
                  value={location}
                  onChange={handleLocationChange}
                  country={selectedCountry}
                />
                {fieldErrors.city && (
                  <p
                    role="alert"
                    className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-red-700 text-white text-xs font-medium"
                  >
                    {fieldErrors.city}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <div className="relative">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-white uppercase"
                    >
                      Contraseña
                    </label>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className={getInputClass("password")}
                      placeholder="Ingrese su contraseña"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 top-6 flex items-center pr-3 text-gray-400 hover:text-white"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p
                      role="alert"
                      className="mt-1 inline-flex items-center px-2 py-1 rounded-full bg-red-700 text-white text-xs font-medium"
                    >
                      {fieldErrors.password}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-white/70">
                      6–10 caracteres, al menos 1 mayúscula, 1 minúscula y 1
                      número, sin espacios.
                    </p>
                  )}
                </div>
                <div>
                  <div className="relative">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-white uppercase"
                    >
                      Confirmar Contraseña
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      className={`${getInputClass("confirmPassword")} mb-4`}
                      placeholder="Confirme su contraseña"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 top-6 flex items-center pr-3 text-gray-400 hover:text-white"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p
                      role="alert"
                      className="-mt-3 mb-4 inline-flex items-center px-2 py-1 rounded-full bg-red-700 text-white text-xs font-medium"
                    >
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mensaje general suprimido a pedido: se muestran tags por campo */}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader size="sm" className="mr-2" />
                    <span>Registrando...</span>
                  </div>
                ) : (
                  "Registrarse"
                )}
              </button>
            </div>
          </motion.form>
        )}

        <motion.div variants={itemVariants} className="text-center">
          <Link href="/login" className="text-sm hover:text-white">
            ¿Ya tiene una cuenta?{" "}
            <span className="font-semibold text-[var(--primary-dark)]">
              Iniciar sesión
            </span>
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
