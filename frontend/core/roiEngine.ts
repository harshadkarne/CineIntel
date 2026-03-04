/**
 * roiEngine.ts
 * Core logic for calculating and standardizing Return on Investment (ROI) across CineIntel.
 */

/**
 * Computes standard ROI (Revenue / Budget)
 */
export function computeROI(revenue: number | null | undefined, budget: number | null | undefined): number {
    if (revenue == null || budget == null) return 0;
    if (budget <= 0) return 0;
    return revenue / budget;
}

/**
 * Derives a success label strictly based on ROI
 */
export function getSuccessLabel(roi: number): "Hit" | "Flop" {
    if (roi > 1.0) return "Hit";
    return "Flop";
}
