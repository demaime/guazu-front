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

const SurveyMap = ({ answers = [], mostrarTodos = true, selectedUsers = [] }) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);

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

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="w-full h-[600px]">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={14}
        center={defaultCenter}
        options={{
          scrollwheel: false
        }}
      >
        {answers.map((mark, index) => {
          if (!mark.lat || !mark.lng) return null;
          
          if (!mostrarTodos && !selectedUsers.includes(mark.userId)) return null;

          return (
            <Marker
              key={mark._id}
              position={{ lat: mark.lat, lng: mark.lng }}
              onClick={() => handleMarkerClick(mark)}
              label={{
                text: index.toString(),
                fontSize: '12px',
                textAlign: 'center'
              }}
            />
          );
        })}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div>
              <p className="font-semibold">{selectedMarker.fullName}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default SurveyMap; 