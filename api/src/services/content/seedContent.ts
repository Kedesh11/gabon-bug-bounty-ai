import type { PrismaClient } from "@prisma/client";

// Idempotent: safe to call from both a one-off migration script and the routine
// dev-reset seed (prisma/seed.ts), same pattern as seedVulnerabilityTaxonomy. Seeds
// today's hardcoded Navbar.tsx/FooterSection.tsx links so the first deploy of the
// CMS-backed components looks identical to before.
const DEFAULT_NAVBAR_ITEMS = [
  { label: "Programmes", url: "/programmes" },
  { label: "Soumettre Rapport", url: "/soumettre-rapport" },
  { label: "Hackers", url: "/hackers" },
  { label: "Agents MCP", url: "/mcp-agents" },
  { label: "Documentation", url: "/documentation" },
];

const DEFAULT_FOOTER_LINKS = [
  { label: "Mentions légales", url: "/mentions-legales" },
  { label: "Contact", url: "/contact" },
];

export async function seedContentDefaults(prisma: PrismaClient) {
  const existingNavbarCount = await prisma.navbarItem.count();
  if (existingNavbarCount === 0) {
    for (const [index, item] of DEFAULT_NAVBAR_ITEMS.entries()) {
      await prisma.navbarItem.create({ data: { ...item, order: index } });
    }
  }

  const existingColumnCount = await prisma.footerColumn.count();
  if (existingColumnCount === 0) {
    const column = await prisma.footerColumn.create({ data: { title: "Liens", order: 0 } });
    for (const [index, link] of DEFAULT_FOOTER_LINKS.entries()) {
      await prisma.footerLink.create({ data: { ...link, columnId: column.id, order: index } });
    }
  }
}
