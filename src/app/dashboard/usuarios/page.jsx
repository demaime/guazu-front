"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  const [itemsPerPage, setItemsPerPage] = useState(20);
  // Refs para calcular items por página y evitar scroll
  const gridRef = useRef(null);
  const paginationRef = useRef(null);

  // Calcular dinámicamente columnas por breakpoint
  const getNumColumns = () => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    if (w >= 1536) return 4; // 2xl
    if (w >= 1280) return 3; // xl
    if (w >= 768) return 2; // md
    return 1;
  };

  // Recalcular items por página según alto disponible y altura de card
  const recalcItemsPerPage = useCallback(() => {
    try {
      if (!gridRef.current) return;
      const top = gridRef.current.getBoundingClientRect().top;
      const viewportH = window.innerHeight || 0;
      const paginationH =
        paginationRef.current?.getBoundingClientRect()?.height || 72;
      const bottomPadding = 0;
      const available = Math.max(
        0,
        viewportH - top - paginationH - bottomPadding
      );

      const columns = getNumColumns();
      const cardHeight = 140; // altura fija del contenedor de cada card
      const rowGap = 20; // coincide con gap-5
      const rowHeight = cardHeight + rowGap;
      const rows = Math.max(1, Math.floor((available + rowGap) / rowHeight));
      const next = Math.max(1, rows * columns);
      setItemsPerPage((prev) => (prev !== next ? next : prev));
    } catch {}
  }, []);

  useEffect(() => {
    recalcItemsPerPage();
    window.addEventListener("resize", recalcItemsPerPage);
    return () => window.removeEventListener("resize", recalcItemsPerPage);
  }, [recalcItemsPerPage]);

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
          router.push("/dashboard/encuestas");
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

  // Recalcular cuando cambian la vista o la cantidad filtrada
  useEffect(() => {
    recalcItemsPerPage();
  }, [recalcItemsPerPage, viewMode, filteredUsers.length]);

  // Calcular índices para la paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Ajustar página actual si cambia itemsPerPage o el filtro reduce totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [itemsPerPage, filteredUsers.length, totalPages, currentPage]);

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
    return (
      <div className="p-4 h-[calc(100vh-64px)] flex items-center justify-center">
        <LoaderWrapper size="lg" fullScreen={false} text="Cargando usuarios…" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden p-2 sm:p-4">
      <div className="flex-1 flex flex-col overflow-hidden p-0">
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold leading-6 text-[var(--text-primary)]">
                Listado de Usuarios
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido o email..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="rounded-md border border-[var(--card-border)] bg-[var(--card-background)] w-full sm:w-80 md:w-96 pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <div className="flex items-center justify-center gap-1 p-1 rounded-md bg-[var(--card-border)] flex-shrink-0">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-md transition-colors ${
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
                  className={`p-2 rounded-md transition-colors ${
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

        <div className="overflow-hidden px-1 sm:px-2">
          <AnimatePresence mode="wait">
            {viewMode === "table" ? (
              <motion.div
                key="table-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-full inline-block align-middle"
              >
                <div className="overflow-x-auto">
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
                initial="hidden"
                animate="visible"
                exit="hidden"
                ref={gridRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 p-0"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.1,
                    },
                  },
                }}
              >
                {currentUsers.map((user, index) => (
                  <motion.div
                    key={user._id}
                    className="overflow-hidden"
                    variants={{
                      hidden: {
                        opacity: 0,
                        filter: "blur(2px)",
                        y: 20,
                      },
                      visible: {
                        opacity: 1,
                        filter: "blur(0px)",
                        y: 0,
                        transition: {
                          duration: 0.4,
                          ease: "easeOut",
                        },
                      },
                    }}
                  >
                    <UserCard
                      user={user}
                      currentUser={currentUser}
                      highlightTerm={searchTerm}
                      onCardClick={() => handleOpenModal(user)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Paginación */}
        {filteredUsers.length > 0 && (
          <div
            ref={paginationRef}
            className="mt-2 py-2 border-t border-[var(--card-border)]"
          >
            <nav className="flex items-center justify-center gap-1 sm:gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-hover)] flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
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
                  className={`px-3 py-2 rounded-md text-sm cursor-pointer min-w-[40px] ${
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
                className="px-3 py-2 rounded-md text-sm bg-[var(--card-background)] border border-[var(--card-border)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-hover)] flex items-center gap-1"
              >
                <span className="hidden sm:inline">Siguiente</span>
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
