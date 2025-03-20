'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/services/auth.service';

const getRoleName = (role) => {
  switch (role) {
    case 'ROLE_ADMIN':
      return 'Administrador';
    case 'SUPERVISOR':
      return 'Supervisor';
    case 'POLLSTER':
      return 'Encuestador';
    default:
      return '';
  }
};

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = authService.getUser();
    setUser(userData);
  }, []);

  return (
    <div>
      <div className="rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] px-5 py-6 shadow-sm sm:px-6">
        <div className="mb-8">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold leading-6 text-[var(--text-primary)]">
              Bienvenido {user?.name || user?.email}
            </h2>
            <span className="text-sm text-[var(--text-secondary)]">
              - {getRoleName(user?.role)}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Panel de control de Guazú - Sistema de Encuestas
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card de Encuestas */}
          <div className="overflow-hidden rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75a.75.75 0 000-1.5h-.75a.75.75 0 01-.75-.75V6.108c0-.369.303-.678.67-.696.387-.02.774-.04 1.158-.06" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-[var(--text-secondary)]">Encuestas Activas</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">0</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-primary px-5 py-3">
              <div className="text-sm">
                <a href="/dashboard/encuestas" className="font-medium text-white hover:text-gray-100">
                  Ver todas
                </a>
              </div>
            </div>
          </div>

          {/* Card de Usuarios */}
          <div className="overflow-hidden rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-[var(--text-secondary)]">Usuarios Registrados</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">0</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-primary px-5 py-3">
              <div className="text-sm">
                <a href="/dashboard/usuarios" className="font-medium text-white hover:text-gray-100">
                  Ver todos
                </a>
              </div>
            </div>
          </div>

          {/* Card de Respuestas */}
          <div className="overflow-hidden rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-[var(--text-secondary)]">Total de Respuestas</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">0</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-primary px-5 py-3">
              <div className="text-sm">
                <a href="/dashboard/encuestas" className="font-medium text-white hover:text-gray-100">
                  Ver detalles
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 