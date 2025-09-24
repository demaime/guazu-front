"use client";

import { motion } from "framer-motion";

const StatCard = ({
  title,
  value,
  icon: Icon,
  variant = "default",
  subtitle = null,
  trend = null,
  className = "",
}) => {
  const variants = {
    default: "card p-6 hover:shadow-lg transition-all duration-300",
    primary:
      "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300",
    secondary:
      "bg-gradient-to-br from-[var(--secondary)] to-[var(--secondary-dark)] text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300",
    success:
      "bg-gradient-to-br from-[#00c853] to-[#00a847] text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300",
    warning:
      "bg-gradient-to-br from-[#ffc107] to-[#ff8f00] text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300",
    glass:
      "glass-primary p-6 rounded-xl border border-[var(--card-border)] hover:shadow-lg transition-all duration-300",
  };

  const isGradient = ["primary", "secondary", "success", "warning"].includes(
    variant
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`${variants[variant]} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              isGradient ? "text-white/80" : "text-[var(--text-secondary)]"
            }`}
          >
            {title}
          </p>
          <p
            className={`text-3xl font-bold mt-1 ${
              isGradient ? "text-white" : "text-[var(--text-primary)]"
            }`}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={`text-sm mt-1 ${
                isGradient ? "text-white/70" : "text-[var(--text-secondary)]"
              }`}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <div
              className={`text-xs mt-2 flex items-center gap-1 ${
                isGradient ? "text-white/90" : "text-[var(--text-secondary)]"
              }`}
            >
              {trend}
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={`p-3 rounded-xl ${
              isGradient
                ? "bg-white/20"
                : variant === "glass"
                ? "bg-[var(--primary)]/10"
                : "bg-[var(--primary-light)] text-[var(--primary)] dark:bg-[rgba(128,145,245,0.2)] dark:text-[var(--primary-light)]"
            }`}
          >
            <Icon className={`w-6 h-6 ${isGradient ? "text-white" : ""}`} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;

