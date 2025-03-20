'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';

export default function Usuarios() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const userData = authService.getUser();
    setUser(userData);
  }, []);

  // Renderizar contenido según el rol
  const renderContent = () => {
    if (!user) return null;

    if (user.role === 'ROLE_ADMIN') {
      return (
        <>
          <h1 className="text-3xl font-bold mb-6 text-[var(--text-primary)]">Gestión de Usuarios</h1>
          <div className="grid gap-4">
            {/* Lista de todos los usuarios */}
            <div className="p-4 rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] hover:bg-[var(--card-background-hover)] transition-all">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Todos los Usuarios</h2>
                <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors">
                  Nuevo Usuario
                </button>
              </div>
              {/* Aquí irá la tabla de usuarios */}
            </div>
          </div>
        </>
      );
    }

    if (user.role === 'SUPERVISOR') {
      return (
        <>
          <h1 className="text-3xl font-bold mb-6 text-[var(--text-primary)]">Encuestadores</h1>
          <div className="grid gap-4">
            {/* Lista de encuestadores */}
            <div className="p-4 rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] hover:bg-[var(--card-background-hover)] transition-all">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Lista de Encuestadores</h2>
              {/* Aquí irá la lista de encuestadores */}
            </div>
          </div>
        </>
      );
    }

    // POLLSTER no debería ver esta página
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Acceso Denegado</h1>
        <p className="text-[var(--text-secondary)] mt-2">No tienes permisos para ver esta página.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8">
      <div className="rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] px-5 py-6 shadow-sm">
        {renderContent()}
      </div>
    </div>
  );
} 