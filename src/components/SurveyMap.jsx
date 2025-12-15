"use client";

import { useState, useEffect } from "react";
import {
  GoogleMap,
  useLoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

const libraries = ["places"];

const baseContainerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = {
  lat: -31.6350688,
  lng: -60.7053478,
};

const markerColors = [
  "#FF0000", // Rojo brillante
  "#0066FF", // Azul royal
  "#00CC00", // Verde brillante
  "#FF6600", // Naranja
  "#9900FF", // Púrpura
  "#FF0099", // Rosa fucsia
  "#00CCCC", // Cian
  "#FFCC00", // Amarillo oro
  "#FF3366", // Rosa rojizo
  "#0099FF", // Azul cielo
  "#66FF00", // Verde lima
  "#FF9900", // Naranja dorado
  "#CC00FF", // Magenta
  "#00FF99", // Verde agua
  "#FF0066", // Rosa intenso
  "#3366FF", // Azul medio
  "#CCFF00", // Amarillo lima
  "#FF6699", // Rosa claro
  "#0033CC", // Azul oscuro
  "#CC6600", // Naranja oscuro
];

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

// Estilo JSON para el mapa en modo oscuro (ejemplo estándar)
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

const defaultOptions = {
  scrollwheel: false,
  streetViewControl: false,
  mapTypeControlOptions: {
    position: 2,
  },
  fullscreenControl: true,
  fullscreenControlOptions: {
    position: 7,
  },
};

// Función auxiliar para obtener la respuesta legible
const getReadableAnswer = (survey, questionKey, answerValue) => {
  if (!survey?.pages?.[0]?.elements) {
    return Array.isArray(answerValue)
      ? JSON.stringify(answerValue)
      : String(answerValue); // Fallback si no hay definición de encuesta
  }

  const question = survey.pages[0].elements.find((q) => q.name === questionKey);
  if (!question) {
    return Array.isArray(answerValue)
      ? JSON.stringify(answerValue)
      : String(answerValue); // Fallback si no se encuentra la pregunta
  }

  // Manejar diferentes tipos de preguntas
  switch (question.type) {
    case "radiogroup":
    case "dropdown":
      const selectedChoice = question.choices?.find(
        (c) => c.value === answerValue
      );
      return selectedChoice?.text?.es || selectedChoice?.text || answerValue; // Mostrar texto de la opción
    case "checkbox":
      if (!Array.isArray(answerValue)) {
        return String(answerValue);
      }
      const selectedTexts = answerValue.map((val) => {
        const choice = question.choices?.find((c) => c.value === val);
        return choice?.text?.es || choice?.text || val;
      });
      return selectedTexts.join(", "); // Unir textos de opciones seleccionadas
    case "matrix":
      // Para matriz, la respuesta suele ser un objeto {fila: columna}
      if (typeof answerValue === "object" && answerValue !== null) {
        return Object.entries(answerValue)
          .map(([rowValue, colValue]) => {
            const rowText =
              question.rows?.find((r) => r.value === rowValue)?.text?.es ||
              rowValue;
            const colText =
              question.columns?.find((c) => c.value === colValue)?.text?.es ||
              colValue;
            return `${rowText}: ${colText}`;
          })
          .join("; ");
      } else {
        return String(answerValue); // Fallback
      }
    case "boolean":
      return answerValue
        ? question.labelTrue || "Sí"
        : question.labelFalse || "No";
    // Añadir más casos si es necesario (rating, multipletext, etc.)
    default:
      // Para preguntas simples (text, comment), devolver el valor directamente
      return String(answerValue);
  }
};

const SurveyMap = ({
  survey,
  answers = [],
  mostrarTodos = true,
  selectedUsers = [],
  height = "400px",
  onOpenList,
  userColors: userColorsProp,
}) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [userColors, setUserColors] = useState(userColorsProp || {});
  const [mapRef, setMapRef] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(14);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMapInteractive, setIsMapInteractive] = useState(false);
  const [showUserLocation, setShowUserLocation] = useState(false);

  const { isLoaded } = useLoadScript({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Efecto para detectar el tema actual
  useEffect(() => {
    const checkDarkMode = () => {
      // Asume que el tema se controla con la clase 'dark' en <html>
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    // Observar cambios en la clase del <html> para detectar cambios de tema
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    // Limpiar observador al desmontar
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      const geoOptions = {
        timeout: 10 * 1000,
      };

      const geoSuccess = (pos) => {
        const newLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(newLocation);
        setMapCenter(newLocation);
      };

      const geoError = (error) => {
        console.log("Error occurred. Error code: " + error.code);
      };

      navigator.geolocation.getCurrentPosition(
        geoSuccess,
        geoError,
        geoOptions
      );
    }
  }, []);

  // Asignar colores a los usuarios (solo si no se pasaron como prop)
  useEffect(() => {
    if (userColorsProp) {
      setUserColors(userColorsProp);
    } else {
      const uniqueUsers = [...new Set(answers.map((a) => a.userId))];
      const colors = {};
      uniqueUsers.forEach((userId, index) => {
        colors[userId] = markerColors[index % markerColors.length];
      });
      setUserColors(colors);
    }
  }, [answers, userColorsProp]);

  // Escuchar evento para centrar en encuestador
  useEffect(() => {
    const handleCenterOnPollster = (event) => {
      const { pollsterId } = event.detail;
      console.log("🗺️ Map received center request for:", pollsterId);
      console.log("🗺️ Map ref exists:", !!mapRef);
      console.log("🗺️ Google maps loaded:", !!window.google);
      centerOnUser(pollsterId);
    };

    window.addEventListener("centerOnPollster", handleCenterOnPollster);
    return () => {
      window.removeEventListener("centerOnPollster", handleCenterOnPollster);
    };
  }, [answers, mapRef]);

  // Auto-centrar mapa en todos los casos visibles
  useEffect(() => {
    if (!mapRef || !window.google || answers.length === 0) {
      return;
    }

    const validAnswers = answers.filter((a) => a.lat && a.lng);

    if (validAnswers.length === 0) {
      // Si no hay coordenadas, usar ubicación por defecto
      mapRef.setCenter(defaultCenter);
      mapRef.setZoom(14);
      return;
    }

    // Calcular bounds de todas las respuestas
    const bounds = new window.google.maps.LatLngBounds();
    validAnswers.forEach((answer) => {
      bounds.extend({
        lat: parseFloat(answer.lat),
        lng: parseFloat(answer.lng),
      });
    });

    // Ajustar mapa a los bounds
    mapRef.fitBounds(bounds);

    // Si solo hay un punto, hacer zoom apropiado
    if (validAnswers.length === 1) {
      setTimeout(() => {
        mapRef.setZoom(16);
      }, 100);
    }
  }, [answers, mapRef]); // Ejecutar cuando cambien answers o mapRef

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
    // Centrar el mapa en el marcador seleccionado
    if (mapRef) {
      mapRef.panTo({ lat: marker.lat, lng: marker.lng });
      // Hacer un pequeño zoom si estamos muy alejados
      if (mapRef.getZoom() < 15) {
        mapRef.setZoom(16);
      }
    }
  };

  // Función para centrar el mapa en un usuario específico
  const centerOnUser = (userId) => {
    console.log("🎯 centerOnUser called with userId:", userId);

    if (!window.google) {
      console.error("❌ Google Maps not loaded");
      return;
    }

    if (!mapRef) {
      console.error("❌ Map ref not available");
      return;
    }

    const userAnswers = answers.filter(
      (a) => a.userId === userId && a.lat && a.lng
    );

    console.log("📍 Found user answers:", userAnswers.length, userAnswers);

    if (userAnswers.length > 0) {
      // Calculamos el centro de todas las respuestas del usuario
      const bounds = new window.google.maps.LatLngBounds();
      userAnswers.forEach((answer) => {
        const lat = parseFloat(answer.lat);
        const lng = parseFloat(answer.lng);
        console.log("➕ Adding to bounds:", lat, lng);
        bounds.extend({ lat, lng });
      });

      console.log("✅ Fitting bounds to map");
      mapRef.fitBounds(bounds);

      // Si solo hay un punto, hacemos zoom
      if (userAnswers.length === 1) {
        setTimeout(() => {
          console.log("🔍 Setting zoom to 16");
          mapRef.setZoom(16);
        }, 100);
      }
    } else {
      console.warn("⚠️ No answers found for this user");
    }
  };

  const onMapLoad = (map) => {
    setMapRef(map);
    // Agregar listener para activar interacción al primer click/touch
    map.addListener("click", () => {
      if (!isMapInteractive) {
        setIsMapInteractive(true);
        map.setOptions({ scrollwheel: true });
      }
    });
  };

  if (!isLoaded)
    return (
      <div className="w-full h-[400px] bg-[var(--card-background)] rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );

  // Procesar las respuestas para asegurar que tengan la estructura correcta
  const processedAnswers = answers
    .filter((answer) => answer.lat && answer.lng) // Solo respuestas con coordenadas
    .map((answer, index) => ({
      ...answer,
      lat: parseFloat(answer.lat),
      lng: parseFloat(answer.lng),
      index: index + 1, // Guardamos el índice para mostrarlo en el marcador
    }))
    .filter((answer) => !isNaN(answer.lat) && !isNaN(answer.lng));

  console.log("🗺️ SurveyMap RENDER");
  console.log("📍 Total processedAnswers:", processedAnswers.length);
  console.log("👁️ mostrarTodos:", mostrarTodos);
  console.log("👥 selectedUsers:", selectedUsers);
  console.log(
    "🎨 userColors:",
    Object.keys(userColors).length,
    "colors assigned"
  );

  return (
    <div className="relative w-full">
      <GoogleMap
        id="survey-map"
        mapContainerStyle={{ ...baseContainerStyle, height }}
        zoom={mapZoom}
        center={mapCenter}
        options={{
          ...defaultOptions,
          styles: isDarkMode ? darkMapStyle : [],
        }}
        onLoad={onMapLoad}
      >
        {processedAnswers.map((mark, idx) => {
          if (!mostrarTodos && !selectedUsers.includes(mark.userId)) {
            return null;
          }

          // Crear marcador personalizado más grande y visible
          const customIcon = {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: userColors[mark.userId],
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 3,
            scale: 16,
          };

          return (
            <Marker
              key={mark._id}
              position={{ lat: mark.lat, lng: mark.lng }}
              onClick={() => handleMarkerClick(mark)}
              icon={customIcon}
              zIndex={1000}
            />
          );
        })}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div style={{ 
              padding: '12px', 
              maxWidth: '280px',
              backgroundColor: '#ffffff',
              color: '#1f2937'
            }}>
              <div style={{ 
                borderBottom: '1px solid #e5e7eb', 
                paddingBottom: '8px', 
                marginBottom: '8px' 
              }}>
                <p style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px', 
                  color: '#111827',
                  margin: '0 0 4px 0'
                }}>
                  Caso #{selectedMarker.index}
                </p>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#374151',
                  fontWeight: '500',
                  margin: '0 0 4px 0'
                }}>
                  {selectedMarker.fullName || 'Sin nombre'}
                </p>
                {selectedMarker.createdAt && (
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    margin: '0 0 2px 0'
                  }}>
                    📅 {formatDate(selectedMarker.createdAt)}
                  </p>
                )}
                {selectedMarker.time && selectedMarker.time > 0 && (
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    margin: '0'
                  }}>
                    ⏱️ Duración: {Math.round(selectedMarker.time / 60)} min
                  </p>
                )}
              </div>
              {selectedMarker.quotaAnswers &&
                Object.keys(selectedMarker.quotaAnswers).length > 0 && (
                  <>
                    <p style={{ 
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#111827',
                      margin: '0 0 6px 0'
                    }}>
                      Cuotas:
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '4px',
                      margin: '0'
                    }}>
                      {Object.entries(selectedMarker.quotaAnswers).map(
                        ([key, value]) => (
                          <span
                            key={key}
                            style={{
                              fontSize: '11px',
                              padding: '4px 8px',
                              backgroundColor: '#e0e7ff',
                              color: '#4338ca',
                              borderRadius: '12px',
                              fontWeight: '500',
                              display: 'inline-block'
                            }}
                          >
                            {key}: {value}
                          </span>
                        )
                      )}
                    </div>
                  </>
                )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      {/* Floating actions (mobile friendly) */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-2">
        <button
          type="button"
          className="p-2 rounded-lg shadow-md bg-white dark:bg-slate-800 text-[var(--text-primary)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)]"
          title="Centrar en mi ubicación"
          onClick={() => {
            if (mapRef) {
              mapRef.panTo(userLocation);
              mapRef.setZoom(14);
              setShowUserLocation(true);
            }
          }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
        {typeof onOpenList === "function" && (
          <button
            type="button"
            className="p-2 rounded-lg shadow-md bg-white dark:bg-slate-800 text-[var(--text-primary)] hover:bg-[var(--hover-bg)] border border-[var(--card-border)]"
            title="Ver lista"
            onClick={() => onOpenList()}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
      </div>
      {!isMapInteractive && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-lg cursor-pointer"
          onClick={() => {
            setIsMapInteractive(true);
            mapRef?.setOptions({ scrollwheel: true });
          }}
        >
          <div className="bg-white/90 dark:bg-[var(--card-background)] p-4 rounded-lg shadow-lg text-center">
            <p className="text-sm font-medium mb-1">
              Haz clic para interactuar con el mapa
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Podrás hacer zoom y desplazarte
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyMap;
