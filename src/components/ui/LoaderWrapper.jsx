import { motion } from "framer-motion";
import { useEffect } from "react";
import { Loader } from "@/components/ui/Loader";

/**
 * LoaderWrapper component - Provides a consistent loading experience
 * @param {Object} props
 * @param {string} props.size - Size of the loader ('sm', 'default', 'lg', 'xl')
 * @param {string} props.className - Additional CSS classes for the loader
 * @param {string} props.text - Optional text to display below the loader
 * @param {boolean} props.fullScreen - Whether the loader should take the full screen height
 */
export function LoaderWrapper({
  size = "lg",
  className = "",
  text = "",
  fullScreen = false,
}) {
  // Lock scroll when showing as full-screen overlay
  useEffect(() => {
    if (!fullScreen) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [fullScreen]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={
        fullScreen
          ? "fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]"
          : "flex items-center justify-center h-full"
      }
    >
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-[3rem]"
      >
        <Loader
          size={typeof size === "number" ? size + 2 : size === "lg" ? 50 : size}
          className={`text-primary ${className}`}
        />
        {text && (
          <div className="loader-caption">
            <p className="text-[var(--text-secondary)] italic">{text}</p>
            <span className="loading-underline" aria-hidden="true" />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
