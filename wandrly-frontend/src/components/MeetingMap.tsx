"use client";

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { io, Socket } from "socket.io-client";
import { Loader2, MapPin, Navigation, PowerOff } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

// Fix for default Leaflet icons missing in Next.js
const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// A special glowing icon for the calculated Meeting Point
const meetingPointIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(16, 185, 129, 0.8); animation: pulse 2s infinite;"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

interface LocationState {
    lat: number;
    lng: number;
    timestamp: string;
}

interface MeetingMapProps {
    eventId: string;
    userId: string;
    userName: string;
}

// Helper component to auto-recenter the map when the meeting point changes
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
    }, [lat, lng, map]);
    return null;
}

export default function MeetingMap({ eventId, userId, userName }: MeetingMapProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [myLocation, setMyLocation] = useState<LocationState | null>(null);
    const [peerLocations, setPeerLocations] = useState<Record<string, LocationState>>({});
    const [watchId, setWatchId] = useState<number | null>(null);

    // 1. Initialize Socket Connection
    useEffect(() => {
        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", {
            transports: ["websocket"],
        });
        setSocket(newSocket);

        newSocket.on("location_updated", (data: { userId: string; lat: number; lng: number; timestamp: string }) => {
            setPeerLocations((prev) => ({
                ...prev,
                [data.userId]: { lat: data.lat, lng: data.lng, timestamp: data.timestamp },
            }));
        });

        newSocket.on("member_left_map", (data: { userId: string }) => {
            setPeerLocations((prev) => {
                const updated = { ...prev };
                delete updated[data.userId];
                return updated;
            });
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // 2. The Geographic Centroid Math (The Optimal Meeting Point)
    const meetingPoint = useMemo(() => {
        const allLats = [];
        const allLngs = [];

        if (myLocation) {
            allLats.push(myLocation.lat);
            allLngs.push(myLocation.lng);
        }

        Object.values(peerLocations).forEach((loc) => {
            allLats.push(loc.lat);
            allLngs.push(loc.lng);
        });

        if (allLats.length === 0) return null;

        // Calculate the exact geographic center (average of all coordinates)
        const avgLat = allLats.reduce((sum, val) => sum + val, 0) / allLats.length;
        const avgLng = allLngs.reduce((sum, val) => sum + val, 0) / allLngs.length;

        return { lat: avgLat, lng: avgLng };
    }, [myLocation, peerLocations]);

    // 3. Toggle Live Location Sharing
    const toggleLocationSharing = () => {
        if (!socket) return;

        if (isSharing) {
            // Turn Off
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
            setIsSharing(false);
            setMyLocation(null);
            socket.emit("leave_meeting_point", { eventId, userId, userName });
        } else {
            // Turn On
            socket.emit("join_meeting_room", { eventId, userId, userName });
            setIsSharing(true);

            const id = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMyLocation({ lat: latitude, lng: longitude, timestamp: new Date().toISOString() });

                    socket.emit("share_location", {
                        eventId,
                        userId,
                        lat: latitude,
                        lng: longitude,
                    });
                },
                (error) => {
                    // Destructure the exact error for better debugging
                    console.error(`GPS Error (${error.code}): ${error.message}`);

                    // Provide UI feedback based on the exact failure reason
                    if (error.code === 1) {
                        // alert("Location access denied. Please enable location permissions in your browser settings.");
                        toast.error("Location access denied. Please enable location permissions in your browser settings.");
                    } else if (error.code === 3) {
                        // alert("GPS signal timeout. Ensure you have a clear view of the sky or are connected to Wi-Fi.");
                        toast.error("GPS signal timeout. Ensure you have a clear view of the sky or are connected to Wi-Fi.");

                    } else {
                        // alert("Unable to determine your location. Please try again.");
                        toast.error("Unable to determine your location. Please try again.");

                    }

                    // CRITICAL: Reset the UI state so the button doesn't get stuck on "Stop Broadcasting"
                    setIsSharing(false);
                    setWatchId(null);
                    socket.emit("leave_meeting_point", { eventId, userId, userName });
                },
                {
                    enableHighAccuracy: true,
                    // Increase maxAge to accept a location cached within the last 10 seconds
                    maximumAge: 10000,
                    // Give the browser 15 seconds to lock on instead of 5
                    timeout: 15000
                }
            );
            setWatchId(id);
        }
    };

    // Cleanup GPS watcher on unmount
    useEffect(() => {
        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [watchId]);

    return (
        <div className="relative w-full h-150 bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 shadow-sm">

            {/* Floating Control Deck */}
            <div className="absolute top-4 right-4 z-400 flex flex-col gap-2">
                <button
                    onClick={toggleLocationSharing}
                    className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all ${isSharing
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                >
                    {isSharing ? <PowerOff className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
                    {isSharing ? "Stop Broadcasting" : "Broadcast Location"}
                </button>

                {isSharing && meetingPoint && (
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-zinc-200">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Active Squad</h4>
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            You + {Object.keys(peerLocations).length} others
                        </div>
                    </div>
                )}
            </div>

            {/* The Map */}
            <MapContainer
                center={meetingPoint ? [meetingPoint.lat, meetingPoint.lng] : [28.6139, 77.2090]} // Defaults to Delhi if no data
                zoom={13}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {meetingPoint && <RecenterMap lat={meetingPoint.lat} lng={meetingPoint.lng} />}

                {/* Render My Location */}
                {myLocation && (
                    <Marker position={[myLocation.lat, myLocation.lng]} icon={defaultIcon}>
                        <Popup><strong>You</strong> are here.</Popup>
                    </Marker>
                )}

                {/* Render Friends' Locations */}
                {Object.entries(peerLocations).map(([peerId, loc]) => (
                    <Marker key={peerId} position={[loc.lat, loc.lng]} icon={defaultIcon}>
                        <Popup>Friend updating live...</Popup>
                    </Marker>
                ))}

                {/* The Computed Meeting Point */}
                {meetingPoint && Object.keys(peerLocations).length > 0 && (
                    <Marker position={[meetingPoint.lat, meetingPoint.lng]} icon={meetingPointIcon}>
                        <Popup>
                            <strong>Optimal Meeting Point</strong><br />
                            Exact geographic center of the group.
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}