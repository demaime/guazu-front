"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authService } from "@/services/auth.service";
import { Loader } from "@/components/ui/Loader";

export default function ActivateAccountPage({ params }) {
  const router = useRouter();
  const { token } = params;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const activateAccount = async () => {
      try {
        await authService.activateAccount(token);
        setSuccess(true);
      } catch (err) {
        setError(err.message || "Error al activar la cuenta");
      } finally {
        setIsLoading(false);
      }
    };

    activateAccount();
  }, [token]);

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
          Activación de cuenta
        </motion.h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader size="lg" />
          </div>
        ) : success ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/80 text-white rounded-md text-center"
          >
            <h3 className="text-xl mb-2">¡Cuenta activada correctamente!</h3>
            <p>Ya puedes iniciar sesión en la plataforma.</p>
            <p className="mt-4">
              <Link
                href="/login"
                className="font-medium underline hover:text-green-100"
              >
                Ir a Iniciar Sesión
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/80 text-white rounded-md text-center"
          >
            <h3 className="text-xl mb-2">Error de activación</h3>
            <p>{error}</p>
            <p className="mt-4">
              <Link
                href="/login"
                className="font-medium underline hover:text-red-100"
              >
                Volver al inicio de sesión
              </Link>
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
