import { z } from "zod";

// Stored URLs end up in an <a href> on public pages. A `javascript:` or `data:` value planted
// by an untrusted user (a self-registered entreprise's programme website) or a compromised
// staff account would run script when clicked, so the scheme is checked where it is stored.

// Absolute http(s) only. A bare "example.ga" is accepted and promoted to https://example.ga,
// since that is what people type into a "site web" field.
export const websiteUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  },
  z
    .string()
    .max(300)
    .refine((value) => {
      try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "L'adresse doit être une URL http(s) valide")
    .optional(),
);

// Navbar / footer targets: an in-app path ("/programmes") or an absolute http(s)/mailto/tel URL.
export const linkTarget = z
  .string()
  .min(1)
  .max(300)
  .refine((value) => {
    if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
    try {
      return ["http:", "https:", "mailto:", "tel:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Le lien doit être un chemin interne (/page) ou une URL http(s), mailto: ou tel:");
