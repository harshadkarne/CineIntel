import { AlertTriangle, Database, Info, Sparkles } from "lucide-react";

export default function Banner() {
    return (
        <div className="w-full bg-black/40 border-b border-white/5 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Database className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Scope</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                        <span className="text-white">196 Bollywood Films</span>
                        <span className="opacity-20">/</span>
                        <span>2001–2019</span>
                        <span className="opacity-20">/</span>
                        <span className="flex items-center gap-1"><Sparkles size={10} className="text-secondary" /> TMDb Verified</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 group cursor-help">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter group-hover:text-yellow-500 transition-colors">Low Confidence</span>
                    </div>
                    <div className="flex items-center gap-2 group cursor-help">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">High Confidence</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
