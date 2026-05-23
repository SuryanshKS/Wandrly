"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Sparkles, Plus, Trash2, CheckCircle2, Circle, Loader2, AlertCircle, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EditPackingItemModal from "./EditPackingItemModal";
import { Edit2 } from "lucide-react"; 
import { Skeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

interface PackingItem {
    id: string;
    item_name: string;
    is_packed: boolean;
    auto_generated_reason?: string;
}

interface PackingListTabProps {
    tripId: string;
}

export default function PackingListTab({ tripId }: PackingListTabProps) {
    const [items, setItems] = useState<PackingItem[]>([]);
    const [newItemName, setNewItemName] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const [errorNotice, setErrorNotice] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<PackingItem | null>(null);

    // NEW: PDF Export Refs & State
    const printRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleEditClick = (item: PackingItem) => {
        setItemToEdit(item);
        setIsEditModalOpen(true);
    };

    const handleItemUpdated = (updatedItem: PackingItem) => {
        setItems(items.map(item => item.id === updatedItem.id ? updatedItem : item));
    };

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/packing`, config);

            const payload = res.data;
            const extractedArray = payload.data || payload.items || payload.packingList || payload;

            setItems(Array.isArray(extractedArray) ? extractedArray : []);
        } catch (error) {
            console.error("Failed to fetch packing list:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (tripId) fetchItems();
    }, [tripId]);

    const handleAddItem = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        setErrorNotice(null);

        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/packing`,
                { item_name: newItemName },
                config
            );

            setNewItemName("");
            await fetchItems(); 

        } catch (error: any) {
            console.error("Failed to add item:", error);
            setErrorNotice(error.response?.data?.message || "Failed to add item manually.");
        }
    };

    const handleAutoGenerate = async () => {
        setIsGenerating(true);
        setErrorNotice(null);

        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/packing/auto-generate`, {}, config);

            await fetchItems(); 

        } catch (error: any) {
            console.error("AI Generation failed:", error);
            const errorMsg = error.response?.data?.message || "The AI system failed to compile a list. Please try again.";
            setErrorNotice(errorMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const togglePacked = async (itemId: string, currentStatus: boolean) => {
        setItems(items.map(i => i.id === itemId ? { ...i, is_packed: !currentStatus } : i));

        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.patch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/packing/${itemId}`,
                { is_packed: !currentStatus },
                config
            );
        } catch (error) {
            console.error("Failed to update item:", error);
            setItems(items.map(i => i.id === itemId ? { ...i, is_packed: currentStatus } : i));
        }
    };

    const deleteItem = async (itemId: string) => {
        setItems(items.filter(i => i.id !== itemId));
        try {
            const token = localStorage.getItem("wandrly_token");
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/trips/${tripId}/packing/${itemId}`, config);
        } catch (error) {
            console.error("Failed to delete item:", error);
        }
    };

    // NEW: PDF Export Logic
    const handleExportPDF = async () => {
        if (!printRef.current) return;
        
        setIsExporting(true);
        const toastId = toast.loading("Generating your packing list PDF...");
        
        try {
            const filterNode = (node: HTMLElement) => {
                if (node?.getAttribute && node.getAttribute('data-html2canvas-ignore') === 'true') {
                    return false;
                }
                return true;
            };

            const imgData = await toPng(printRef.current, { 
                pixelRatio: 2, 
                backgroundColor: "#ffffff",
                filter: filterNode as any
            });
            
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgWidth = pdfWidth;
            const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = pdfImgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfImgWidth, pdfImgHeight);
            heightLeft -= pdfHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - pdfImgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfImgWidth, pdfImgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save("Wandrly-Packing-List.pdf");
            toast.success("PDF downloaded successfully!", { id: toastId });
        } catch (error) {
            console.error("PDF Export failed:", error);
            toast.error("Failed to generate PDF. Please try again.", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full max-w-3xl mx-auto space-y-6 text-left">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="flex w-full gap-2">
                        <Skeleton className="h-10 flex-1 rounded-md" />
                        <Skeleton className="h-10 w-12 rounded-md" />
                    </div>
                    <Skeleton className="h-10 w-full sm:w-36 rounded-md" />
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden divide-y divide-zinc-100">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3 w-full">
                                <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                                <div className="space-y-1.5 w-full">
                                    <Skeleton className="h-4 w-48" />
                                    {i % 2 === 0 && <Skeleton className="h-3 w-32" />}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pl-4">
                                <Skeleton className="h-6 w-6 rounded-md" />
                                <Skeleton className="h-6 w-6 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-3xl mx-auto space-y-6 text-left">
            {errorNotice && (
                <div className="flex items-start justify-between bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-800">System Alert</p>
                            <p className="text-xs text-red-700 mt-0.5">{errorNotice}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setErrorNotice(null)}
                        className="text-red-400 hover:text-red-600 transition-colors rounded-lg p-1 hover:bg-red-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            
            {/* Top Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <form onSubmit={handleAddItem} className="flex w-full gap-2">
                    <Input
                        placeholder="Add an item manually..."
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" variant="secondary">
                        <Plus className="h-4 w-4" />
                    </Button>
                </form>

                <Button
                    onClick={handleAutoGenerate}
                    disabled={isGenerating}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                >
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {isGenerating ? "Analyzing Trip..." : "Auto-Generate"}
                </Button>
            </div>

            {items.length === 0 ? (
                <EmptyState 
                    type="packing"
                    title="Your manifest is empty"
                    description="Add items manually or let AI draft a completely custom list based on your destination's specific weather and vibe."
                >
                    <Button
                        onClick={handleAutoGenerate}
                        disabled={isGenerating}
                        className="rounded-xl font-bold shadow-lg shadow-emerald-600/20 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all hover:-translate-y-0.5 mt-2"
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5 stroke-3" />}
                        {isGenerating ? "Analyzing Trip..." : "Generate AI Packing List"}
                    </Button>
                </EmptyState>
            ) : (
                <>
                    {/* NEW: The PDF Export Header */}
                    <div className="flex justify-between items-end pt-2 pb-0">
                        <h3 className="text-lg font-bold text-zinc-900 px-1">Packing Manifest</h3>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportPDF} 
                            disabled={isExporting}
                            className="h-8 text-xs font-semibold"
                        >
                            {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                            {isExporting ? "Exporting..." : "Export to PDF"}
                        </Button>
                    </div>

                    {/* NEW: Attached the printRef here */}
                    <div ref={printRef} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden p-1">
                        <div className="divide-y divide-zinc-100">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => togglePacked(item.id, item.is_packed)} className="text-zinc-400 hover:text-emerald-500 transition-colors">
                                            {item.is_packed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5" />}
                                        </button>
                                        <div>
                                            <p className={`text-sm font-medium ${item.is_packed ? "text-zinc-400 line-through" : "text-zinc-900"}`}>
                                                {item.item_name}
                                            </p>
                                            {item.auto_generated_reason && (
                                                <p className="text-xs text-blue-500 font-medium mt-0.5 flex items-center gap-1">
                                                    <Sparkles className="h-3 w-3" /> {item.auto_generated_reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* NEW: Added data-html2canvas-ignore so edit/delete icons don't show on the PDF */}
                                    <div data-html2canvas-ignore="true" className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditClick(item)}
                                            className="p-1.5 text-zinc-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                            title="Edit Item"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete Item"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <EditPackingItemModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                tripId={tripId}
                item={itemToEdit}
                onSuccess={handleItemUpdated}
            />
        </div>
    );
};