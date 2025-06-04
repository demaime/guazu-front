import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Componente indicador de estado offline
 * @param {object} props - Component props
 * @param {boolean} props.isOffline - Whether the app is currently offline
 * @param {Date} props.lastUpdate - Last successful data update timestamp
 * @param {string} props.message - Custom message to display
 * @param {string} props.className - Additional CSS classes
 */
export function OfflineIndicator({
  isOffline,
  lastUpdate,
  message,
  className = "",
}) {
  const defaultMessage =
    "Mostrando datos guardados localmente. Los datos se actualizarán cuando se restaure la conexión.";

  if (!isOffline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-md ${className}`}
      >
        <div className="flex items-center">
          <WifiOff className="w-5 h-5 text-yellow-600 mr-3" />
          <div className="flex-1">
            <p className="text-yellow-800 font-medium">Modo offline</p>
            <p className="text-sm text-yellow-700 mt-1">
              {message || defaultMessage}
              {lastUpdate && (
                <span className="block mt-1">
                  Última actualización: {lastUpdate.toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Componente compacto de estado de conexión
 * @param {object} props - Component props
 * @param {boolean} props.isOnline - Whether the app is currently online
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg'
 */
export function ConnectionStatus({ isOnline, size = "md" }) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const iconClass = sizeClasses[size];

  return (
    <div className="flex items-center gap-1">
      {isOnline ? (
        <Wifi className={`${iconClass} text-green-500`} />
      ) : (
        <WifiOff className={`${iconClass} text-red-500`} />
      )}
      <span
        className={`text-xs ${isOnline ? "text-green-600" : "text-red-600"}`}
      >
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
}
