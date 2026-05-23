"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { X, Loader2, AlertCircle, Receipt, Users, IndianRupee } from "lucide-react";

interface Member {
  user_id: string;
  user: { name: string; email: string };
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  members: Member[];
  onSuccess: () => void;
}

export default function AddExpenseModal({ isOpen, onClose, tripId, members, onSuccess }: AddExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>("");
  // By default, everyone is selected to split the cost
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && members.length > 0) {
      setPaidBy(members[0].user_id);
      setSplitAmong(members.map(m => m.user_id));
      setDescription("");
      setTotalAmount("");
      setErrorMsg(null);
    }
  }, [isOpen, members]);

  if (!isOpen) return null;

  const toggleSplitUser = (userId: string) => {
    setSplitAmong(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !totalAmount || splitAmong.length === 0) {
      setErrorMsg("Please fill in all fields and select at least one person to split with.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const amountFloat = parseFloat(totalAmount);
      
      // PERFECT SPLIT ALGORITHM (Handles JavaScript floating point remainders)
      // e.g., 10 / 3 = 3.33. Remainder 0.01 goes to the first person.
      const baseSplit = Math.floor((amountFloat / splitAmong.length) * 100) / 100;
      let splits = splitAmong.map(id => ({ user_id: id, amount_owed: baseSplit }));
      
      const calculatedTotal = baseSplit * splitAmong.length;
      const remainder = Math.round((amountFloat - calculatedTotal) * 100) / 100;
      
      if (remainder !== 0 && splits.length > 0) {
        splits[0].amount_owed = Math.round((splits[0].amount_owed + remainder) * 100) / 100;
      }

      const payload = {
        description,
        total_amount: amountFloat,
        paid_by: paidBy,
        splits
      };

      const token = localStorage.getItem("wandrly_token");
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/expenses`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || "Failed to log expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" /> Log an Expense
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {errorMsg && (
            <div className="mb-5 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {errorMsg}
            </div>
          )}

          <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-bold text-zinc-700 mb-1.5 block">What was this for?</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Dinner at the Marina" className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" required />
            </div>

            <div>
              <label className="text-sm font-bold text-zinc-700 mb-1.5 block">Total Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input type="number" step="0.01" min="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0.00" className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" required />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-zinc-700 mb-1.5 block">Who Paid?</label>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.user.name || m.user.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-zinc-700 mb-1.5 flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-400" /> Split Equally Among:
              </label>
              <div className="space-y-2 border border-zinc-200 rounded-xl p-3 bg-zinc-50/50">
                {members.map(m => (
                  <label key={m.user_id} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={splitAmong.includes(m.user_id)} onChange={() => toggleSplitUser(m.user_id)} className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer" />
                    <span className="text-sm text-zinc-700 font-medium">{m.user.name || m.user.email}</span>
                  </label>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-200 bg-zinc-100 rounded-xl transition-colors">Cancel</button>
          <button type="submit" form="expense-form" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-xl shadow-sm transition-colors flex items-center justify-center min-w-30">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}