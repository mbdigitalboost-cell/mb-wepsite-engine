export const REGIONS = [
  "marmara",
  "ic_anadolu",
  "ege",
  "akdeniz",
  "karadeniz",
  "guneydogu_anadolu",
  "dogu_anadolu",
] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  marmara: "Marmara",
  ic_anadolu: "İç Anadolu",
  ege: "Ege",
  akdeniz: "Akdeniz",
  karadeniz: "Karadeniz",
  guneydogu_anadolu: "Güneydoğu Anadolu",
  dogu_anadolu: "Doğu Anadolu",
};

export const FACADES = ["kuzey", "guney", "dogu", "bati"] as const;
export type Facade = (typeof FACADES)[number];
export const FACADE_LABELS: Record<Facade, string> = {
  kuzey: "Kuzey",
  guney: "Güney",
  dogu: "Doğu",
  bati: "Batı",
};

export const SUN_EXPOSURE_LEVELS = ["az", "orta", "yogun"] as const;
export type SunExposure = (typeof SUN_EXPOSURE_LEVELS)[number];
export const SUN_EXPOSURE_LABELS: Record<SunExposure, string> = {
  az: "Az",
  orta: "Orta",
  yogun: "Yoğun",
};

export const INSULATION_LEVELS = ["iyi", "orta", "zayif"] as const;
export type InsulationLevel = (typeof INSULATION_LEVELS)[number];
export const INSULATION_LABELS: Record<InsulationLevel, string> = {
  iyi: "İyi",
  orta: "Orta",
  zayif: "Zayıf",
};

export const HEAT_GENERATING_EQUIPMENT = [
  "bilgisayar_sunucu",
  "endustriyel_mutfak",
  "yogun_aydinlatma",
  "diger_isi_kaynagi",
] as const;
export type HeatGeneratingEquipment = (typeof HEAT_GENERATING_EQUIPMENT)[number];
export const HEAT_GENERATING_EQUIPMENT_LABELS: Record<HeatGeneratingEquipment, string> = {
  bilgisayar_sunucu: "Bilgisayar / sunucu ekipmanı",
  endustriyel_mutfak: "Endüstriyel / mutfak ekipmanı",
  yogun_aydinlatma: "Yoğun aydınlatma",
  diger_isi_kaynagi: "Diğer ısı kaynağı",
};

export interface BtuCalculationInput {
  region: Region;
  widthMeters: number;
  lengthMeters: number;
  ceilingHeightMeters: number;
  peopleCount: number;
  facade: Facade;
  sunExposure: SunExposure;
  insulationLevel: InsulationLevel;
  windowCount: number;
  heatGeneratingEquipment: HeatGeneratingEquipment[];
}

export interface BtuCalculationBreakdown {
  areaSquareMeters: number;
  regionCoefficient: number;
  areaLoadBtu: number;
  peopleCount: number;
  peopleLoadBtu: number;
  totalBtu: number;
}

export interface BtuCalculationResult {
  breakdown: BtuCalculationBreakdown;
  recommendedCapacityBtu: number | null;
  exceedsStandardRange: boolean;
}
