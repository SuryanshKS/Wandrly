"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, Plus, LogOut, Loader2, Compass, MapPin, Calendar, ArrowUpRight } from "lucide-react";
import NewTripModal from "@/components/NewTripModal";
import { Skeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState"; // Adjust path if necessary

import dynamic from 'next/dynamic';
import { toast } from "sonner";

// This forces Next.js to skip this component during Server-Side Rendering
const GlobalGlobe = dynamic(() => import('@/components/GlobalGlobe'), {
    ssr: false,
    loading: () => <div className="h-100 w-full bg-stone-100 animate-pulse rounded-3xl" />
});

interface Trip {
    id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    cover_image?: string; // FIXED: Swapped to your exact snake_case schema naming
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
    is_premium: boolean;
}

export default function DashboardPage() {
    const router = useRouter();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState("");
    const [mapData, setMapData] = useState<any[]>([]); // Separated state

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };
    const handleUnlockPremium = async () => {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
            // alert("Razorpay SDK failed to load. Are you online?");
            toast.error("Razorpay SDK failed to load. Are you online?");
            return;
        }

        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // 1. Hit your exact checkout endpoint
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/checkout`, {}, config);

            // Your backend returns { status, key_id, order }
            const { key_id, order } = res.data;

            // 2. Initialize Razorpay Options
            const options = {
                key: key_id,
                amount: order.amount,
                currency: order.currency,
                name: "Wandrly Premium",
                description: "Unlock Unlimited Trip Journals",
                order_id: order.id,
                handler: function (response: any) {
                    // 3. Payment succeeded! 
                    // Your backend webhook is currently processing the database update.
                    // We wait 2 seconds to ensure the webhook finishes, then refresh the UI.
                    toast.success("Payment authorized! Synchronizing database profile...");
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                },
                theme: { color: "#10b981" } // Emerald-500 to match your UI
            };

            const rzp = new (window as any).Razorpay(options);

            // Handle payment failure gracefully
            rzp.on('payment.failed', function (response: any) {
                console.error("Payment failed:", response.error.description);
                // alert("Payment failed or was cancelled. Please try again.");
                // Replaced alert with error toast!
                toast.error(`Payment Failed: ${response.error.description}`);
            });

            rzp.open();
        } catch (error: any) {
            console.error("Payment init failed:", error);
            const msg = error.response?.data?.message || "Could not initialize payment system.";
            // alert(msg);
            // Replaced alert with error toast!
            toast.error(msg);
        }
    };



    useEffect(() => {
        const fetchAllData = async () => {
            const token = localStorage.getItem("wandrly_token");
            if (!token) {
                router.push("/login");
                return;
            }

            const config = { headers: { Authorization: `Bearer ${token}` } };
            setIsLoadingData(true);

            try {
                // Fetch everything in parallel
                const [profileRes, tripsRes, mapRes] = await Promise.all([
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, config),
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips`, config),
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/analytics/global-map`, config).catch(() => ({ data: { data: [] } }))
                ]);

                setUser(profileRes.data);
                setTrips(tripsRes.data.trips || tripsRes.data);
                setMapData(mapRes.data.data || []);
            } catch (err: any) {
                console.error("Dashboard sync failure:", err);
                if (err.response?.status === 401) {
                    localStorage.removeItem("wandrly_token");
                    router.push("/login");
                } else {
                    setError("Failed to synchronize your dashboard data.");
                }
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchAllData();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("wandrly_token");
        router.push("/login");
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } }
    };

    const renderLocation = (dest: string | undefined) => {
        if (!dest) return "Unknown Location";
        return dest.split(",")[0];
    };


    return (
        <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 pb-16">

            {/* GLOBAL NAVBAR */}
            <nav className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/80 backdrop-blur-md dark:bg-zinc-950/80 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="bg-zinc-900 text-white p-2 rounded-lg dark:bg-white dark:text-zinc-900">
                                <Compass className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-xl tracking-tight">Wandrly</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-stone-500 hover:text-red-600 transition-colors">
                                <LogOut className="h-4 w-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>



            {/* CONDITIONAL MAIN CONTENT: SKELETON vs REAL DATA */}
            {!isAuthenticated || isLoadingData ? (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                    {/* Header Skeleton */}
                    <div className="flex justify-between items-end">
                        <div>
                            <Skeleton className="h-9 w-64 mb-2" />
                            <Skeleton className="h-5 w-80" />
                        </div>
                        <Skeleton className="h-11 w-32 rounded-xl" />
                    </div>

                    {/* Top Section Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        <div className="md:col-span-2">
                            <Skeleton className="h-100 w-full rounded-3xl" />
                        </div>
                        <div className="md:col-span-1">
                            <Skeleton className="h-100 w-full rounded-2xl" />
                        </div>
                    </div>

                    {/* Bottom Gallery Skeleton */}
                    <div className="space-y-5">
                        <div className="border-b border-stone-200 pb-3 dark:border-zinc-800">
                            <Skeleton className="h-7 w-64" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-80 rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-white dark:bg-zinc-900 flex flex-col">
                                    <Skeleton className="h-40 w-full rounded-none" />
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <Skeleton className="h-6 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                        <Skeleton className="h-10 w-full rounded-xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            ) : (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-10">
                        {/* HEADER HUB */}
                        <motion.div variants={itemVariants} className="flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                    Welcome back, {user?.name || "Traveler"}
                                </h1>
                                <p className="text-stone-500 mt-1">Manage and document your global travelogues.</p>
                            </div>
                            <Button
                                className="h-11 px-5 font-bold shadow-lg shadow-emerald-600/20 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <Plus className="h-4 w-4 mr-2 stroke-3" />
                                New Trip
                            </Button>
                        </motion.div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {/* TOP HERO SECTION: MAP + METRICS */}
                        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                            {/* MAP COLUMN */}
                            <div className="md:col-span-2">
                                <div className="h-100 w-full rounded-3xl overflow-hidden border border-stone-200 shadow-xl shadow-stone-200/50 relative isolate">
                                    <div className="absolute top-4 left-12 z-999 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-md border border-stone-100">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-sm font-semibold text-zinc-700 whitespace-nowrap">
                                            {trips.length} Visited Destinations
                                        </span>
                                    </div>
                                    <GlobalGlobe trips={mapData} />
                                </div>
                            </div>

                            {/* CARD COLUMN */}
                            <div className="md:col-span-1 h-100">
                                <Card className="border-stone-200 shadow-sm rounded-2xl h-full flex flex-col justify-between">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                                            Account Diagnostics
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col justify-between pt-2 pb-6">
                                        <div>
                                            <div className={`text-3xl font-bold tracking-tight ${user?.is_premium ? "text-emerald-600" : "text-zinc-900"}`}>
                                                {user?.is_premium ? "Premium Tier" : "Standard Tier"}
                                            </div>
                                            <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">
                                                You have loaded <span className="font-semibold text-zinc-900 dark:text-white">{trips.length}</span> individual database journals into your client container.
                                            </p>
                                        </div>
                                        {!user?.is_premium ? (
                                            <Button variant="outline" className="w-full h-11 text-blue-600 border-blue-200 bg-blue-50/30 hover:bg-blue-50 transition-all font-semibold rounded-xl"
                                                onClick={handleUnlockPremium}
                                            >
                                                Unlock Unlimited Trips
                                            </Button>
                                        ) : (
                                            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
                                                ✓ Unlimited Cloud Storage Enabled
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>

                        {/* BOTTOM SECTION: THE DYNAMIC TRIP GALLERY */}
                        <motion.div variants={itemVariants} className="space-y-5">
                            <div className="border-b border-stone-200 pb-3 dark:border-zinc-800">
                                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Your Historical Collections</h2>
                            </div>

                            {trips.length === 0 ? (
                                // <Card className="border-dashed border-2 border-stone-200 shadow-none flex flex-col items-center justify-center h-75 bg-stone-50/50 rounded-2xl">
                                //     <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-stone-100">
                                //         <MapPin className="h-7 w-7 text-blue-500" />
                                //     </div>
                                //     <h3 className="text-base font-semibold text-zinc-900">Your layout stream is empty</h3>
                                //     <p className="text-sm text-stone-500 max-w-xs text-center mt-1 mb-5 leading-relaxed">
                                //         Fire your initialization trigger to seed your first Cloudinary cover mapping.
                                //     </p>
                                //     <Button onClick={() => setIsModalOpen(true)} className="rounded-xl font-bold">
                                //         <Plus className="h-4 w-4 mr-1.5" /> Initialize Journey
                                //     </Button>
                                // </Card>
                                <EmptyState
                                    type="trip"
                                    title="Your layout stream is empty"
                                    description="Fire your initialization trigger to seed your first Cloudinary cover mapping."
                                >
                                    <Button
                                        onClick={() => setIsModalOpen(true)}
                                        className="rounded-xl font-bold shadow-md bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all hover:-translate-y-0.5"
                                    >
                                        <Plus className="h-4 w-4 mr-1.5 stroke-3" /> Initialize Journey
                                    </Button>
                                </EmptyState>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {trips.map((trip) => (
                                        <motion.div
                                            key={trip.id}
                                            whileHover={{ y: -8 }}
                                            transition={{ duration: 0.3, ease: "easeOut" }}
                                            className="group cursor-pointer"
                                            onClick={() => router.push(`/dashboard/trips/${trip.id}`)}
                                        >
                                            <Card className="overflow-hidden border-stone-200 shadow-sm hover:shadow-2xl hover:shadow-stone-200/50 transition-all duration-300 bg-white dark:bg-zinc-900 rounded-2xl flex flex-col h-80">
                                                <div className="h-40 w-full relative bg-stone-100 overflow-hidden border-b border-stone-100 dark:border-zinc-800">
                                                    {trip.cover_image ? (
                                                        <img
                                                            src={trip.cover_image}
                                                            alt={trip.title}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-stone-100">
                                                            <Map className="h-8 w-8 text-stone-300" />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 text-zinc-800">
                                                        <MapPin className="h-3 w-3 text-stone-500" />
                                                        {renderLocation(trip.destination)}
                                                    </div>
                                                </div>
                                                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                                                    <div className="space-y-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h3 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                                                {trip.title}
                                                            </h3>
                                                            <ArrowUpRight className="h-4 w-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                                                        </div>
                                                        <p className="text-sm text-stone-500 font-medium">{trip.destination}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-stone-500 bg-stone-50/80 dark:bg-zinc-950 border border-stone-100 dark:border-zinc-800 p-2.5 rounded-xl w-full">
                                                        <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                                                        <span>{formatDate(trip.start_date)}</span>
                                                        <span className="text-stone-300">•</span>
                                                        <span>{formatDate(trip.end_date)}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                </main>
            )}

            <NewTripModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onTripCreated={() => {
                    window.location.reload();
                }}
            />
        </div>
    );
}