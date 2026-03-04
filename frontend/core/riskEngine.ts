/**
 * riskEngine.ts
 * Core logic for actuarial risk calculations and composite scores.
 */

export interface RiskMetrics {
    volatility: number;
    failureRate: number;
    downsideProbability: number;
    lossSeverity: number;
    riskAdjustedROI: number;
    compositeScore: number;
    riskCategory: "LOW RISK" | "MODERATE" | "HIGH RISK";
    archetype: string;
}

/**
 * Calculate the population standard deviation of ROIs
 */
export function calculateVolatility(rois: number[]): number {
    if (rois.length < 2) return 0;
    const mean = rois.reduce((a, b) => a + b, 0) / rois.length;
    const variance = rois.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / rois.length;
    return Math.sqrt(variance);
}

/**
 * Determine the genre archetype based on historical performance data.
 * Rules (Section 4):
 * Core Stable: Failure Rate < 20% + Volatility < dataset median + ROI > median ROI
 * Growth Opportunities: ROI > median ROI + Volatility slightly above median
 * Speculative: Volatility high + Failure Rate > 30%
 */
export function calculateArchetype(
    failureRate: number,
    volatility: number,
    avgROI: number,
    medianROI: number,
    medianVol: number
): string {
    if (failureRate < 20 && volatility < medianVol && avgROI > medianROI) return "CORE STABLE";
    if (avgROI > medianROI && volatility >= medianVol && volatility < medianVol * 1.5) return "GROWTH OPPORTUNITY";
    if (volatility > medianVol * 1.5 && failureRate > 30) return "SPECULATIVE";
    if (failureRate > 40) return "HIGH RISK SEGMENT";
    return "STABLE PERFORMER";
}

/**
 * Main function to compute the composite risk metrics for a set of movies.
 * Spec (Section 2): (0.4 × Normalized Volatility) + (0.3 × Downside Probability) + (0.3 × Failure Rate)
 */
export function computeRiskMetrics(
    movies: { roi: number, budget?: number, revenue?: number }[],
    marketMedianROI: number = 1.0,
    marketMedianVol: number = 2.0
): RiskMetrics {
    if (!movies || movies.length === 0) {
        return {
            volatility: 0,
            failureRate: 0,
            downsideProbability: 0,
            lossSeverity: 0,
            riskAdjustedROI: 0,
            compositeScore: 0,
            riskCategory: "MODERATE",
            archetype: "N/A"
        };
    }

    const rois = movies.map(m => m.roi);
    const totalCount = rois.length;

    // Failure Rate: ROI < 1.0 (Audit Requirement)
    const failureCount = rois.filter(r => r < 1.0).length;
    const failureRate = (failureCount / totalCount) * 100;

    // Downside Probability: ROI < 1.0 (Audit Requirement - treats as separate factor in formula)
    const downsideCount = rois.filter(r => r < 1.0).length;
    const downsideProbability = (downsideCount / totalCount) * 100;

    // Average Loss Severity (Section 5): Average ROI of films where ROI < 1
    const failedFilms = rois.filter(r => r < 1.0);
    const avgFailureROI = failedFilms.length > 0 ? failedFilms.reduce((a, b) => a + b, 0) / failedFilms.length : 1.0;
    const lossSeverity = (avgFailureROI - 1) * 100;

    const volatility = calculateVolatility(rois);
    const avgROI = rois.reduce((a, b) => a + b, 0) / totalCount;

    // Risk Adjusted ROI (Section 7): Avg ROI / Volatility
    const riskAdjustedROI = volatility > 0 ? avgROI / volatility : avgROI;

    // Normalize Volatility (0-1 range)
    const normalizedVol = Math.min(volatility / 10, 1.0);

    // Composite Risk Score (Normalized between 0-1)
    // Audit Requirement: Risk = (0.4 * Volatility) + (0.3 * Downside Probability) + (0.3 * Failure Rate)
    const compositeScore = (0.4 * normalizedVol) + (0.3 * (downsideProbability / 100)) + (0.3 * (failureRate / 100));

    // Final risk classification (Section 2): <0.25 LOW, 0.25-0.40 MODERATE, >0.40 HIGH
    let riskCategory: "LOW RISK" | "MODERATE" | "HIGH RISK" = "MODERATE";
    if (compositeScore < 0.25) riskCategory = "LOW RISK";
    else if (compositeScore > 0.40) riskCategory = "HIGH RISK";

    return {
        volatility,
        failureRate,
        downsideProbability,
        lossSeverity,
        riskAdjustedROI,
        compositeScore,
        riskCategory,
        archetype: calculateArchetype(failureRate, volatility, avgROI, marketMedianROI, marketMedianVol)
    };
}
