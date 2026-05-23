"use client";

import { useState, useEffect,useRef } from "react";
import axios from "axios";
// Notice Edit2 is added to the imports here
import { Clock, Plus, Trash2, Sparkles, Loader2, AlertCircle, MapPin, Edit2,Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EditEventModal from "./EditEventModal";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";
// Remove this: import html2canvas from "html2canvas";
import { toPng } from "html-to-image"; // Add this instead
import jsPDF from "jspdf";
interface ItenaryEvent {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    intensity_level: "CHILL" | "MEDIUM" | "INTENSE";
}

interface ItenaryListTabProps {
    tripId: string;
}

export default function ItenaryListTab({ tripId }: ItenaryListTabProps) {
    const [events, setEvents] = useState<ItenaryEvent[]>([]);
    const [title, setTitle] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [intensity, setIntensity] = useState<"CHILL" | "MEDIUM" | "INTENSE">("MEDIUM");

    const [blankDate, setBlankDate] = useState(""); // for empty day(no events)

    const [isLoading, setIsLoading] = useState(true);
    // We change this to a string so we can show a loading spinner only on the specific day clicked
    const [isFillingGaps, setIsFillingGaps] = useState<string | false>(false);
    const [errorNotice, setErrorNotice] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<ItenaryEvent | null>(null);

    // NEW: Ref and State for PDF Export
    const printRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    
    // Function to trigger the modal
    const handleEditClick = (event: ItenaryEvent) => {
        setEventToEdit(event);
        setIsEditModalOpen(true);
    };
    
    // Function to handle the state update after a successful save
    const handleEventUpdated = (updatedEvent: ItenaryEvent) => {
        // Map over your current events array and replace the old one with the updated one
        setEvents(events.map(evt => evt.id === updatedEvent.id ? updatedEvent : evt));
    };

    // 1. Fetch Timeline Events
    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // ADDED CACHE BUSTER TO FORCE A REAL REFRESH
            const res = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/itenary?_t=${Date.now()}`,
                config
            );

            console.log("Response from API:", res); // Added this line to log the entire response

            const payload = res.data;
            const extractedArray = payload.data || payload.events || payload;
            setEvents(Array.isArray(extractedArray) ? extractedArray : []);
        } catch (error) {
            console.error("Failed to fetch itenary events:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (tripId) fetchEvents();
    }, [tripId]);

    // 2. Manual Event Ingestion
    const handleAddEvent = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!title.trim() || !startTime || !endTime) {
            setErrorNotice("Please fill in all required fields.");
            return;
        }

        if (new Date(endTime) < new Date(startTime)) {
            setErrorNotice("End time cannot be before start time.");
            return;
        }
        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/itenary`,
                {
                    title,
                    start_time: new Date(startTime).toISOString(),
                    end_time: new Date(endTime).toISOString(),
                    intensity_level: intensity
                },
                config
            );

            setTitle("");
            setStartTime("");
            setEndTime("");
            await fetchEvents(); // Refresh state cleanly from the source of truth
        } catch (error: any) {
            console.error("Failed to append event:", error);
            setErrorNotice(error.response?.data?.message || "Failed to create event manually.");
        }
    };

    // 3. AI Fill-The-Gaps Trigger
    const handleFillGaps = async (targetDateStr: string) => {
        setIsFillingGaps(targetDateStr);
        setErrorNotice(null);

        try {
            // Safely format "Wednesday, May 20, 2026" into "2026-05-20"
            const d = new Date(targetDateStr);
            const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // SWITCHED TO POST AND MOVED DATE TO URL PARAM TO MATCH EXISTING BACKEND LOGIC
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/itenary/fill-gaps?date=${formattedDate}`,
                {}, // Empty body
                config
            );
            await fetchEvents();
        } catch (error: any) {
            console.error("AI Fill Gaps execution failed:", error);
            setErrorNotice(error.response?.data?.message || "The AI optimizer failed to calculate suggestions.");
        } finally {
            setIsFillingGaps(false);
        }
    };

    // 4. Delete Event Row
    const handleDeleteEvent = async (eventId: string) => {
        setEvents(events.filter(e => e.id !== eventId));
        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/itenary/${eventId}`, config);
        } catch (error) {
            console.error("Failed to destroy event record:", error);
        }
    };

    // NEW: PDF Export Logic using html-to-image
    const handleExportPDF = async () => {
        if (!printRef.current) return;
        
        setIsExporting(true);
        const toastId = toast.loading("Generating your itinerary PDF...");
        
        try {
            // Filter function to hide buttons with data-html2canvas-ignore="true"
            const filterNode = (node: HTMLElement) => {
                if (node?.getAttribute && node.getAttribute('data-html2canvas-ignore') === 'true') {
                    return false;
                }
                return true;
            };

            // Use toPng instead of html2canvas
            const imgData = await toPng(printRef.current, { 
                pixelRatio: 2, // High resolution capture
                backgroundColor: "#ffffff",
                filter: filterNode as any
            });
            
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgWidth = pdfWidth;
            const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = pdfImgHeight;
            let position = 0;
            
            // Add first page
            pdf.addImage(imgData, 'PNG', 0, position, pdfImgWidth, pdfImgHeight);
            heightLeft -= pdfHeight;
            
            // Loop through and add new pages if the itinerary is long
            while (heightLeft >= 0) {
                position = heightLeft - pdfImgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfImgWidth, pdfImgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save("Wandrly-Itinerary.pdf");
            toast.success("PDF downloaded successfully!", { id: toastId });
        } catch (error) {
            console.error("PDF Export failed:", error);
            toast.error("Failed to generate PDF. Please try again.", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };


    const formatEventTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    };

    
    // --- NEW: THE DAILY GROUPING ENGINE ---
    // 1. Sort the raw array purely chronologically first (oldest to newest)
    const sortedEvents = [...events].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    // 2. Group the sorted events by their calendar date string
    const groupedEvents = sortedEvents.reduce((acc: Record<string, ItenaryEvent[]>, event) => {
        // Extract just the date part (e.g., "May 20, 2026")
        const dateKey = new Date(event.start_time).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });
        
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
    }, {});
    if (isLoading) {
        return (
            <div className="w-full max-w-3xl mx-auto space-y-4 text-left">
                {/* 1. Manual Input Form Skeleton */}
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div className="md:col-span-2 space-y-1.5">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-10" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="md:col-span-5 flex justify-between pt-2 border-t border-zinc-100 mt-2">
                            <Skeleton className="h-9 w-40 rounded-md" />
                        </div>
                    </div>
                </div>

                {/* 2. AI Blank Day Tool Skeleton */}
                <div className="flex items-center gap-3 bg-zinc-50/80 p-4 rounded-xl border border-zinc-100 shadow-sm">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-72" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-36 rounded-md" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                </div>

                {/* 3. The Visual Timeline Skeleton */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
                    <div className="space-y-10">
                        {/* We loop through 2 "Days" to make it look full */}
                        {[1, 2].map((dayIndex) => (
                            <div key={dayIndex} className="relative">
                                {/* Day Header Skeleton */}
                                <div className="flex items-center justify-between py-2 mb-4 -ml-2 pl-2 border-b border-zinc-100">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-2 w-2 rounded-full" />
                                        <Skeleton className="h-4 w-40" />
                                    </div>
                                    <Skeleton className="h-7 w-28 rounded-md" />
                                </div>

                                {/* Timeline Line & Cards Skeleton */}
                                <div className="relative border-l border-zinc-200 pl-6 ml-2 space-y-5">
                                    {/* We loop through 2 "Events" per day */}
                                    {[1, 2].map((eventIndex) => (
                                        <div key={eventIndex} className="relative group">
                                            {/* Bullet Anchor Skeleton */}
                                            <div className="absolute -left-7.5 top-4 bg-zinc-200 border-2 border-white rounded-full h-3.5 w-3.5" />
                                            
                                            {/* Event Card Skeleton */}
                                            <div className="bg-zinc-50/50 border border-zinc-100 p-4 rounded-xl shadow-sm space-y-2.5">
                                                <Skeleton className="h-5 w-2/3" />
                                                <Skeleton className="h-3 w-full" />
                                                <Skeleton className="h-3 w-4/5" />
                                                <div className="flex items-center gap-4 pt-2">
                                                    <Skeleton className="h-6 w-32 rounded-md" />
                                                    <Skeleton className="h-6 w-20 rounded-md" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="w-full max-w-3xl mx-auto space-y-4 text-left">
            {/* System Banner Layer */}
            {errorNotice && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">Schedule Conflict / Failure</p>
                        <p className="text-xs text-red-700 mt-0.5">{errorNotice}</p>
                    </div>
                </div>
            )}

            {/* Manual Input Form + AI Action Deck */}
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500">Activity Title</label>
                        <Input placeholder="E.g., Dinner at Bistro, Scuba Diving..." value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500">Start Date & Time</label>
                        <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500">End Date & Time</label>
                        <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500">Vibe</label>
                        <select
                            value={intensity}
                            onChange={(e) => setIntensity(e.target.value as any)}
                            className="flex h-9 w-full items-center justify-between rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                        >
                            <option value="CHILL">Chill</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="INTENSE">Intense</option>
                        </select>
                    </div>

                    <div className="md:col-span-5 flex justify-between gap-4 pt-2 border-t border-zinc-100 mt-2">
                        <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Log Custom Event
                        </Button>
                    </div>
                </form>
            </div>

            {/* AI Blank Day Tool */}
            <div className="flex items-center gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                <div className="flex-1">
                    <h4 className="text-sm font-semibold text-emerald-900">Plan a Completely Blank Day</h4>
                    <p className="text-xs text-emerald-700">Select a date with no events, and AI will build a full-day itinerary.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={blankDate}
                        onChange={(e) => setBlankDate(e.target.value)}
                        className="h-8 text-xs w-36 bg-white"
                    />
                    <Button
                        type="button"
                        onClick={() => handleFillGaps(blankDate)}
                        disabled={!blankDate || isFillingGaps === blankDate}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isFillingGaps === blankDate ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                        Generate
                    </Button>
                </div>
            </div>

            {/* NEW: Export Header */}
            <div className="flex justify-between items-end pt-4 pb-2">
                <h3 className="text-lg font-bold text-zinc-900 px-1">Your Journey Timeline</h3>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportPDF} 
                    disabled={isExporting || Object.keys(groupedEvents).length === 0}
                    className="h-8 text-xs font-semibold"
                >
                    {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                    {isExporting ? "Exporting..." : "Export to PDF"}
                </Button>
            </div>

            {/* The Visual Timeline Loop (Grouped by Day) */}
            <div ref={printRef} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
                {Object.keys(groupedEvents).length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-sm">
                        Your schedule timeline is empty. Add your flights, accommodations, or click the AI optimizer to populate recommendations.
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.keys(groupedEvents).map((dateKey) => (
                            <div key={dateKey} className="relative">

                                {/* 1. The Day Header with per-day AI Button */}
                                <div className="flex items-center justify-between sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 mb-4 -ml-2 pl-2 border-b border-zinc-100">
                                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        {dateKey}
                                    </h3>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleFillGaps(dateKey)}
                                        disabled={isFillingGaps === dateKey}
                                        data-html2canvas-ignore="true"
                                        className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50 transition-colors"
                                    >
                                        {isFillingGaps === dateKey ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1.5" />}
                                        {isFillingGaps === dateKey ? "Analyzing..." : "Optimize Day"}
                                    </Button>
                                </div>

                                {/* 2. The Timeline for this specific day */}
                                <div className="relative border-l border-zinc-200 pl-6 ml-2 space-y-5">
                                    {groupedEvents[dateKey].map((event) => (
                                        <div key={event.id} className="relative group">

                                            {/* Timeline Bullet Anchor */}
                                            <div className="absolute -left-7.75 top-4 bg-white border-2 border-zinc-300 rounded-full h-3.5 w-3.5 flex items-center justify-center group-hover:border-zinc-500 transition-colors">
                                                <div className="h-1 w-1 bg-zinc-300 rounded-full group-hover:bg-zinc-500 transition-colors" />
                                            </div>

                                            {/* Event Card */}
                                            <div className="flex items-start justify-between bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-100 p-4 rounded-xl transition-all shadow-sm">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-semibold text-zinc-900">{event.title}</h4>
                                                    {event.description && (
                                                        <p className="text-xs text-zinc-500 leading-relaxed max-w-xl pb-1">
                                                            {event.description}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-500">
                                                        <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-zinc-100 shadow-sm">
                                                            <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                                            {formatEventTime(event.start_time)} — {formatEventTime(event.end_time)}
                                                        </span>
                                                        <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${event.intensity_level === "INTENSE" ? "bg-red-50 text-red-700 border border-red-100" :
                                                            event.intensity_level === "CHILL" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-orange-50 text-orange-700 border border-orange-100"
                                                            }`}>
                                                            {event.intensity_level} VIBE
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* FIXED: Edit and Delete Buttons are now grouped together here */}
                                                <div data-html2canvas-ignore="true" className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button 
                                                        onClick={() => handleEditClick(event)} 
                                                        className="p-1.5 text-zinc-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                        title="Edit Event"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteEvent(event.id)} 
                                                        className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Delete Event"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* FIXED: The Modal is now placed completely outside the loop at the bottom of the component */}
            <EditEventModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                tripId={tripId}
                event={eventToEdit}
                onSuccess={handleEventUpdated}
            />
        </div>
    );
}