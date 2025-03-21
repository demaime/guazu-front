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
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
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
    <div className="w-full h-[600px]">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={14}
        center={defaultCenter}
        options={{
          scrollwheel: false,
          streetViewControl: false,
          mapTypeControl: false
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
  );
};

export default SurveyMap; 