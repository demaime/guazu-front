import { motion } from "framer-motion";
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
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center justify-center ${
        fullScreen ? "min-h-screen" : "h-full"
      }`}
    >
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        <Loader size={size} className={`text-primary ${className}`} />
        {text && <p className="text-[var(--text-secondary)]">{text}</p>}
      </motion.div>
    </motion.div>
  );
}
