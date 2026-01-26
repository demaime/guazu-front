import React, { memo } from "react";
import { Mail, User, MapPin } from "lucide-react";
import { HighlightText } from "./HighlightText";

const UserCard = memo(({ user, currentUser, highlightTerm, onCardClick }) => {
  const getRoleInfo = (role) => {
    switch (role) {
      case "ROLE_ADMIN":
        // Administrador: secondary (morado)
        return { 
          label: "Administrador", 
          bgColor: "bg-[var(--secondary)]",
          textColor: "text-white",
          borderColor: "border-[var(--secondary-dark)]"
        };
      case "SUPERVISOR":
        // Supervisor: primary (azul)
        return { 
          label: "Supervisor", 
          bgColor: "bg-[var(--primary)]",
          textColor: "text-white",
          borderColor: "border-[var(--primary-dark)]"
        };
      case "POLLSTER":
        // Encuestador: primary-light (azul claro)
        return { 
          label: "Encuestador", 
          bgColor: "bg-[var(--primary-light)]",
          textColor: "text-[var(--primary-dark)]",
          borderColor: "border-[var(--primary)]"
        };
      default:
        return { 
          label: role, 
          bgColor: "bg-[var(--card-border)]",
          textColor: "text-[var(--text-primary)]",
          borderColor: "border-[var(--card-border)]"
        };
    }
  };

  const isSelf = currentUser?._id && user?._id && currentUser._id === user._id;
  const avatarSrc = user?.image || (isSelf ? currentUser?.image : null);
  const roleInfo = getRoleInfo(user.role);

  return (
    <div
      className="group relative flex flex-row h-full w-full bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg sm:rounded-xl overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 hover:border-[var(--primary)]/50 transition-all duration-300 cursor-pointer"
      onClick={onCardClick}
    >
      {/* Primer tercio VERTICAL: Foto sin padding ni bordes */}
      <div className="w-1/3 h-full flex-shrink-0 overflow-hidden">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={`Foto de ${user.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[var(--card-border)] flex items-center justify-center">
            <User className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--text-muted)]" />
          </div>
        )}
      </div>

      {/* Otros 2 tercios VERTICALES: Información */}
      <div className="w-2/3 flex flex-col justify-between p-2 sm:p-3 min-w-0 overflow-hidden">
        {/* Nombre */}
        <div className="flex items-start gap-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate flex-1" title={`${user.name} ${user.lastName}`}>
            <HighlightText
              text={`${user.name} ${user.lastName}`}
              highlight={highlightTerm}
            />
          </h3>
          {isSelf && (
            <span className="flex-shrink-0 text-[var(--primary-light)] text-[8px] sm:text-[9px] font-bold bg-[var(--primary)]/20 px-1 py-0.5 rounded">
              TÚ
            </span>
          )}
        </div>
        
        {/* Email */}
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-[var(--text-secondary)] min-w-0">
          <Mail size={10} className="flex-shrink-0 sm:w-[11px] sm:h-[11px]" />
          <span className="truncate" title={user.email}>
            <HighlightText text={user.email} highlight={highlightTerm} />
          </span>
        </div>

        {/* Ciudad */}
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-[var(--text-secondary)] min-w-0">
          <MapPin size={10} className="flex-shrink-0 sm:w-[11px] sm:h-[11px]" />
          <span className="truncate" title={user.city || "Sin ciudad"}>
            {user.city || "Sin ciudad"}
          </span>
        </div>

        {/* Rol */}
        <div>
          <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border ${roleInfo.bgColor} ${roleInfo.textColor} ${roleInfo.borderColor}`}>
            {roleInfo.label}
          </span>
        </div>
      </div>
    </div>
  );
});

UserCard.displayName = "UserCard";

export default UserCard;
