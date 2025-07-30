import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Mail,
  Shield,
  MapPin,
  Edit,
  Save,
  Camera,
  Loader,
} from "lucide-react";
import { userService } from "@/services/user.service";
import { toast } from "react-toastify";
import { authService } from "@/services/auth.service";
import UserAvatar from "./UserAvatar";

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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Use the user data directly instead of fetching again
      setEditedUser(user);
      setIsEditing(false); // Reset edit state when user changes
    }
  }, [user]);

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
      onUserUpdate(updatedUser); // Callback to update the list
      toast.success("Usuario actualizado con éxito");
      setEditedUser(updatedUser); // Update local state with the saved user
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

  const getRoleName = (role) => {
    const roles = {
      ROLE_ADMIN: "Administrador",
      SUPERVISOR: "Supervisor",
      POLLSTER: "Encuestador",
    };
    return roles[role] || role;
  };

  const renderField = (label, value, fieldName, Icon, editable = true) => (
    <div>
      <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </label>
      {isEditing && editable ? (
        <input
          type="text"
          name={fieldName}
          value={editedUser[fieldName] || ""}
          onChange={handleInputChange}
          className="mt-1 w-full px-3 py-2 bg-[var(--input-background)] border border-[var(--card-border)] rounded-md text-[var(--text-primary)] focus:ring-primary focus:border-primary"
        />
      ) : (
        <p className="mt-1 text-lg text-[var(--text-primary)]">{value}</p>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[var(--card-background)] rounded-2xl shadow-xl w-full max-w-2xl border border-[var(--card-border)] flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--card-border)] flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Detalles del Usuario
              </h2>
              <div className="flex items-center gap-2">
                {canEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-[var(--hover-bg)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader className="w-10 h-10 text-primary" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <UserAvatar
                        src={editedUser?.image}
                        alt={`Foto de ${editedUser?.name}`}
                        size="2xl"
                        className="border-4 border-primary"
                      />
                      {isEditing && (
                        <button className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full hover:bg-primary/80 transition-colors">
                          <Camera className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      {renderField("Nombre", editedUser?.name, "name", User)}
                      {renderField(
                        "Apellido",
                        editedUser?.lastName,
                        "lastName",
                        User
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderField(
                      "Email",
                      editedUser?.email,
                      "email",
                      Mail,
                      currentUser?.role === "ROLE_ADMIN"
                    )}
                    {renderField(
                      "Ciudad",
                      editedUser?.city || "No especificada",
                      "city",
                      MapPin
                    )}
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Rol
                      </label>
                      {isEditing && currentUser?.role === "ROLE_ADMIN" ? (
                        <select
                          name="role"
                          value={editedUser?.role}
                          onChange={handleInputChange}
                          className="mt-1 w-full px-3 py-2 bg-[var(--input-background)] border border-[var(--card-border)] rounded-md text-[var(--text-primary)] focus:ring-primary focus:border-primary"
                        >
                          <option value="POLLSTER">Encuestador</option>
                          <option value="SUPERVISOR">Supervisor</option>
                          <option value="ROLE_ADMIN">Administrador</option>
                        </select>
                      ) : (
                        <p className="mt-1 text-lg text-[var(--text-primary)]">
                          {getRoleName(editedUser?.role)}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {isEditing && !isLoading && (
              <div className="p-4 border-t border-[var(--card-border)] flex justify-end items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
