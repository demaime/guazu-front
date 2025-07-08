"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, X, Camera } from "lucide-react";
import Image from "next/image";

const ProfilePhotoUpload = ({ currentUser, onPhotoUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

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

    return true;
  };

  const handleFile = async (file) => {
    setError("");
    if (!validateFile(file)) return;

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(
        `/api/upload-image/${currentUser._id}/${
          (currentUser.imageQty || 0) + 1
        }`,
        {
          method: "PUT",
          body: formData,
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message);
      }

      onPhotoUpdate(data.user);
    } catch (error) {
      setError(error.message || "Error al subir la imagen");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
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

  const handleRemovePhoto = async () => {
    try {
      setIsUploading(true);
      const response = await fetch(`/api/update/${currentUser._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token"),
        },
        body: JSON.stringify({ image: null }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message);
      }

      setPreviewUrl(null);
      onPhotoUpdate(data.user);
    } catch (error) {
      setError(error.message || "Error al eliminar la imagen");
    } finally {
      setIsUploading(false);
    }
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
        {(previewUrl || currentUser.image) && (
          <div className="relative w-32 h-32 mx-auto mb-4">
            <Image
              src={previewUrl || `/uploads/users/${currentUser.image}`}
              alt="Foto de perfil"
              fill
              className="rounded-full object-cover"
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
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
            ) : (
              <>
                {!previewUrl && !currentUser.image && (
                  <Camera className="w-8 h-8 text-[var(--text-secondary)]" />
                )}
                <p className="text-sm text-[var(--text-secondary)]">
                  {previewUrl || currentUser.image
                    ? "Haz clic o arrastra una nueva foto"
                    : "Haz clic o arrastra una foto"}
                </p>
              </>
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
