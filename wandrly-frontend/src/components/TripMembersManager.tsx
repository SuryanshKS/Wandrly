"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { UserPlus, Shield, ShieldAlert, Trash2, Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

interface User {
    id: string;
    name: string | null;
    email: string;
}

interface TripMember {
    user_id: string;
    role: "ADMIN" | "EDITOR" | "VIEWER";
    user: User;
}

interface CurrentUser {
    id: string;
    name: string;
}

export default function TripMembersManager({ tripId }: { tripId: string }) {
    const [members, setMembers] = useState<TripMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

    // Invite Form State
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
    const [isInviting, setIsInviting] = useState(false);

    // Feedback State
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Fetch initial members
    useEffect(() => {
        const token = localStorage.getItem("wandrly_token");
        
        // 1. Decode JWT to know who the current user is
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decodedData = JSON.parse(jsonPayload);
                setCurrentUser({ id: decodedData.id || decodedData.userId, name: decodedData.name });
            } catch (e) {
                console.error("Failed to decode user token", e);
            }
        }


        const fetchMembers = async () => {
            try {
                // Assuming you have a GET route to fetch current members
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/members`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMembers(res.data.data || res.data.members || []);
            } catch (error) {
                console.error("Failed to load members:", error);
            } finally {
                setIsLoading(false);
            }
        };
        if (tripId) fetchMembers();
    }, [tripId]);

    const showFeedback = (msg: string, type: "error" | "success") => {
        if (type === "error") {
            setErrorMsg(msg);
            setSuccessMsg(null);
        } else {
            setSuccessMsg(msg);
            setErrorMsg(null);
        }
        setTimeout(() => { setErrorMsg(null); setSuccessMsg(null); }, 5000);
    };

    // 1. INVITE MEMBER (Matches router.post('/:tripId/members'))
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setIsInviting(true);
        try {
            const token = localStorage.getItem("wandrly_token");
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/members`,
                { email: inviteEmail, role: inviteRole },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Add new member to UI
            setMembers([...members, res.data.member]);
            setInviteEmail("");
            setInviteRole("VIEWER");
            showFeedback(res.data.message || "Member invited successfully!", "success");

        } catch (error: any) {
            showFeedback(error.response?.data?.message || "Failed to invite member.", "error");
        } finally {
            setIsInviting(false);
        }
    };

    // 2. UPDATE ROLE (Matches router.put('/:tripId/members/role'))
    const handleRoleUpdate = async (targetUserId: string, newRole: string) => {
        try {
            const token = localStorage.getItem("wandrly_token");
            await axios.put(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/members/role`,
                { targetUserId, newRole },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update UI
            setMembers(members.map(m => m.user_id === targetUserId ? { ...m, role: newRole as any } : m));
            showFeedback("Role updated successfully.", "success");
        } catch (error: any) {
            showFeedback(error.response?.data?.message || "Failed to update role.", "error");
        }
    };

    // 3. REMOVE MEMBER (Matches router.delete('/:tripId/members/:targetUserId'))
    const handleRemove = async (targetUserId: string) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;

        try {
            const token = localStorage.getItem("wandrly_token");
            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/members/${targetUserId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Remove from UI
            setMembers(members.filter(m => m.user_id !== targetUserId));
            showFeedback("Member removed from trip.", "success");
        } catch (error: any) {
            showFeedback(error.response?.data?.message || "Failed to remove member.", "error");
        }
    };


    // --- SMART SORTING ALGORITHM ---
    const sortedMembers = useMemo(() => {
        if (!currentUser) return members;
        return [...members].sort((a, b) => {
            // 1. Admin always goes to the top
            if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
            if (b.role === 'ADMIN' && a.role !== 'ADMIN') return 1;
            
            // 2. Current User (if not admin) goes right below admin
            if (a.user_id === currentUser.id && b.user_id !== currentUser.id) return -1;
            if (b.user_id === currentUser.id && a.user_id !== currentUser.id) return 1;
            
            return 0;
        });
    }, [members, currentUser]);

    // Check if the current user viewing the page is the Admin
    const isViewerAdmin = useMemo(() => {
        return members.some(m => m.user_id === currentUser?.id && m.role === 'ADMIN');
    }, [members, currentUser]);


   if (isLoading) {
        return (
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden max-w-2xl mx-auto">
                {/* Invite Form Skeleton */}
                <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Skeleton className="h-10 flex-1 rounded-lg" />
                        <Skeleton className="h-10 w-24 rounded-lg" />
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                </div>
                {/* Roster List Skeleton */}
                <div className="p-6">
                    <Skeleton className="h-4 w-40 mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-48" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-20 rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden max-w-2xl mx-auto">

            {/* Header & Invite Form */}
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-emerald-600" />
                    Invite to Trip
                </h2>

                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input
                            type="email"
                            placeholder="friend@email.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            required
                        />
                    </div>
                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as "VIEWER" | "EDITOR")}
                        className="py-2 px-3 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="VIEWER">Viewer</option>
                        <option value="EDITOR">Editor</option>
                    </select>
                    <button
                        type="submit"
                        disabled={isInviting}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors flex items-center justify-center min-w-25"
                    >
                        {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
                    </button>
                </form>

                {/* Feedback Banners */}
                {errorMsg && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                        <AlertCircle className="h-4 w-4 shrink-0" /> {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
                    </div>
                )}
            </div>
            

            {/* Roster List */}
            <div className="p-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Current Members ({members.length})</h3>
                <div className="space-y-3">
                    {sortedMembers.map((member) => {
                        const isMe = member.user_id === currentUser?.id;
                        const isAdmin = member.role === "ADMIN";

                        return (
                            <div 
                                key={member.user_id} 
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                    isAdmin ? "border-amber-200 bg-amber-50/50" : 
                                    isMe ? "border-emerald-200 bg-emerald-50/50" : 
                                    "border-zinc-100 bg-white hover:bg-zinc-50"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                        isAdmin ? "bg-amber-100 text-amber-700" :
                                        isMe ? "bg-emerald-100 text-emerald-700" :
                                        "bg-blue-100 text-blue-700"
                                    }`}>
                                        {member.user?.name?.charAt(0).toUpperCase() || member.user?.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                                            {member.user?.name || "Traveler"} 
                                            {isMe && <span className="text-zinc-400 font-normal text-xs ml-1">(You)</span>}
                                            {isAdmin && (
                                                <span title="Trip Admin">
                                                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500 ml-1" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-zinc-500">{member.user?.email}</div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-2">
                                    {/* Only show select/remove if the VIEWER is an ADMIN, and they aren't looking at themselves */}
                                    {isViewerAdmin && !isMe ? (
                                        <>
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleRoleUpdate(member.user_id, e.target.value)}
                                                className="text-xs font-bold bg-white border border-zinc-200 text-zinc-700 rounded-md px-2 py-1.5 cursor-pointer hover:bg-zinc-50 outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="VIEWER">Viewer</option>
                                                <option value="EDITOR">Editor</option>
                                            </select>
                                            <button
                                                onClick={() => handleRemove(member.user_id)}
                                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Remove User"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        // If not an admin (or looking at themselves), just show a clean, non-interactive badge
                                        <div className={`text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1 ${
                                            isAdmin ? "text-amber-700 bg-amber-100/50" : "text-zinc-500 bg-zinc-100"
                                        }`}>
                                            {isAdmin && <Shield className="h-3 w-3" />} 
                                            {member.role}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}