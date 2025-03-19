'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Loader } from '@/components/ui/Loader';
import { Menu, X, ChevronLeft, ChevronRight, Home, ClipboardList, Users, LogOut, LayoutGrid } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      const user = authService.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const navItems = [
    { path: '/dashboard', label: 'Inicio', icon: Home },
    { path: '/dashboard/encuestas', label: 'Encuestas', icon: ClipboardList },
    { path: '/dashboard/usuarios', label: 'Usuarios', icon: Users },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="xl" className="text-blue-600" />
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-wrapper">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold leading-6 text-gray-900 bg-primary">Dashboard</h1>
            <button
              onClick={() => {
                authService.logout();
                router.replace('/login');
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="main-wrapper">
        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="sidebar-overlay fade-in"
            onClick={toggleSidebar}
          />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'mobile-open' : 'mobile-closed'}`}>
          <div className="sidebar-header">
            <div className="flex items-center gap-2">
              <LayoutGrid className={`w-6 h-6 text-blue-600 ${!isSidebarCollapsed ? 'mr-2' : ''}`} />
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
                className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`nav-item ${currentPath === item.path ? 'active' : ''}`}
                >
                  <Icon className="nav-item-icon" />
                  <span className={`nav-item-text ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                    {item.label}
                  </span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {children}
        </main>

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
} 