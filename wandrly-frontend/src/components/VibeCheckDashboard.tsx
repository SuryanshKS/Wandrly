"use client";

import { Activity, Flame, Coffee, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from "@/components/Skeleton"; // NEW SKELETON IMPORT

interface PacingDay {
    date: string;
    total_intensity_score: number;
    event_count: number;
    breakdown: {
        CHILL: number;
        MEDIUM: number;
        INTENSE: number;
    };
    events: { title: string; intensity: string }[];
    burnoutRisk: "LOW" | "MEDIUM" | "HIGH";
}

interface VibeCheckDashboardProps {
    pacingData: PacingDay[];
    isLoading?: boolean; // NEW: Allows parent to trigger the skeleton
}

export default function VibeCheckDashboard({ pacingData, isLoading = false }: VibeCheckDashboardProps) {
    // THE NEW SKELETON LOADER
    if (isLoading) {
        return (
            <div className="space-y-6 text-left">
                {/* 1. Overall Trip Health Summary Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    ))}
                </div>

                {/* 2. Daily Pacing Timeline Skeleton */}
                <div className="space-y-4">
                    <Skeleton className="h-7 w-48 mt-8 mb-4" />

                    {/* Render 3 placeholder days */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center">
                            {/* Left Side Skeleton */}
                            <div className="p-6 md:w-64 border-b md:border-b-0 md:border-r border-zinc-100 bg-zinc-50/50">
                                <Skeleton className="h-4 w-24 mb-3" />
                                <Skeleton className="h-6 w-32 rounded-full" />
                            </div>

                            {/* Right Side Skeleton */}
                            <div className="p-6 flex-1 flex flex-col justify-center">
                                <div className="flex justify-between items-end mb-3">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-20" />
                                </div>

                                {/* Vibe Bar Skeleton */}
                                <Skeleton className="h-3 w-full rounded-full mb-3" />

                                {/* Micro-legends Skeleton */}
                                <div className="flex gap-4">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!pacingData || pacingData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-white rounded-3xl border border-zinc-200">
                <Activity className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium text-zinc-900">No pacing data available.</p>
                <p className="text-sm">Add events to your itinerary to generate a vibe check.</p>
            </div>
        );
    }

    // Calculate some quick overall stats
    const highRiskDays = pacingData.filter(d => d.burnoutRisk === "HIGH").length;
    const totalEvents = pacingData.reduce((acc, day) => acc + day.event_count, 0);

    return (
        <div className="space-y-6">

            {/* 1. Overall Trip Health Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="text-sm font-semibold text-zinc-500 mb-1">Total Days Analyzed</div>
                    <div className="text-2xl font-bold text-zinc-900">{pacingData.length}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="text-sm font-semibold text-zinc-500 mb-1">Total Planned Events</div>
                    <div className="text-2xl font-bold text-zinc-900">{totalEvents}</div>
                </div>
                <div className={`p-5 rounded-2xl border shadow-sm ${highRiskDays > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                        {highRiskDays > 0 ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        <span className={highRiskDays > 0 ? "text-red-700" : "text-emerald-700"}>Burnout Risk</span>
                    </div>
                    <div className={`text-2xl font-bold ${highRiskDays > 0 ? "text-red-800" : "text-emerald-800"}`}>
                        {highRiskDays} High Risk Day{highRiskDays !== 1 && 's'}
                    </div>
                </div>
            </div>

            {/* 2. Daily Pacing Timeline */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-900 px-1 mt-8 mb-4">Daily Vibe Forecast</h3>
                {pacingData.map((day) => {

                    // Determine colors based on risk
                    const isHighRisk = day.burnoutRisk === "HIGH";
                    const isMediumRisk = day.burnoutRisk === "MEDIUM";

                    return (
                        <div key={day.date} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center">

                            {/* Left Side: Date & Risk Badge */}
                            <div className={`p-6 md:w-64 border-b md:border-b-0 md:border-r border-zinc-100 ${isHighRisk ? 'bg-red-50/50' : isMediumRisk ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`}>
                                <div className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>

                                {isHighRisk && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold mt-2">
                                        <Flame className="h-3 w-3" /> HIGH BURNOUT RISK
                                    </div>
                                )}
                                {isMediumRisk && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold mt-2">
                                        <Activity className="h-3 w-3" /> MODERATE PACE
                                    </div>
                                )}
                                {!isHighRisk && !isMediumRisk && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mt-2">
                                        <Coffee className="h-3 w-3" /> CHILL VIBES
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Event Breakdown & Score */}
                            <div className="p-6 flex-1 flex flex-col justify-center">
                                <div className="flex justify-between items-end mb-3">
                                    <div className="text-sm font-medium text-zinc-500">Intensity Score: <span className="text-zinc-900 font-bold">{day.total_intensity_score}</span></div>
                                    <div className="text-sm text-zinc-500">{day.event_count} Events</div>
                                </div>

                                {/* The "Vibe Bar" (Visual ratio of chill/medium/intense) */}
                                <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                                    {day.breakdown.CHILL > 0 && (
                                        <div style={{ width: `${(day.breakdown.CHILL / day.event_count) * 100}%` }} className="h-full bg-blue-400" title="Chill Events" />
                                    )}
                                    {day.breakdown.MEDIUM > 0 && (
                                        <div style={{ width: `${(day.breakdown.MEDIUM / day.event_count) * 100}%` }} className="h-full bg-amber-400" title="Medium Events" />
                                    )}
                                    {day.breakdown.INTENSE > 0 && (
                                        <div style={{ width: `${(day.breakdown.INTENSE / day.event_count) * 100}%` }} className="h-full bg-red-500" title="Intense Events" />
                                    )}
                                </div>

                                {/* Micro-legends */}
                                <div className="flex gap-4 mt-3 text-xs font-medium">
                                    {day.breakdown.CHILL > 0 && <span className="text-blue-600 flex items-center gap-1"><Coffee className="h-3 w-3" /> {day.breakdown.CHILL} Chill</span>}
                                    {day.breakdown.MEDIUM > 0 && <span className="text-amber-600 flex items-center gap-1"><Activity className="h-3 w-3" /> {day.breakdown.MEDIUM} Medium</span>}
                                    {day.breakdown.INTENSE > 0 && <span className="text-red-600 flex items-center gap-1"><Zap className="h-3 w-3" /> {day.breakdown.INTENSE} Intense</span>}
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}