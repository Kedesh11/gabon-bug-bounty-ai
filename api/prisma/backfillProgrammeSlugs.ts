// One-off data migration (stage 1 -> stage 2 of the Programme.slug schema change).
// Run once after the stage-1 migration (adds nullable, unique Programme.slug) and
// before the stage-2 migration (makes it required). Idempotent: safe to re-run,
// only touches rows where slug IS NULL.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const programmes = await prisma.programme.findMany({
    where: { slug: null },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Backfilling slugs for ${programmes.length} programme(s)...`);

  const taken = new Set(
    (await prisma.programme.findMany({ where: { slug: { not: null } }, select: { slug: true } })).map((p) => p.slug!),
  );

  for (const programme of programmes) {
    const base = slugify(programme.name) || "programme";
    let slug = base;
    let suffix = 2;
    while (taken.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    taken.add(slug);
    await prisma.programme.update({ where: { id: programme.id }, data: { slug } });
  }

  const stillMissing = await prisma.programme.count({ where: { slug: null } });
  if (stillMissing > 0) {
    throw new Error(`${stillMissing} programme(s) still have no slug — refusing to proceed to stage 2.`);
  }

  console.log("Done. Safe to run the stage-2 migration now.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
