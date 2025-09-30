"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { LogOut, User, HelpCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function UserMenu({ onStartTutorial }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const userData = authService.getUser();
    setUser(userData);
  }, []);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    authService.logout();
    router.replace("/login");
  };

  const handleStartTutorial = () => {
    console.log("🎯 [UserMenu] handleStartTutorial - click en Ver Tutorial");
    setIsOpen(false);
    if (onStartTutorial) {
      console.log("✅ [UserMenu] Llamando a onStartTutorial");
      onStartTutorial();
    } else {
      console.log("❌ [UserMenu] onStartTutorial no está definido");
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:opacity-80 transition-opacity flex items-center gap-2"
        aria-label="Menú de usuario"
      >
        <User className="w-5 h-5 text-white" />
        <ChevronDown
          className={`w-4 h-4 text-white transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.name || user?.fullName || "Usuario"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {user?.role === "POLLSTER"
                  ? "Encuestador"
                  : user?.role === "SUPERVISOR"
                  ? "Supervisor"
                  : user?.role === "ROLE_ADMIN"
                  ? "Administrador"
                  : "Usuario"}
              </p>
            </div>

            <div className="py-1">
              {user?.role === "POLLSTER" && (
                <button
                  onClick={handleStartTutorial}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Ver Tutorial
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
