"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, X, Camera } from "lucide-react";
import Image from "next/image";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";

const ProfilePhotoUpload = ({ currentUser, onPhotoUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
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

  const handleFile = (file) => {
    setError("");
    if (!validateFile(file)) return;

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
      setPendingFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    try {
      setIsUploading(true);
      const token = authService.getToken();
      const updatedUser = await userService.updateImage(
        currentUser._id,
        pendingFile,
        token
      );
      onPhotoUpdate(updatedUser);
      setPendingFile(null);
      setPreviewUrl(null);
    } catch (error) {
      setError(error.message || "Error al subir la imagen");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setPreviewUrl(null);
    setPendingFile(null);
    setError("");
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
      const token = authService.getToken();
      const updatedUser = await userService.updateProfile(
        currentUser._id,
        { image: null },
        token
      );
      setPreviewUrl(null);
      onPhotoUpdate(updatedUser);
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
            {!pendingFile && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        )}

        {/* Botones de confirmar/cancelar para imagen pendiente */}
        {pendingFile && (
          <div className="flex gap-2 justify-center mb-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirmUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
            >
              {isUploading ? "Guardando..." : "Confirmar"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCancelUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm"
            >
              Cancelar
            </motion.button>
          </div>
        )}

        {/* Área de drop/upload */}
        {!pendingFile && (
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
        )}

        {/* Mensaje para imagen pendiente */}
        {pendingFile && (
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              ¿Confirmar nueva foto de perfil?
            </p>
          </div>
        )}

        {/* Error message */}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
};

export default ProfilePhotoUpload;
