import { motion } from "framer-motion";

/**
 * CSS-only loader based on radial-gradient animation.
 * Sizes map to fixed pixels to preserve aspect ratio.
 */
export function Loader({ size = "default", className = "" }) {
  const sizePx =
    {
      sm: 16,
      default: 24,
      lg: 32,
      xl: 48,
    }[size] || 24;

  const style = {
    "--r1": "154%",
    "--r2": "68.5%",
    width: `${sizePx * 1.25}px`, // half the previous circle size
  };

  return (
    <motion.div
      initial={{ opacity: 0.85, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0.85, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={className}
    >
      <div
        style={style}
        className="loader-css relative aspect-square rounded-full"
      >
        <span className="loader-logo" />
      </div>
    </motion.div>
  );
}
