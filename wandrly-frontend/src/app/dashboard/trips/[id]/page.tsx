"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Calendar, MapPin, Loader2, Sparkles, Map, ListChecks, Users, Image as ImageIcon, Camera, Activity, ReceiptIndianRupee, BarChart2, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PackingListTab from "@/components/PackingListTab";
import ItenaryListTab from "@/components/ItenaryListTab";
import Link from "next/link";
import TravelogueTimeline from "@/components/TravelogueTimeline";
import VibeCheckDashboard from "@/components/VibeCheckDashboard";
import TripMembersManager from "@/components/TripMembersManager";
import TripExpensesTab from "@/components/TripExpenseTab";
import TripPollsTab from "@/components/TripPollsTab";
import { Skeleton } from "@/components/Skeleton";
import dynamic from "next/dynamic";

// Dynamically import the map to prevent SSR crashes
const LiveMeetingMap = dynamic(() => import("@/components/MeetingMap"), { ssr: false });

interface TripDetails {
    id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    cover_image?: string;
}

interface CurrentUser {
    id: string;
    name: string;
}

export default function TripWorkspace() {
    const params = useParams();
    const router = useRouter();
    const tripId = params.id as string;

    const [trip, setTrip] = useState<TripDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Navigation tabs state
    const [activeTab, setActiveTab] = useState<"itenary" | "packing" | "travelogue" | "vibecheck" | "team" | "expenses" | "polls">("team");

    const [timelineEvents, setTimelineEvents] = useState([]);
    const [pacingData, setPacingData] = useState([]);
    const [isMapOpen, setIsMapOpen] = useState(false);

    // NEW: State to hold the decoded user details
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

    const [isTravelogueLoading, setIsTravelogueLoading] = useState(false);
    const [isVibeCheckLoading, setIsVibeCheckLoading] = useState(false);

    useEffect(() => {
        const fetchTrip = async () => {
            const token = localStorage.getItem("wandrly_token");
            if (!token) {
                router.push("/login");
                return;
            }

            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const decodedData = JSON.parse(jsonPayload);

                setCurrentUser({
                    id: decodedData.id || decodedData.userId,
                    name: decodedData.name || "Trip Member"
                });
            } catch (e) {
                console.error("Failed to decode user token", e);
            }

            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}`, config);
                setTrip(response.data.data);
            } catch (err: any) {
                console.error("Failed to fetch trip:", err);
                setError("Failed to load trip details. It may have been deleted or you don't have access.");
            } finally {
                setIsLoading(false);
            }
        };

        if (tripId) fetchTrip();
    }, [tripId, router]);

    useEffect(() => {
        const fetchTravelogue = async () => {
            setIsTravelogueLoading(true);
            try {
                const token = localStorage.getItem("wandrly_token");
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/travelogue`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTimelineEvents(res.data.route_markers || []);
            } catch (error) {
                console.error("Failed to load travelogue:", error);
            }
            finally {
                setIsTravelogueLoading(false);
            }
        };

        if (tripId && activeTab === "travelogue") fetchTravelogue();
    }, [tripId, activeTab]);

    useEffect(() => {
        const fetchPacing = async () => {
            setIsVibeCheckLoading(true);
            try {
                const token = localStorage.getItem("wandrly_token");
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/analytics/pacing`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPacingData(res.data.pacing_data || []);
            } catch (error) {
                console.error("Failed to load pacing data:", error);
            }
            finally {
                setIsVibeCheckLoading(false);
            }
        };

        if (tripId && activeTab === "vibecheck") fetchPacing();
    }, [tripId, activeTab]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-stone-50 pb-20">
                <div className="relative w-full h-[40vh] min-h-75 bg-stone-200 overflow-hidden border-b border-stone-200">
                    <div className="absolute top-6 left-6 z-10">
                        <Skeleton className="h-9 w-36 bg-stone-300/80 rounded-md" />
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-8 max-w-7xl mx-auto space-y-4">
                        <Skeleton className="h-5 w-48 bg-stone-300/80 rounded-md" />
                        <Skeleton className="h-12 w-2/3 max-w-xl bg-stone-300/80 rounded-lg" />
                        <div className="flex gap-4 pt-2">
                            <Skeleton className="h-9 w-56 bg-stone-300/80 rounded-lg" />
                            <Skeleton className="h-9 w-40 bg-stone-300/80 rounded-lg" />
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                    <div className="flex items-center justify-center gap-2 border-b border-stone-200 pb-1 mb-8 overflow-x-auto">
                        <Skeleton className="h-10 w-28 mb-3 rounded-lg" />
                        <Skeleton className="h-10 w-32 mb-3 rounded-lg" />
                        <Skeleton className="h-10 w-32 mb-3 rounded-lg" />
                        <Skeleton className="h-10 w-36 mb-3 rounded-lg" />
                        <Skeleton className="h-10 w-28 mb-3 rounded-lg" />
                        <Skeleton className="h-10 w-24 mb-3 rounded-lg" />
                    </div>
                    <div className="mt-6 max-w-3xl mx-auto space-y-4">
                        <Skeleton className="h-16 w-full rounded-2xl" />
                        <Skeleton className="h-28 w-full rounded-2xl" />
                        <Skeleton className="h-28 w-full rounded-2xl" />
                        <Skeleton className="h-28 w-full rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !trip) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-stone-50 p-4">
                <p className="text-red-500 font-medium mb-4">{error}</p>
                <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 pb-20">

            {/* 1. HERO BANNER */}
            <div className="relative w-full h-[40vh] min-h-75 bg-stone-900 overflow-hidden">
                {trip.cover_image && (
                    <img
                        src={trip.cover_image}
                        alt={trip.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-stone-900/40 to-transparent" />

                <div className="absolute top-6 left-6 z-10">
                    <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md rounded-xl" onClick={() => router.push("/dashboard")}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Terminal
                    </Button>
                </div>

                <div className="absolute bottom-0 left-0 w-full p-8">
                    
                    <div className="flex items-center gap-2 text-stone-200 font-medium mb-2">
                        <MapPin className="h-4 w-4 text-emerald-400" />
                        <span>{trip.destination}</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">{trip.title}</h1>
                    <div className="flex flex-wrap justify-between w-full items-center gap-4 text-sm font-medium text-stone-300">
                        <div className="flex items-center gap-1.5 bg-stone-950/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                            <Calendar className="h-4 w-4 text-emerald-400" />
                            <span>{formatDate(trip.start_date)} - {formatDate(trip.end_date)}</span>
                        </div>
                        
                        {/* RESTORED BUTTON */}
                        <Link href={`/dashboard/trips/${tripId}/gallery`}>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-950/30 backdrop-blur-md border border-white/10 text-stone-300 hover:bg-stone-800/50 hover:text-white transition-all text-sm font-medium">
                                <ImageIcon className="h-4 w-4" /> 
                                View Trip Images
                            </button>
                        </Link>
                    </div>

                </div>
            </div>

            {/* 2. PREMIUM FLOATING TABS */}
            <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-stone-200/60 mb-8 flex items-center justify-center gap-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
                    {[
                        { id: "team", icon: Users, label: "Members" },
                        { id: "itenary", icon: Map, label: "Itinerary" },
                        { id: "packing", icon: ListChecks, label: "Packing" },
                        { id: "travelogue", icon: Camera, label: "Travelogue" },
                        { id: "vibecheck", icon: Activity, label: "Vibe Check" },
                        { id: "expenses", icon: ReceiptIndianRupee, label: "Expenses" },
                        { id: "polls", icon: BarChart2, label: "Polls" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? "bg-stone-900 text-white shadow-md"
                                    : "text-stone-500 hover:text-stone-900 hover:bg-stone-100/50"
                            }`}
                        >
                            <tab.icon className="h-4 w-4" /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* 3. CONTENT AREA */}
                <div className="mt-6">
                    {activeTab === "itenary" && <ItenaryListTab tripId={tripId} />}
                    {activeTab === "packing" && <PackingListTab tripId={tripId} />}
                    {activeTab === "travelogue" && <TravelogueTimeline events={timelineEvents} isLoading={isTravelogueLoading} />}
                    {activeTab === "vibecheck" && <VibeCheckDashboard pacingData={pacingData} isLoading={isVibeCheckLoading} />}
                    {activeTab === "team" && <TripMembersManager tripId={tripId} />}
                    {activeTab === "expenses" && <TripExpensesTab tripId={tripId} />}
                    {activeTab === "polls" && <TripPollsTab tripId={tripId} />}
                </div>
            </div>

            {/* FAB */}
            {currentUser && (
                <button
                    onClick={() => setIsMapOpen(true)}
                    className="fixed bottom-8 right-8 z-40 bg-linear-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/30 hover:scale-105 transition-all flex items-center justify-center group"
                >
                    <Navigation className="h-6 w-6 group-hover:animate-pulse" />
                </button>
            )}

            {/* Map Overlay */}
            {isMapOpen && currentUser && (
                <div className="fixed inset-0 z-100 bg-white flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between shadow-sm z-101 bg-white">
                        <div>
                            <h2 className="text-lg font-black text-stone-900">Squad Radar</h2>
                            <p className="text-xs text-stone-500 font-medium">Live tracking is active</p>
                        </div>
                        <button onClick={() => setIsMapOpen(false)} className="p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-stone-200 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-1 w-full relative">
                        <LiveMeetingMap eventId={tripId} userId={currentUser.id} userName={currentUser.name} />
                    </div>
                </div>
            )}
        </div>
    );
};