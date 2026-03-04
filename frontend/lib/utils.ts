/**
 * CineIntel Core Utilities
 * Standardizes formatting, fallbacks, and logic across the dashboard.
 */

/**
 * Downloads a blob as a file
 */
export const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
};

// Basic check for valid numerical data
export const isValidNumber = (val: any): boolean => {
    return val !== null && val !== undefined && !Number.isNaN(Number(val)) && val !== Infinity && val !== -Infinity && (typeof val === 'number' || !isNaN(val));
};

// Formats a standard metric with a fallback if data is missing
export const formatMetric = (val: any, fallback: string = "Data insufficient"): string => {
    if (!isValidNumber(val)) return fallback;
    return new Intl.NumberFormat('en-IN').format(Number(val));
};

// specifically for ROI mapping (1.5 -> 1.50x)
export const formatROI = (roi: any): string => {
    if (!isValidNumber(roi)) return "Data insufficient";
    const val = Number(roi);
    // Prevent illogical infinity or massive values if needed, but here just format
    return `${val.toFixed(2)}x`;
};

// specifically for Volatility mapping (4.2 -> σ 4.20)
export const formatVolatility = (vol: any): string => {
    if (!isValidNumber(vol)) return "Data insufficient";
    return `σ ${Number(vol).toFixed(2)}`;
};

// formats percentages (45.2 -> 45.2%) 
export const formatPercent = (pct: any, decimals: number = 1): string => {
    if (!isValidNumber(pct)) return "Data insufficient";
    const val = Number(pct);
    return `${val.toFixed(decimals)}%`;
};

// Formats raw currency in Rupees to INR Crores (₹X.XX Cr)
export const formatCurrency = (value: any): string => {
    if (!isValidNumber(value)) return "N/A";
    const num = Number(value);
    if (num === 0) return "N/A";
    const crores = num / 10000000;
    return `₹${crores.toFixed(1)} Cr`;
};

// formats Indian Currency to Crores (Assumes input is already in Crores)
export const formatCurrencyCr = (value: any): string => {
    if (!isValidNumber(value)) return "Data insufficient";
    const num = Number(value);
    if (num === 0) return "₹0 Cr";

    // Input is already in Crores (normalized from USD * 83 / 10^7).
    // Display as Whole numbers or with 1 decimal if needed, e.g. "₹16.5 Cr", "₹250 Cr"
    if (num >= 100) return `₹${Math.round(num)} Cr`;
    return `₹${num.toFixed(1)} Cr`;
};

// Helper for UI badges
export const getRiskBadgeColor = (riskLabel: string) => {
    const r = (riskLabel || "").toLowerCase();
    if (r.indexOf('safe') !== -1 || r.indexOf('low') !== -1) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (r.indexOf('moderate') !== -1) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (r.indexOf('high') !== -1 || r.indexOf('extreme') !== -1 || r.indexOf('risk') !== -1) return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'; // fallback
};
