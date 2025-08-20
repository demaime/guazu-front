class GeolocationService {
  static getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("UNSUPPORTED"));
        return;
      }

      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          let errorType;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorType = "PERMISSION_DENIED";
              break;
            case error.POSITION_UNAVAILABLE:
              errorType = "POSITION_UNAVAILABLE";
              break;
            case error.TIMEOUT:
              errorType = "TIMEOUT";
              break;
            default:
              errorType = "UNKNOWN_ERROR";
          }
          reject(new Error(errorType));
        },
        defaultOptions
      );
    });
  }

  static async checkPermission() {
    if (!navigator.permissions) return "unknown";
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state; // 'granted', 'denied', 'prompt'
    } catch {
      return "unknown";
    }
  }
}

export default GeolocationService;

