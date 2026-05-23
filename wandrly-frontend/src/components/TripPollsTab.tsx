"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, Plus, CheckCircle2, BarChart2 } from "lucide-react";
import CreatePollModal from "./CreatePollModal";
import { Skeleton } from "@/components/Skeleton";

import { io, Socket } from "socket.io-client";

interface PollOption {
    id: string;
    option_text: string;
    _count: { votes: number };
}

interface Poll {
    id: string;
    question: string;
    creator: { id: string; name: string };
    options: PollOption[];
    votes: { option_id: string }[]; // Array containing user's current vote (if any)
}

export default function TripPollsTab({ tripId }: { tripId: string }) {
    const [polls, setPolls] = useState<Poll[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [votingOn, setVotingOn] = useState<string | null>(null);

    const fetchPolls = async () => {
        try {
            const token = localStorage.getItem("wandrly_token");
            // ADDED: ?_t=${Date.now()} to forcefully bypass the browser cache
            const res = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/polls?_t=${Date.now()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPolls(res.data.polls || []);
        } catch (error) {
            console.error("Failed to load polls", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!tripId) return;

        // 1. Initial data load
        fetchPolls();

        // 2. Establish the WebSocket connection
        // Ensure the URL matches where your Node.js socket server is running
        const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", {
            transports: ["websocket"],
        });

        socket.on("connect", () => {
            // 3. Match your backend exactly: Tell the server to put us in this trip's room
            socket.emit("join_trip", tripId);
        });

        // 4. Listen for the broadcast events from your addPoll and voteInPoll controllers
        socket.on("poll_created", () => {
            fetchPolls(); // Refresh the list to show the new poll
        });

        socket.on("poll_updated", () => {
            fetchPolls(); // Refresh the list to instantly animate the progress bars
        });

        // 5. Cleanup on unmount
        return () => {
            // Match your backend's cleanup listener
            socket.emit("leave_trip", tripId);
            socket.off("poll_created");
            socket.off("poll_updated");
            socket.disconnect();
        };
    }, [tripId]);

    const handleVote = async (pollId: string, optionId: string) => {
        setVotingOn(optionId);
        try {
            const token = localStorage.getItem("wandrly_token");
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/polls/${pollId}/vote`,
                { optionId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Re-fetch to get updated vote counts and current user vote status
            await fetchPolls();
        } catch (error) {
            console.error("Failed to cast vote:", error);
        } finally {
            setVotingOn(null);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full max-w-3xl mx-auto space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-7 w-32 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-28 rounded-xl" />
                </div>

                {/* Poll Cards Skeleton */}
                <div className="space-y-6">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                            <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                            <div className="p-5 sm:p-6 space-y-3">
                                <Skeleton className="h-14 w-full rounded-xl border border-zinc-100" />
                                <Skeleton className="h-14 w-full rounded-xl border border-zinc-100" />
                                <Skeleton className="h-14 w-full rounded-xl border border-zinc-100" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-3xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900">Group Polls</h2>
                    <p className="text-sm text-zinc-500">Vote on dates, destinations, and activities.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                    <Plus className="h-4 w-4" /> New Poll
                </button>
            </div>

            {/* Polls Feed */}
            <div className="space-y-6">
                {polls.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-500 text-sm shadow-sm">
                        <BarChart2 className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
                        No active polls. Create one to get the group's opinion!
                    </div>
                ) : (
                    polls.map((poll) => {
                        // Calculate total votes for percentage math
                        const totalVotes = poll.options.reduce((sum, opt) => sum + opt._count.votes, 0);
                        const userVoteOptionId = poll.votes.length > 0 ? poll.votes[0].option_id : null;

                        return (
                            <div key={poll.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                                <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
                                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">{poll.question}</h3>
                                    <p className="text-xs text-zinc-500 mt-1">Asked by {poll.creator.name} • {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</p>
                                </div>

                                <div className="p-5 sm:p-6 space-y-3">
                                    {poll.options.map((option) => {
                                        const isSelected = userVoteOptionId === option.id;
                                        const votePercentage = totalVotes === 0 ? 0 : Math.round((option._count.votes / totalVotes) * 100);

                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => handleVote(poll.id, option.id)}
                                                disabled={votingOn !== null}
                                                className={`relative w-full text-left overflow-hidden rounded-xl border transition-all ${isSelected
                                                    ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30"
                                                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                                                    }`}
                                            >
                                                {/* Progress Bar Background */}
                                                <div
                                                    className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out ${isSelected ? "bg-emerald-100/50" : "bg-zinc-100"}`}
                                                    style={{ width: `${votePercentage}%` }}
                                                />

                                                {/* Content */}
                                                <div className="relative z-10 flex items-center justify-between p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex items-center justify-center h-5 w-5 rounded-full border shrink-0 transition-colors ${isSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300"
                                                            }`}>
                                                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                            {votingOn === option.id && <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />}
                                                        </div>
                                                        <span className={`text-sm font-medium ${isSelected ? "text-emerald-900" : "text-zinc-700"}`}>
                                                            {option.option_text}
                                                        </span>
                                                    </div>

                                                    <span className={`text-sm font-bold ${isSelected ? "text-emerald-600" : "text-zinc-500"}`}>
                                                        {votePercentage}%
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <CreatePollModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tripId={tripId}
                onSuccess={fetchPolls}
            />
        </div>
    );
}