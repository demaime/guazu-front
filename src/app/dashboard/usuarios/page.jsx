'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('email');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const { users, totalCount } = await userService.getAllUsers();
      setUsers(users);
      setTotalCount(totalCount);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getUser();
    if (user?.role !== 'ROLE_ADMIN' && user?.role !== 'SUPERVISOR') {
      router.push('/dashboard');
      return;
    }
    loadUsers();
  }, [router]);

  // Filtrar usuarios por el campo seleccionado
  const filteredUsers = users.filter(user =>
    user[filterField].toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular índices para la paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Función auxiliar para generar el rango de páginas a mostrar
  const getPageNumbers = () => {
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - 4);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleFilterFieldChange = (event) => {
    setFilterField(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'Administrador';
      case 'SUPERVISOR':
        return 'Supervisor';
      case 'POLLSTER':
        return 'Encuestador';
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center">
          <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            <span className="inline-block animate-bounce">.</span>
            <span className="inline-block animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
            <span className="inline-block animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] px-5 py-4 shadow-sm sm:px-6 flex-1 flex flex-col overflow-hidden">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold leading-6 text-[var(--text-primary)]">
              Listado de Usuarios
            </h2>
            <div className="flex gap-4">
              <select
                value={filterField}
                onChange={handleFilterFieldChange}
                className="rounded-md border border-[var(--card-border)] bg-[var(--card-background)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="name">Nombre</option>
                <option value="lastName">Apellido</option>
                <option value="email">Email</option>
              </select>
              <input
                type="text"
                placeholder={`Buscar por ${filterField === 'name' ? 'Nombre' : filterField === 'lastName' ? 'Apellido' : 'e-mail'}`}
                value={searchTerm}
                onChange={handleSearchChange}
                className="rounded-md border border-[var(--card-border)] bg-[var(--card-background)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-[var(--card-border)]">
            <thead className="bg-[var(--card-background)] sticky top-0">
              <tr>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Apellido
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)] bg-[var(--card-background)]">
              {currentUsers.map((user) => (
                <tr key={user._id} className="hover:bg-[var(--card-hover)]">
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    {user.name}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    {user.lastName}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    {user.email}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    {getRoleName(user.role)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm">
                    <button
                      onClick={() => router.push(`/dashboard/usuarios/${user._id}`)}
                      className="text-primary hover:text-primary/80"
                    >
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="mt-4 py-3 border-t border-[var(--card-border)]">
          <nav className="flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-hover)]"
            >
              Anterior
            </button>

            {currentPage > 3 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  className="px-3 py-1 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
                >
                  1
                </button>
                <span className="px-2 text-[var(--text-secondary)]">...</span>
              </>
            )}

            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-3 py-1 rounded-md text-sm ${
                  currentPage === pageNum
                    ? 'bg-primary text-white'
                    : 'bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
                }`}
              >
                {pageNum}
              </button>
            ))}

            {currentPage < totalPages - 2 && (
              <>
                <span className="px-2 text-[var(--text-secondary)]">...</span>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="px-3 py-1 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-hover)]"
            >
              Siguiente
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
} 