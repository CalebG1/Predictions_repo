// Huff gravity trade-area model. Pure, dependency-free math (unit-tested).
//
// P(cell i patronizes site j) = (A_j / d_ij^beta) / sum_k (A_k / d_ik^beta)
//
// Attractiveness A is a size/assortment proxy; beta is the distance-decay
// exponent (~2 for convenience retail). The model is probabilistic — every
// cell has some chance of visiting every site — which is what makes it a
// natural input to the forecasting engine and to cannibalization analysis.

export interface GravitySite {
  id: string;
  x: number;
  y: number;
  attractiveness: number;
}

export interface DemandPoint {
  id: string;
  x: number;
  y: number;
  population: number;
}

const MIN_DISTANCE = 0.01;

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(MIN_DISTANCE, Math.hypot(a.x - b.x, a.y - b.y));
}

/**
 * Huff patronage probabilities for one demand cell across competing sites.
 * Returns one probability per site (same order); sums to 1.
 */
export function huffProbabilities(
  sites: GravitySite[],
  cell: { x: number; y: number },
  beta = 2.0
): number[] {
  if (sites.length === 0) return [];
  const utilities = sites.map((s) => s.attractiveness / Math.pow(distance(s, cell), beta));
  const total = utilities.reduce((a, b) => a + b, 0);
  if (total === 0) return sites.map(() => 1 / sites.length);
  return utilities.map((u) => u / total);
}

/** Expected customer capture per site: sum over cells of population x P(cell -> site). */
export function captureBySite(
  sites: GravitySite[],
  cells: DemandPoint[],
  beta = 2.0
): Record<string, number> {
  const capture: Record<string, number> = Object.fromEntries(sites.map((s) => [s.id, 0]));
  for (const cell of cells) {
    const probs = huffProbabilities(sites, cell, beta);
    sites.forEach((s, i) => {
      capture[s.id] += cell.population * probs[i];
    });
  }
  return capture;
}

/** Market share per site (capture normalized over total demand). */
export function marketShares(
  sites: GravitySite[],
  cells: DemandPoint[],
  beta = 2.0
): Record<string, number> {
  const capture = captureBySite(sites, cells, beta);
  const total = cells.reduce((a, c) => a + c.population, 0);
  const shares: Record<string, number> = {};
  for (const s of sites) shares[s.id] = total > 0 ? capture[s.id] / total : 0;
  return shares;
}

export interface CannibalizationEntry {
  candidateId: string;
  incumbentId: string;
  /** Fraction of the incumbent's pre-entry capture lost when the candidate opens (0..1). */
  shareLoss: number;
  /** Absolute expected customers lost by the incumbent. */
  customersLost: number;
}

/**
 * Cannibalization matrix: for each candidate entering alone against the
 * incumbent set, how much of each incumbent's capture it pulls away.
 */
export function cannibalizationMatrix(
  candidates: GravitySite[],
  incumbents: GravitySite[],
  cells: DemandPoint[],
  beta = 2.0
): CannibalizationEntry[] {
  if (incumbents.length === 0) return [];
  const before = captureBySite(incumbents, cells, beta);
  const entries: CannibalizationEntry[] = [];
  for (const candidate of candidates) {
    const after = captureBySite([...incumbents, candidate], cells, beta);
    for (const inc of incumbents) {
      const lost = Math.max(0, before[inc.id] - after[inc.id]);
      entries.push({
        candidateId: candidate.id,
        incumbentId: inc.id,
        shareLoss: before[inc.id] > 0 ? lost / before[inc.id] : 0,
        customersLost: lost,
      });
    }
  }
  return entries;
}

/**
 * Trade-area radius: the distance from the site within which `coverage`
 * (default 75%) of its expected capture lives. Used to draw catchment rings.
 */
export function tradeAreaRadius(
  site: GravitySite,
  competitors: GravitySite[],
  cells: DemandPoint[],
  beta = 2.0,
  coverage = 0.75
): number {
  const all = [site, ...competitors.filter((c) => c.id !== site.id)];
  const contributions: { dist: number; captured: number }[] = [];
  for (const cell of cells) {
    const probs = huffProbabilities(all, cell, beta);
    contributions.push({ dist: distance(site, cell), captured: cell.population * probs[0] });
  }
  contributions.sort((a, b) => a.dist - b.dist);
  const total = contributions.reduce((a, c) => a + c.captured, 0);
  if (total === 0) return 0;
  let acc = 0;
  for (const c of contributions) {
    acc += c.captured;
    if (acc >= total * coverage) return c.dist;
  }
  return contributions[contributions.length - 1]?.dist ?? 0;
}
