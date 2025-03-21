'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { Loader } from '@/components/ui/Loader';
import { Menu, X, ChevronLeft, ChevronRight, Home, ClipboardList, Users, LogOut, LayoutGrid, Settings, UserRoundPen } from 'lucide-react';
import { themeService } from '@/services/theme.service';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getToken();
      const userData = authService.getUser();

      if (!token || !userData) {
        console.log('No hay token o usuario, redirigiendo a login');
        router.replace('/login');
        return;
      }

      console.log('Usuario autenticado:', userData);
      setUser(userData);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    console.log('Pathname actual:', pathname);
  }, [pathname]);

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsSidebarCollapsed(true);
  }, [pathname]);

  const handleProfileClick = () => {
    console.log('Click en perfil');
    console.log('Usuario actual:', user);
    console.log('Token actual:', authService.getToken());
  };

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

    // Item de configuración que siempre irá al final
    const configItem = { path: 'configuracion', label: 'Configuración', icon: Settings };

    let items = [...baseItems];

    if (userRole === 'ROLE_ADMIN') {
      items.push(
        { path: 'usuarios', label: 'Usuarios', icon: Users },
        { path: 'encuestadores', label: 'Encuestadores', icon: UserRoundPen }
      );
    } else if (userRole === 'SUPERVISOR') {
      items.push({ path: 'encuestadores', label: 'Encuestadores', icon: UserRoundPen });
    }

    // Agregar Configuración al final
    items.push(configItem);

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
            <div 
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  toggleSidebarCollapse();
                }
              }}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Image
                src="/logo-full.png"
                alt="Guazú"
                width={160}
                height={80}
                className="object-contain h-8"
              />
            </div>
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
            <div 
              className="flex items-center justify-between w-full cursor-pointer"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  toggleSidebar();
                } else {
                  toggleSidebarCollapse();
                }
              }}
            >
              <div className="flex items-center gap-2">
                <LayoutGrid className={`w-5 h-5 ${!isSidebarCollapsed ? 'mr-2' : ''}`} />
                <h2 className={`font-semibold transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                  Menú
                </h2>
              </div>
              <div className="flex items-center">
                {window.innerWidth >= 1024 ? (
                  <ChevronLeft className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>

          {/* Tarjeta de perfil */}
          <Link href="/dashboard/perfil">
            <motion.div 
              className={`block px-4 py-3 border-b border-[var(--card-border)] transition-all hover:bg-[var(--hover-bg)] cursor-pointer group ${isSidebarCollapsed ? 'text-center' : ''}`}
              onClick={handleProfileClick}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 ${isSidebarCollapsed ? 'mx-auto' : ''}`}>
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className={`flex-1 min-w-0 transition-all ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  <p className="font-medium text-[var(--text-primary)] truncate">
                    {user?.name || user?.email || 'Usuario'}
                  </p>
                  <div className="relative h-5 min-w-[120px]">
                    <p className="text-xs text-[var(--text-secondary)] transition-all duration-200 absolute top-0 left-0 w-full group-hover:opacity-0">
                      {user?.role === 'ROLE_ADMIN' ? 'Administrador' : 
                       user?.role === 'SUPERVISOR' ? 'Supervisor' : 
                       user?.role === 'POLLSTER' ? 'Encuestador' : 'Usuario'}
                    </p>
                    <p className="text-xs text-[var(--primary)] absolute top-0 left-0 w-full transition-all duration-200 opacity-0 group-hover:opacity-100">
                      Mi perfil
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>

          <nav className="sidebar-nav">
            {navItems.map((item, i) => {
              const Icon = item.icon;
              const fullPath = `/dashboard${item.path ? `/${item.path}` : ''}`;
              const isActive = pathname === fullPath;
              
              return (
                <Link href={fullPath} key={fullPath} className="w-full">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'w-full'}`}>
                      <Icon className="nav-item-icon" />
                      <span className={`nav-item-text ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                        {item.label}
                      </span>
                    </div>
                  </motion.div>
                </Link>
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