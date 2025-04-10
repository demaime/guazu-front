"use client";

import { ThemeProvider } from "@/providers/ThemeProvider";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ClientThemeWrapper({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Let ThemeProvider and themeService handle class application
  }, []);

  if (!mounted) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  return (
    <ThemeProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </ThemeProvider>
  );
}
