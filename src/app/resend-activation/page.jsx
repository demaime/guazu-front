"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authService } from "@/services/auth.service";
import { Loader } from "@/components/ui/Loader";

export default function ResendActivationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError(""); // Limpiar error al empezar a escribir
    setSuccessMessage(""); // Limpiar mensaje de éxito
  };

  const validateForm = () => {
    if (!email) {
      setError("El campo de email es obligatorio.");
      return false;
    }
    // Validación simple de email
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("El formato del email no es válido.");
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
      await authService.resendActivation(email);
      setSuccessMessage(
        "¡Correo reenviado! Revisa tu bandeja de entrada y la casilla de correo no deseado."
      );
      setEmail(""); // Limpiar formulario
    } catch (err) {
      setError(err.message || "Ocurrió un error al reenviar el correo.");
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
          Reenviar email de activación
        </motion.h2>
        <motion.p variants={itemVariants} className="text-white text-center">
          Ingrese su dirección de correo electrónico y le reenviaremos el
          enlace para activar su cuenta.
        </motion.p>

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
                value={email}
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
              {isLoading ? <Loader size="sm" /> : "Reenviar"}
            </motion.button>

            <motion.div variants={itemVariants} className="text-center mt-4">
              <Link
                href="/login"
                className="text-white hover:text-gray-200 text-sm"
              >
                Volver al inicio
              </Link>
            </motion.div>
          </motion.form>
        )}
      </motion.div>
    </motion.div>
  );
}

