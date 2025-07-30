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

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col overflow-hidden cursor-pointer"
      onClick={onCardClick}
    >
      <div className="bg-gradient-to-br from-gray-700 via-gray-800 to-black p-4 relative h-24 flex items-end">
        <div className="absolute -bottom-10 left-4">
          <UserAvatar
            src={user.image}
            alt={`Foto de ${user.name}`}
            size="xl"
            className="border-4 border-[var(--card-background)]"
          />
        </div>
      </div>
      <div className="pt-14 px-4 pb-4 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">
          <HighlightText
            text={`${user.name} ${user.lastName}`}
            highlight={highlightTerm}
          />
        </h3>

        <div className="mt-2 space-y-2 text-sm text-[var(--text-secondary)] flex-1">
          <p className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="truncate">
              <HighlightText text={user.email} highlight={highlightTerm} />
            </span>
          </p>
          <p className="flex items-center gap-2">
            {currentUser?.role === "SUPERVISOR" ? (
              <>
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="truncate">
                  {user.city || "No especificada"}
                </span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="truncate">{getRoleName(user.role)}</span>
              </>
            )}
          </p>
        </div>

        <div className="mt-4">
          <button
            className="w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onCardClick();
            }}
          >
            Ver Perfil
          </button>
        </div>
      </div>
    </motion.div>
  );
});

UserCard.displayName = "UserCard";

export default UserCard;
