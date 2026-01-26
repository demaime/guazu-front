import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Mail,
  Edit,
  Save,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  FileText,
  Clock,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Globe,
} from "lucide-react";
import { userService } from "@/services/user.service";
import { toast } from "react-toastify";
import { authService } from "@/services/auth.service";

// Skeleton con shimmer
const Skeleton = ({ className = "" }) => (
  <div
    className={`bg-gradient-to-r from-[var(--card-border)] via-[var(--hover-bg)] to-[var(--card-border)] bg-[length:200%_100%] animate-shimmer ${className}`}
  />
);

export default function UserDetailModal({
  isOpen,
  onClose,
  user,
  currentUser,
  onUserUpdate,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (user) {
      setEditedUser(user);
      setIsEditing(false);
      loadUserStats(user._id);
    }
  }, [user]);

  const loadUserStats = async (userId) => {
    try {
      setLoadingStats(true);
      const userStats = await userService.getUserStats(userId);
      setStats(userStats);
    } catch (error) {
      console.error("Error loading user stats:", error);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  if (!user) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const token = authService.getToken();
      const updatedUser = await userService.updateProfile(
        editedUser._id,
        editedUser,
        token
      );
      onUserUpdate(updatedUser);
      toast.success("Usuario actualizado con éxito");
      setEditedUser(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error("Error al actualizar el usuario:", error);
      toast.error("Error al actualizar el usuario");
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit =
    currentUser?.role === "ROLE_ADMIN" || currentUser?.role === "SUPERVISOR";
  const showStats =
    currentUser?.role === "ROLE_ADMIN" || currentUser?.role === "SUPERVISOR";

  const getRoleInfo = (role) => {
    switch (role) {
      case "ROLE_ADMIN":
        return {
          label: "Administrador",
          bgColor: "bg-[var(--secondary)]",
          textColor: "text-white",
        };
      case "SUPERVISOR":
        return {
          label: "Supervisor",
          bgColor: "bg-[var(--primary)]",
          textColor: "text-white",
        };
      case "POLLSTER":
        return {
          label: "Encuestador",
          bgColor: "bg-[var(--primary-light)]",
          textColor: "text-[var(--primary-dark)]",
        };
      default:
        return {
          label: role,
          bgColor: "bg-[var(--card-border)]",
          textColor: "text-[var(--text-secondary)]",
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return "Sin actividad";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days}d`;
    if (days < 30) return `Hace ${Math.floor(days / 7)}sem`;
    return `Hace ${Math.floor(days / 30)}m`;
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return "0m";
    const mins = Math.floor(seconds / 60);
    if (mins === 0) return `${seconds}s`;
    return `${mins}m`;
  };

  const getCountryName = (code) => {
    const countries = { AR: "Argentina", PY: "Paraguay" };
    return countries[code] || code || "—";
  };

  const roleInfo = getRoleInfo(editedUser?.role);
  const isSelf = currentUser?._id === user?._id;
  const fullName = `${editedUser?.name || ""} ${editedUser?.lastName || ""}`.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--card-background)] rounded-2xl w-full max-w-4xl border border-[var(--card-border)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Avatar */}
            <div className="relative bg-gradient-to-br from-[var(--primary)]/10 via-[var(--secondary)]/5 to-transparent px-6 py-4 border-b border-[var(--card-border)]/50">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {editedUser?.image ? (
                    <img
                      src={editedUser.image}
                      alt={fullName}
                      className="w-20 h-20 rounded-xl object-cover ring-2 ring-[var(--primary)]/20 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[var(--card-border)] to-[var(--hover-bg)] flex items-center justify-center ring-2 ring-[var(--primary)]/20 shadow-md">
                      <User className="w-10 h-10 text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>

                {/* Name, Email, Role */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isEditing ? (
                      <div className="flex gap-2 flex-1">
                        <input
                          type="text"
                          name="name"
                          value={editedUser?.name || ""}
                          onChange={handleInputChange}
                          placeholder="Nombre"
                          className="flex-1 px-3 py-1.5 bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg text-lg font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        />
                        <input
                          type="text"
                          name="lastName"
                          value={editedUser?.lastName || ""}
                          onChange={handleInputChange}
                          placeholder="Apellido"
                          className="flex-1 px-3 py-1.5 bg-[var(--input-background)] border border-[var(--card-border)] rounded-lg text-lg font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        />
                      </div>
                    ) : (
                      <h2 className="text-2xl font-bold text-[var(--text-primary)] truncate">
                        {fullName || "Sin nombre"}
                      </h2>
                    )}
                    {isSelf && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold rounded-full">
                        TÚ
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <p className="text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {editedUser?.email}
                    </p>
                    {editedUser?.city && (
                      <p className="text-[var(--text-muted)] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {editedUser.city}
                        {editedUser?.province && `, ${editedUser.province}`}
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${roleInfo.bgColor} ${roleInfo.textColor}`}
                    >
                      {roleInfo.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-start gap-2 flex-shrink-0">
                  {canEdit && !isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg font-semibold transition-all text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Stats Grid */}
              {showStats && (
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Estadísticas
                  </h3>
                  {loadingStats ? (
                    <div className="grid grid-cols-4 gap-3">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-gradient-to-br from-[var(--inner-card-bg)] to-[var(--card-background)] rounded-xl p-3"
                        >
                          <Skeleton className="h-3 w-12 mb-2 rounded" />
                          <Skeleton className="h-6 w-10 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-4 gap-3">
                      {/* Casos */}
                      <div className="bg-gradient-to-br from-[var(--primary)]/5 to-transparent rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ClipboardList className="w-3.5 h-3.5 text-[var(--primary)]" />
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                            Casos
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                          {stats.totalAnswers || 0}
                        </p>
                      </div>

                      {/* Encuestas */}
                      <div className="bg-gradient-to-br from-[var(--secondary)]/5 to-transparent rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--secondary)]" />
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                            Encuestas
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                          {stats.totalSurveysParticipated || 0}
                        </p>
                      </div>

                      {/* Asignadas */}
                      <div className="bg-gradient-to-br from-[var(--primary-light)]/10 to-transparent rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-[var(--primary)]" />
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                            Asignadas
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                          {stats.totalSurveysAssigned || 0}
                        </p>
                      </div>

                      {/* Tiempo */}
                      <div className="bg-gradient-to-br from-[var(--primary)]/5 to-transparent rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                            T. Prom.
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                          {formatTime(stats.avgTimePerSurvey)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Information */}
              <div>
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Información
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[var(--inner-card-bg)] rounded-lg flex-shrink-0">
                      <Mail className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-medium uppercase">
                        Email
                      </p>
                      {isEditing && currentUser?.role === "ROLE_ADMIN" ? (
                        <input
                          type="email"
                          name="email"
                          value={editedUser?.email || ""}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1 bg-[var(--input-background)] border border-[var(--card-border)] rounded text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {editedUser?.email || "—"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[var(--inner-card-bg)] rounded-lg flex-shrink-0">
                      <Phone className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-medium uppercase">
                        Teléfono
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          name="cellular"
                          value={editedUser?.cellular || ""}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1 bg-[var(--input-background)] border border-[var(--card-border)] rounded text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {editedUser?.cellular || "—"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Document */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[var(--inner-card-bg)] rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-medium uppercase">
                        Documento
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          name="documentNumber"
                          value={
                            editedUser?.documentNumber ||
                            editedUser?.dni ||
                            ""
                          }
                          onChange={handleInputChange}
                          className="w-full px-2 py-1 bg-[var(--input-background)] border border-[var(--card-border)] rounded text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {editedUser?.documentNumber ||
                            editedUser?.dni ||
                            "—"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Country */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[var(--inner-card-bg)] rounded-lg flex-shrink-0">
                      <Globe className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-medium uppercase">
                        País
                      </p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {getCountryName(editedUser?.country)}
                      </p>
                    </div>
                  </div>

                  {/* Job */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[var(--inner-card-bg)] rounded-lg flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-medium uppercase">
                        Ocupación
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          name="job"
                          value={editedUser?.job || ""}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1 bg-[var(--input-background)] border border-[var(--card-border)] rounded text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {editedUser?.job || "—"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Studies */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[var(--inner-card-bg)] rounded-lg flex-shrink-0">
                      <GraduationCap className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-medium uppercase">
                        Estudios
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          name="study"
                          value={editedUser?.study || ""}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1 bg-[var(--input-background)] border border-[var(--card-border)] rounded text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {editedUser?.study || "—"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[var(--hover-bg)]/30 border-t border-[var(--card-border)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Registrado: {formatDate(stats?.registeredAt || editedUser?.createdAt)}
                </span>
              </div>

              {isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedUser(user);
                    }}
                    className="px-4 py-2 bg-[var(--card-border)] hover:bg-[var(--card-border)]/80 text-[var(--text-primary)] rounded-lg font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
