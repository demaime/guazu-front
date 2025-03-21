'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = {
  lat: -31.6350688,
  lng: -60.7053478
};

const markerColors = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'
];

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const SurveyMap = ({ answers = [], mostrarTodos = true, selectedUsers = [] }) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [userColors, setUserColors] = useState({});
  const [mapRef, setMapRef] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(14);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries
  });

  useEffect(() => {
    if (navigator.geolocation) {
      const geoOptions = {
        timeout: 10 * 1000
      };

      const geoSuccess = (pos) => {
        const newLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(newLocation);
        setMapCenter(newLocation);
      };

      const geoError = (error) => {
        console.log('Error occurred. Error code: ' + error.code);
      };

      navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
    }
  }, []);

  // Asignar colores a los usuarios
  useEffect(() => {
    const uniqueUsers = [...new Set(answers.map(a => a.userId))];
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
    const userAnswers = answers.filter(a => a.userId === userId && a.lat && a.lng);
    if (userAnswers.length > 0) {
      // Calculamos el centro de todas las respuestas del usuario
      const bounds = new window.google.maps.LatLngBounds();
      userAnswers.forEach(answer => {
        bounds.extend({ lat: parseFloat(answer.lat), lng: parseFloat(answer.lng) });
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
  };

  if (!isLoaded) return <div>Loading...</div>;

  // Procesar las respuestas para asegurar que tengan la estructura correcta
  const processedAnswers = answers
    .filter(answer => answer.lat && answer.lng) // Solo respuestas con coordenadas
    .map((answer, index) => ({
      ...answer,
      lat: parseFloat(answer.lat),
      lng: parseFloat(answer.lng),
      index: index + 1 // Guardamos el índice para mostrarlo en el marcador
    }))
    .filter(answer => !isNaN(answer.lat) && !isNaN(answer.lng));

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(userColors).map(([userId, color]) => {
          const user = answers.find(a => a.userId === userId);
          if (!user) return null;
          return (
            <button
              key={userId}
              onClick={() => centerOnUser(userId)}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-[var(--card-background)] shadow-sm border border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--primary-light)]"
            >
              <span 
                className="w-3 h-3 rounded-full mr-2 ring-2 ring-[var(--card-background)] shadow-sm" 
                style={{ backgroundColor: color }}
              />
              <span className="truncate max-w-[200px] text-[var(--text-primary)]">
                {user.fullName || `Encuestador ${userId}`}
              </span>
            </button>
          );
        })}
      </div>
      
      <div className="h-[600px]">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={mapZoom}
          center={mapCenter}
          onLoad={onMapLoad}
          options={{
            scrollwheel: true, // Habilitamos el zoom con la rueda del mouse
            streetViewControl: true,
            mapTypeControl: true,
            mapTypeControlOptions: {
              position: window.google.maps.ControlPosition.TOP_RIGHT
            },
            zoomControl: true,
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.RIGHT_CENTER
            }
          }}
        >
          {processedAnswers.map((mark) => {
            if (!mostrarTodos && !selectedUsers.includes(mark.userId)) return null;

            const iconUrl = `http://maps.google.com/mapfiles/ms/icons/${userColors[mark.userId]}-dot.png`;

            return (
              <Marker
                key={mark._id}
                position={{ lat: mark.lat, lng: mark.lng }}
                onClick={() => handleMarkerClick(mark)}
                icon={{
                  url: iconUrl,
                  scaledSize: new window.google.maps.Size(30, 30)
                }}
                label={{
                  text: mark.index.toString(),
                  color: 'white',
                  fontSize: '12px'
                }}
              />
            );
          })}

          {selectedMarker && (
            <InfoWindow
              position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-2 max-w-sm">
                <div className="border-b pb-2 mb-2">
                  <p className="font-semibold text-sm">Encuesta #{selectedMarker.index}</p>
                  <p className="text-sm">Por: {selectedMarker.fullName}</p>
                  <p className="text-xs text-gray-600">
                    {selectedMarker.createdAt && formatDate(selectedMarker.createdAt)}
                    {selectedMarker.offline && ' (Offline)'}
                  </p>
                  {selectedMarker.time && (
                    <p className="text-xs text-gray-600">
                      Tiempo: {selectedMarker.time} segundos
                    </p>
                  )}
                </div>
                {selectedMarker.answer && Object.keys(selectedMarker.answer).length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Respuestas:</p>
                    <div className="max-h-40 overflow-y-auto">
                      {Object.entries(selectedMarker.answer).map(([key, value]) => (
                        <div key={key} className="ml-2 mb-1">
                          <span className="font-medium">{key}:</span>{' '}
                          {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
};

export default SurveyMap; 