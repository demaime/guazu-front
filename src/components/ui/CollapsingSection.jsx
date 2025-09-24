"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CollapsingSection = ({
  title,
  icon: Icon,
  children,
  defaultExpanded = true,
  headerContent = null,
  variant = "default",
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const variants = {
    default: "card p-0 overflow-hidden",
    glass:
      "glass-primary rounded-xl overflow-hidden border border-[var(--card-border)]",
    outlined:
      "border-2 border-[var(--primary)] rounded-xl overflow-hidden bg-transparent",
    gradient:
      "bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary)] text-white rounded-xl overflow-hidden",
  };

  return (
    <div className={`${variants[variant]} ${className}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer transition-all duration-200 hover:bg-[var(--hover-bg)] ${
          variant === "gradient" ? "hover:bg-black/10" : ""
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={`p-2 rounded-lg ${
                variant === "gradient"
                  ? "bg-white/20"
                  : "bg-[var(--primary-light)] text-[var(--primary)] dark:bg-[rgba(128,145,245,0.2)] dark:text-[var(--primary-light)]"
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <h2
            className={`text-xl font-semibold ${
              variant === "gradient"
                ? "text-white"
                : "text-[var(--text-primary)]"
            }`}
          >
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {headerContent && <div className="mr-2">{headerContent}</div>}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={
              variant === "gradient"
                ? "text-white"
                : "text-[var(--text-secondary)]"
            }
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className={`p-4 pt-4 ${
                variant === "gradient" ? "bg-[var(--card-background)]" : ""
              }`}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollapsingSection;
