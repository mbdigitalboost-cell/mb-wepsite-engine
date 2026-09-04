import { REGIONS, type BtuCalculationInput, type BtuCalculationResult, type Region } from "./types";

export const REGION_COEFFICIENTS: Record<Region, number> = {
  marmara: 385,
  ic_anadolu: 346,
  ege: 423,
  akdeniz: 445,
  karadeniz: 385,
  guneydogu_anadolu: 462,
  dogu_anadolu: 308,
};

export const PERSON_LOAD_BTU = 600;

export const STANDARD_CAPACITIES_BTU = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000] as const;

export function calculateBtu(input: BtuCalculationInput): BtuCalculationResult {
  const areaSquareMeters = input.widthMeters * input.lengthMeters;
  const regionCoefficient = REGION_COEFFICIENTS[input.region];
  const areaLoadBtu = areaSquareMeters * regionCoefficient;
  const peopleLoadBtu = input.peopleCount * PERSON_LOAD_BTU;
  const totalBtu = areaLoadBtu + peopleLoadBtu;

  const recommendedCapacityBtu = STANDARD_CAPACITIES_BTU.find((capacity) => totalBtu <= capacity) ?? null;

  return {
    breakdown: {
      areaSquareMeters,
      regionCoefficient,
      areaLoadBtu,
      peopleCount: input.peopleCount,
      peopleLoadBtu,
      totalBtu,
    },
    recommendedCapacityBtu,
    exceedsStandardRange: recommendedCapacityBtu === null,
  };
}

export function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}
