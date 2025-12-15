"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { userService, updateUserProfile } from "@/services/user.service";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { User, Mail, Phone, MapPin } from "lucide-react";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import { toast } from "react-toastify";

export default function PerfilPage() {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    birthDate: "",
    cellular: "",
    city: "",
    dni: "",
    job: "",
    province: "",
    study: "",
    address: "",
    addressNumber: "",
    addressUnity: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imageBase64, setImageBase64] = useState(null);

  // Emitir evento cuando cambia el estado de edición
  useEffect(() => {
    const event = new CustomEvent("profileEditingChange", {
      detail: { isEditing },
    });
    window.dispatchEvent(event);
  }, [isEditing]);

  // Estados para modales
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState("");
  const suppressBeforeUnloadRef = useRef(false);

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

  // beforeunload solo para cierre/refresh. Suprimimos si la navegación es confirmada por nuestro modal.
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !suppressBeforeUnloadRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
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
    const target = pendingNavigationUrl || "/dashboard/encuestas";
    setPendingNavigationUrl("");
    suppressBeforeUnloadRef.current = true;
    setHasUnsavedChanges(false);
    try {
      window.location.assign(target);
    } catch {
      router.replace(target);
    }
  };

  const cancelNavigation = () => {
    setShowNavigationModal(false);
    setPendingNavigationUrl("");
  };

  useEffect(() => {
    let isMounted = true;

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
          // Si no hay conexión, usar inmediatamente los datos locales sin esperar fetch
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            setUser(userData);
            const initialFormData = {
              name: userData?.name || "",
              lastName: userData?.lastName || "",
              email: userData?.email || "",
              birthDate: userData?.birthDate
                ? new Date(userData.birthDate).toISOString().split("T")[0]
                : "",
              cellular: userData?.cellular || "",
              city: userData?.city || "",
              dni: userData?.dni || "",
              job: userData?.job || "",
              province: userData?.province || "",
              study: userData?.study || "",
              address: userData?.address || "",
              addressNumber: userData?.addressNumber || "",
              addressUnity: userData?.addressUnity || "",
            };
            setFormData(initialFormData);
            setOriginalFormData(initialFormData);
            return;
          }
          const updatedUser = await userService.getProfile(userData._id, token);

          // Only update state if component is still mounted
          if (!isMounted) return;

          setUser(updatedUser);
          const initialFormData = {
            name: updatedUser?.name || "",
            lastName: updatedUser?.lastName || "",
            email: updatedUser?.email || "",
            birthDate: updatedUser?.birthDate
              ? new Date(updatedUser.birthDate).toISOString().split("T")[0]
              : "",
            cellular: updatedUser?.cellular || "",
            city: updatedUser?.city || "",
            dni: updatedUser?.dni || "",
            job: updatedUser?.job || "",
            province: updatedUser?.province || "",
            study: updatedUser?.study || "",
            address: updatedUser?.address || "",
            addressNumber: updatedUser?.addressNumber || "",
            addressUnity: updatedUser?.addressUnity || "",
          };
          setFormData(initialFormData);
          setOriginalFormData(initialFormData);
        } catch (error) {
          console.error("Error fetching user profile:", error);

          // Only update state if component is still mounted
          if (!isMounted) return;

          // Set a more user-friendly error message
          setError(
            "No se pudieron cargar los datos actualizados del perfil. Mostrando datos locales."
          );

          // Set user with localStorage data if service fails
          setUser(userData);

          const initialFormData = {
            name: userData?.name || "",
            lastName: userData?.lastName || "",
            email: userData?.email || "",
            birthDate: userData?.birthDate
              ? new Date(userData.birthDate).toISOString().split("T")[0]
              : "",
            cellular: userData?.cellular || "",
            city: userData?.city || "",
            dni: userData?.dni || "",
            job: userData?.job || "",
            province: userData?.province || "",
            study: userData?.study || "",
            address: userData?.address || "",
            addressNumber: userData?.addressNumber || "",
            addressUnity: userData?.addressUnity || "",
          };
          setFormData(initialFormData);
          setOriginalFormData(initialFormData);
        }
      } catch (error) {
        if (isMounted) {
          setError("Error al inicializar el usuario");
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeUser();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [router]);

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
        name: user?.name || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        cellular: user?.cellular || "",
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

    setIsSaving(true);

    try {
      const userId = user?._id;
      const token = localStorage.getItem("token");

      if (!userId || !token) {
        throw new Error("Usuario o token no disponible");
      }

      // Preparar los datos a actualizar (todos los campos del modelo presentes en el formulario)
      const updateData = { ...formData };
      // Normalizar tipos numéricos si vienen como string
      ["dni", "addressNumber"].forEach((k) => {
        if (
          updateData[k] !== "" &&
          updateData[k] !== null &&
          updateData[k] !== undefined
        ) {
          updateData[k] = Number(updateData[k]);
        } else {
          delete updateData[k];
        }
      });

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
      <div className="p-4 h-[calc(100vh-64px)] flex items-center justify-center">
        <LoaderWrapper
          size="lg"
          fullScreen={false}
          text="Cargando perfil…"
          className="text-primary"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="container mx-auto px-4 py-8 pb-20 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Mi Perfil
          </h1>
          <p className="text-[var(--text-secondary)]">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>

        {/* Banner Principal */}
        <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl p-6 md:p-8 mb-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-6 md:gap-8">
            {/* Foto de perfil */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/20 shadow-lg">
                <ProfilePhotoUpload
                  currentUser={user}
                  onPhotoChange={handlePhotoChange}
                  onRemovePhoto={handleRemovePhoto}
                  isLoading={isSaving}
                />
              </div>
            </div>

            {/* Información clave */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-5xl font-bold mb-3">
                {user?.name} {user?.lastName}
              </h2>
              <p className="text-lg md:text-xl text-white/80 mb-4">
                {user?.email}
              </p>
              <div className="flex flex-col gap-3 text-base md:text-lg justify-center md:justify-start">
                <div className="flex items-center justify-center md:justify-start">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                    {user?.role === "ROLE_ADMIN"
                      ? "Administrador"
                      : user?.role === "POLLSTER"
                      ? "Encuestador"
                      : user?.role === "SUPERVISOR"
                      ? "Supervisor"
                      : "Encuestador"}
                  </span>
                </div>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <svg
                    className="w-5 h-5 flex-shrink-0 hidden md:block"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-center md:text-left">
                    {user?.city}, {user?.province}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Miembro desde */}
        {user?.createdAt && (
          <div className="bg-[var(--card-background)] rounded-xl p-4 mb-8 shadow-sm border border-[var(--card-border)]">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">
                  Miembro desde{" "}
                  {new Date(user.createdAt).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        )}

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

        {/* Campos editables */}
        <div className="bg-[var(--card-background)] rounded-xl p-8 shadow-sm border border-[var(--card-border)]">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-3">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                Información Personal
              </h3>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">
              Actualiza tu información personal y de contacto
            </p>
            {hasUnsavedChanges && (
              <div className="mt-2">
                <span className="text-xs text-[var(--text-secondary)]">
                  Cambios sin guardar
                </span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveChanges();
            }}
          >
            <div className="space-y-8">
              {/* Información Básica */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-[var(--primary)] rounded-full"></div>
                  <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                    Información Básica
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Nombre
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="Ingresa tu nombre"
                        />
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <User className="w-5 h-5 text-[var(--text-secondary)] mr-3" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.name || "Sin nombre"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Apellido
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lastName: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="Ingresa tu apellido"
                        />
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <User className="w-5 h-5 text-[var(--text-secondary)] mr-3" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.lastName || "Sin apellido"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-[var(--primary)] rounded-full"></div>
                  <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                    Información de Contacto
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Email
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="tu@email.com"
                        />
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <Mail className="w-5 h-5 text-[var(--text-secondary)] mr-3" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.email || "Sin email"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Teléfono
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="tel"
                          value={formData.cellular}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              cellular: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="+54 9 11 1234-5678"
                        />
                        <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <Phone className="w-5 h-5 text-[var(--text-secondary)] mr-3" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.cellular || "No especificado"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Identificación */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-[var(--primary)] rounded-full"></div>
                  <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                    Identificación
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      N° de Documento / Cédula
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.dni}
                          onChange={(e) =>
                            setFormData({ ...formData, dni: e.target.value })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="Número de documento"
                        />
                        <svg
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <svg
                          className="w-5 h-5 text-[var(--text-secondary)] mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                          />
                        </svg>
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.dni || user?.documentNumber || "Sin especificar"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Fecha de Nacimiento
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              birthDate: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                        />
                        <svg
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <svg
                          className="w-5 h-5 text-[var(--text-secondary)] mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.birthDate
                            ? new Date(user.birthDate).toLocaleDateString(
                                "es-ES"
                              )
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-[var(--primary)] rounded-full"></div>
                  <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                    Ubicación
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Provincia
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.province}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              province: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="Ciudad Autónoma de Buenos Aires"
                        />
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <MapPin className="w-5 h-5 text-[var(--text-secondary)] mr-3" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.province || "No especificado"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Localidad
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) =>
                            setFormData({ ...formData, city: e.target.value })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="BALVANERA"
                        />
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <MapPin className="w-5 h-5 text-[var(--text-secondary)] mr-3" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.city || "No especificado"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Dirección
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="Av. Corrientes"
                        />
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <MapPin className="w-5 h-5 text-[var(--text-secondary)] mr-3" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.address || "No especificado"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Número
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.addressNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              addressNumber: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="1234"
                        />
                        <svg
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <svg
                          className="w-5 h-5 text-[var(--text-secondary)] mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                          />
                        </svg>
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.addressNumber || "No especificado"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Unidad
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.addressUnity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              addressUnity: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="A"
                        />
                        <svg
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <svg
                          className="w-5 h-5 text-[var(--text-secondary)] mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.addressUnity || "No especificado"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Información Profesional */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-[var(--primary)] rounded-full"></div>
                  <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                    Información Profesional
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Trabajo
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.job}
                          onChange={(e) =>
                            setFormData({ ...formData, job: e.target.value })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="Desarrollador"
                        />
                        <svg
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <svg
                          className="w-5 h-5 text-[var(--text-secondary)] mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6"
                          />
                        </svg>
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.job || "No especificado"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Estudios
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.study}
                          onChange={(e) =>
                            setFormData({ ...formData, study: e.target.value })
                          }
                          className="w-full px-4 py-3 pl-12 rounded-xl bg-[var(--input-background)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                          placeholder="Ingeniería en Sistemas"
                        />
                        <svg
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 14l9-5-9-5-9 5 9 5z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex items-center px-4 py-3 bg-[var(--input-background)] rounded-xl">
                        <svg
                          className="w-5 h-5 text-[var(--text-secondary)] mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 14l9-5-9-5-9 5 9 5z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                          />
                        </svg>
                        <span className="text-[var(--text-primary)] font-medium">
                          {user?.study || "No especificado"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Botones de acción - Footer fijo */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card-background)] border-t border-[var(--card-border)] shadow-lg z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-3 justify-center">
          {isEditing ? (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCancelChanges}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[var(--text-secondary)] hover:bg-[var(--text-muted)] text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.preventDefault();
                  handleSaveChanges();
                }}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </motion.button>
            </>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(true)}
              className="px-8 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg font-medium transition-all duration-200 shadow-md"
            >
              Editar Perfil
            </motion.button>
          )}
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
          >
            Hay cambios sin guardar. ¿Deseas descartarlos y navegar a esta
            página?
          </ConfirmModal>
        )}
      </AnimatePresence>
    </div>
  );
}
