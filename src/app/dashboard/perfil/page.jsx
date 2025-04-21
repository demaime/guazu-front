"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { userService } from "@/services/user.service";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Loader } from "@/components/ui/Loader";

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

        // Log userData just before calling getProfile
        // console.log("Calling getProfile with userData:", userData);

        try {
          const updatedUser = await userService.getProfile(userData._id, token);
          // console.log("getProfile successful, updatedUser:", updatedUser); // Remove log

          // --- RESTORE STATE UPDATES ---
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
          // --- END OF RESTORE ---
        } catch (error) {
          setError(error.message || "Error al cargar los datos del usuario");
          // Fallback: Use initial userData from localStorage if getProfile fails
          setUser(userData); // Set user from localStorage data
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

        // Remove the direct setting from localStorage as it's now handled in try/catch
        /*
        setUser(userData); 
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
        */
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
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Mi Perfil
          </h1>
        </div>

        <div className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg shadow-sm">
          <div className="p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md"
              >
                {error}
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md"
              >
                {successMessage}
              </motion.div>
            )}

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* Sección de imagen de perfil */}
              <div className="flex items-center space-x-6">
                <div className="relative w-24 h-24">
                  {user && user.image ? (
                    <Image
                      src={user.image}
                      alt="Foto de perfil"
                      fill
                      className="rounded-full object-cover"
                      onError={(e) => {
                        console.error(
                          "Error loading profile image:",
                          e.target.src
                        );
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                      {user?.name ? user.name[0].toUpperCase() : "U"}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="image"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors cursor-pointer"
                  >
                    Cambiar foto
                  </label>
                </div>
              </div>

              {/* Campos del formulario */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderField("name", "Nombre")}
                {renderField("lastName", "Apellido")}
                {renderField("email", "Correo electrónico", "email")}
                {renderField("phone", "Teléfono")}
                {renderField("cellular", "Celular")}
                {renderField("address", "Dirección")}
                {renderField("addressNumber", "Número")}
                {renderField("addressUnity", "Unidad")}
                {renderField("city", "Ciudad")}
                {renderField("province", "Provincia")}
                {renderField("section", "Sección")}
                {renderField("dni", "DNI")}
                {renderField("job", "Ocupación")}
                {renderField("study", "Estudios")}
                {renderField("birthDate", "Fecha de nacimiento", "date")}
              </div>

              {/* Botones de acción - Siempre visibles pero deshabilitados si no hay cambios */}
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!hasUnsavedChanges}
                  className={`px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--button-secondary)] rounded-md transition-colors ${
                    !hasUnsavedChanges
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-opacity-80"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!hasUnsavedChanges || isSaving}
                  className={`px-4 py-2 text-sm font-medium text-white bg-primary rounded-md transition-colors ${
                    !hasUnsavedChanges || isSaving
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-primary-dark"
                  }`}
                >
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>

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
