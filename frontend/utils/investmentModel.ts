/**
 * Investment Simulator Logic
 * Frontend-side calculations for the CineIntel Investment Simulator.
 */

export interface SimulationMetrics {
  greenlight_score: number;
  expected_roi: number;
  break_even: number;
}

/**
 * Computes additional metrics based on ML probabilities and budget.
 * 
 * Logic:
 * score = (hit_prob * 100 * 0.6) + (avg_prob * 100 * 0.3) - (flop_prob * 100 * 0.5)
 * ROI = 1 + (score / 100) * 1.5
 * break_even = budget * 1.5
 * 
 * @param hitProb Hit probability (0-1)
 * @param avgProb Average probability (0-1)
 * @param flopProb Flop probability (0-1)
 * @param budget Budget in ₹ Crores
 * @returns Computed metrics
 */
export function calculateSimMetrics(
  hitProb: number,
  avgProb: number,
  flopProb: number,
  budget: number
): SimulationMetrics {
  // 1. Compute Greenlight Score
  let score = (hitProb * 100 * 0.6) + (avgProb * 100 * 0.3) - (flopProb * 100 * 0.5);
  
  // 2. Clamp score between 0 and 100
  score = Math.min(100, Math.max(0, score));
  
  // 3. Compute Expected ROI
  const expected_roi = 1 + (score / 100) * 1.5;
  
  // 4. Compute Break-even
  const break_even = budget * 1.5;
  
  return {
    greenlight_score: Math.round(score),
    expected_roi,
    break_even
  };
}

/**
 * Basic heuristic fallback for when the API is unavailable.
 * Maintains the dashboard experience without showing "Data insufficient".
 */
export function heuristicSim(genres: string[], budget: number): SimulationMetrics {
    // Simple logic based on genre count and budget
    const baseScore = 65; 
    const genreBonus = Math.min(genres.length * 2, 10);
    const budgetPenalty = budget > 100 ? -5 : 0;
    
    const score = baseScore + genreBonus + budgetPenalty;
    const expected_roi = 1 + (score / 100) * 1.2;
    const break_even = budget * 1.5;
    
    return {
        greenlight_score: score,
        expected_roi,
        break_even
    };
}
