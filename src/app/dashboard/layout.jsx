'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Loader } from '@/components/ui/Loader';
import { Menu, X, ChevronLeft, ChevronRight, Home, ClipboardList, Users, LogOut, LayoutGrid, Settings } from 'lucide-react';
import { themeService } from '@/services/theme.service';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getToken();
      const userData = authService.getUser();

      if (!token || !userData) {
        router.replace('/login');
        return;
      }

      setUser(userData);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      themeService.initTheme();
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Definir las opciones de navegación según el rol
  const getNavItems = (userRole) => {
    // Items base que todos los usuarios pueden ver
    const baseItems = [
      { path: '', label: 'Inicio', icon: Home },
      { path: 'encuestas', label: 'Encuestas', icon: ClipboardList },
    ];

    // Item de Mi Perfil que siempre irá al final
    const profileItem = { path: 'configuracion', label: 'Mi Perfil', icon: Settings };

    let items = [...baseItems];

    if (userRole === 'ROLE_ADMIN') {
      items.push({ path: 'usuarios', label: 'Usuarios', icon: Users });
    } else if (userRole === 'SUPERVISOR') {
      items.push({ path: 'usuarios', label: 'Encuestadores', icon: Users });
    }

    // Agregar Mi Perfil al final
    items.push(profileItem);

    return items;
  };

  if (isLoading) {
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

  const navItems = getNavItems(user?.role);

  return (
    <div className="dashboard-layout">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="dashboard-header"
      >
        <div className="header-content bg-primary">
          <div className="header-wrapper">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-md hover:bg-opacity-80"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-lg font-semibold leading-6 text-white">Guazú</h1>
            <button
              onClick={() => {
                authService.logout();
                router.replace('/login');
              }}
              className="p-2 hover:opacity-80 transition-opacity"
            >
              <LogOut className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </motion.header>

      <div className="main-wrapper">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sidebar-overlay"
              onClick={toggleSidebar}
            />
          )}
        </AnimatePresence>

        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'mobile-open' : 'mobile-closed'}`}>
          <div className="sidebar-header">
            <div className="flex items-center gap-2">
              <LayoutGrid className={`w-5 h-5 ${!isSidebarCollapsed ? 'mr-2' : ''}`} />
              <h2 className={`font-semibold transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                Menú
              </h2>
            </div>
            <div className="flex items-center">
              <button
                onClick={toggleSidebarCollapse}
                className="sidebar-collapse-btn"
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 hover:bg-opacity-80 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item, i) => {
              const Icon = item.icon;
              const fullPath = `/dashboard${item.path ? `/${item.path}` : ''}`;
              return (
                <motion.a
                  key={fullPath}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  href={fullPath}
                  className={`nav-item ${currentPath === fullPath ? 'active' : ''}`}
                >
                  <Icon className="nav-item-icon" />
                  <span className={`nav-item-text ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                    {item.label}
                  </span>
                </motion.a>
              );
            })}
          </nav>
        </aside>

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="main-content"
        >
          {children}
        </motion.main>

        <button
          onClick={toggleSidebar}
          className="sidebar-toggle"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}