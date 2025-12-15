import { motion } from "framer-motion";
import { Star, Check, MapPin } from "lucide-react";

export default function ParticipantCard({
  participant,
  isSelected,
  isFavorite,
  onToggleSelect,
  onToggleFavorite,
}) {
  const handleFavoriteClick = (e) => {
    e.stopPropagation(); // Prevent card selection when clicking favorite
    onToggleFavorite();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggleSelect}
      className={`relative bg-[var(--card-background)] border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-[var(--primary)] bg-[var(--primary)]/5"
          : "border-[var(--card-border)] hover:border-[var(--primary)]/50"
      }`}
    >
      {/* Favorite Button (Top Right) */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-3 right-3 p-1.5 hover:bg-[var(--hover-bg)] rounded-full transition-colors z-10"
      >
        <Star
          className={`w-5 h-5 transition-all ${
            isFavorite
              ? "fill-yellow-400 text-yellow-400"
              : "text-[var(--text-secondary)] hover:text-yellow-400"
          }`}
        />
      </button>

      {/* Checkbox (Left Side) */}
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-[var(--primary)] border-[var(--primary)]"
              : "border-[var(--card-border)]"
          }`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>

        {/* Content */}
        <div className="flex-1 mr-8">
          {/* Avatar & Name */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-semibold text-sm">
              {participant.fullName
                ? participant.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "??"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] truncate">
                {participant.fullName || "Sin nombre"}
              </h3>
            </div>
          </div>

          {/* Email */}
          <p className="text-sm text-[var(--text-secondary)] truncate mb-2">
            {participant.email || "Sin email"}
          </p>

          {/* Location */}
          {(participant.city || participant.province) && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">
                {[participant.city, participant.province]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-lg">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </motion.div>
  );
}
