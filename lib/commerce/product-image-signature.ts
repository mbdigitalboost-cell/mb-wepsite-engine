import type { ProductImageMimeType } from "@/lib/commerce/product-image-constants";

/**
 * FAZ 2C-1C M-5 fix — the client `file.type`, the server's own MIME check
 * (isAllowedProductImageMimeType), and the `product-images` Storage
 * bucket's `allowed_mime_types` all rely on the SAME self-reported
 * string (see M-5 design review) — none of them look at the actual file
 * bytes. This is the first layer that does: a lightweight "magic number"
 * check against the small, well-known header signature every one of the
 * 4 allowed formats has. Pure TypeScript, zero dependencies (see M-5
 * design review's recommendation — the heavier, decode-based validation
 * a library like `sharp` would provide is deliberately NOT done here,
 * left to a future image-processing phase).
 *
 * Never throws and never indexes out of bounds — every comparison is
 * bounds-checked against `bytes.length` first, so a too-short/empty
 * `bytes` array simply returns `false`, same as a genuine mismatch.
 */
export function verifyImageSignature(bytes: Uint8Array, mimeType: ProductImageMimeType): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return matchesBytes(bytes, [0xff, 0xd8, 0xff], 0);
    case "image/png":
      return matchesBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    case "image/webp":
      // "RIFF" at offset 0, "WEBP" at offset 8 (offsets 4-7 hold the
      // little-endian chunk size, which this check deliberately ignores
      // — only the two fixed ASCII markers are the actual format signature).
      return matchesBytes(bytes, [0x52, 0x49, 0x46, 0x46], 0) && matchesBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8);
    case "image/gif":
      return matchesAscii(bytes, "GIF87a", 0) || matchesAscii(bytes, "GIF89a", 0);
    default:
      return false;
  }
}

function matchesBytes(bytes: Uint8Array, expected: readonly number[], offset: number): boolean {
  if (bytes.length < offset + expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (bytes[offset + i] !== expected[i]) return false;
  }
  return true;
}

function matchesAscii(bytes: Uint8Array, expected: string, offset: number): boolean {
  if (bytes.length < offset + expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (bytes[offset + i] !== expected.charCodeAt(i)) return false;
  }
  return true;
}
