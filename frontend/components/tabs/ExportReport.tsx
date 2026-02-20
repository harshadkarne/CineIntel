"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
    FileDown,
    CheckCircle2,
    Loader2,
    Sparkles,
    FileText,
    Share2,
    Lock,
    Download,
    ShieldCheck,
    Zap,
    ArrowRight
} from "lucide-react";

export default function ExportReport() {
    const [loading, setLoading] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            await api.exportReport();
            // Simulate small delay for UX
            setTimeout(() => {
                setLoading(false);
                setDownloaded(true);
            }, 1800);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-12 space-y-16 page-transition">
            <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    <ShieldCheck size={14} /> Intelligence Security Verified
                </div>
                <h1 className="text-5xl font-black text-white italic tracking-tighter">Strategic Intelligence <br />Export Suite</h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
                    Convert dynamic real-time analytics into portable, executive-grade intelligence dossiers for offline review and theatrical slate planning.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Executive Summary Option */}
                <div className="glass rounded-[40px] p-10 space-y-8 flex flex-col group border-t border-white/5 transition-all hover:bg-white/[0.04]">
                    <div className="flex justify-between items-start">
                        <div className="w-16 h-16 bg-white/[0.03] rounded-3xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                            <FileText className="text-gray-400" size={32} />
                        </div>
                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">v1.2 // Summary</div>
                    </div>

                    <div>
                        <h3 className="text-2xl font-black text-white mb-3 italic">Executive Summary</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">A high-velocity, 5-page PDF distillation of core ROI trends and market pulse. Minimalist, focused, data-dense.</p>
                    </div>

                    <div className="pt-4 mt-auto">
                        <button
                            onClick={handleExport}
                            disabled={loading}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all text-gray-300 uppercase tracking-widest text-xs"
                        >
                            {loading ? <Loader2 className="animate-spin text-primary" size={20} /> : downloaded ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Download size={20} />}
                            {downloaded ? "Dossier Ready" : "Generate Summary"}
                        </button>
                    </div>
                </div>

                {/* Full Slate Analytics Option */}
                <div className="glass-card rounded-[40px] p-10 space-y-8 flex flex-col relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />

                    <div className="relative z-10 flex justify-between items-start">
                        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                            <Sparkles className="text-primary" size={32} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-widest animate-pulse">
                            <Zap size={10} fill="currentColor" /> Premium
                        </div>
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-white mb-3 italic">Full Analytics Slate</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">Deep-dive technical dossier including model transparency reports, genre combination heatmaps, and local/global ROI cycle analysis.</p>
                    </div>

                    <div className="relative z-10 pt-4 mt-auto">
                        <button
                            onClick={handleExport}
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-2xl shadow-primary/40 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" size={22} /> : downloaded ? <CheckCircle2 size={22} /> : <Share2 size={22} />}
                            {downloaded ? "Slate Delivered" : "Export Full Slate"}
                        </button>
                    </div>
                </div>
            </div>

            {downloaded && (
                <div className="animate-in fade-in zoom-in-95 duration-500 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] text-center max-w-2xl mx-auto shadow-2xl">
                    <p className="text-emerald-400 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                        <CheckCircle2 size={18} /> Operation Successful: Intelligence Package Transferred
                    </p>
                </div>
            )}

            {/* Cinematic Placeholder / Preview */}
            <div className="relative group">
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="glass rounded-[48px] p-12 opacity-30 select-none grayscale cursor-not-allowed overflow-hidden group-hover:opacity-40 transition-opacity">
                    <div className="flex justify-between items-center mb-12">
                        <div className="h-8 bg-white/10 rounded-full w-48" />
                        <div className="flex gap-2">
                            <div className="w-10 h-1bg-white/5 rounded" />
                            <div className="w-10 h-1bg-white/5 rounded" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-12">
                        <div className="space-y-4">
                            <div className="h-32 bg-white/5 rounded-3xl" />
                            <div className="h-4 bg-white/5 rounded w-3/4" />
                            <div className="h-4 bg-white/5 rounded w-1/2" />
                        </div>
                        <div className="space-y-4">
                            <div className="h-32 bg-white/5 rounded-3xl" />
                            <div className="h-4 bg-white/5 rounded w-2/3" />
                            <div className="h-4 bg-white/5 rounded w-full" />
                        </div>
                        <div className="space-y-4">
                            <div className="h-32 bg-white/5 rounded-3xl" />
                            <div className="h-4 bg-white/5 rounded w-full" />
                            <div className="h-4 bg-white/5 rounded w-1/3" />
                        </div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="px-6 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-3">
                            <Lock size={14} /> Secure Preview Locked
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
