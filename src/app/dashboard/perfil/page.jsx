"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { userService, updateUserProfile } from "@/services/user.service";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Loader } from "@/components/ui/Loader";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { User, Mail, Phone, MapPin, WifiOff } from "lucide-react";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { toast } from "react-toastify";

export default function PerfilPage() {
  const router = useRouter();
  const { isOnline, isOffline } = useNetworkStatus();
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

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imageBase64, setImageBase64] = useState(null);

  // Estados para modales
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState("");

  useEffect(() => {
    if (originalFormData) {
      const hasDataChanges = Object.keys(formData).some((key) => {
        const originalValue = String(originalFormData[key] || "");
        const currentValue = String(formData[key] || "");
        return originalValue !== currentValue;
      });
      const hasImageChanges = imageBase64 !== null;
      setHasUnsavedChanges(hasDataChanges || hasImageChanges || isEditing);
    }
  }, [formData, originalFormData, imageBase64, isEditing]);

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

  // Interceptar navegación programática
  useEffect(() => {
    const handleRouteChange = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        const target = e.target.closest("a");
        if (target && target.href) {
          const url = new URL(target.href);
          setPendingNavigationUrl(url.pathname);
          setShowNavigationModal(true);
        }
      }
    };

    // Interceptar clics en todos los enlaces
    const links = document.querySelectorAll('a[href^="/dashboard"]');
    links.forEach((link) => {
      link.addEventListener("click", handleRouteChange);
    });

    return () => {
      links.forEach((link) => {
        link.removeEventListener("click", handleRouteChange);
      });
    };
  }, [hasUnsavedChanges]);

  // Escuchar cambios de pathname para intercepción más robusta
  useEffect(() => {
    const originalPush = router.push;
    const originalReplace = router.replace;

    router.push = async (...args) => {
      if (hasUnsavedChanges) {
        setPendingNavigationUrl(args[0]);
        setShowNavigationModal(true);
        return;
      }
      return originalPush.apply(router, args);
    };

    router.replace = async (...args) => {
      if (hasUnsavedChanges) {
        setPendingNavigationUrl(args[0]);
        setShowNavigationModal(true);
        return;
      }
      return originalReplace.apply(router, args);
    };

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [hasUnsavedChanges, router]);

  const handleNavigation = (url) => {
    if (hasUnsavedChanges) {
      setPendingNavigationUrl(url);
      setShowNavigationModal(true);
    } else {
      router.push(url);
    }
  };

  const confirmNavigation = () => {
    setShowNavigationModal(false);
    router.push(pendingNavigationUrl);
    setPendingNavigationUrl("");
  };

  const cancelNavigation = () => {
    setShowNavigationModal(false);
    setPendingNavigationUrl("");
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

  const handlePhotoChange = (file, base64) => {
    if (base64) {
      setImageBase64(base64);
    }
  };

  const handleRemovePhoto = async () => {
    setShowDeleteModal(true);
  };

  const confirmRemovePhoto = async () => {
    setShowDeleteModal(false);

    setIsSaving(true);

    try {
      const userId = user?._id;
      const token = localStorage.getItem("token");

      if (!userId || !token) {
        throw new Error("Usuario o token no disponible");
      }

      // Enviar actualización para eliminar imagen
      const updateData = {
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        cellular: user.cellular,
        image: "", // Eliminar imagen
      };

      const response = await updateUserProfile(userId, updateData, token);

      if (response.user) {
        // Actualizar localStorage
        localStorage.setItem("user", JSON.stringify(response.user));

        // Actualizar contexto local
        setUser(response.user);

        // Limpiar estados locales
        setImageBase64(null);
        setHasUnsavedChanges(false);

        // Mostrar éxito con toast
        toast.success("Foto de perfil eliminada correctamente");
      }
    } catch (error) {
      console.error("Error eliminando foto:", error);
      toast.error("Error al eliminar la foto de perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelRemovePhoto = () => {
    setShowDeleteModal(false);
  };

  const handleSaveChanges = async () => {
    setError("");

    // Verificar si está offline
    if (isOffline) {
      const offlineMessage =
        "No es posible guardar cambios sin conexión a internet. Los cambios se perderán al cerrar la página.";
      setError(offlineMessage);
      toast.error(offlineMessage);
      return;
    }

    setIsSaving(true);

    try {
      const userId = user?._id;
      const token = localStorage.getItem("token");

      if (!userId || !token) {
        throw new Error("Usuario o token no disponible");
      }

      // Preparar los datos a actualizar
      const updateData = {
        name: formData.name,
        lastName: formData.lastName,
        email: formData.email,
        cellular: formData.cellular,
      };

      // Si hay una nueva imagen, agregarla como base64
      if (imageBase64) {
        updateData.image = imageBase64;
      }

      // Usar la nueva función para actualizar el perfil
      const response = await updateUserProfile(userId, updateData, token);

      if (response.user) {
        // Actualizar localStorage
        localStorage.setItem("user", JSON.stringify(response.user));

        // Actualizar contexto
        setUser(response.user);

        // Resetear estados
        setHasUnsavedChanges(false);
        setImageBase64(null);

        // Mostrar éxito con toast
        toast.success("Perfil actualizado correctamente");
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      setError(error.message || "Error al guardar los cambios");
      toast.error("Error al guardar los cambios");
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

  const handleCancelChanges = () => {
    setFormData(originalFormData);
    setImageBase64(null);
    setHasUnsavedChanges(false);
    setIsEditing(false);
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

        {/* Indicador offline */}
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md flex items-center gap-2 mb-6"
          >
            <WifiOff className="w-5 h-5" />
            <span>
              Sin conexión. No podrás guardar cambios hasta recuperar la
              conexión.
            </span>
          </motion.div>
        )}

        {/* Sección de foto de perfil */}
        <div className="bg-[var(--card-background)] rounded-lg p-6 mb-8 shadow-sm border border-[var(--card-border)]">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
            Foto de Perfil
          </h2>
          <ProfilePhotoUpload
            currentUser={user}
            onPhotoChange={handlePhotoChange}
            onRemovePhoto={handleRemovePhoto}
            isLoading={isSaving}
          />
        </div>

        {/* Mensajes de éxito y error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Sección de información personal */}
        <div className="bg-[var(--card-background)] rounded-lg p-6 shadow-sm border border-[var(--card-border)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Información Personal
            </h2>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isEditing) {
                  handleCancelChanges();
                } else {
                  setIsEditing(true);
                }
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-[var(--input-background)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)]"
            >
              {isEditing ? "Cancelar" : "Editar"}
            </motion.button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveChanges();
            }}
          >
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

              {/* Botón de guardar - se muestra cuando hay cambios pendientes */}
              {hasUnsavedChanges && (
                <div className="flex justify-end gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleCancelChanges}
                    disabled={isSaving}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Descartar Cambios
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={isSaving || isOffline}
                    className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                      isOffline
                        ? "bg-gray-400"
                        : "bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
                    }`}
                    title={isOffline ? "Requiere conexión a internet" : ""}
                  >
                    {isSaving && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    )}
                    {isOffline
                      ? "Sin conexión"
                      : isSaving
                      ? "Guardando..."
                      : "Guardar Cambios"}
                  </motion.button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <ConfirmModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={confirmRemovePhoto}
            title="Eliminar Foto de Perfil"
            confirmText="Eliminar"
            cancelText="Cancelar"
            confirmButtonClass="bg-red-500 text-white hover:bg-red-600"
          >
            ¿Estás seguro de que quieres eliminar tu foto de perfil?
          </ConfirmModal>
        )}
        {showNavigationModal && (
          <ConfirmModal
            isOpen={showNavigationModal}
            onClose={() => setShowNavigationModal(false)}
            onConfirm={confirmNavigation}
            title="Cambios sin Guardar"
            confirmText="Descartar y Navegar"
            cancelText="Cancelar"
            confirmButtonClass="bg-orange-500 text-white hover:bg-orange-600"
          >
            Hay cambios sin guardar. ¿Deseas descartarlos y navegar a esta
            página?
          </ConfirmModal>
        )}
      </AnimatePresence>
    </div>
  );
}
