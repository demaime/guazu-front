"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Camera } from "lucide-react";
import Image from "next/image";
import { API_URL } from "@/config/constants";

const ProfilePhotoUpload = ({
  currentUser,
  onPhotoChange,
  pendingImage,
  previewUrl,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [imageExists, setImageExists] = useState(true);

  // Verificar si la imagen existe cuando cambia
  useEffect(() => {
    if (
      currentUser?.image &&
      currentUser.image !== "null" &&
      currentUser.image !== ""
    ) {
      const imageUrl = `${API_URL}/uploads/users/${currentUser.image}`;
      console.log("Verificando existencia de imagen:", imageUrl);

      // Crear una imagen temporal para verificar si se puede cargar
      const img = new window.Image();
      img.onload = () => {
        console.log("Imagen cargada exitosamente");
        setImageExists(true);
      };
      img.onerror = () => {
        console.log(
          "Error al cargar imagen, imagen no existe o no es accesible"
        );
        setImageExists(false);
      };
      img.src = imageUrl;
    } else {
      setImageExists(false);
    }
  }, [currentUser?.image]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateFile = (file) => {
    // Validar tipo
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setError("Solo se permiten archivos PNG o JPG/JPEG");
      return false;
    }

    // Validar tamaño (1MB)
    if (file.size > 1000000) {
      setError("La imagen no debe superar 1MB");
      return false;
    }

    setError("");
    return true;
  };

  const handleFile = (file) => {
    if (!validateFile(file)) return;

    // Crear preview y notificar al padre
    const reader = new FileReader();
    reader.onloadend = () => {
      onPhotoChange(file, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    onPhotoChange(null, null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary)]/10"
            : "border-[var(--card-border)] hover:border-[var(--primary)]"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Vista previa o imagen actual */}
        {(previewUrl || (currentUser?.image && imageExists)) && (
          <div className="relative w-32 h-32 mx-auto mb-4">
            <Image
              src={
                previewUrl || `${API_URL}/uploads/users/${currentUser.image}`
              }
              alt="Foto de perfil"
              width={128}
              height={128}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                console.log("Error cargando imagen:", e);
                e.target.style.display = "none";
              }}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRemovePhoto}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        )}

        {/* Área de drop/upload */}
        <label className="block cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileInput}
          />
          <div className="flex flex-col items-center gap-2">
            {!previewUrl && !currentUser?.image && (
              <Camera className="w-8 h-8 text-[var(--text-secondary)]" />
            )}
            <p className="text-sm text-[var(--text-secondary)]">
              {previewUrl || (currentUser?.image && imageExists)
                ? "Haz clic o arrastra una nueva foto"
                : "Haz clic o arrastra una foto"}
            </p>
            {pendingImage && (
              <p className="text-xs text-[var(--primary)] font-medium">
                Nueva imagen seleccionada - guarda los cambios para confirmar
              </p>
            )}
          </div>
        </label>

        {/* Error message */}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
};

export default ProfilePhotoUpload;
