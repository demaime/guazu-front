"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * SplashScreen component - Pantalla de inicio moderna para PWA
 * @param {Object} props
 * @param {boolean} props.isVisible - Controla la visibilidad del splash
 * @param {function} props.onComplete - Callback cuando termina la animación
 * @param {number} props.duration - Duración total en milisegundos (default: 3000)
 */
export function SplashScreen({
  isVisible = true,
  onComplete = () => {},
  duration = 3000,
}) {
  const [showLogo, setShowLogo] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const timer1 = setTimeout(() => {
      setShowLogo(true);
    }, 200);

    const timer2 = setTimeout(() => {
      setShowTitle(true);
    }, 800);

    const timer3 = setTimeout(() => {
      setIsComplete(true);
      setTimeout(() => {
        onComplete();
      }, 500);
    }, duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="splash-screen"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.1,
            transition: {
              duration: 0.6,
              ease: [0.4, 0, 0.6, 1],
            },
          }}
        >
          {/* Fondo con gradiente */}
          <div className="splash-background" />

          {/* Patrón geométrico animado */}
          <div className="splash-pattern" />
          <div className="splash-geometric" />

          {/* Capa de blur */}
          <div className="splash-blur" />

          {/* Contenido principal */}
          <div className="splash-content">
            {/* Logo con animación de entrada - mantiene espacio para texto */}
            <div className="splash-logo">
              <AnimatePresence>
                {showLogo && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.3,
                      rotateY: -90,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotateY: 0,
                    }}
                    transition={{
                      duration: 1.2,
                      ease: [0.25, 0.46, 0.45, 0.94],
                      scale: {
                        type: "spring",
                        damping: 15,
                        stiffness: 100,
                      },
                    }}
                    className="w-full h-full"
                  >
                    <Image
                      src="/logo-solo.png"
                      alt="Guazú Logo"
                      width={120}
                      height={120}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Título con animación de entrada en cascada */}
            <div className="splash-title-container">
              <AnimatePresence>
                {showTitle && (
                  <motion.h1
                    className="splash-title"
                    initial={{
                      opacity: 0,
                      y: 30,
                      scale: 0.8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    transition={{
                      duration: 1,
                      delay: 0.3,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    {"Guazú".split("").map((letter, index) => (
                      <motion.span
                        key={index}
                        initial={{
                          opacity: 0,
                          y: 20,
                          rotateX: -90,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          rotateX: 0,
                        }}
                        transition={{
                          duration: 0.6,
                          delay: 0.5 + index * 0.1,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        style={{ display: "inline-block" }}
                      >
                        {letter}
                      </motion.span>
                    ))}
                  </motion.h1>
                )}
              </AnimatePresence>
            </div>

            {/* Indicador de progreso sutil */}
            <div className="splash-progress">
              <AnimatePresence>
                {showTitle && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{
                      opacity: 0.6,
                      width: "200px",
                      transition: {
                        width: {
                          duration: duration / 1000 - 1.5,
                          ease: "easeInOut",
                        },
                        opacity: { duration: 0.5 },
                      },
                    }}
                    className="h-0.5 bg-white/30 rounded-full"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Partículas flotantes decorativas */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 3) * 20}%`,
                }}
                animate={{
                  y: [-10, 10, -10],
                  opacity: [0.2, 0.5, 0.2],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
