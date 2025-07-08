"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { userService } from "@/services/user.service";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Loader } from "@/components/ui/Loader";
import { User, Mail, Phone, MapPin } from "lucide-react";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";

export default function PerfilPage() {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    addressNumber: "",
    addressUnity: "",
    birthDate: "",
    cellular: "",
    city: "",
    dni: "",
    job: "",
    province: "",
    section: "",
    study: "",
    workHistory: "",
    aboutSurvey: "",
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (originalFormData) {
      const hasChanges = Object.keys(formData).some((key) => {
        const originalValue = String(originalFormData[key] || "");
        const currentValue = String(formData[key] || "");
        return originalValue !== currentValue;
      });
      setHasUnsavedChanges(hasChanges || selectedImage !== null);
    }
  }, [formData, originalFormData, selectedImage]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleNavigation = (url) => {
    if (hasUnsavedChanges) {
      if (confirm("Hay cambios sin guardar. ¿Deseas descartarlos?")) {
        router.push(url);
      }
    } else {
      router.push(url);
    }
  };

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const token = authService.getToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        const userData = authService.getUser();

        if (!userData) {
          router.replace("/login");
          return;
        }

        try {
          const updatedUser = await userService.getProfile(userData._id, token);
          setUser(updatedUser);
          const initialFormData = {
            name: updatedUser?.name || "",
            lastName: updatedUser?.lastName || "",
            email: updatedUser?.email || "",
            phone: updatedUser?.phone || "",
            address: updatedUser?.address || "",
            addressNumber: updatedUser?.addressNumber || "",
            addressUnity: updatedUser?.addressUnity || "",
            birthDate: updatedUser?.birthDate || "",
            cellular: updatedUser?.cellular || "",
            city: updatedUser?.city || "",
            dni: updatedUser?.dni || "",
            job: updatedUser?.job || "",
            province: updatedUser?.province || "",
            section: updatedUser?.section || "",
            study: updatedUser?.study || "",
            workHistory: updatedUser?.workHistory || "",
            aboutSurvey: updatedUser?.aboutSurvey || "",
          };
          setFormData(initialFormData);
          setOriginalFormData(initialFormData);
        } catch (error) {
          setError(error.message || "Error al cargar los datos del usuario");
          const initialFormData = {
            name: userData?.name || "",
            lastName: userData?.lastName || "",
            email: userData?.email || "",
            phone: userData?.phone || "",
            address: userData?.address || "",
            addressNumber: userData?.addressNumber || "",
            addressUnity: userData?.addressUnity || "",
            birthDate: userData?.birthDate || "",
            cellular: userData?.cellular || "",
            city: userData?.city || "",
            dni: userData?.dni || "",
            job: userData?.job || "",
            province: userData?.province || "",
            section: userData?.section || "",
            study: userData?.study || "",
            workHistory: userData?.workHistory || "",
            aboutSurvey: userData?.aboutSurvey || "",
          };
          setFormData(initialFormData);
          setOriginalFormData(initialFormData);
        }
      } catch (error) {
        setError("Error al inicializar el usuario");
      } finally {
        setIsInitializing(false);
      }
    };

    initializeUser();
  }, []);

  const isFieldEditable = (fieldName) => {
    if (!user?.editableFields) return false;
    return (
      user.editableFields.includes("all") ||
      user.editableFields.includes(fieldName)
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    setShowConfirmModal(true);
    setModalAction("save");
  };

  const handleCancel = () => {
    setShowConfirmModal(true);
    setModalAction("cancel");
  };

  const handleModalConfirm = async () => {
    if (modalAction === "save") {
      await handleSubmit();
    } else if (modalAction === "cancel") {
      setFormData(originalFormData);
      setSelectedImage(null);
      setHasUnsavedChanges(false);
    }
    setShowConfirmModal(false);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const token = authService.getToken();
      const userId = user._id;

      if (selectedImage) {
        await userService.updateImage(userId, selectedImage, token);
      }

      await userService.updateProfile(userId, formData, token);
      setSuccessMessage("Perfil actualizado correctamente");
      setOriginalFormData(formData);
      setSelectedImage(null);
      setHasUnsavedChanges(false);

      const updatedUser = authService.getUser();
      setUser(updatedUser);
    } catch (err) {
      setError(err.message || "Error al actualizar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (fieldName, label, type = "text") => {
    const isEditable = isFieldEditable(fieldName);
    return (
      <div className="space-y-1">
        <label
          htmlFor={fieldName}
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          {label}
          {!isEditable && (
            <span className="ml-2 text-xs text-[var(--text-secondary)] opacity-70">
              (Solo lectura)
            </span>
          )}
        </label>
        <input
          type={type}
          id={fieldName}
          name={fieldName}
          value={formData[fieldName] || ""}
          onChange={handleChange}
          disabled={!isEditable}
          className={`mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm ${
            !isEditable ? "opacity-70 cursor-not-allowed" : ""
          }`}
        />
      </div>
    );
  };

  const handlePhotoUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (isInitializing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center"
      >
        <Loader size="xl" className="text-primary" />
      </motion.div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-[var(--text-primary)]">
          Mi Perfil
        </h1>

        {/* Sección de foto de perfil */}
        <div className="bg-[var(--card-background)] rounded-lg p-6 mb-8 shadow-sm border border-[var(--card-border)]">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
            Foto de Perfil
          </h2>
          <ProfilePhotoUpload
            currentUser={user}
            onPhotoUpdate={handlePhotoUpdate}
          />
        </div>

        {/* Sección de información personal */}
        <div className="bg-[var(--card-background)] rounded-lg p-6 shadow-sm border border-[var(--card-border)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Información Personal
            </h2>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-[var(--input-background)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)]"
            >
              {isEditing ? "Cancelar" : "Editar"}
            </motion.button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Nombre
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  ) : (
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-[var(--text-secondary)] mr-2" />
                      <span className="text-[var(--text-primary)]">
                        {user.name}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Apellido
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  ) : (
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-[var(--text-secondary)] mr-2" />
                      <span className="text-[var(--text-primary)]">
                        {user.lastName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                ) : (
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-[var(--text-secondary)] mr-2" />
                    <span className="text-[var(--text-primary)]">
                      {user.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Teléfono
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.cellular}
                    onChange={(e) =>
                      setFormData({ ...formData, cellular: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                ) : (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-[var(--text-secondary)] mr-2" />
                    <span className="text-[var(--text-primary)]">
                      {user.cellular || "No especificado"}
                    </span>
                  </div>
                )}
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Dirección
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                ) : (
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-[var(--text-secondary)] mr-2" />
                    <span className="text-[var(--text-primary)]">
                      {user.address || "No especificada"}
                    </span>
                  </div>
                )}
              </div>

              {/* Botón de guardar */}
              {isEditing && (
                <div className="flex justify-end">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
                  >
                    Guardar Cambios
                  </motion.button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Modal de confirmación */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {modalAction === "save"
                  ? "¿Guardar cambios?"
                  : "¿Descartar cambios?"}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {modalAction === "save"
                  ? "¿Estás seguro de que deseas guardar los cambios realizados?"
                  : "¿Estás seguro de que deseas descartar los cambios realizados?"}
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleModalConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
