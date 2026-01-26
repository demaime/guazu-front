import React, { useState } from "react";
import { User } from "lucide-react";

const UserAvatar = ({
  src,
  alt,
  size = "md",
  className = "",
  fallbackIcon = User,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
    "2xl": "w-32 h-32",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
    "2xl": "w-16 h-16",
  };

  const FallbackIcon = fallbackIcon;

  /* Determine rounded class - defaults to rounded-full unless overridden in className */
  const roundedClass = className.includes("rounded-") ? "" : "rounded-full";

  if (!src || imageError) {
    return (
      <div
        className={`${sizeClasses[size]} ${className} ${roundedClass} overflow-hidden bg-[var(--card-border)] flex items-center justify-center border border-[var(--card-border)]`}
      >
        <FallbackIcon className={`${iconSizes[size]} text-[var(--text-muted)]`} />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${className} ${roundedClass} relative overflow-hidden`}
    >
      {!imageLoaded && (
        <div
          className={`w-full h-full ${roundedClass} bg-[var(--card-border)] flex items-center justify-center border border-[var(--card-border)] absolute inset-0`}
        >
          <FallbackIcon className={`${iconSizes[size]} text-[var(--text-muted)]`} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${
          imageLoaded ? "opacity-100" : "opacity-0"
        } transition-opacity duration-200`}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageError(true);
          setImageLoaded(false);
        }}
      />
    </div>
  );
};

export default UserAvatar;
