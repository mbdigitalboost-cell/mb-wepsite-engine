import { z } from "zod";
import {
  REGIONS,
  FACADES,
  SUN_EXPOSURE_LEVELS,
  INSULATION_LEVELS,
  HEAT_GENERATING_EQUIPMENT,
} from "@/lib/btu/types";

export const btuCalculatorSchema = z.object({
  region: z.enum(REGIONS),
  widthMeters: z.coerce.number().finite().min(0.5, "En az 0.5 m olmalı.").max(100, "En fazla 100 m olmalı."),
  lengthMeters: z.coerce.number().finite().min(0.5, "En az 0.5 m olmalı.").max(100, "En fazla 100 m olmalı."),
  ceilingHeightMeters: z.coerce.number().finite().min(2, "En az 2 m olmalı.").max(10, "En fazla 10 m olmalı."),
  peopleCount: z.coerce
    .number()
    .finite()
    .int("Tam sayı olmalı.")
    .min(1, "En az 1 kişi olmalı.")
    .max(100, "En fazla 100 olmalı."),
  facade: z.enum(FACADES),
  sunExposure: z.enum(SUN_EXPOSURE_LEVELS),
  insulationLevel: z.enum(INSULATION_LEVELS),
  windowCount: z.coerce
    .number()
    .finite()
    .int("Tam sayı olmalı.")
    .min(0, "Negatif olamaz.")
    .max(100, "En fazla 100 olmalı."),
  heatGeneratingEquipment: z.array(z.enum(HEAT_GENERATING_EQUIPMENT)).default([]),
});

export type BtuCalculatorFormInput = z.infer<typeof btuCalculatorSchema>;
