import { z } from "zod";
import { petraSolutions } from "@/lib/data/petra/solutions";

/**
 * Single source of truth for the discovery request form's shape — used
 * for both client-side validation (immediate feedback) and server-side
 * validation (the only one that's actually trusted; see
 * app/api/forms/discovery-request/route.ts). Never trust the client copy
 * alone.
 */
export const discoveryRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı.")
    .max(100, "Ad soyad çok uzun."),
  phone: z
    .string()
    .trim()
    .min(7, "Geçerli bir telefon numarası girin.")
    .max(20, "Geçerli bir telefon numarası girin.")
    .regex(/^[0-9+()\s-]+$/, "Geçerli bir telefon numarası girin."),
  email: z.string().trim().email("Geçerli bir e-posta girin.").max(200).optional().or(z.literal("")),
  service: z.enum(petraSolutions.map((s) => s.slug) as [string, ...string[]]).optional(),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  /**
   * Honeypot — real users never see or fill this field (visually hidden).
   * Deliberately unconstrained here (any string passes validation) so a
   * bot that fills it still gets a fake "success" from the route handler
   * instead of a validation error that would reveal the field name.
   */
  company: z.string().optional().or(z.literal("")),
});

export type DiscoveryRequestInput = z.infer<typeof discoveryRequestSchema>;
