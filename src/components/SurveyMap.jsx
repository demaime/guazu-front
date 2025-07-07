"use client";

import { useState, useEffect } from "react";
import {
  GoogleMap,
  useLoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

const libraries = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = {
  lat: -31.6350688,
  lng: -60.7053478,
};

const markerColors = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
  "pink",
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
}) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [userColors, setUserColors] = useState({});
  const [mapRef, setMapRef] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(14);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMapInteractive, setIsMapInteractive] = useState(false);

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

  // Asignar colores a los usuarios
  useEffect(() => {
    const uniqueUsers = [...new Set(answers.map((a) => a.userId))];
    const colors = {};
    uniqueUsers.forEach((userId, index) => {
      colors[userId] = markerColors[index % markerColors.length];
    });
    setUserColors(colors);
  }, [answers]);

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
    const userAnswers = answers.filter(
      (a) => a.userId === userId && a.lat && a.lng
    );
    if (userAnswers.length > 0) {
      // Calculamos el centro de todas las respuestas del usuario
      const bounds = new window.google.maps.LatLngBounds();
      userAnswers.forEach((answer) => {
        bounds.extend({
          lat: parseFloat(answer.lat),
          lng: parseFloat(answer.lng),
        });
      });

      if (mapRef) {
        mapRef.fitBounds(bounds);
        // Si solo hay un punto, hacemos zoom
        if (userAnswers.length === 1) {
          setTimeout(() => {
            mapRef.setZoom(16);
          }, 100);
        }
      }
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

  return (
    <div className="relative w-full">
      <GoogleMap
        id="survey-map"
        mapContainerStyle={mapContainerStyle}
        zoom={mapZoom}
        center={mapCenter}
        options={{
          ...defaultOptions,
          styles: isDarkMode ? darkMapStyle : [],
        }}
        onLoad={onMapLoad}
      >
        {processedAnswers.map((mark) => {
          if (!mostrarTodos && !selectedUsers.includes(mark.userId))
            return null;

          const iconUrl = `http://maps.google.com/mapfiles/ms/icons/${
            userColors[mark.userId]
          }-dot.png`;

          return (
            <Marker
              key={mark._id}
              position={{ lat: mark.lat, lng: mark.lng }}
              onClick={() => handleMarkerClick(mark)}
              icon={{
                url: iconUrl,
                scaledSize: new window.google.maps.Size(30, 30),
              }}
              label={{
                text: mark.index.toString(),
                color: "white",
                fontSize: "12px",
              }}
            />
          );
        })}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 max-w-sm text-gray-800">
              <div className="border-b pb-2 mb-2 border-[var(--card-border)]">
                <p className="font-semibold text-sm">
                  Encuesta #{selectedMarker.index}
                </p>
                <p className="text-sm">Por: {selectedMarker.fullName}</p>
                <p className="text-xs">
                  {selectedMarker.createdAt &&
                    formatDate(selectedMarker.createdAt)}
                  {selectedMarker.offline && " (Offline)"}
                </p>
                {selectedMarker.time && (
                  <p className="text-xs">
                    Tiempo: {selectedMarker.time} segundos
                  </p>
                )}
              </div>
              {selectedMarker.answer &&
                Object.keys(selectedMarker.answer).length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Respuestas:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {Object.entries(selectedMarker.answer).map(
                        ([key, value]) => {
                          // Removed the logic relying on getReadableAnswer for displaying the value
                          // const question = survey?.pages?.[0]?.elements?.find(
                          //   (q) => q.name === key
                          // );
                          // const questionTitle = question?.title || key;
                          // const readableValue = getReadableAnswer(
                          //   survey,
                          //   key,
                          //   value
                          // );

                          // Direct rendering logic
                          let displayValue;
                          if (
                            typeof value === "object" &&
                            value !== null &&
                            !Array.isArray(value)
                          ) {
                            // Format object values (e.g., matrix)
                            displayValue = Object.entries(value)
                              .map(
                                ([objKey, objValue]) => `${objKey}: ${objValue}`
                              )
                              .join(", ");
                          } else if (Array.isArray(value)) {
                            // Format array values (e.g., multiple choice)
                            displayValue = value.join(", ");
                          } else {
                            // Display other values directly
                            displayValue = String(value);
                          }

                          return (
                            <div key={key} className="ml-2">
                              <span className="font-medium">{key}:</span>{" "}
                              <span>{displayValue}</span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
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
