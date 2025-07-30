"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { authService } from "@/services/auth.service";
import { userService } from "@/services/user.service";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Mail,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  MapPin,
  LayoutGrid,
  List,
} from "lucide-react";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import UserCard from "@/components/ui/UserCard";
import { HighlightText } from "@/components/ui/HighlightText";
import UserDetailModal from "@/components/ui/UserDetailModal";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState("card"); // 'table' or 'card'
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const loadUsers = useCallback(async () => {
    if (isLoadingUsers) return; // Evitar múltiples llamadas simultáneas

    try {
      setIsLoadingUsers(true);
      const { users, totalCount } = await userService.getAllUsers();
      setUsers(users);
      setTotalCount(totalCount);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      // Si hay error de autenticación, redirigir al login
      if (
        error.message?.includes("401") ||
        error.message?.includes("unauthorized")
      ) {
        authService.logout();
        router.push("/login");
        return;
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isLoadingUsers, router]);

  useEffect(() => {
    const initializePage = async () => {
      if (hasInitialized) return;

      setIsLoading(true);

      try {
        // Verificar autenticación
        if (!authService.isAuthenticated()) {
          router.push("/login");
          return;
        }

        const user = authService.getUser();

        // Verificar permisos
        if (user?.role !== "ROLE_ADMIN" && user?.role !== "SUPERVISOR") {
          router.push("/dashboard");
          return;
        }

        setCurrentUser(user);
        setHasInitialized(true);

        // Cargar usuarios solo después de verificar permisos
        await loadUsers();
      } catch (error) {
        console.error("Error inicializando página:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, [hasInitialized, loadUsers, router]);

  // Filtrar usuarios por el campo seleccionado
  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
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

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleOpenModal = useCallback((user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUser(null);
  }, []);

  const handleUserUpdate = useCallback((updatedUser) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user._id === updatedUser._id ? updatedUser : user
      )
    );
  }, []);

  const getRoleName = (role) => {
    switch (role) {
      case "ROLE_ADMIN":
        return "Administrador";
      case "SUPERVISOR":
        return "Supervisor";
      case "POLLSTER":
        return "Encuestador";
      default:
        return role;
    }
  };

  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2,
        when: "beforeChildren",
        staggerChildren: 0.03,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.15 },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.15 },
    },
    exit: {
      opacity: 0,
      x: 10,
      transition: { duration: 0.15 },
    },
  };

  if (isLoading) {
    return <LoaderWrapper fullScreen />;
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] px-5 py-4 shadow-sm sm:px-6 flex-1 flex flex-col overflow-hidden">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold leading-6 text-[var(--text-primary)]">
                Listado de Usuarios
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido o email..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="rounded-md border border-[var(--card-border)] bg-[var(--card-background)] w-64 pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <div className="flex items-center gap-1 p-1 rounded-md bg-[var(--card-border)]">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "table"
                      ? "bg-primary text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  }`}
                  aria-label="Vista de tabla"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "card"
                      ? "bg-primary text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  }`}
                  aria-label="Vista de tarjetas"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {viewMode === "table" ? (
              <motion.div
                key="table-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-full inline-block align-middle"
              >
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-[var(--card-border)]">
                    <thead className="bg-[var(--card-background)] sticky top-0">
                      <tr>
                        <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[20%]">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Nombre</span>
                          </div>
                        </th>
                        <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[20%]">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Apellido</span>
                          </div>
                        </th>
                        <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[30%]">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Email</span>
                          </div>
                        </th>
                        <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[15%]">
                          <div className="flex items-center gap-2">
                            {currentUser?.role === "SUPERVISOR" ? (
                              <>
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">Ciudad</span>
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">Rol</span>
                              </>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[15%]">
                          <span className="truncate">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <AnimatePresence>
                      <motion.tbody
                        key={currentPage}
                        variants={tableVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="divide-y divide-[var(--card-border)] bg-[var(--card-background)]"
                      >
                        {currentUsers.map((user) => (
                          <motion.tr
                            key={user._id}
                            variants={rowVariants}
                            className="table-row-hover"
                          >
                            <td className="px-6 py-3 text-sm text-[var(--text-primary)] truncate max-w-0">
                              <HighlightText
                                text={user.name}
                                highlight={searchTerm}
                              />
                            </td>
                            <td className="px-6 py-3 text-sm text-[var(--text-primary)] truncate max-w-0">
                              <HighlightText
                                text={user.lastName}
                                highlight={searchTerm}
                              />
                            </td>
                            <td className="px-6 py-3 text-sm text-[var(--text-primary)] truncate max-w-0">
                              <HighlightText
                                text={user.email}
                                highlight={searchTerm}
                              />
                            </td>
                            <td className="px-6 py-3 text-sm text-[var(--text-primary)] truncate max-w-0">
                              {currentUser?.role === "SUPERVISOR"
                                ? user.city
                                : getRoleName(user.role)}
                            </td>
                            <td className="px-6 py-3 text-sm whitespace-nowrap">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="link-action"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenModal(user);
                                }}
                              >
                                Ver detalles
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </AnimatePresence>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="card-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-1"
              >
                {currentUsers.map((user) => (
                  <UserCard
                    key={user._id}
                    user={user}
                    currentUser={currentUser}
                    highlightTerm={searchTerm}
                    onCardClick={() => handleOpenModal(user)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Paginación */}
        {filteredUsers.length > 0 && (
          <div className="mt-4 py-3 border-t border-[var(--card-border)]">
            <nav className="flex items-center justify-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-hover)] flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </motion.button>

              {currentPage > 3 && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-1 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
                  >
                    1
                  </motion.button>
                  <span className="px-2 text-[var(--text-secondary)]">...</span>
                </>
              )}

              {getPageNumbers().map((pageNum) => (
                <motion.button
                  key={pageNum}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 rounded-md text-sm cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-primary text-white"
                      : "bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
                  }`}
                >
                  {pageNum}
                </motion.button>
              ))}

              {currentPage < totalPages - 2 && (
                <>
                  <span className="px-2 text-[var(--text-secondary)]">...</span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-1 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
                  >
                    {totalPages}
                  </motion.button>
                </>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-hover)] flex items-center gap-1"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </nav>
          </div>
        )}
      </div>
      <UserDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        user={selectedUser}
        currentUser={currentUser}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
}
