"use client";

import { useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, Calendar, MapPin, Type } from "lucide-react";
import LocationTypeahead from "./LocationTypeahead";

interface NewTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTripCreated: () => void;
}

export default function NewTripModal({ isOpen, onClose, onTripCreated }: NewTripModalProps) {
    const [title, setTitle] = useState("");
    const [destination, setDestination] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");

    // Handle local image preview before uploading
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const token = localStorage.getItem("wandrly_token");

        try {
            // 1. Prepare Multipart Form Data for Cloudinary routing via Express backend
            const formData = new FormData();
            formData.append("title", title);
            formData.append("destination", destination);

            formData.append("start_date", startDate);//as the backend sends in snake_case
            formData.append("end_date", endDate);

            if (image) {
                formData.append("coverImage", image); // Matches your backend multer storage key!
            }

            // 2. Fire Request to Render API
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/trips`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            // 3. Reset state and refresh dashboard data upon success
            setTitle("");
            setDestination("");
            setStartDate("");
            setEndDate("");
            setImage(null);
            setImagePreview(null);
            onTripCreated();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create trip. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-120 border-zinc-200 shadow-2xl bg-white dark:bg-zinc-900 p-6">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-2xl font-bold tracking-tight">Plan a new journey</DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        Set your destination, dates, and cover image to kick off your travelogue.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                            {error}
                        </div>
                    )}

                    {/* Trip Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium">Trip Title</Label>
                        <div className="relative">
                            <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                id="title"
                                placeholder="e.g., Summer Backpacking Tokyo"
                                className="pl-9 h-11"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Destination */}
                    {/* <div className="space-y-2">
                        <Label htmlFor="destination" className="text-sm font-medium">Destination City / Country</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                id="destination"
                                placeholder="e.g., Tokyo, Japan"
                                className="pl-9 h-11"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                required
                            />
                        </div>
                    </div> */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-900">Destination City / Country</label>
                        <LocationTypeahead
                            value={destination}
                            onChange={(val, newLat, newLng) => {
                                setDestination(val);
                                if (newLat) setLat(newLat.toString());
                                if (newLng) setLng(newLng.toString());
                            }}
                            placeholder="e.g., Tokyo, Japan"
                        />
                    </div>


                    {/* Date Range Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                <Input
                                    id="startDate"
                                    type="date"
                                    className="pl-9 h-11 clean-date-input"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                                <Input
                                    id="endDate"
                                    type="date"
                                    className="pl-9 h-11 clean-date-input"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Image Upload Zone */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Cover Image</Label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-200 border-dashed rounded-lg hover:border-zinc-300 transition-colors bg-zinc-50/50 relative overflow-hidden h-35 items-center">
                            {imagePreview ? (
                                <>
                                    <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs font-semibold flex items-center gap-1 cursor-pointer">
                                            <ImagePlus className="h-4 w-4" /> Change Image
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-1 text-center">
                                    <ImagePlus className="mx-auto h-8 w-8 text-zinc-400" />
                                    <div className="flex text-sm text-zinc-600 justify-center">
                                        <span className="relative cursor-pointer font-semibold text-blue-600 hover:text-blue-500">
                                            Upload a file
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400">PNG, JPG, WEBP up to 5MB</p>
                                </div>
                            )}
                            <input
                                id="coverImage"
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 mt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="h-10 px-5">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Trip"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}