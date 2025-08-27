"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authService } from "@/services/auth.service";
import { Loader } from "@/components/ui/Loader"; // Asumiendo que tienes un componente Loader

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
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(""); // Limpiar error al empezar a escribir
    setSuccessMessage(""); // Limpiar mensaje de éxito
  };

  const validateForm = () => {
    const { name, lastName, email, password, confirmPassword, dni, city } =
      formData;
    if (!name || !lastName || !email || !password || !confirmPassword) {
      setError("Todos los campos son obligatorios.");
      return false;
    }
    if (!dni || isNaN(Number(dni)) || Number(dni) <= 0) {
      setError("El DNI es obligatorio y debe ser un número válido.");
      return false;
    }
    if (!city || String(city).trim() === "") {
      setError("La localidad es obligatoria.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return false;
    }
    // Validación simple de email (puedes mejorarla)
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("El formato del email no es válido.");
      return false;
    }
    if (password.length < 6) {
      // Ejemplo: requiere al menos 6 caracteres
      setError("La contraseña debe tener al menos 6 caracteres.");
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
      const payload = {
        name: formData.name,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        dni: Number(formData.dni),
        city: formData.city,
        province: formData.province,
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
      setError(err.message || "Ocurrió un error durante el registro.");
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
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                placeholder="Ingrese su nombre"
                value={formData.name}
                onChange={handleChange}
              />
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
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                placeholder="Ingrese su apellido"
                value={formData.lastName}
                onChange={handleChange}
              />
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
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                placeholder="Ingrese su email"
                value={formData.email}
                onChange={handleChange}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dni"
                    className="block text-sm font-medium text-white uppercase"
                  >
                    DNI
                  </label>
                  <input
                    id="dni"
                    name="dni"
                    type="number"
                    required
                    className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                    placeholder="Ingrese su DNI"
                    value={formData.dni}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-white uppercase"
                  >
                    Localidad
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                    placeholder="Ingrese su localidad"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white uppercase">
                    Provincia
                  </label>
                  <input
                    name="province"
                    type="text"
                    className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                    value={formData.province}
                    onChange={handleChange}
                  />
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
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white uppercase"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                  placeholder="Ingrese su contraseña"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-white uppercase"
                >
                  Confirmar Contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="mt-1 mb-4 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                  placeholder="Confirme su contraseña"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-white bg-red-500/80 p-3 rounded-md text-sm text-center"
              >
                {error}
              </motion.div>
            )}

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
          <Link
            href="/login"
            className="text-sm text-white/80 hover:text-white"
          >
            ¿Ya tiene una cuenta? Iniciar sesión
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
