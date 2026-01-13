"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/auth.service";
import { Loader } from "@/components/ui/Loader";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  ClipboardList,
  Users,
  LogOut,
  LayoutGrid,
  Settings,
  Sparkles,
  GraduationCap,
  RefreshCw,
} from "lucide-react";
import { themeService } from "@/services/theme.service";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { API_URL } from "@/config/constants";
import { TutorialProvider, useTutorial } from "@/contexts/TutorialContext";
import { StatusIndicators } from "@/components/StatusIndicators";

function DashboardLayoutContent({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { startTutorial, startObserveCaseTutorial } = useTutorial();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [userImageExists, setUserImageExists] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getToken();
      const userData = authService.getUser();

      if (!token || !userData) {
        router.replace("/login");
        return;
      }

      setUser(userData);
      setIsLoading(false);
    };

    checkAuth();

    // Escuchar cambios en localStorage para actualizar la imagen de perfil
    const handleStorageChange = () => {
      const updatedUser = authService.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // También escuchar cambios locales al localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      originalSetItem.apply(this, arguments);
      if (key === "user") {
        handleStorageChange();
      }
    };

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  // Verificar si la imagen del usuario existe
  useEffect(() => {
    if (user?.image && user.image !== "null" && user.image !== "") {
      // Si es base64, está lista para usar
      if (user.image.startsWith("data:image/")) {
        setUserImageExists(true);
      } else {
        // Si es una URL/nombre de archivo, verificar si existe
        const imageUrl = `${API_URL}/uploads/users/${user.image}`;

        const img = new window.Image();
        img.onload = () => {
          setUserImageExists(true);
        };
        img.onerror = () => {
          setUserImageExists(false);
        };
        img.src = imageUrl;
      }
    } else {
      setUserImageExists(false);
    }
  }, [user?.image]);

  useEffect(() => {
    // Pathname tracking (removed log for cleaner console)
  }, [pathname]);

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsSidebarCollapsed(true);
  }, [pathname]);

  // Evitar pull-to-refresh en Android cuando el scroll está en el tope
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAndroid = /Android/i.test(window.navigator.userAgent || "");
    if (!isAndroid) return;

    const mainContent = document.querySelector(".main-content");
    if (!mainContent) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let isMultiTouch = false;

    const handleTouchStart = (event) => {
      if (!event.touches || event.touches.length === 0) return;
      isMultiTouch = event.touches.length > 1;
      if (isMultiTouch) return;
      touchStartY = event.touches[0].clientY;
      touchStartX = event.touches[0].clientX;
    };

    const handleTouchMove = (event) => {
      if (!event.touches || event.touches.length === 0) return;
      if (isMultiTouch) return;
      const currentY = event.touches[0].clientY;
      const currentX = event.touches[0].clientX;
      const deltaY = currentY - touchStartY;
      const deltaX = Math.abs(currentX - touchStartX);
      const pullingDown = deltaY > 10 && deltaY > deltaX;
      const atTop = mainContent.scrollTop <= 0;
      if (pullingDown && atTop) {
        // Cancelar gesto para evitar que Chrome Android haga refresh
        event.preventDefault();
      }
    };

    mainContent.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    // Necesitamos passive: false para poder llamar preventDefault
    mainContent.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    return () => {
      mainContent.removeEventListener("touchstart", handleTouchStart);
      mainContent.removeEventListener("touchmove", handleTouchMove);
    };
  }, [pathname]);

  const handleProfileClick = () => {
    // Profile click handler (logs removed for cleaner console)
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      themeService.initTheme();
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleLogout = () => {
    authService.logout();
    router.replace("/login");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  // Definir las opciones de navegación según el rol
  const getNavItems = (userRole) => {
    // Item de configuración que siempre irá al final
    const configItem = {
      path: "configuracion",
      label: "Configuración",
      icon: Settings,
    };

    let items = [];

    if (userRole === "POLLSTER") {
      // Pollsters solo ven Encuestas y Configuración
      items = [
        { path: "encuestas", label: "Encuestas", icon: ClipboardList },
        configItem,
      ];
    } else {
      // Otros roles tienen el menú completo
      items = [
        { path: "", label: "Inicio", icon: Home },
        { path: "encuestas", label: "Encuestas", icon: ClipboardList },
      ];

      if (userRole === "ROLE_ADMIN") {
        items.push(
          { path: "usuarios", label: "Usuarios", icon: Users },
          { path: "temporal", label: "Nuevo Creador", icon: Sparkles }
          // { path: "encuestadores", label: "Encuestadores", icon: UserRoundPen }
        );
      } else if (userRole === "SUPERVISOR") {
        // Ocultar temporalmente el ítem "Encuestadores" para supervisores
        // items.push({
        //   path: "encuestadores",
        //   label: "Encuestadores",
        //   icon: UserRoundPen,
        // });
      }

      // Agregar Configuración al final
      items.push(configItem);
    }

    return items;
  };

  if (isLoading) {
    return <LoaderWrapper size="xl" fullScreen />;
  }

  const navItems = getNavItems(user?.role);

  return (
    <div className="dashboard-layout">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="dashboard-header"
        data-tutorial="dashboard-header"
      >
        <div className="header-content bg-primary">
          <div className="header-wrapper">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-md hover:bg-opacity-80"
              data-tutorial="menu-button"
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
            {pathname === "/dashboard/encuestas/responder" ? (
              <StatusIndicators />
            ) : (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Actualizar página"
                aria-label="Actualizar página"
              >
                <RefreshCw
                  className={`w-5 h-5 text-white ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
              </button>
            )}
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

        <aside
          className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""} ${
            isSidebarOpen ? "mobile-open" : "mobile-closed"
          }`}
        >
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
                <LayoutGrid
                  className={`w-5 h-5 ${!isSidebarCollapsed ? "mr-2" : ""}`}
                />
                <h2
                  className={`font-semibold transition-opacity duration-200 ${
                    isSidebarCollapsed ? "opacity-0 hidden" : "opacity-100"
                  }`}
                >
                  Menú
                </h2>
              </div>
              <div className="flex items-center">
                {window.innerWidth >= 1024 ? (
                  <ChevronLeft
                    className={`w-5 h-5 transition-transform ${
                      isSidebarCollapsed ? "rotate-180" : ""
                    }`}
                  />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>

          {/* Tarjeta de perfil */}
          <Link href="/dashboard/perfil">
            <motion.div
              className={`block px-4 py-3 border-b border-[var(--card-border)] transition-all hover:bg-[var(--hover-bg)] cursor-pointer group ${
                isSidebarCollapsed ? "text-center" : ""
              }`}
              onClick={handleProfileClick}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 overflow-hidden ${
                    isSidebarCollapsed ? "mx-auto" : ""
                  }`}
                >
                  {user?.image && userImageExists ? (
                    <Image
                      src={
                        user.image.startsWith("data:image/")
                          ? user.image
                          : `${API_URL}/uploads/users/${user.image}`
                      }
                      alt="Foto de perfil"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : user?.name ? (
                    user.name[0].toUpperCase()
                  ) : (
                    "U"
                  )}
                </div>
                <div
                  className={`flex-1 min-w-0 transition-all ${
                    isSidebarCollapsed ? "hidden" : "block"
                  }`}
                >
                  <p className="font-medium text-[var(--text-primary)] truncate">
                    {user?.name || user?.email || "Usuario"}
                  </p>
                  <div className="relative h-5 min-w-[120px]">
                    <p className="text-xs text-[var(--text-secondary)] transition-all duration-200 absolute top-0 left-0 w-full group-hover:opacity-0">
                      {user?.role === "ROLE_ADMIN"
                        ? "Administrador"
                        : user?.role === "SUPERVISOR"
                        ? "Supervisor"
                        : user?.role === "POLLSTER"
                        ? "Encuestador"
                        : "Usuario"}
                    </p>
                    <p className="text-xs text-[var(--primary)] absolute top-0 left-0 w-full transition-all duration-200 opacity-0 group-hover:opacity-100">
                      Mi perfil
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>

          <nav className="sidebar-nav flex-1 flex flex-col">
            <div className="flex-1">
              {navItems.map((item, i) => {
                const Icon = item.icon;
                const fullPath = `/dashboard${
                  item.path ? `/${item.path}` : ""
                }`;
                const isActive = pathname === fullPath;

                return (
                  <Link href={fullPath} key={fullPath} className="w-full">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`nav-item ${isActive ? "active" : ""}`}
                    >
                      <div
                        className={`flex items-center ${
                          isSidebarCollapsed ? "justify-center" : "w-full"
                        }`}
                      >
                        <Icon className="nav-item-icon" />
                        <span
                          className={`nav-item-text ${
                            isSidebarCollapsed
                              ? "opacity-0 hidden"
                              : "opacity-100"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Sección inferior: Tutoriales y Cerrar Sesión */}
            <div className="mt-auto border-t border-[var(--card-border)] pt-2">
              {/* Botón Tutoriales */}
              <motion.div
                onClick={() => setIsTutorialModalOpen(true)}
                className="nav-item cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center" : "w-full"
                  }`}
                >
                  <GraduationCap className="nav-item-icon text-yellow-500" />
                  <span
                    className={`nav-item-text ${
                      isSidebarCollapsed ? "opacity-0 hidden" : "opacity-100"
                    }`}
                  >
                    Tutoriales
                  </span>
                </div>
              </motion.div>

              {/* Botón Cerrar Sesión */}
              <motion.div
                onClick={handleLogout}
                className="nav-item cursor-pointer hover:bg-red-500/10 text-red-600 dark:text-red-400"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center" : "w-full"
                  }`}
                >
                  <LogOut className="nav-item-icon" />
                  <span
                    className={`nav-item-text ${
                      isSidebarCollapsed ? "opacity-0 hidden" : "opacity-100"
                    }`}
                  >
                    Cerrar Sesión
                  </span>
                </div>
              </motion.div>
            </div>
          </nav>
        </aside>

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="main-content"
          style={
            pathname === "/dashboard/usuarios"
              ? { overflowY: "hidden", padding: 0 }
              : undefined
          }
        >
          {children}
        </motion.main>
      </div>

      {/* Modal de Tutoriales */}
      <AnimatePresence>
        {isTutorialModalOpen && (
          <>
            {/* Overlay con blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsTutorialModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--card-background)] rounded-2xl shadow-2xl z-[70] max-h-[80vh] overflow-hidden"
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    Tutoriales
                  </h2>
                </div>
                <button
                  onClick={() => setIsTutorialModalOpen(false)}
                  className="p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                {/* Tutorial de Responder Encuesta - solo en /dashboard/encuestas */}
                {pathname === "/dashboard/encuestas" &&
                user?.role === "POLLSTER" ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        console.log(
                          "🎯 [Layout] Iniciando tutorial de Responder Encuesta"
                        );
                        setIsTutorialModalOpen(false);
                        // Pequeño delay para que el modal se cierre antes
                        setTimeout(() => {
                          startTutorial();
                        }, 300);
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-white">
                            1
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                            Cómo navegar la lista de encuestas
                          </h3>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Aprende a navegar y responder encuestas
                            correctamente
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : pathname.includes("/mis-casos") &&
                  user?.role === "POLLSTER" ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setIsTutorialModalOpen(false);
                        setTimeout(() => {
                          startObserveCaseTutorial();
                        }, 300);
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-white">
                            1
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                            Cómo observar un caso
                          </h3>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Aprende a reportar casos que requieren atención del
                            supervisor
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-[var(--hover-bg)] flex items-center justify-center mx-auto mb-4">
                      <GraduationCap className="w-8 h-8 text-yellow-500" />
                    </div>
                    <p className="text-[var(--text-secondary)] mb-4">
                      No hay tutoriales disponibles para esta pantalla
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Los tutoriales aparecerán aquí según la sección donde te
                      encuentres
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <TutorialProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </TutorialProvider>
  );
}
