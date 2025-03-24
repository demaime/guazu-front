import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function PollsterSelector({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80"
        />
        
        {/* Dialog */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-background w-full max-w-2xl mx-4 rounded-lg shadow-xl border border-card-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-card-border bg-card-background rounded-t-lg">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-hover-bg rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 bg-background">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex justify-end gap-2 p-4 border-t border-card-border bg-card-background rounded-b-lg">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 