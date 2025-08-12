import { motion } from "framer-motion";

/**
 * CSS-only loader (ring) using border rotation.
 * Sizes map to fixed pixels via CSS var --s.
 */
export function Loader({ size = "default", className = "" }) {
  const sizePx =
    typeof size === "number"
      ? size
      : {
          sm: 14,
          default: 20,
          lg: 26,
          xl: 32,
        }[size] || 20;

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
