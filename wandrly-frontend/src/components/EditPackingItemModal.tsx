"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { X, Loader2, AlertCircle, Type } from "lucide-react";

interface PackingItem {
  id: string;
  item_name: string;
  is_packed: boolean;
  category?: string; // Optional, depending on your schema
}

interface EditPackingItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  item: PackingItem | null;
  onSuccess: (updatedItem: PackingItem) => void;
}

export default function EditPackingItemModal({ isOpen, onClose, tripId, item, onSuccess }: EditPackingItemModalProps) {
  const [itemName, setItemName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate form when modal opens
  useEffect(() => {
    if (item) {
      setItemName(item.item_name || "");
      setErrorMsg(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setErrorMsg("Item name cannot be empty.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("wandrly_token");
      
      // We MUST send is_packed to satisfy the strict backend boolean check
      const payload = {
        is_packed: item.is_packed, 
        new_item_name: itemName
      };

      const res = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/packing/${item.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSuccess(res.data.item);
      onClose();
    } catch (error: any) {
      console.error("Failed to update item:", error);
      setErrorMsg(error.response?.data?.message || "Failed to update item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h2 className="text-base font-bold text-zinc-900">Edit Item</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5">
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-xs font-medium border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          <form id="edit-packing-form" onSubmit={handleSubmit}>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 mb-1.5">
              <Type className="h-3.5 w-3.5 text-zinc-400" /> Item Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 bg-zinc-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-packing-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg shadow-sm transition-colors flex items-center justify-center min-w-20"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
}