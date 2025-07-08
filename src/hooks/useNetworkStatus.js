import { useState, useEffect } from "react";

/**
 * Custom hook para detectar el estado de conexión a internet
 * @returns {object} Object with isOnline, isOffline, and wasOffline properties
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state based on navigator.onLine
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      console.log("Network status: ONLINE");
      setIsOnline(true);
      setWasOffline(false);
    };

    const handleOffline = () => {
      console.log("Network status: OFFLINE");
      setIsOnline(false);
      setWasOffline(true);
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
  };
}

/**
 * Custom hook para manejo de errores de red
 * @param {Error} error - Error object
 * @returns {boolean} Whether the error is a network error
 */
export function useNetworkError(error) {
  if (!error) return false;

  return (
    !navigator.onLine ||
    error.message?.includes("fetch") ||
    error.message?.includes("Network") ||
    error.message?.includes("Failed to fetch") ||
    error.name === "NetworkError" ||
    error.message?.includes("ERR_INTERNET_DISCONNECTED")
  );
}

/**
 * Custom hook para retry de operaciones cuando se recupera la conexión
 * @param {function} operation - Function to retry when coming back online
 */
export function useOnlineRetry(operation) {
  const { isOnline, wasOffline } = useNetworkStatus();

  useEffect(() => {
    if (isOnline && wasOffline && operation) {
      console.log("Network recovered, retrying operation...");
      operation();
    }
  }, [isOnline, wasOffline, operation]);
}
