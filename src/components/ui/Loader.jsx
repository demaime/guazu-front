import { motion } from "framer-motion";

/**
 * Circular gradient loader with smooth rotation animation.
 * Uses gradient between primary, primary-light, and primary-dark colors.
 * Sizes map to fixed pixels via CSS var --size.
 */
export function Loader({ size = "default", className = "" }) {
  const sizePx =
    typeof size === "number"
      ? size
      : {
          sm: 16,
          default: 24,
          lg: 40,
          xl: 56,
        }[size] || 24;

  const style = { "--size": `${sizePx}px` };

  return (
    <motion.div
      initial={{ opacity: 0.85, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0.85, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={className}
    >
      <div style={style} className="loader" />
    </motion.div>
  );
}
