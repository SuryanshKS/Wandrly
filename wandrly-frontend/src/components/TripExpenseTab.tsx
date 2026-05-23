"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import AddExpenseModal from "./AddExpenseModal";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";

interface Member {
    user_id: string;
    user: { name: string; email: string };
}

interface Settlement {
    from_user: string;
    to_user: string;
    amount: number;
}

export default function TripExpensesTab({ tripId }: { tripId: string }) {
    const [members, setMembers] = useState<Member[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [settlingDebt, setSettlingDebt] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Fetch members for the names and form
            const memRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/members`, config);
            setMembers(memRes.data.members || memRes.data.data || []);

            // Fetch the greedy algorithm settlement outputs
            const setRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/settlements`, config);
            setSettlements(setRes.data.settlements || []);

        } catch (error) {
            console.error("Failed to load expense data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (tripId) fetchData();
    }, [tripId]);

    const handleSettleUp = async (settlement: Settlement, index: number) => {
        if (!window.confirm(`Mark $${settlement.amount.toFixed(2)} as settled?`)) return;

        setSettlingDebt(`${index}`);
        try {
            const token = localStorage.getItem("wandrly_token");
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/settle`,
                { amount: settlement.amount, creditorId: settlement.to_user },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Refresh the settlements UI!
            await fetchData();
        } catch (error) {
            console.error("Failed to settle debt:", error);
            // alert("Failed to settle. Ensure you are the person who owes the debt!");
            toast.error("Failed to settle. Ensure you are the person who owes the debt!");

        } finally {
            setSettlingDebt(null);
        }
    };

    const getUserName = (userId: string) => {
        const member = members.find(m => m.user_id === userId);
        return member?.user.name || member?.user.email || "Unknown";
    };

    if (isLoading) {
        return (
            <div className="w-full max-w-3xl mx-auto space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-7 w-40 mb-2" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-10 w-36 rounded-xl" />
                </div>

                {/* Settlements Dashboard Skeleton */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-zinc-50/50 border-b border-zinc-200">
                        <Skeleton className="h-4 w-32 rounded-md" />
                    </div>

                    <div className="divide-y divide-zinc-100">
                        {/* Render 3 dummy settlement rows */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                                {/* Left Side: Avatars and Text */}
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />

                                    <div className="flex flex-col items-center gap-1.5">
                                        <Skeleton className="h-2 w-8" />
                                        <Skeleton className="h-3 w-4" />
                                    </div>

                                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />

                                    <div className="ml-2 space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-6 w-20" />
                                    </div>
                                </div>

                                {/* Right Side: Settle Button */}
                                <Skeleton className="h-9 w-full sm:w-28 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900">Group Finances</h2>
                    <p className="text-sm text-zinc-500">Track shared expenses and settle up.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Expense
                </button>
            </div>

            {/* Settlements Dashboard */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-zinc-50/50 border-b border-zinc-200">
                    <h3 className="text-sm font-bold text-zinc-900 tracking-wider uppercase">Current Balances</h3>
                </div>

                {settlements.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 text-sm">
                        You're all settled up! No outstanding debts in the group.
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100">
                        {settlements.map((settlement, idx) => (
                            <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 text-red-700 font-bold text-sm">
                                        {getUserName(settlement.from_user).charAt(0).toUpperCase()}
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs font-bold text-zinc-400">OWES</span>
                                        <ArrowRight className="h-4 w-4 text-zinc-300" />
                                    </div>

                                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                                        {getUserName(settlement.to_user).charAt(0).toUpperCase()}
                                    </div>

                                    <div className="ml-2">
                                        <p className="text-sm text-zinc-500">
                                            <span className="font-bold text-zinc-900">{getUserName(settlement.from_user)}</span> owes <span className="font-bold text-zinc-900">{getUserName(settlement.to_user)}</span>
                                        </p>
                                        <p className="text-lg font-black text-emerald-600">₹{settlement.amount.toFixed(2)}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSettleUp(settlement, idx)}
                                    disabled={settlingDebt === `${idx}`}
                                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 sm:w-auto w-full"
                                >
                                    {settlingDebt === `${idx}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    Settle Debt
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AddExpenseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tripId={tripId}
                members={members}
                onSuccess={fetchData} // Refreshes the dashboard on save
            />
        </div>
    );
}