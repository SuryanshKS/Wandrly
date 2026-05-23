"use client";

import { useState, useEffect, useRef, use } from "react";
import axios from "axios";
import { Camera, Loader2, ArrowLeft, Trash2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton"; // NEW SKELETON IMPORT

interface MediaItem {
    id: string; // or id, depending on your database schema
    file_url: string; // The cloudinary URL
    created_at?: string;
    event_id?: string | null;
}

// Add a simple Event interface
interface TripEvent {
    id: string;
    title: string;
}

export default function TravelogueGallery({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const tripId = unwrappedParams.id;
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [errorNotice, setErrorNotice] = useState<string | null>(null);
    const [events, setEvents] = useState<TripEvent[]>([]);

    // Hidden file input reference
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMediaAndEvents = async () => {
        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [mediaRes, eventsRes] = await Promise.all([
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/gallery`, config),
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/travelogue`, config)
            ]);

            setMedia(Array.isArray(mediaRes.data.data) ? mediaRes.data.data : []);

            // // NEW: Robust Event Extractor
            // const rawEvents = eventsRes.data.data || eventsRes.data;
            // let flatEvents = [];

            // if (Array.isArray(rawEvents)) {
            //     // Scenario 1: It's already a flat array
            //     flatEvents = rawEvents;
            // } else if (typeof rawEvents === 'object' && rawEvents !== null) {
            //     // Scenario 2: It's grouped by date. Object.values extracts the arrays, and .flat() merges them!
            //     flatEvents = Object.values(rawEvents).flat();
            // }

            // setEvents(flatEvents);

            setEvents(eventsRes.data.route_markers || []);

        } catch (error) {
            console.error("Failed to fetch gallery data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMediaAndEvents();
    }, [tripId]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setErrorNotice(null);

        // Prepare data for Multer
        const formData = new FormData();
        formData.append("image", file); // This MUST match uploadMiddleware.single('image') in your routes

        try {
            const token = localStorage.getItem("wandrly_token");
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            };

            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/media/upload`, formData, config);
            await fetchMediaAndEvents(); // Refresh the gallery to show the new image

        } catch (error: any) {
            console.error("Upload failed:", error);
            setErrorNotice(error.response?.data?.message || "Failed to upload image to Cloudinary.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset the input
        }
    };

    const handleDelete = async (mediaId: string) => {
        // Optimistic UI removal for a snappy user experience
        setMedia(media.filter(m => m.id !== mediaId));
        try {
            const token = localStorage.getItem("wandrly_token");
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/media/${mediaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Delete failed:", error);
            fetchMediaAndEvents(); // Revert the UI if the server fails
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 pb-24">
                {/* 1. Navbar Skeleton (Matching the real one exactly) */}
                <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-zinc-200 shadow-sm px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div>
                            <Skeleton className="h-6 w-32 mb-1" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-36 rounded-full" />
                </div>

                {/* 2. Masonry Grid Skeleton */}
                <div className="max-w-7xl mx-auto px-6 pt-8">
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                        {/* We map 8 dummy blocks with alternating heights to simulate a masonry grid */}
                        {[300, 450, 250, 350, 400, 200, 300, 400].map((height, i) => (
                            <div key={i} className="break-inside-avoid rounded-2xl overflow-hidden shadow-sm border border-zinc-200 bg-white mb-6 flex flex-col">
                                <Skeleton style={{ height: `${height}px` }} className="w-full rounded-none" />
                                <div className="p-3 bg-zinc-50 border-t border-zinc-100">
                                    <Skeleton className="h-8 w-full rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const handleAssignEvent = async (mediaId: string, eventId: string) => {

        try {
            const token = localStorage.getItem("wandrly_token");
            await axios.patch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/media/${mediaId}/assign`,
                { event_id: eventId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update the local UI state so it feels instant
            setMedia(media.map(m => m.id === mediaId ? { ...m, event_id: eventId === "none" ? null : eventId } : m));
        } catch (error) {
            console.error("Failed to assign event:", error);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 pb-24">
            {/* 1. Sticky Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-zinc-200 shadow-sm px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/trips/${tripId}`}>
                        <button className="p-2 rounded-full hover:bg-zinc-100 transition-colors">
                            <ArrowLeft className="h-5 w-5 text-zinc-600" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900">Travelogue</h1>
                        <p className="text-xs text-zinc-500 font-medium">Your global memories</p>
                    </div>
                </div>

                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium shadow-md rounded-full px-5 py-2.5 transition-colors text-sm"
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        {isUploading ? "Uploading..." : "Upload Photo"}
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pt-8">
                {/* Error Banner */}
                {errorNotice && (
                    <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold">{errorNotice}</p>
                    </div>
                )}

                {/* 2. Masonry Photo Grid */}
                {media.length === 0 ? (
                    <div className="text-center py-32 border-2 border-dashed border-zinc-200 rounded-3xl bg-white">
                        <Camera className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-zinc-700">Your gallery is empty</h3>
                        <p className="text-zinc-500 text-sm mt-2 max-w-sm mx-auto">Upload photos of your itinerary, plane tickets, or memories to build your travelogue.</p>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                        {media.map((item) => (
                            <div key={item.id} className="relative group break-inside-avoid rounded-2xl overflow-hidden shadow-sm border border-zinc-200 bg-white mb-6 flex flex-col">

                                {/* 1. Image & Overlay Wrapper */}
                                <div className="relative">
                                    <img
                                        src={item.file_url}
                                        alt="Travel memory"
                                        className="w-full object-cover transition-transform duration-500"
                                        loading="lazy"
                                    />

                                    {/* Hover Delete Overlay (Now locked strictly to the image area) */}
                                    {/* Added pointer-events-none to the wrapper, and pointer-events-auto to the button so the glass ceiling is shattered! */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-3 pointer-events-none">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="bg-black/50 hover:bg-red-500 backdrop-blur-md p-2 rounded-full text-white transition-colors shadow-sm pointer-events-auto"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* 2. The Event Assignment Bar (Safely below the overlay zone) */}
                                <div className="p-3 bg-zinc-50/80 border-t border-zinc-100 relative z-10">
                                    <select
                                        value={item.event_id || "none"}
                                        onChange={(e) => handleAssignEvent(item.id, e.target.value)}
                                        className="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-md px-2 py-1.5 w-full outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-sm hover:border-zinc-300 transition-colors"
                                    >
                                        <option value="none">Unassigned (General Trip Photo)</option>
                                        {events.map((evt, index) => (
                                            // Using a template literal creates a guaranteed unique key for React
                                            <option key={`${evt.id}-${index}`} value={evt.id}>
                                                📍 {evt.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}