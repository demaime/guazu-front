import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function Loader({ size = 'default', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div
        animate={{ 
          rotate: 360,
          transition: { 
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }
        }}
      >
        <Loader2 
          className={`text-[var(--text-primary)] ${sizeClasses[size]} ${className}`}
        />
      </motion.div>
    </motion.div>
  );
} 