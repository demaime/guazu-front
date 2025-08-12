"use client";

import { useState, useEffect } from "react";
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
  MapPin,
  X,
  Star,
  Phone,
  MessageSquare,
  Calendar,
  Award,
  Trophy,
  Target,
  Clock,
} from "lucide-react";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

// Coordenadas de ciudades comunes
const CITY_COORDINATES = {
  "Santa Fe": { lat: -31.6333, lng: -60.7 },
  Encarnación: { lat: -27.3367, lng: -55.8661 },
  Posadas: { lat: -27.3667, lng: -55.8968 },
};

export default function PollstersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterField, setFilterField] = useState("email");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPollster, setSelectedPollster] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadPollsters = async () => {
    try {
      setIsLoading(true);
      const { users: pollsters, totalCount } = await userService.getPollsters();
      setUsers(pollsters || []);
      setTotalCount(totalCount || 0);
    } catch (error) {
      console.error("Error cargando encuestadores:", error);
      setUsers([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getUser();
    setCurrentUser(user);
    if (user?.role !== "ROLE_ADMIN" && user?.role !== "SUPERVISOR") {
      router.push("/dashboard/encuestas");
      return;
    }
    loadPollsters();
  }, [router]);

  useEffect(() => {
    if (selectedPollster?.city) {
      const coordinates = CITY_COORDINATES[selectedPollster.city];
      if (coordinates) {
        setMapCoordinates(coordinates);
      }
    }
  }, [selectedPollster]);

  // Filtrar usuarios por el campo seleccionado
  const filteredUsers =
    users?.filter((user) => {
      if (!user || !user[filterField]) return false;
      const fieldValue = user[filterField].toString().toLowerCase();
      const searchValue = searchTerm.toLowerCase();
      return fieldValue.includes(searchValue);
    }) || [];

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

  const handleFilterFieldChange = (event) => {
    setFilterField(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
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
    return <LoaderWrapper />;
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="rounded-lg bg-[var(--card-background)] border border-[var(--card-border)] px-5 py-4 shadow-sm sm:px-6 flex-1 flex flex-col overflow-hidden">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold leading-6 text-[var(--text-primary)]">
                Listado de Encuestadores
              </h2>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={filterField}
                  onChange={handleFilterFieldChange}
                  className="rounded-md border border-[var(--card-border)] bg-[var(--card-background)] pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="name">Nombre</option>
                  <option value="lastName">Apellido</option>
                  <option value="email">Email</option>
                </select>
                <User className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Buscar por ${
                    filterField === "name"
                      ? "Nombre"
                      : filterField === "lastName"
                      ? "Apellido"
                      : "e-mail"
                  }`}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="rounded-md border border-[var(--card-border)] bg-[var(--card-background)] pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="min-w-full inline-block align-middle">
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
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Ciudad</span>
                      </div>
                    </th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[15%]">
                      <span className="truncate">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <AnimatePresence mode="wait">
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
                          {user.name}
                        </td>
                        <td className="px-6 py-3 text-sm text-[var(--text-primary)] truncate max-w-0">
                          {user.lastName}
                        </td>
                        <td className="px-6 py-3 text-sm text-[var(--text-primary)] truncate max-w-0">
                          {user.email}
                        </td>
                        <td className="px-6 py-3 text-sm text-[var(--text-primary)] truncate max-w-0">
                          {user.city}
                        </td>
                        <td className="px-6 py-3 text-sm whitespace-nowrap">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-dark transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPollster(user);
                              setIsModalOpen(true);
                            }}
                          >
                            <User className="w-4 h-4" />
                            Ver detalles
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </AnimatePresence>
              </table>
            </div>
          </div>
        </div>

        {/* Paginación */}
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
      </div>

      {/* Modal de detalles del encuestador */}
      <AnimatePresence>
        {isModalOpen && selectedPollster && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-background)] rounded-lg w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Detalles del Encuestador
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-[var(--card-hover)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex flex-col gap-6">
                  {/* Header con foto y datos principales */}
                  <div className="flex gap-6">
                    <div className="w-32 h-32 rounded-full bg-[var(--card-hover)] flex items-center justify-center flex-shrink-0">
                      <User className="w-16 h-16 text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
                        {selectedPollster.name} {selectedPollster.lastName}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= 2.8
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-lg text-[var(--text-secondary)]">
                          2.8
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Información Personal */}
                  <div className="bg-[var(--card-hover)] rounded-lg p-4">
                    <h4 className="text-lg font-medium text-[var(--text-primary)] mb-4">
                      Información Personal
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-[var(--text-secondary)]" />
                        <span className="text-[var(--text-primary)]">
                          {selectedPollster.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-[var(--text-secondary)]" />
                        <span className="text-[var(--text-primary)]">
                          {selectedPollster.phone || "No especificado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-[var(--text-secondary)]" />
                        <span className="text-[var(--text-primary)]">
                          {selectedPollster.city || "No especificada"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[var(--text-secondary)]" />
                        <span className="text-[var(--text-primary)]">
                          Miembro desde{" "}
                          {new Date(
                            selectedPollster.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Logros */}
                  <div className="flex flex-col gap-3">
                    <h4 className="text-lg font-medium text-[var(--text-primary)]">
                      Logros
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-[var(--card-hover)] p-4 rounded-lg flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Trophy className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h5 className="text-base font-medium text-[var(--text-primary)]">
                            Encuestador Experto
                          </h5>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Completó más de 100 encuestas
                          </p>
                        </div>
                      </div>
                      <div className="bg-[var(--card-hover)] p-4 rounded-lg flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Target className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h5 className="text-base font-medium text-[var(--text-primary)]">
                            Precisión Perfecta
                          </h5>
                          <p className="text-sm text-[var(--text-secondary)]">
                            95% de respuestas completas
                          </p>
                        </div>
                      </div>
                      <div className="bg-[var(--card-hover)] p-4 rounded-lg flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h5 className="text-base font-medium text-[var(--text-primary)]">
                            Velocidad Suprema
                          </h5>
                          <p className="text-sm text-[var(--text-secondary)]">
                            15 encuestas en un día
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer del modal con botones */}
              <div className="p-4 mt-auto border-t border-[var(--card-border)] flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-[var(--card-hover)] text-[var(--text-primary)] py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[var(--card-border)] transition-colors"
                  onClick={() => {
                    // Aquí implementaremos la lógica para ver ubicaciones
                    console.log("Ver ubicaciones");
                  }}
                >
                  <MapPin className="w-5 h-5" />
                  Ver ubicaciones
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-primary text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
                  onClick={() => {
                    // Aquí implementaremos la lógica de contacto
                    setIsModalOpen(false);
                  }}
                >
                  <MessageSquare className="w-5 h-5" />
                  Contactar para mi encuesta
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
