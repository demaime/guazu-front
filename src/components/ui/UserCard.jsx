import React, { memo } from "react";
import { motion } from "framer-motion";
import { Mail, Shield, User, MapPin } from "lucide-react";
import { HighlightText } from "./HighlightText";
import UserAvatar from "./UserAvatar";

const UserCard = memo(({ user, currentUser, highlightTerm, onCardClick }) => {
  const getRoleName = (role) => {
    switch (role) {
      case "ROLE_ADMIN":
        return "Administrador";
      case "SUPERVISOR":
        return "Supervisor";
      case "POLLSTER":
        return "Encuestador";
      default:
        return role;
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  const isSelf = currentUser?._id && user?._id && currentUser._id === user._id;
  const avatarSrc = user?.image || (isSelf ? currentUser?.image : null);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="group relative bg-[var(--card-background)] border border-[var(--card-border)] rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 p-4 flex items-center gap-4 cursor-pointer"
      onClick={onCardClick}
    >
      {/* Avatar a la izquierda (tipo carnet) */}
      <UserAvatar
        src={avatarSrc}
        alt={`Foto de ${user.name}`}
        size="lg"
        className="shadow-sm"
      />

      {/* Contenido principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] line-clamp-2">
            <HighlightText
              text={`${user.name} ${user.lastName}`}
              highlight={highlightTerm}
            />
          </h3>
          {isSelf && (
            <span className="text-primary text-xs md:text-sm font-semibold whitespace-nowrap">
              (tú)
            </span>
          )}
        </div>

        <div className="mt-1 text-sm text-[var(--text-secondary)] flex items-center gap-2 min-w-0">
          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            <HighlightText text={user.email} highlight={highlightTerm} />
          </span>
        </div>

        {/* Badges: ciudad (prioritaria) y rol */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
            <MapPin className="w-3 h-3" />
            {user.city || "No especificada"}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--card-border)] text-[var(--text-secondary)] text-xs">
            <Shield className="w-3 h-3" />
            {getRoleName(user.role)}
          </span>
        </div>
      </div>

      {/* Overlay de acción en hover (sin botón permanente) */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center bg-black/5">
        <span className="px-3 py-1.5 rounded-full bg-primary text-white text-sm shadow">
          Ver perfil
        </span>
      </div>
    </motion.div>
  );
});

UserCard.displayName = "UserCard";

export default UserCard;
