"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Camera, Upload } from "lucide-react";
import Image from "next/image";
import { API_URL } from "@/config/constants";

const ProfilePhotoUpload = ({
  currentUser,
  onPhotoChange,
  onRemovePhoto,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [imageExists, setImageExists] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Verificar si la imagen existe cuando cambia
  useEffect(() => {
    if (
      currentUser?.image &&
      currentUser.image !== "null" &&
      currentUser.image !== ""
    ) {
      // Si es base64, está lista para usar
      if (currentUser.image.startsWith("data:image/")) {
        console.log("Imagen base64 detectada en ProfilePhotoUpload");
        setImageExists(true);
      } else {
        // Si es una URL/nombre de archivo, verificar si existe
        const imageUrl = `${API_URL}/uploads/users/${currentUser.image}`;
        console.log("Verificando existencia de imagen de archivo:", imageUrl);

        const img = new window.Image();
        img.onload = () => {
          console.log("Imagen de archivo cargada exitosamente");
          setImageExists(true);
        };
        img.onerror = () => {
          console.log("Error al cargar imagen de archivo");
          setImageExists(false);
        };
        img.src = imageUrl;
      }
    } else {
      setImageExists(false);
    }
  }, [currentUser?.image]);

  const validateFile = (file) => {
    // Validar tipo
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setError("Solo se permiten archivos PNG o JPG/JPEG");
      return false;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no debe superar 5MB");
      return false;
    }

    setError("");
    return true;
  };

  // Función para convertir archivo a base64
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleFileSelect = async (file) => {
    if (!validateFile(file)) return;

    try {
      // Convertir a base64
      const base64Image = await toBase64(file);

      // Establecer preview local
      setImagePreview(base64Image);

      // Notificar al padre con el base64
      onPhotoChange(file, base64Image);

      console.log("Archivo procesado y preview establecido");
    } catch (error) {
      console.error("Error converting to base64:", error);
      setError("Error al procesar la imagen");
    }
  };

  const handleRemovePhoto = async (e) => {
    e.stopPropagation(); // Evitar que se active el selector de archivos

    // Si hay una función onRemovePhoto del padre, usarla (para eliminar de DB)
    if (onRemovePhoto) {
      await onRemovePhoto();
    } else {
      // Fallback: solo limpiar localmente
      setImagePreview(null);
      onPhotoChange(null, null);
    }

    console.log("Imagen eliminada");
  };

  const handleClickToUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  };

  // Determinar qué imagen mostrar
  const getImageSrc = () => {
    // Prioridad: vista previa local > imagen actual del usuario
    if (imagePreview) {
      return imagePreview;
    }
    if (currentUser?.image && imageExists) {
      // Detectar si es base64 o archivo
      if (currentUser.image.startsWith("data:image/")) {
        return currentUser.image;
      } else {
        return `${API_URL}/uploads/users/${currentUser.image}`;
      }
    }
    return null;
  };

  const imageSrc = getImageSrc();

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Input file oculto */}
      <input
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileInput}
        ref={fileInputRef}
      />

      {imageSrc ? (
        /* Modo: Imagen existente - Clickeable para cambiar */
        <div className="text-center">
          <div
            className="relative w-32 h-32 mx-auto mb-4 group cursor-pointer"
            onClick={handleClickToUpload}
          >
            <div className="relative w-full h-full">
              <Image
                src={imageSrc}
                alt="Foto de perfil"
                width={128}
                height={128}
                className="w-full h-full rounded-full object-cover border-2 border-[var(--card-border)] group-hover:border-[var(--primary)] transition-colors"
                onError={(e) => {
                  console.log(
                    "Error cargando imagen en ProfilePhotoUpload:",
                    e
                  );
                  setImageExists(false);
                }}
              />

              {/* Overlay en hover */}
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Botón eliminar */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleRemovePhoto}
              disabled={isLoading}
              className={`absolute -top-2 -right-2 p-1.5 text-white rounded-full transition-colors shadow-lg border-2 border-white ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              }`}
              title={isLoading ? "Eliminando..." : "Eliminar imagen"}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              ) : (
                <X className="w-3 h-3" />
              )}
            </motion.button>
          </div>

          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Haz clic en la imagen para cambiarla
          </p>
        </div>
      ) : (
        /* Modo: Sin imagen - Área de drop/upload */
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? "border-[var(--primary)] bg-[var(--primary)]/10"
              : "border-[var(--card-border)] hover:border-[var(--primary)]"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickToUpload}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-[var(--input-background)]">
              <Camera className="w-8 h-8 text-[var(--text-secondary)]" />
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                Subir foto de perfil
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Haz clic o arrastra una imagen aquí
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                PNG o JPG hasta 5MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-red-700 text-sm">{error}</p>
        </motion.div>
      )}
    </div>
  );
};

export default ProfilePhotoUpload;
