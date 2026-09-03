/**
 * Material Demand Estimator for Common Construction Trades in Szczecin.
 * Calculates exact material bags, adhesives, primers, and boards from room dimensions.
 */

export interface MaterialCalculationResult {
  trade: string;
  scopeM2: number;
  materials: Array<{
    name: string;
    quantity: number;
    unit: string;
    approxCostPLN: number;
  }>;
  totalApproxCostPLN: number;
}

export function calculateDrywallMaterials(wallAreaM2: number): MaterialCalculationResult {
  // Gypsum boards 1.2 x 2.6 = 3.12 m2 per board + 10% waste
  const boardsCount = Math.ceil((wallAreaM2 * 1.1) / 3.12);
  const profilesCW = Math.ceil(wallAreaM2 * 0.9); // linear meters
  const screwsPack = Math.ceil(wallAreaM2 / 30); // 1 pack per 30m2
  const jointFillerKg = Math.ceil(wallAreaM2 * 0.4); // 0.4 kg/m2

  const materials = [
    { name: 'Płyty G-K Standard 12.5mm (1.2x2.6m)', quantity: boardsCount, unit: 'szt.', approxCostPLN: boardsCount * 38 },
    { name: 'Profile CW/UW', quantity: profilesCW, unit: 'mb', approxCostPLN: profilesCW * 12 },
    { name: 'Wkręty TN 25mm (op. 500 szt.)', quantity: screwsPack, unit: 'op.', approxCostPLN: screwsPack * 25 },
    { name: 'Gips szpachlowy do spoinowania (kg)', quantity: jointFillerKg, unit: 'kg', approxCostPLN: jointFillerKg * 4 },
  ];

  const totalApproxCostPLN = materials.reduce((acc, m) => acc + m.approxCostPLN, 0);

  return {
    trade: 'Ściany i sufity G-K',
    scopeM2: wallAreaM2,
    materials,
    totalApproxCostPLN,
  };
}

export function calculatePlasterAndPaintMaterials(wallAreaM2: number): MaterialCalculationResult {
  // Gładź: approx 1.2 kg per m2 for 2 coats -> 20kg bags
  const plasterBags = Math.ceil((wallAreaM2 * 1.2) / 20);
  // Grunt głęboko penetrujący: approx 0.15 L/m2 -> 5L containers
  const primerContainers = Math.ceil((wallAreaM2 * 0.15) / 5);
  // Farba nawierzchniowa: 10 m2 / L for 2 coats -> (wallAreaM2 * 2) / 10 -> 10L buckets
  const paintBuckets10L = Math.ceil((wallAreaM2 * 2) / 100);

  const materials = [
    { name: 'Gładź polimerowa / gipsowa (worki 20kg)', quantity: plasterBags, unit: 'worków', approxCostPLN: plasterBags * 45 },
    { name: 'Grunt głęboko penetrujący (bańki 5L)', quantity: primerContainers, unit: 'szt.', approxCostPLN: primerContainers * 35 },
    { name: 'Farba biała grunt/lateks (wiadra 10L)', quantity: paintBuckets10L, unit: 'wiader', approxCostPLN: paintBuckets10L * 140 },
  ];

  const totalApproxCostPLN = materials.reduce((acc, m) => acc + m.approxCostPLN, 0);

  return {
    trade: 'Gładzie i malowanie',
    scopeM2: wallAreaM2,
    materials,
    totalApproxCostPLN,
  };
}
