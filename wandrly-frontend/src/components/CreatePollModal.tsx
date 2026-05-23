"use client";

import { useState } from "react";
import axios from "axios";
import { X, Plus, Trash2, Loader2, AlertCircle, BarChart2 } from "lucide-react";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  onSuccess: () => void;
}

export default function CreatePollModal({ isOpen, onClose, tripId, onSuccess }: CreatePollModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (text: string, index: number) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    // Filter out empty options
    const validOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    
    if (!question.trim()) {
      setErrorMsg("Please enter a question.");
      return;
    }
    if (validOptions.length < 2) {
      setErrorMsg("You must provide at least two valid options.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem("wandrly_token");
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/polls`,
        { question, options: validOptions },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setQuestion("");
      setOptions(["", ""]);
      onSuccess();
      onClose();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || "Failed to create poll.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-emerald-600" /> Create a Poll
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {errorMsg && (
            <div className="mb-5 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {errorMsg}
            </div>
          )}

          <form id="create-poll-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-bold text-zinc-700 mb-1.5 block">Question</label>
              <input 
                type="text" 
                value={question} 
                onChange={(e) => setQuestion(e.target.value)} 
                placeholder="e.g., Which museum should we visit?" 
                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium" 
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-zinc-700 block">Options</label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={opt} 
                    onChange={(e) => handleOptionChange(e.target.value, idx)} 
                    placeholder={`Option ${idx + 1}`} 
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(idx)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              
              {options.length < 10 && (
                <button type="button" onClick={handleAddOption} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-2 p-1">
                  <Plus className="h-4 w-4" /> Add Option
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-200 bg-zinc-100 rounded-xl transition-colors">Cancel</button>
          <button type="submit" form="create-poll-form" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-xl shadow-sm transition-colors flex items-center justify-center min-w-30">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post Poll"}
          </button>
        </div>
      </div>
    </div>
  );
}