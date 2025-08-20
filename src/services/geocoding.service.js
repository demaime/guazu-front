/**
 * Servicio de geocodificación inversa usando OpenStreetMap Nominatim
 * Convierte coordenadas (lat, lng) en información de ubicación (ciudad, estado, país)
 */
class GeocodingService {
  // Cache para evitar requests repetidos
  static cache = new Map();

  /**
   * Obtiene información de ciudad basada en coordenadas
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * @returns {Promise<{city: string, state: string|null, country: string|null}>}
   */
  static async getCityFromCoordinates(lat, lng) {
    // Validar coordenadas
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return { city: "Ubicación no disponible", state: null, country: null };
    }

    // Crear clave para cache (redondeada a 3 decimales para agrupar ubicaciones cercanas)
    const cacheKey = `${Math.round(lat * 1000) / 1000},${
      Math.round(lng * 1000) / 1000
    }`;

    // Verificar cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Request a OpenStreetMap Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=es&zoom=10`,
        {
          headers: {
            "User-Agent": "Guazu-Surveys-App/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Extraer información de dirección
      const address = data.address || {};

      // Función helper para formatear ubicación de CABA
      const formatCABALocation = (address) => {
        const neighbourhood =
          address.neighbourhood || address.suburb || address.quarter;
        const cityDistrict = address.city_district || address.district;

        // Si tenemos barrio/comuna, lo usamos
        if (neighbourhood) {
          return `${neighbourhood}, CABA`;
        }

        // Si tenemos distrito/comuna sin barrio específico
        if (cityDistrict && cityDistrict.toLowerCase().includes("comuna")) {
          return `${cityDistrict}, CABA`;
        }

        return "CABA";
      };

      // Detectar si es CABA/Ciudad de Buenos Aires
      const isCABA =
        address.city === "Ciudad Autónoma de Buenos Aires" ||
        address.city === "Buenos Aires" ||
        address.municipality === "Ciudad Autónoma de Buenos Aires" ||
        address.state === "Ciudad Autónoma de Buenos Aires" ||
        (address.country === "Argentina" &&
          (address.city === "Buenos Aires" ||
            address.municipality === "Buenos Aires") &&
          !address.state);

      let cityName;
      if (isCABA) {
        cityName = formatCABALocation(address);
      } else {
        cityName =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.county ||
          "Ciudad no disponible";
      }

      const result = {
        city: cityName,
        state: address.state || address.province || null,
        country: address.country || null,
        // Información adicional para debug
        _debug: {
          neighbourhood: address.neighbourhood,
          suburb: address.suburb,
          city_district: address.city_district,
          isCABA: isCABA,
        },
      };

      // Guardar en cache
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.warn("Error en geocodificación:", error);

      const fallback = {
        city: "Ubicación no disponible",
        state: null,
        country: null,
      };

      // Guardar fallback en cache para evitar intentos repetidos
      this.cache.set(cacheKey, fallback);

      return fallback;
    }
  }

  /**
   * Obtiene múltiples ciudades de forma eficiente
   * @param {Array<{lat: number, lng: number}>} coordinates - Array de coordenadas
   * @returns {Promise<Array<{city: string, state: string|null, country: string|null}>>}
   */
  static async getMultipleCities(coordinates) {
    const promises = coordinates.map((coord) =>
      this.getCityFromCoordinates(coord.lat, coord.lng)
    );

    return Promise.all(promises);
  }

  /**
   * Limpia el cache (útil para desarrollo)
   */
  static clearCache() {
    this.cache.clear();
  }

  /**
   * Obtiene estadísticas del cache
   */
  static getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export default GeocodingService;
