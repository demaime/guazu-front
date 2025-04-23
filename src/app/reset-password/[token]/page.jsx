"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authService } from "@/services/auth.service";
import { Loader } from "@/components/ui/Loader";

export default function ResetPasswordPage({ params }) {
  const router = useRouter();
  const { token } = React.use(params);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [tokenValid, setTokenValid] = useState(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(""); // Limpiar error al empezar a escribir
  };

  const validateForm = () => {
    const { password, confirmPassword } = formData;
    if (!password || !confirmPassword) {
      setError("Todos los campos son obligatorios.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return false;
    }
    if (password.length < 6) {
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

    try {
      await authService.resetPassword(
        token,
        formData.password,
        formData.confirmPassword
      );
      setSuccessMessage("La contraseña se ha modificado correctamente.");
      // Limpiar formulario
      setFormData({
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(err.message || "Error al restablecer la contraseña.");
      if (err.message && err.message.includes("token")) {
        setTokenValid(false);
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
        className="w-full max-w-md p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl"
      >
        <motion.h2
          variants={itemVariants}
          className="text-3xl font-bold text-center text-white"
        >
          Restablecimiento de contraseña
        </motion.h2>

        {!tokenValid ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/80 text-white rounded-md text-center"
          >
            El enlace ha expirado o no es válido. Por favor, solicite un nuevo
            enlace.
            <p className="mt-4">
              <Link
                href="/forgot-password"
                className="font-medium underline hover:text-red-100"
              >
                Solicitar nuevo enlace
              </Link>
            </p>
          </motion.div>
        ) : successMessage ? (
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
                htmlFor="password"
                className="block text-sm font-medium text-white uppercase"
              >
                Nueva contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                placeholder="Ingrese nueva contraseña"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-white uppercase"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                placeholder="Confirme su contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 text-sm bg-red-500/80 text-white rounded-md"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              variants={itemVariants}
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[var(--primary)] bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              {isLoading ? <Loader size="sm" /> : "Aceptar"}
            </motion.button>
          </motion.form>
        )}
      </motion.div>
    </motion.div>
  );
}
