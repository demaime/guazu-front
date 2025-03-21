'use client';

import { motion } from 'framer-motion';
import { Loader } from '@/components/ui/Loader';

export default function PerfilLoading() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center"
    >
      <Loader size="xl" className="text-primary" />
    </motion.div>
  );
} 