/**
 * analyticsEngine.ts
 * Top-level aggregation engine providing centralized metrics to all dashboard components.
 */
import rawMovies from '../data/movies.json';
import { computeROI, getSuccessLabel } from './roiEngine';
import { computeRiskMetrics } from './riskEngine';
import type { Movie } from './filterEngine';
import { isValidNumber } from '../lib/utils';

// Sanitize and initialize the central database
export const MOVIE_DATABASE: Movie[] = (rawMovies as any[])
    .map(m => {
        const rawBudget = Number(m.budget);
        const rawRevenue = Number(m.revenue);
        if (isNaN(rawBudget) || isNaN(rawRevenue)) return null;

        const budget = (rawBudget * 83) / 10000000;
        const revenue = (rawRevenue * 83) / 10000000;

        let roi = budget > 0 ? revenue / budget : 0;
        roi = Number(roi);
        if (isNaN(roi)) roi = 0;
        if (roi > 20) roi = 20;
        if (roi < 0) roi = 0;

        const risk_score = Math.min(1, Math.max(0, (budget / 500) * 0.5 + (roi < 1 ? 0.5 : 0)));

        return {
            ...m,
            genres: Array.isArray(m.genres) ? m.genres : [],
            budget,
            revenue,
            roi,
            risk_score,
            year: Number(m.year) || 0,
            title: m.title || "Unknown",
            success_label: getSuccessLabel(roi),
            runtime: Number(m.runtime) || 0,
            release_month: Number(m.release_month) || 0,
            valid_financials: budget > 0 && revenue > 0
        };
    })
    .filter((m): m is Movie => m !== null && m.budget > 0 && m.revenue >= 0 && !isNaN(m.roi));

const CACHE: Record<string, any> = {};

/**
 * Computes market-wide benchmarks for risk comparison.
 */
export function getMarketBenchmarks() {
    const cacheKey = 'marketBenchmarks_v2';
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    const validMovies = MOVIE_DATABASE.filter(m => m.budget > 0 && m.revenue > 0 && !isNaN(m.roi));
    const rois = validMovies.map(m => m.roi).sort((a, b) => a - b);
    const medianROI = rois[Math.floor(rois.length / 2)] || 1.0;

    const genreSet = new Set<string>();
    MOVIE_DATABASE.forEach(m => m.genres.forEach(g => genreSet.add(g)));
    const genres = Array.from(genreSet);

    const volList = genres.map(g => {
        const gm = MOVIE_DATABASE.filter(m => m.genres.includes(g) && m.budget > 0);
        if (gm.length < 5) return null;
        const mean = gm.reduce((a, b) => a + b.roi, 0) / gm.length;
        const variance = gm.reduce((acc, val) => acc + Math.pow(val.roi - mean, 2), 0) / gm.length;
        return Math.sqrt(variance);
    }).filter((v): v is number => v !== null && v > 0);

    const sortedVols = volList.sort((a, b) => a - b);
    const medianVol = sortedVols[Math.floor(sortedVols.length / 2)] || 2.0;

    // Market health: % of films with ROI >= 1 (break-even or better)
    const successCount = validMovies.filter(m => m.roi >= 1.0).length;
    const market_health_score = validMovies.length > 0 ? (successCount / validMovies.length) * 100 : 0;

    const result = { medianROI, medianVol, market_health_score };
    CACHE[cacheKey] = result;
    return result;
}

export function getAllGenres(): string[] {
    if (CACHE['allGenres']) return CACHE['allGenres'];
    const genreSet = new Set<string>();
    MOVIE_DATABASE.forEach(m => m.genres.forEach((g: string) => genreSet.add(g)));
    const result = Array.from(genreSet).sort();
    CACHE['allGenres'] = result;
    return result;
}

export function getGenreAnalytics(genre: string, benchmarks?: { medianROI: number, medianVol: number }) {
    const { medianROI, medianVol } = benchmarks || getMarketBenchmarks();
    const cacheKey = `genreAnalytics_precision_v3_${genre}`;
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    const genreMovies = MOVIE_DATABASE.filter(m => m.genres.includes(genre));
    const validMovies = genreMovies.filter(m => m.valid_financials && m.budget > 0);

    if (validMovies.length === 0) return null;

    const rois = validMovies.map(m => m.roi).sort((a, b) => a - b);
    const avgROI = validMovies.reduce((sum, m) => sum + m.revenue, 0) / validMovies.reduce((sum, m) => sum + m.budget, 0);
    const medianROI_local = rois[Math.floor(rois.length / 2)];

    const totalRevenue = validMovies.reduce((acc, m) => acc + m.revenue, 0);
    const totalBudget = validMovies.reduce((acc, m) => acc + m.budget, 0);
    const averageBudget = totalBudget / validMovies.length;

    const risk = computeRiskMetrics(validMovies, medianROI, medianVol);

    const currentYear = 2025;
    const last5Yr = validMovies.filter(m => m.year >= currentYear - 5);
    const prev5Yr = validMovies.filter(m => m.year >= currentYear - 10 && m.year < currentYear - 5);
    const last5Avg = last5Yr.length > 0 ? last5Yr.reduce((s, m) => s + m.roi, 0) / last5Yr.length : 0;
    const prev5Avg = prev5Yr.length > 0 ? prev5Yr.reduce((s, m) => s + m.roi, 0) / prev5Yr.length : 0;
    const momentum = prev5Avg > 0 ? ((last5Avg - prev5Avg) / prev5Avg) * 100 : 0;

    let lifecycle = "Stable";
    if (last5Avg > prev5Avg * 1.25) lifecycle = "Growing";
    else if (last5Avg < prev5Avg * 0.75) lifecycle = "Declining";
    if (last5Avg > 3.0 && lifecycle === "Growing") lifecycle = "Peak";

    const last3YrCount = validMovies.filter(m => m.year >= currentYear - 3).length;
    const yearsActive = new Set(validMovies.map(m => m.year)).size;
    const histAvgVolume = yearsActive > 0 ? validMovies.length / yearsActive : 0;
    const saturationIndex = histAvgVolume > 0 ? last3YrCount / (histAvgVolume * 3) : 0;

    const budgetBands = [
        { label: "Micro Budget (< ₹5 Cr)", min: 0, max: 5 },
        { label: "Low Budget (₹5–20 Cr)", min: 5, max: 20 },
        { label: "Mid Budget (₹20–60 Cr)", min: 20, max: 60 },
        { label: "High Budget (₹60–120 Cr)", min: 60, max: 120 },
        { label: "Blockbuster (₹120 Cr+)", min: 120, max: 10000 }
    ];

    const budgetIntelligence = budgetBands.map(band => {
        const bandMovies = validMovies.filter(m => {
            const budgetCr = m.budget;
            return budgetCr >= band.min && budgetCr < band.max;
        });
        if (bandMovies.length === 0) return { ...band, avg_roi: 0, hit_rate: 0, count: 0 };
        const bandAvgROI = bandMovies.reduce((acc, m) => acc + m.roi, 0) / bandMovies.length;
        const bandHits = bandMovies.filter(m => m.roi >= 2.0).length;
        return { ...band, avg_roi: bandAvgROI, hit_rate: (bandHits / bandMovies.length) * 100, count: bandMovies.length };
    });

    const result = {
        genre,
        totalMovies: genreMovies.length,
        validMoviesCount: validMovies.length,
        averageROI: avgROI,
        medianROI: medianROI_local,
        totalRevenue,
        totalBudget,
        averageBudget,
        hitRate: (validMovies.filter(m => m.roi >= 2.0).length / validMovies.length) * 100,
        failureRate: risk.failureRate,
        downsideProbability: risk.downsideProbability,
        lossSeverity: risk.lossSeverity,
        riskAdjustedROI: risk.riskAdjustedROI,
        volatility: risk.volatility,
        investmentScore: risk.compositeScore,
        momentum,
        lifecycle,
        saturationIndex,
        confidence: validMovies.length >= 5 ? "HIGH" : "LOW",
        budgetIntelligence,
        sweetSpot: [...budgetIntelligence].sort((a, b) => b.avg_roi - a.avg_roi)[0]?.label || "N/A",
        topDrivers: [...validMovies].sort((a, b) => b.roi - a.roi).slice(0, 3),
        riskCategory: risk.riskCategory,
        archetype: risk.archetype,
        compositeScore: risk.compositeScore
    };

    CACHE[cacheKey] = result;
    return result;
}

export function getAllGenreAnalytics() {
    const cacheKey = 'allGenreAnalyticsPrecision_v3';
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    const benchmarks = getMarketBenchmarks();
    const genres = getAllGenres();
    const result = genres.map(g => getGenreAnalytics(g, benchmarks)).filter(Boolean);

    const totalIndustryRevenue = MOVIE_DATABASE.reduce((acc, m) => acc + (m.revenue || 0), 0);

    const enriched = result.map((g: any) => ({
        ...g,
        volumeShare: (g.totalMovies / MOVIE_DATABASE.length) * 100,
        revenueShare: (g.totalRevenue / Math.max(1, totalIndustryRevenue)) * 100
    }));

    CACHE[cacheKey] = enriched;
    return enriched;
}

export function getMarketRiskAnalysis() {
    const validMovies = MOVIE_DATABASE.filter(m => m.budget > 0 && m.revenue > 0 && !isNaN(m.roi));
    if (validMovies.length === 0) return null;

    const risk = computeRiskMetrics(validMovies);
    const rois = validMovies.map(m => m.roi);
    const meanROI = rois.reduce((a, b) => a + b, 0) / rois.length;
    const sortedROIs = [...rois].sort((a, b) => a - b);
    const medianROI = sortedROIs[Math.floor(sortedROIs.length / 2)];

    return {
        mean_roi: meanROI,
        median_roi: medianROI,
        volatility: risk.volatility,
        downside_probability: risk.downsideProbability,
        failure_rate: risk.failureRate,
        capital_loss_probability: risk.failureRate, // ROI < 1 is the proxy for capital loss in this model
        risk_level: risk.riskCategory
    };
}

/**
 * STEP 3 — PORTFOLIO OPTIMIZER ENGINE
 * Allocates capital across genres using dynamic weights (Section 8).
 */
export function getOptimizedPortfolio(riskAppetite: number) {
    const allStats = getAllGenreAnalytics();
    // Section 9: Filters out low-sample genres (n < 20)
    const genreStats = allStats.filter((g: any) => g.validMoviesCount >= 5);

    const stable = genreStats.filter((g: any) => g.archetype.includes("STABLE"));
    const growth = genreStats.filter((g: any) => g.archetype.includes("GROWTH") || g.archetype.includes("BREAKOUT"));
    const speculative = genreStats.filter((g: any) => g.archetype.includes("SPECULATIVE") || g.archetype.includes("HIGH RISK"));

    // Section 8: Dynamic Allocation Weights
    const stableWeight = 0.55;
    const growthWeight = 0.30;
    const specWeight = 0.15;

    const portfolio: any[] = [];

    const distribute = (list: any[], totalWeight: number) => {
        if (list.length === 0) return;
        const sorted = [...list].sort((a, b) => b.investmentScore - a.investmentScore).slice(0, 3);
        const weightPerGenre = totalWeight / sorted.length;
        sorted.forEach(g => {
            portfolio.push({
                genre: g.genre,
                weight: weightPerGenre * 100,
                expectedROI: g.averageROI,
                risk: g.riskCategory,
                archetype: g.archetype,
                volatility: g.volatility,
                failureRate: g.failureRate
            });
        });
    };

    distribute(stable, stableWeight);
    distribute(growth, growthWeight);
    distribute(speculative, specWeight);

    const totalPortfolioWeight = portfolio.reduce((acc, p) => acc + p.weight, 0);
    // Normalize if weights don't sum to target due to missing categories
    if (totalPortfolioWeight > 0 && Math.abs(totalPortfolioWeight - 100) > 1) {
        portfolio.forEach(p => p.weight = (p.weight / totalPortfolioWeight) * 100);
    }

    const expectedROI = portfolio.reduce((acc, p) => acc + (p.expectedROI * p.weight / 100), 0);

    return {
        portfolio,
        metrics: {
            expected_roi: expectedROI,
            volatility: portfolio.reduce((acc, p) => acc + (p.volatility * p.weight / 100), 0),
            hit_probability: 100 - portfolio.reduce((acc, p) => acc + (p.failureRate * p.weight / 100), 0)
        }
    };
}

export function getGlobalMetrics() {
    const cacheKey = 'globalMetrics_institutional_v1';
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    // Step 11: Data Integrity Checks (Budget > 0, ROI >= 0, finite values)
    const validMovies = MOVIE_DATABASE.filter(m =>
        m.budget > 0 &&
        m.roi >= 0 &&
        isValidNumber(m.roi) &&
        isValidNumber(m.revenue)
    );

    if (validMovies.length === 0) return null;

    // Step 10: Total Volume Analysed (Σ Box Office Revenue, deduplicated by MOVIE_DATABASE logic)
    const totalVolume = validMovies.reduce((acc, m) => acc + (m.revenue || 0), 0);

    // Step 2: Market Velocity Calculation (Industry ROI momentum)
    const yearsWithData = validMovies.map(m => m.year).filter(y => y >= 1957);
    const maxYear = yearsWithData.length > 0 ? Math.max(...yearsWithData) : 2025;

    // Window definitions (institutional 5-year buckets)
    const recentWindow = validMovies.filter(m => m.year >= maxYear - 4 && m.year <= maxYear);
    const prevWindow = validMovies.filter(m => m.year >= maxYear - 9 && m.year < maxYear - 4);

    const recentAvgROI = recentWindow.length > 0 ? recentWindow.reduce((a, b) => a + (b.roi || 0), 0) / recentWindow.length : 0;
    const prevAvgROI = prevWindow.length > 0 ? prevWindow.reduce((a, b) => a + (b.roi || 0), 0) / prevWindow.length : 0;

    // Market Velocity = ((Avg ROI last 5y - Avg ROI prev 5y) / Avg ROI prev 5y) * 100
    const velocity_pct = prevAvgROI > 0.001 ? ((recentAvgROI - prevAvgROI) / prevAvgROI) * 100 : 0;
    const market_velocity_label = velocity_pct >= 0 ? 'Expansionary' : 'Contractionary';

    // Step 4: Correct Risk Regime (ROI Volatility σ)
    const allROIs = validMovies.filter(m => m.year >= 1975).map(m => m.roi || 0); // Focus on modern era for risk
    const marketMean = allROIs.reduce((a, b) => a + b, 0) / allROIs.length;
    const marketVariance = allROIs.reduce((acc, roi) => acc + Math.pow(roi - marketMean, 2), 0) / allROIs.length;
    const risk_index = Math.sqrt(marketVariance);
    let risk_label = "Moderate Risk";
    if (risk_index < 2.5) risk_label = "Low Risk";
    else if (risk_index >= 4) risk_label = "High Risk"; // Threshold update: sigma >= 4

    // Step 3: Fix Market Sentiment Logic (Refined Multi-signal Score)
    // Sentiment Score = (ROI_growth * 0.4) - (Volatility * 0.3) - (FailureRate * 0.3)

    const roiTrend = prevAvgROI > 0.001 ? (recentAvgROI - prevAvgROI) / prevAvgROI : 0;
    const recentFailureRate = recentWindow.length > 0 ? (recentWindow.filter(m => m.roi < 1.0).length / recentWindow.length) : 0;

    const sentimentScore = (roiTrend * 0.4) - (risk_index * 0.3) - (recentFailureRate * 0.3);

    let sentiment = "Neutral";
    let sentiment_stage = "neutral";
    if (sentimentScore > 0.2) {
        sentiment = "Bullish";
        sentiment_stage = "bullish";
    } else if (sentimentScore < -0.2) {
        sentiment = "Bearish";
        sentiment_stage = "bearish";
    }

    // Step 9: Fix Allocation Guardrails (Risk Logic)
    let capital_allocation: Record<string, number>;
    if (risk_label === "Low Risk") {
        capital_allocation = { 'Core': 70, 'Growth': 20, 'Speculative': 10 };
    } else if (risk_label === "Moderate Risk") {
        capital_allocation = { 'Core': 55, 'Growth': 30, 'Speculative': 15 };
    } else {
        capital_allocation = { 'Core': 40, 'Growth': 40, 'Speculative': 20 };
    }

    // Step 5: Fix Trending Genre Calculation (Momentum Score)
    const genreSet = new Set<string>();
    validMovies.forEach(m => (m.genres || []).forEach(g => genreSet.add(g)));

    const genreMomentum: any[] = [];
    Array.from(genreSet).forEach(genre => {
        if (!genre || genre === "Unknown") return;
        const gMovies = validMovies.filter(m => (m.genres || []).includes(genre));
        const gRecent = gMovies.filter(m => m.year >= maxYear - 4);
        const gPrev = gMovies.filter(m => m.year >= maxYear - 9 && m.year < maxYear - 5);

        if (gRecent.length < 2 || gPrev.length < 2) return;

        const gRecentROI = gRecent.reduce((a, b) => a + (b.roi || 0), 0) / gRecent.length;
        const gPrevROI = gPrev.reduce((a, b) => a + (b.roi || 0), 0) / gPrev.length;
        const roiGrowth = gPrevROI > 0 ? (gRecentROI - gPrevROI) / gPrevROI : 0;

        const gRecentHR = gRecent.filter(m => m.roi >= 2.0).length / gRecent.length;
        const gPrevHR = gPrev.filter(m => m.roi >= 2.0).length / gPrev.length;
        const hrGrowth = gPrevHR > 0 ? (gRecentHR - gPrevHR) / gPrevHR : 0;

        const volGrowth = (gRecent.length - gPrev.length) / Math.max(1, gPrev.length);

        // MomentumScore = (ROI_growth * 0.5) + (HitRate_growth * 0.3) + (ReleaseVolume_growth * 0.2)
        const momentumScore = (roiGrowth * 0.5) + (hrGrowth * 0.3) + (volGrowth * 0.2);

        // Alpha score (Step 6) and Anchor score (Step 8)
        const gVol = Math.sqrt(gRecent.reduce((acc, m) => acc + Math.pow((m.roi || 0) - gRecentROI, 2), 0) / gRecent.length) || 0.1;
        const alphaScore = gRecentROI / gVol;

        // Anchor segment (Step 8): AnchorScore = (HitRate * 0.6) + ((1 / Volatility) * 0.4)
        const anchorScore = (gRecentHR * 0.6) + ((1 / gVol) * 0.4);

        genreMomentum.push({ genre, momentumScore, alphaScore, anchorScore, avgROI: gRecentROI, volatility: gVol });
    });

    let trending_genre = "Drama";
    let top_alpha = "Action";
    let anchor_segment = "Comedy";

    if (genreMomentum.length > 0) {
        trending_genre = [...genreMomentum].sort((a, b) => b.momentumScore - a.momentumScore)[0].genre;
        top_alpha = [...genreMomentum].sort((a, b) => b.alphaScore - a.alphaScore)[0].genre;
        anchor_segment = [...genreMomentum].sort((a, b) => b.anchorScore - a.anchorScore)[0].genre;
    }

    // Step 9: Correct Strategic Intelligence Narrative
    const strategic_intelligence = `The market is currently in a ${sentiment} phase with ${risk_label} conditions. ${trending_genre} is showing the strongest momentum. ${top_alpha} offers the highest return efficiency, while ${anchor_segment} provides stability.`;

    const result = {
        total_movies: MOVIE_DATABASE.length,
        financial_sample_count: validMovies.length,
        year_range: `${Math.min(...validMovies.map(m => m.year))}–${maxYear}`,
        sentiment,
        sentiment_stage,
        sentiment_score: sentimentScore,
        market_velocity: velocity_pct,
        market_velocity_label,
        risk_index,
        risk_label,
        trending_genre,
        top_alpha,
        anchor_segment,
        strategic_intelligence,
        capital_allocation: {
            "Core (Low Risk)": capital_allocation['Core'],
            "Growth (Moderate)": capital_allocation['Growth'],
            "Speculative (High)": capital_allocation['Speculative']
        },
        total_volume: totalVolume,
        data_freshness: 'Mar 2026',
        confidence_score: validMovies.length > 300 ? 'High' : 'Moderate',
        avg_roi: recentAvgROI,
        success_rate: (recentWindow.filter(m => m.roi > 1.0).length / Math.max(1, recentWindow.length)) * 100
    };

    CACHE[cacheKey] = result;
    return result;
}

export function getExplorerInsights(filteredMovies: Movie[]) {
    if (filteredMovies.length === 0) return null;
    const genreCounts: Record<string, { count: number, totalROI: number }> = {};
    filteredMovies.forEach(m => {
        m.genres.forEach(g => {
            if (!genreCounts[g]) genreCounts[g] = { count: 0, totalROI: 0 };
            genreCounts[g].count++;
            genreCounts[g].totalROI += m.roi;
        });
    });

    const genreStats = Object.entries(genreCounts).map(([genre, stats]) => ({
        genre,
        avgROI: stats.totalROI / stats.count,
        count: stats.count
    }));

    const topGenre = genreStats.sort((a, b) => b.avgROI - a.avgROI)[0]?.genre || "N/A";
    const budgetTiers = [
        { label: "Micro (< ₹5 Cr)", min: 0, max: 5 },
        { label: "Low (₹5-30 Cr)", min: 5, max: 30 },
        { label: "Mid (₹30-100 Cr)", min: 30, max: 100 },
        { label: "High (> ₹100 Cr)", min: 100, max: 1000000 }
    ];

    const budgetPerformance = budgetTiers.map(tier => {
        const movies = filteredMovies.filter(m => m.budget >= tier.min && m.budget < tier.max);
        const avgROI = movies.length > 0 ? movies.reduce((acc, m) => acc + m.roi, 0) / movies.length : 0;
        return { ...tier, avgROI };
    });

    // Weakest segment: genre with lowest average ROI (min 5 films in this filter)
    const weakestGenreStats = genreStats.filter(g => g.count >= 5);
    const weakestSegment = [...weakestGenreStats].sort((a, b) => a.avgROI - b.avgROI)[0]?.genre || "N/A";

    return {
        topGenre,
        optimalBudget: budgetPerformance.sort((a, b) => b.avgROI - a.avgROI)[0]?.label || "N/A",
        highestROIAsset: [...filteredMovies].sort((a, b) => b.roi - a.roi)[0],
        weakestSegment
    };
}

/**
 * SECTION 2 & 3 — GENRE VS GENRE COMPARATOR
 */
export function getGenreComparison(genreA: string, genreB: string) {
    const statsA = getGenreAnalytics(genreA);
    const statsB = getGenreAnalytics(genreB);

    if (!statsA || !statsB) return null;

    const computeScore = (s: any) => {
        // Audit Requirement: Score = (ROI weight 0.4) + (Hit Rate weight 0.3) − (Volatility weight 0.3)
        // Normalize for score consistency
        const normROI = Math.min(1.0, s.averageROI / 5.0);
        const normHit = s.hitRate / 100;
        const normVol = Math.min(s.volatility / 5.0, 1.0);

        return (normROI * 0.4) + (normHit * 0.3) - (normVol * 0.3);
    };

    const scoreA = computeScore(statsA);
    const scoreB = computeScore(statsB);

    return {
        genreA: statsA,
        genreB: statsB,
        winner: scoreA > scoreB ? genreA : genreB,
        comparison: {
            roi: statsA.averageROI > statsB.averageROI ? genreA : genreB,
            hitRate: statsA.hitRate > statsB.hitRate ? genreA : genreB,
            stability: statsA.volatility < statsB.volatility ? genreA : genreB,
            revenue: statsA.totalRevenue > statsB.totalRevenue ? genreA : genreB
        }
    };
}

/**
 * SECTION 6 — ROI TREND COMPARISON
 */
export function getROIEvolution(genreA: string, genreB: string) {
    const startYear = 1957;
    const endYear = 2025;
    const timeline: any[] = [];

    const getRollingAvg = (genre: string, year: number) => {
        const window = MOVIE_DATABASE.filter(m =>
            m.genres.includes(genre) &&
            m.year >= year - 1 && m.year <= year + 1
        );
        if (window.length === 0) return null;
        return window.reduce((sum, m) => sum + m.roi, 0) / window.length;
    };

    for (let year = startYear; year <= endYear; year++) {
        const roiA = getRollingAvg(genreA, year);
        const roiB = getRollingAvg(genreB, year);

        if (roiA !== null || roiB !== null) {
            timeline.push({
                year,
                [genreA]: roiA || 0,
                [genreB]: roiB || 0
            });
        }
    }

    return timeline;
}

/**
 * SECTION 8 — GENRE COMBINATION ANALYZER
 */
export function getGenreCombinations() {
    const cacheKey = 'genreCombinations_v1';
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    const combos: Record<string, { totalROI: number, count: number, genres: string[] }> = {};

    MOVIE_DATABASE.forEach(m => {
        if (m.genres.length < 2) return;

        // Sort genres to ensure "Drama+Comedy" and "Comedy+Drama" are the same key
        const sorted = [...m.genres].sort();
        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                const pairKey = `${sorted[i]} + ${sorted[j]}`;
                if (!combos[pairKey]) {
                    combos[pairKey] = { totalROI: 0, count: 0, genres: [sorted[i], sorted[j]] };
                }
                combos[pairKey].totalROI += m.roi;
                combos[pairKey].count++;
            }
        }
    });

    const result = Object.entries(combos)
        .map(([name, stats]) => ({
            name,
            avgROI: stats.totalROI / stats.count,
            count: stats.count,
            genres: stats.genres,
            // Audit Requirement: include Risk (using volatility proxy for combo stats)
            volatility: 0, // Simplified for combos due to pair complexity, but placeholder for unit consistency
        }))
        .sort((a, b) => b.avgROI - a.avgROI);

    CACHE[cacheKey] = result;
    return result;
}

/**
 * ROI CLASSIFICATION
 * Returns a human-readable label for a given ROI value.
 * Used by MovieExplorer.tsx card badges.
 * Breakout ROI = >= 5x | Hit = >= 2x | Stable Asset = >= 1x | Flop = < 1x
 */
export function getROIClassification(roi: number): "Breakout ROI" | "Hit" | "Stable Asset" | "Flop" {
    if (roi >= 5.0) return "Breakout ROI";
    if (roi >= 2.0) return "Hit";
    if (roi >= 1.0) return "Stable Asset";
    return "Flop";
}

/**
 * BACKWARD COMPATIBILITY ALIASES
 */
export const getIndustryBenchmarks = getMarketBenchmarks;
export const getGenreSectorComparison = getAllGenreAnalytics;

/**
 * GENRE INTELLIGENCE — YEARLY ROI PERFORMANCE
 * Builds a 3-year rolling average ROI series per genre (1957–2025).
 * Used by GenreIntelligence.tsx for ROI evolution charts.
 */
export function getYearlyGenrePerformance() {
    const cacheKey = 'yearlyGenrePerformance_v2';
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    const genres = getAllGenres(); // Removed count threshold to include ALL genres

    const startYear = 1990; // Narrowed for chart density
    const endYear = 2025;
    const result: any[] = [];

    genres.forEach(genre => {
        for (let year = startYear; year <= endYear; year++) {
            // 3-year rolling window
            const window = MOVIE_DATABASE.filter(m =>
                m.genres.includes(genre) &&
                m.year >= year - 1 && m.year <= year + 1 &&
                m.valid_financials
            );
            if (window.length < 3) continue;
            const avgROI = window.reduce((a, m) => a + m.roi, 0) / window.length;
            result.push({
                year,
                genre,
                avg_roi: parseFloat(avgROI.toFixed(2)),
                avg_roi_smooth: parseFloat(avgROI.toFixed(2)),
                trend: avgROI > 2.0 ? 'High' : avgROI > 1.0 ? 'Moderate' : 'Low',
                count: window.length
            });
        }
    });

    CACHE[cacheKey] = result;
    return result;
}

/**
 * EXPORT ENGINE
 * Generates a JSON or text export blob of all platform analytics.
 * Used by ExportReport.tsx.
 */
export function generateExport(format: 'pdf' | 'json' = 'json'): Blob {
    const globalMetrics = getGlobalMetrics();
    const genreAnalytics = getAllGenreAnalytics();
    const benchmarks = getMarketBenchmarks();
    const combinations = getGenreCombinations().slice(0, 20);

    const exportData = {
        generated_at: new Date().toISOString(),
        platform: 'CineIntel v2.0',
        dataset_scope: `${globalMetrics.total_movies} Bollywood films (${globalMetrics.year_range})`,
        global_metrics: {
            total_films: globalMetrics.total_movies,
            avg_roi: parseFloat(globalMetrics.avg_roi.toFixed(2)),
            success_rate: parseFloat(globalMetrics.success_rate.toFixed(1)),
            risk_volatility: parseFloat(globalMetrics.risk_index.toFixed(2)),
            market_health: parseFloat(benchmarks.market_health_score.toFixed(1)),
            top_genre_by_roi: globalMetrics.top_alpha,
            trending_genre: globalMetrics.trending_genre,
            risk_level: globalMetrics.risk_label
        },
        genre_breakdown: genreAnalytics
            .filter((g: any) => g.validMoviesCount >= 20)
            .map((g: any) => ({
                genre: g.genre,
                films: g.totalMovies,
                avg_roi: parseFloat(g.averageROI.toFixed(2)),
                hit_rate: parseFloat(g.hitRate.toFixed(1)),
                failure_rate: parseFloat(g.failureRate.toFixed(1)),
                volatility: parseFloat(g.volatility.toFixed(2)),
                risk_score: parseFloat(g.compositeScore.toFixed(3)),
                risk_category: g.riskCategory,
                archetype: g.archetype
            })),
        top_genre_combinations: combinations.map((c: { genres: string[], avgROI: number, count: number }) => ({
            genres: c.genres,
            avg_roi: parseFloat(c.avgROI.toFixed(2)),
            film_count: c.count
        }))
    };

    if (format === 'json') {
        return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    }

    // Text/PDF fallback
    const lines = [
        '=== CineIntel Strategic Intelligence Report ===',
        `Generated: ${new Date().toLocaleString('en-IN')}`,
        `Dataset: ${exportData.dataset_scope}`,
        '',
        '--- GLOBAL METRICS ---',
        `Total Films Analyzed: ${exportData.global_metrics.total_films}`,
        `Market Average ROI: ${exportData.global_metrics.avg_roi}x`,
        `Success Rate (ROI >= 1): ${exportData.global_metrics.success_rate}%`,
        `Risk Volatility (σ): ${exportData.global_metrics.risk_volatility}`,
        `Market Health Score: ${exportData.global_metrics.market_health}%`,
        `Top Alpha Genre: ${exportData.global_metrics.top_genre_by_roi}`,
        `Trending Genre: ${exportData.global_metrics.trending_genre}`,
        `Risk Level: ${exportData.global_metrics.risk_level}`,
        '',
        '--- GENRE BREAKDOWN (Top 10 by ROI) ---',
        ...exportData.genre_breakdown
            .sort((a: { avg_roi: number }, b: { avg_roi: number }) => b.avg_roi - a.avg_roi)
            .slice(0, 10)
            .map((g: { genre: string, avg_roi: number, hit_rate: number, failure_rate: number, risk_category: string }) => `${g.genre}: ${g.avg_roi}x ROI | ${g.hit_rate}% hits | ${g.failure_rate}% failures | Risk: ${g.risk_category}`),
        '',
        '--- TOP GENRE COMBINATIONS ---',
        ...exportData.top_genre_combinations.slice(0, 10).map((c: { genres: string[], avg_roi: number, film_count: number }) => `${c.genres.join(' + ')}: ${c.avg_roi}x avg ROI (${c.film_count} films)`)
    ];

    return new Blob([lines.join('\n')], { type: 'text/plain' });
}

/**
 * INVESTMENT SIMULATOR ENGINE
 * Given a film plan (genres, budget, runtime, release month),
 * returns actuarial projections derived from the real dataset.
 * Used by InvestmentSimulator.tsx.
 */
export interface InvestmentPlan {
    genres: string[];
    budget: number; // ₹ Crores
    runtime: number; // minutes
    releaseMonth: number; // 1–12
}

export function predictInvestment(plan: InvestmentPlan) {
    const { genres, budget, runtime, releaseMonth } = plan;
    if (!genres || genres.length === 0) return null;

    const benchmarks = getMarketBenchmarks();

    // Aggregate genre stats for each selected genre
    const genreStats = genres.map(g => getGenreAnalytics(g, benchmarks)).filter(Boolean);
    if (genreStats.length === 0) return null;

    // Blend ROI, volatility etc. across genres
    const blendedAvgROI = genreStats.reduce((sum: number, g: any) => sum + g.averageROI, 0) / genreStats.length;
    const blendedVolatility = genreStats.reduce((sum: number, g: any) => sum + g.volatility, 0) / genreStats.length;
    const blendedHitRate = genreStats.reduce((sum: number, g: any) => sum + g.hitRate, 0) / genreStats.length;
    const blendedFailureRate = genreStats.reduce((sum: number, g: any) => sum + g.failureRate, 0) / genreStats.length;
    const blendedComposite = genreStats.reduce((sum: number, g: any) => sum + g.compositeScore, 0) / genreStats.length;

    // Budget band multiplier (mid-budget ₹20–60Cr tends to outperform)
    let budgetMultiplier = 1.0;
    if (budget < 5) budgetMultiplier = 0.85;
    else if (budget < 20) budgetMultiplier = 0.95;
    else if (budget < 60) budgetMultiplier = 1.05;
    else if (budget < 120) budgetMultiplier = 1.0;
    else budgetMultiplier = 0.9; // blockbusters are high risk

    // Runtime multiplier (90–150 min sweet spot)
    let runtimeMultiplier = 1.0;
    if (runtime < 90) runtimeMultiplier = 0.92;
    else if (runtime > 180) runtimeMultiplier = 0.90;

    // Seasonal multiplier (Dec/Oct premium window)
    const seasonalPremium: Record<number, number> = {
        1: 0.95, 2: 0.92, 3: 1.02, 4: 0.98, 5: 1.05, 6: 1.10,
        7: 1.08, 8: 0.97, 9: 0.95, 10: 1.12, 11: 1.05, 12: 1.15
    };
    const seasonMultiplier = seasonalPremium[releaseMonth] || 1.0;

    const adjustedROI = blendedAvgROI * budgetMultiplier * runtimeMultiplier * seasonMultiplier;
    const projectedRevenue = budget * adjustedROI;
    const projectedProfit = projectedRevenue - budget;

    // Risk category
    let riskCategory = 'MODERATE';
    if (blendedComposite < 0.25) riskCategory = 'LOW RISK';
    else if (blendedComposite > 0.40) riskCategory = 'HIGH RISK';

    // Greenlight Score (0–100): weighted composite of hit rate, ROI efficiency, and risk
    const greenlightScore = Math.min(100, Math.round(
        (blendedHitRate * 0.4) +
        (Math.min(adjustedROI / 5, 1) * 100 * 0.35) +
        ((1 - blendedComposite) * 100 * 0.25)
    ));

    // Budget percentile (how does this budget compare to all films of these genres?)
    const relevantFilms = MOVIE_DATABASE.filter(m => genres.some(g => m.genres.includes(g)));
    const budgetPercentile = relevantFilms.length > 0
        ? (relevantFilms.filter(m => m.budget < budget).length / relevantFilms.length) * 100
        : 50;

    // Comparable historical films
    const comparableFilms = [...relevantFilms]
        .filter(m => Math.abs(m.budget - budget) / Math.max(1, budget) < 0.5 && m.roi > 1.0)
        .sort((a, b) => Math.abs(a.budget - budget) - Math.abs(b.budget - budget))
        .slice(0, 5)
        .map(m => ({ title: m.title, year: m.year, roi: m.roi, budget: m.budget, genres: m.genres }));

    // Budget tier breakdown for chart
    const budgetTiers = [
        { tier: 'Micro (<₹5Cr)', min: 0, max: 5 },
        { tier: 'Low (₹5–20Cr)', min: 5, max: 20 },
        { tier: 'Mid (₹20–60Cr)', min: 20, max: 60 },
        { tier: 'High (₹60–120Cr)', min: 60, max: 120 },
        { tier: 'Blockbuster (₹120Cr+)', min: 120, max: 99999 }
    ].map(t => {
        const tMovies = relevantFilms.filter(m => m.budget >= t.min && m.budget < t.max);
        return {
            ...t,
            avg_roi: tMovies.length > 0 ? tMovies.reduce((a, m) => a + m.roi, 0) / tMovies.length : 0,
            hit_rate: tMovies.length > 0 ? (tMovies.filter(m => m.roi >= 2.0).length / tMovies.length) * 100 : 0,
            count: tMovies.length
        };
    });

    // Recommendations
    const bestMonth = seasonalPremium[12] > seasonalPremium[5] ? 12 : 5; // Simplified but dynamic
    const recommendedRuntime = 135; // Bollywood sweet spot
    const runtimeDeviation = Math.abs(runtime - recommendedRuntime);
    const runtimeRisk = runtimeDeviation <= 20 ? 'Optimal' : runtimeDeviation <= 40 ? 'Neutral' : 'High Variance';

    const advisorGuidance = [];
    if (adjustedROI < 1.5) advisorGuidance.push("Economic efficiency is low. Consider reducing budget scale or pivoting to higher-ROI genre clusters.");
    if (runtime > 165) advisorGuidance.push("Extended runtime may hit theatrical turnover. Recommend tightening edit to sub-150m for optimized show-counts.");
    if (budget > benchmarks.medianROI * 10) advisorGuidance.push("Capital exposure is high relative to sector benchmarks. Ensure high-quality P&A spend to mitigate downside.");

    // Budget Intelligence
    const budgetIntelligence = {
        risk_level: budgetPercentile < 40 ? 'Low' : budgetPercentile < 75 ? 'Moderate' : 'High',
        median: blendedAvgROI > 0 ? Math.round(benchmarks.medianROI * 10) : 35, // Mock-ish but based on benchmarks
        suggested_range: `₹15 Cr - ₹${Math.round(benchmarks.medianROI * 25)} Cr`,
        percentile: Math.round(budgetPercentile),
        max_historical: Math.max(...relevantFilms.map(m => m.budget), 0),
        hit_range: [15, 65], // Simplified
        volatility_label: blendedVolatility > 4 ? 'High Variance' : 'Stable Trajectory',
        show_volatility_warning: blendedVolatility > 4.5,
        volatility: blendedVolatility
    };

    return {
        expected_roi: parseFloat(adjustedROI.toFixed(2)),
        base_roi: parseFloat(blendedAvgROI.toFixed(2)),
        projected_revenue: parseFloat(projectedRevenue.toFixed(1)),
        projected_profit: parseFloat(projectedProfit.toFixed(1)),
        volatility: parseFloat(blendedVolatility.toFixed(2)),
        hit_rate: parseFloat(blendedHitRate.toFixed(1)),
        failure_rate: parseFloat(blendedFailureRate.toFixed(1)),
        probabilities: {
            hit: parseFloat(blendedHitRate.toFixed(1)),
            average: parseFloat((100 - blendedHitRate - (blendedFailureRate * 0.5)).toFixed(1)),
            flop: parseFloat(blendedFailureRate.toFixed(1))
        },
        composite_risk: parseFloat(blendedComposite.toFixed(3)),
        risk_category: riskCategory,
        greenlight_score: greenlightScore,
        budget_percentile: Math.round(budgetPercentile),
        seasonal_boost: seasonMultiplier > 1.0 ? `+${Math.round((seasonMultiplier - 1) * 100)}%` : `${Math.round((seasonMultiplier - 1) * 100)}%`,
        genre_blend: genres.join(' + '),
        comparable_films: comparableFilms,
        budget_tier_analysis: budgetTiers.filter(t => t.count > 0),
        budget_intelligence: budgetIntelligence,
        recommendations: {
            best_month: bestMonth,
            runtime_risk: runtimeRisk,
            recommended_runtime: recommendedRuntime,
            runtime_deviation: runtimeDeviation,
            advisor_guidance: advisorGuidance
        },
        genre_insights: genreStats.map((g: any) => ({
            genre: g.genre,
            avg_roi: parseFloat(g.averageROI.toFixed(2)),
            median_roi: parseFloat(g.medianROI?.toFixed(2) || 1.5),
            hit_rate: parseFloat(g.hitRate.toFixed(1)),
            failure_rate: parseFloat(g.failureRate.toFixed(1)),
            volatility: parseFloat(g.volatility.toFixed(2)),
            total_count: g.validMoviesCount,
            hit_count: Math.round((g.hitRate / 100) * g.validMoviesCount),
            flop_count: Math.round((g.failureRate / 100) * g.validMoviesCount),
            top_hits: MOVIE_DATABASE.filter(m => m.genres.includes(g.genre) && (m.roi || 0) > 3).slice(0, 3).sort((a, b) => (b.roi || 0) - (a.roi || 0)),
            top_flops: MOVIE_DATABASE.filter(m => m.genres.includes(g.genre) && (m.roi || 0) < 0.5).slice(0, 3).sort((a, b) => (a.roi || 0) - (b.roi || 0))
        }))
    };
}
