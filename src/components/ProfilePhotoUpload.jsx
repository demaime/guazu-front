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
        setImageExists(true);
      } else {
        // Si es una URL/nombre de archivo, verificar si existe
        const imageUrl = `${API_URL}/uploads/users/${currentUser.image}`;

        const img = new window.Image();
        img.onload = () => {
          setImageExists(true);
        };
        img.onerror = () => {
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
    <div className="w-full h-full">
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
        <div
          className="relative w-full h-full group cursor-pointer"
          onClick={handleClickToUpload}
        >
          <Image
            src={imageSrc}
            alt="Foto de perfil"
            fill
            className="object-cover group-hover:opacity-80 transition-opacity"
            onError={(e) => {
              console.log("Error cargando imagen en ProfilePhotoUpload:", e);
              setImageExists(false);
            }}
          />

          {/* Overlay en hover */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Upload className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </div>
      ) : (
        /* Modo: Sin imagen - Área de drop/upload */
        <div
          className={`relative w-full h-full border-2 border-dashed border-white/30 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDragging
              ? "border-white/60 bg-white/10"
              : "hover:border-white/50 hover:bg-white/5"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickToUpload}
        >
          <div className="flex flex-col items-center gap-2 text-white/80">
            <Camera className="w-8 h-8" />
            <p className="text-sm font-medium">Subir foto</p>
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
