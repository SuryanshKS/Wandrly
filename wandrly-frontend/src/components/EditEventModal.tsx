"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { X, Loader2, AlertCircle, MapPin, Clock, Activity, Type } from "lucide-react";

interface ItineraryEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  intensity_level: "CHILL" | "MEDIUM" | "INTENSE";
  lat?: number | null;
  lng?: number | null;
}

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  event: ItineraryEvent | null;
  onSuccess: (updatedEvent: ItineraryEvent) => void;
}

// Helper to convert UTC ISO string to local datetime-local format (YYYY-MM-DDThh:mm)
const formatForInput = (isoString?: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default function EditEventModal({ isOpen, onClose, tripId, event, onSuccess }: EditEventModalProps) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [intensity, setIntensity] = useState<"CHILL" | "MEDIUM" | "INTENSE">("MEDIUM");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate form when modal opens or event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setStartTime(formatForInput(event.start_time));
      setEndTime(formatForInput(event.end_time));
      setIntensity(event.intensity_level || "MEDIUM");
      setLat(event.lat ? event.lat.toString() : "");
      setLng(event.lng ? event.lng.toString() : "");
      setErrorMsg(null);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("wandrly_token");
      
      // Build payload, converting strings back to correct types
      const payload = {
        title,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        intensity_level: intensity,
        ...(lat && { lat: parseFloat(lat) }),
        ...(lng && { lng: parseFloat(lng) })
      };

      // Note: Using 'itenary' to match your backend route spelling exactly
      const res = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/itenary/${event.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSuccess(res.data.event);
      onClose();
    } catch (error: any) {
      console.error("Failed to update event:", error);
      setErrorMsg(error.response?.data?.message || "Failed to update event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h2 className="text-lg font-bold text-zinc-900">Edit Event</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          {errorMsg && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          )}

          <form id="edit-event-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Title */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 mb-1.5">
                <Type className="h-4 w-4 text-zinc-400" /> Event Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 mb-1.5">
                  <Clock className="h-4 w-4 text-zinc-400" /> Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 mb-1.5">
                  <Clock className="h-4 w-4 text-zinc-400" /> End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Intensity */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 mb-1.5">
                <Activity className="h-4 w-4 text-zinc-400" /> Vibe / Intensity
              </label>
              <select
                value={intensity}
                onChange={(e) => setIntensity(e.target.value as "CHILL" | "MEDIUM" | "INTENSE")}
                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="CHILL">Chill (Low Impact)</option>
                <option value="MEDIUM">Medium (Standard Activity)</option>
                <option value="INTENSE">Intense (High Energy)</option>
              </select>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-200 bg-zinc-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-event-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-xl shadow-sm transition-colors flex items-center justify-center min-w-30"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </button>
        </div>

      </div>
    </div>
  );
}