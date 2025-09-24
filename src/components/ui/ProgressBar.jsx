"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const ProgressBar = ({
  current,
  target,
  label = null,
  variant = "default",
  showNumbers = true,
  animated = true,
  className = "",
}) => {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const actualPercentage =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayPercentage(actualPercentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayPercentage(actualPercentage);
    }
  }, [actualPercentage, animated]);

  const getVariantStyles = () => {
    const isComplete = actualPercentage >= 100;
    const isHigh = actualPercentage >= 75;
    const isMedium = actualPercentage >= 50;

    switch (variant) {
      case "success":
        return {
          bg: "bg-[#00c853]",
          text: "text-[#00c853]",
          badge:
            "bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82]",
        };
      case "warning":
        return {
          bg: "bg-[#ffc107]",
          text: "text-[#ffc107]",
          badge:
            "bg-[rgba(255,193,7,0.2)] text-[#ffc107] dark:bg-[rgba(255,193,7,0.3)] dark:text-[#ffecb3]",
        };
      case "danger":
        return {
          bg: "bg-[#f44336]",
          text: "text-[#f44336]",
          badge:
            "bg-[rgba(244,67,54,0.2)] text-[#f44336] dark:bg-[rgba(244,67,54,0.3)] dark:text-[#ff867c]",
        };
      default:
        return {
          bg: isComplete
            ? "bg-[#00c853]"
            : isHigh
            ? "bg-[#ffc107]"
            : "bg-[var(--primary)]",
          text: isComplete
            ? "text-[#00c853]"
            : isHigh
            ? "text-[#ffc107]"
            : "text-[var(--primary)]",
          badge: isComplete
            ? "bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82]"
            : isHigh
            ? "bg-[rgba(255,193,7,0.2)] text-[#ffc107] dark:bg-[rgba(255,193,7,0.3)] dark:text-[#ffecb3]"
            : "bg-[rgba(63,81,181,0.2)] text-[var(--primary)] dark:bg-[rgba(128,145,245,0.3)] dark:text-[var(--primary-light)]",
        };
    }
  };

  const styles = getVariantStyles();
  const remaining = Math.max(0, target - current);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header con label y números */}
      {(label || showNumbers) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {label}
            </span>
          )}
          {showNumbers && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {current.toLocaleString()}/{target.toLocaleString()}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${styles.badge}`}
              >
                {actualPercentage}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Barra de progreso */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[var(--input-background)] rounded-full h-3 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${styles.bg} relative overflow-hidden`}
            initial={{ width: 0 }}
            animate={{ width: `${displayPercentage}%` }}
            transition={{ duration: animated ? 1.5 : 0, ease: "easeOut" }}
          >
            {/* Efecto de brillo animado */}
            {animated && (
              <motion.div
                className="absolute top-0 left-0 h-full w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "400%" }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "linear",
                }}
              />
            )}
          </motion.div>
        </div>

        {/* Indicador de faltantes */}
        {remaining > 0 && actualPercentage < 100 && (
          <span className="text-xs bg-[rgba(244,67,54,0.2)] text-[#f44336] dark:bg-[rgba(244,67,54,0.3)] dark:text-[#ff867c] px-2 py-1 rounded-full whitespace-nowrap font-medium">
            -{remaining.toLocaleString()}
          </span>
        )}

        {/* Indicador de completado */}
        {actualPercentage >= 100 && (
          <span className="text-xs bg-[rgba(0,200,83,0.2)] text-[#00c853] dark:bg-[rgba(0,200,83,0.3)] dark:text-[#5efc82] px-2 py-1 rounded-full whitespace-nowrap font-medium">
            ✓ Completado
          </span>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;

