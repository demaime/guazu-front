'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { motion } from 'framer-motion';
import { Loader } from '@/components/ui/Loader';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        if (authService.isAuthenticated()) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.replace('/login');
      }
    };

    setTimeout(checkAuth, 100);
  }, [router]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center bg-[var(--background)]"
    >
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Loader size="xl" />
      </motion.div>
    </motion.main>
  );
} 