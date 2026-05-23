"use client";

import { MapPin, Clock, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from "@/components/Skeleton";

// Define the shape based on your compileChronologicalTravelogue backend output
interface Media {
    id: string;
    file_url: string;
    // add other media fields if needed (e.g., type, public_id)
}

interface TimelineEvent {
    id: string;
    title: string;
    start_time: string; // or time, depending on your schema
    destination?: string;
    media: Media[];
}

interface TravelogueTimelineProps {
    events: TimelineEvent[];
    isLoading?: boolean; // NEW: Allows parent to trigger the skeleton
}

export default function TravelogueTimeline({ events, isLoading = false }: TravelogueTimelineProps) {
    // THE NEW SKELETON LOADER
    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-left">
                <div className="relative border-l-2 border-zinc-100 ml-4 space-y-12 pb-12">
                    {[1, 2].map((i) => (
                        <div key={i} className="relative pl-8">
                            {/* Timeline Node Skeleton */}
                            <span className="absolute -left-2.75 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 ring-4 ring-white">
                                <div className="h-2 w-2 rounded-full bg-zinc-300" />
                            </span>

                            {/* Event Header Skeleton */}
                            <div className="mb-4 space-y-2">
                                <Skeleton className="h-6 w-48" />
                                <div className="flex gap-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>

                            {/* Media Grid Skeleton */}
                            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                                <Skeleton className="aspect-square w-full rounded-2xl" />
                                <Skeleton className="aspect-square w-full rounded-2xl" />
                                {/* Hide the third one on mobile to match responsive grid */}
                                <Skeleton className="aspect-square w-full rounded-2xl hidden md:block" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!events || events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>No travelogue data available yet.</p>
                <p className="text-sm">Assign some photos to your itinerary events to see them here!</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="relative border-l-2 border-zinc-200 ml-4 space-y-12 pb-12">
                {events.map((event, index) => (
                    <div key={event.id} className="relative pl-8">

                        {/* Timeline Node (The Blue Dot) */}
                        <span className="absolute -left-2.75 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                            <div className="h-2 w-2 rounded-full bg-blue-600" />
                        </span>

                        {/* Event Header */}
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                                {event.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-zinc-500 mt-1">
                                {event.start_time && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(event.start_time).toLocaleDateString()} {/* Format as needed */}
                                    </span>
                                )}
                                {event.destination && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {event.destination}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Media Grid */}
                        {event.media && event.media.length > 0 ? (
                            <div className={`grid gap-4 ${event.media.length === 1 ? 'grid-cols-1 md:w-2/3' :
                                    event.media.length === 2 ? 'grid-cols-2' :
                                        'grid-cols-2 md:grid-cols-3'
                                }`}>
                                {event.media.map((item, index) => (
                                    <div
                                        key={item?.id || `media-${index}`}
                                        className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 group cursor-pointer shadow-sm hover:shadow-md transition-all"
                                    >
                                        <img
                                            src={item.file_url}
                                            alt={`Photo from ${event.title}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-zinc-50 rounded-xl p-4 border border-dashed border-zinc-200 text-sm text-zinc-400 inline-block">
                                No photos assigned to this event yet.
                            </div>
                        )}

                    </div>
                ))}
            </div>
        </div>
    );
}