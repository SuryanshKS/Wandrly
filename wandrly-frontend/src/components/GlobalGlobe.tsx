"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const customIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

export default function GlobalGlobe({ trips }: { trips: any[] }) {
    // Defensive check: If trips are not loaded yet, don't try to render the map
    if (!trips || !Array.isArray(trips)) return null;

    return (
        <MapContainer key={trips.length} center={[20, 0]} zoom={2} className="h-150 w-full rounded-3xl z-0">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {trips.map((trip) => {
                // Only render if coordinates are real
                if (!trip.lat || !trip.lng || (trip.lat === 0 && trip.lng === 0)) return null;

                return (<Marker key={trip.id} position={[trip.lat || 0, trip.lng || 0]} icon={customIcon}>
                    <Popup>
                        <div className="p-2">
                            <h3 className="font-bold text-lg">{trip.title}</h3>
                            <p className="text-sm text-gray-600">{trip.destination}</p>
                        </div>
                    </Popup>
                </Marker>)
            })}
        </MapContainer>
    );
}