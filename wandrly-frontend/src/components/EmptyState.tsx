import React from "react";

type IllustrationType = "trip" | "expense" | "packing" | "media" | "analytics";

interface EmptyStateProps {
    title: string;
    description: string;
    type?: IllustrationType;
    children?: React.ReactNode; // For passing in your call-to-action buttons
}

export default function EmptyState({ title, description, type = "trip", children }: EmptyStateProps) {
    
    // 1. Premium Dual-Tone SVGs built dynamically
    const renderIllustration = () => {
        switch (type) {
            case "trip":
                return (
                    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-32">
                        <circle cx="60" cy="60" r="40" className="fill-stone-100" />
                        <path d="M45 55C45 46.7157 51.7157 40 60 40C68.2843 40 75 46.7157 75 55C75 66 60 80 60 80C60 80 45 66 45 55Z" className="fill-white stroke-emerald-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="60" cy="55" r="8" className="fill-emerald-100 stroke-emerald-500" strokeWidth="3"/>
                        <path d="M30 60L40 50M90 60L80 50" className="stroke-stone-300" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                );
            case "expense":
                return (
                    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-32">
                        <rect x="25" y="35" width="70" height="50" rx="12" className="fill-stone-100 stroke-stone-300" strokeWidth="3"/>
                        <rect x="35" y="45" width="50" height="30" rx="6" className="fill-white stroke-emerald-500" strokeWidth="3"/>
                        <circle cx="60" cy="60" r="8" className="fill-emerald-100 stroke-emerald-500" strokeWidth="3"/>
                        <path d="M60 56V64M56 60H64" className="stroke-emerald-600" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                );
            case "packing":
                return (
                    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-32">
                        <rect x="35" y="40" width="50" height="60" rx="10" className="fill-white stroke-emerald-500" strokeWidth="3"/>
                        <path d="M45 40V30C45 27.2386 47.2386 25 50 25H70C72.7614 25 75 27.2386 75 30V40" className="stroke-stone-300" strokeWidth="3" strokeLinecap="round"/>
                        <line x1="45" y1="55" x2="75" y2="55" className="stroke-stone-200" strokeWidth="3" strokeLinecap="round"/>
                        <line x1="45" y1="70" x2="75" y2="70" className="stroke-stone-200" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                );
            case "media":
                return (
                    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-32">
                        <rect x="30" y="30" width="45" height="50" rx="4" transform="rotate(-10 30 30)" className="fill-stone-100 stroke-stone-300" strokeWidth="3"/>
                        <rect x="45" y="40" width="45" height="50" rx="4" className="fill-white stroke-emerald-500" strokeWidth="3"/>
                        <circle cx="67" cy="58" r="10" className="fill-emerald-50 stroke-emerald-500" strokeWidth="3"/>
                        <circle cx="78" cy="48" r="3" className="fill-stone-300"/>
                    </svg>
                );
            case "analytics":
                return (
                    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-32">
                        <path d="M30 90L45 60L65 75L90 35" className="stroke-emerald-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="90" cy="35" r="6" className="fill-white stroke-emerald-500" strokeWidth="3"/>
                        <line x1="30" y1="95" x2="90" y2="95" className="stroke-stone-300" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                );
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center w-full bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200/60 shadow-sm">
            
            {/* Soft background glow behind the illustration */}
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full scale-150" />
                <div className="relative z-10 animate-in zoom-in-95 duration-700 ease-out">
                    {renderIllustration()}
                </div>
            </div>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
                {title}
            </h3>
            <p className="text-stone-500 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                {description}
            </p>

            {/* Injected Action Buttons (if provided) */}
            {children && (
                <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                    {children}
                </div>
            )}
        </div>
    );
}