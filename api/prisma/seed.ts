/**
 * Seeds the local database with the same demo data the frontend currently
 * ships as mock state (src/stores/dataStore.ts, src/contexts/AuthContext.tsx),
 * but as real rows behind real Supabase Auth accounts.
 *
 * Safe to re-run: wipes previously-seeded demo accounts/data first.
 * Local dev only — never point this at a real Supabase project.
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { seedSystemRolesAndPermissions } from "../src/services/roles/seedSystemRoles.js";
import { seedVulnerabilityTaxonomy } from "../src/services/taxonomy/seedTaxonomy.js";

const prisma = new PrismaClient();
const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "Password123!";

const DEMO_USERS = [
  { email: "admin@bugbounty.com", name: "Admin Principal", role: "admin" as const },
  { email: "hacker@bugbounty.com", name: "CyberPanther", role: "hacker" as const },
  { email: "ghost@mail.com", name: "Gh0stNet", role: "hacker" as const },
  { email: "entreprise@bugbounty.com", name: "Ministère Numérique", role: "entreprise" as const },
  { email: "security@seeg.ga", name: "SEEG Gabon", role: "entreprise" as const },
  { email: "contact@gabontelecom.ga", name: "Gabon Telecom", role: "entreprise" as const },
  { email: "triage@bugbounty.com", name: "Sarah (Triage)", role: "triage" as const },
  { email: "finance@bugbounty.com", name: "Marc (Finance)", role: "finance" as const },
  { email: "support@bugbounty.com", name: "Paul (Support)", role: "support" as const },
];

async function resetDemoData() {
  console.log("Resetting previous demo data...");

  // Full wipe, not just the demo emails: this is a local-only dev database, and
  // leftover rows from test runs (test/helpers.ts) or manual smoke-testing would
  // otherwise silently accumulate here run after run. Cascades to hacker/entreprise
  // profiles, programmes, reports, badges, etc.
  await prisma.profile.deleteMany();
  await prisma.platformLog.deleteMany();
  await prisma.systemConfig.deleteMany();
  // Custom roles created by test/roles.test.ts (or manual smoke-testing of /admin/roles)
  // would otherwise also accumulate — the 6 system roles are reseeded right after this
  // via seedSystemRolesAndPermissions, so it's safe to drop every non-system one first.
  await prisma.role.deleteMany({ where: { isSystem: false } });

  let page = 1;
  while (true) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (!data?.users.length) break;
    for (const user of data.users) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }
    page += 1;
  }
}

async function createDemoUser(email: string, name: string, roleId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Failed to create auth user ${email}: ${error?.message}`);

  await prisma.profile.create({
    data: { id: data.user.id, email, name, roleId },
  });

  return data.user.id;
}

async function main() {
  await resetDemoData();

  console.log("Seeding roles & permissions...");
  const roleIds = await seedSystemRolesAndPermissions(prisma);

  console.log("Seeding vulnerability taxonomy...");
  await seedVulnerabilityTaxonomy(prisma);

  console.log("Creating demo accounts...");
  const ids: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    ids[u.email] = await createDemoUser(u.email, u.name, roleIds[u.role]);
  }

  console.log("Seeding hacker profiles...");
  const cyberPanther = await prisma.hackerProfile.create({
    data: {
      profileId: ids["hacker@bugbounty.com"],
      reputation: 2450,
      bugsFound: 34,
      totalRewards: 4500000,
      rank: 1,
      specialties: ["XSS", "IDOR", "API"],
      status: "actif",
      joinedAt: new Date("2024-03-15"),
      badges: { create: [{ name: "Top Hacker 2024", icon: "🏆", description: "Classé 1er au Gabon" }] },
    },
  });
  const ghost = await prisma.hackerProfile.create({
    data: {
      profileId: ids["ghost@mail.com"],
      reputation: 1890,
      bugsFound: 21,
      totalRewards: 3200000,
      rank: 2,
      specialties: ["SQLi", "RCE"],
      status: "actif",
      joinedAt: new Date("2024-04-01"),
      badges: { create: [{ name: "Bug Hunter", icon: "🐞", description: "Plus de 20 bugs validés" }] },
    },
  });

  console.log("Seeding entreprise profiles...");
  const ministere = await prisma.entrepriseProfile.create({
    data: {
      profileId: ids["entreprise@bugbounty.com"],
      sector: "Gouvernement",
      programmesCount: 1,
      totalPaid: 4500000,
      joinedAt: new Date("2024-02-10"),
      status: "actif",
    },
  });
  const gabonTelecom = await prisma.entrepriseProfile.create({
    data: {
      profileId: ids["contact@gabontelecom.ga"],
      sector: "Télécommunications",
      programmesCount: 1,
      totalPaid: 0,
      joinedAt: new Date("2024-05-15"),
      status: "actif",
    },
  });
  const seeg = await prisma.entrepriseProfile.create({
    data: {
      profileId: ids["security@seeg.ga"],
      sector: "Énergie",
      programmesCount: 1,
      totalPaid: 0,
      joinedAt: new Date("2024-07-15"),
      status: "actif",
    },
  });

  console.log("Seeding programmes...");
  const progGouv = await prisma.programme.create({
    data: {
      name: "API Gouvernementale v2",
      entrepriseId: ministere.id,
      description: "Test de sécurité de l'API REST gouvernementale",
      descriptionLong:
        "Programme orienté API et authentification. Les chercheurs sont invités à tester la logique métier, les contrôles d'accès et les flux OAuth2.",
      scope: ["api.gouv.com", "auth.gouv.com", "citizen-api.gouv.com"],
      outOfScope: ["services internes *.intra.gouv.com", "attaques DoS/DDoS", "social engineering"],
      methodology: "Tests manuels privilégiés.\nPas de scans destructifs.\nTout PoC doit être reproductible et documenté.",
      terms: ["Ne pas exfiltrer de données réelles", "Utiliser uniquement des comptes de test", "Respecter la loi locale"],
      disclosurePolicy: "Divulgation coordonnée après correction confirmée.",
      communicationChannels: ["security@gouv.com", "Canal support triage"],
      tags: ["Web", "API", "Auth"],
      sector: "Gouvernement",
      website: "https://gouv.com",
      programType: "public",
      minReward: 50000,
      maxReward: 2000000,
      rewardCurrency: "XAF",
      triageTimeHours: 24,
      firstResponseHours: 12,
      resolutionDays: 21,
      isNew: false,
      status: "actif",
      createdAt: new Date("2024-06-01"),
      rewardTiers: {
        create: [
          { severity: "critique", min: 1000000, max: 2000000, note: "Prise de contrôle système / exfiltration massive" },
          { severity: "haute", min: 400000, max: 900000, note: "Contournement auth, accès privilégié" },
          { severity: "moyenne", min: 150000, max: 350000, note: "Impact partiel significatif" },
          { severity: "faible", min: 50000, max: 140000, note: "Impact limité / exposition faible" },
        ],
      },
    },
  });

  const progPortail = await prisma.programme.create({
    data: {
      name: "Portail Citoyen",
      entrepriseId: gabonTelecom.id,
      description: "Sécurité du portail de services citoyens",
      descriptionLong: "Programme couvrant le portail web, les API publiques et la gestion d'identité des usagers.",
      scope: ["citoyen.com", "*.citoyen.com", "api.citoyen.com"],
      outOfScope: ["Infrastructure réseau hors applicatif", "Spam", "tests de charge non autorisés"],
      methodology: "Approche grey-box autorisée sur environnement de production avec prudence.",
      terms: ["Un seul compte test par chercheur", "Pas d'automatisation agressive", "Aucune modification destructrice"],
      disclosurePolicy: "Publication possible 90 jours après correction.",
      communicationChannels: ["sec@gabontelecom.com"],
      tags: ["Web", "API", "Mobile"],
      sector: "Télécommunications",
      website: "https://gabontelecom.com",
      programType: "public",
      minReward: 100000,
      maxReward: 5000000,
      rewardCurrency: "XAF",
      triageTimeHours: 36,
      firstResponseHours: 18,
      resolutionDays: 30,
      isNew: false,
      status: "actif",
      createdAt: new Date("2024-05-15"),
      rewardTiers: {
        create: [
          { severity: "critique", min: 2500000, max: 5000000, note: "Compte admin / RCE / fuite massive" },
          { severity: "haute", min: 700000, max: 2400000, note: "Escalade privilèges / IDOR critique" },
          { severity: "moyenne", min: 250000, max: 650000, note: "Altération partielle de données" },
          { severity: "faible", min: 100000, max: 240000, note: "Faible exposition sans impact direct" },
        ],
      },
    },
  });

  await prisma.programme.create({
    data: {
      name: "Audit de Sécurité - SEEG",
      entrepriseId: seeg.id,
      description: "Audit complet de l'infrastructure critique et des portails de facturation.",
      descriptionLong:
        "Ce programme vise à sécuriser les systèmes de gestion de l'énergie et de l'eau. Les chercheurs doivent se concentrer sur les fuites de données clients et les vulnérabilités SCADA simulées.",
      scope: ["portal.seeg.ga", "api-facturation.seeg.ga", "*.seeg.ga"],
      outOfScope: ["Systèmes de contrôle physique", "Déni de service"],
      methodology: "Approche offensive autorisée. Focus sur l'exfiltration de données.",
      tags: ["Infrastructure", "Web", "SCADA"],
      sector: "Énergie & Eau",
      website: "https://seeg.ga",
      programType: "private",
      minReward: 200000,
      maxReward: 10000000,
      rewardCurrency: "XAF",
      triageTimeHours: 48,
      firstResponseHours: 24,
      resolutionDays: 45,
      isNew: true,
      status: "actif",
      createdAt: new Date("2024-07-20"),
      rewardTiers: {
        create: [
          { severity: "critique", min: 5000000, max: 10000000, note: "Accès réseau industriel" },
          { severity: "haute", min: 1500000, max: 4500000, note: "Fuite massive base clients" },
          { severity: "moyenne", min: 500000, max: 1200000, note: "Contournement facturation" },
          { severity: "faible", min: 200000, max: 450000, note: "Bugs mineurs" },
        ],
      },
    },
  });

  console.log("Seeding reports...");
  await prisma.report.create({
    data: {
      title: "XSS Réfléchi sur /login",
      description: "Injection XSS via le paramètre redirect_url",
      severity: "haute",
      status: "accepte",
      hackerId: cyberPanther.id,
      programmeId: progGouv.id,
      entrepriseId: ministere.id,
      reward: 500000,
      createdAt: new Date("2024-07-10"),
      vulnerability: "XSS",
      vrtCategory: "Server-side Injection",
      vrtType: "Cross-site Scripting (XSS)",
      proof: "URL: /login?redirect=javascript:alert(1)",
      analysisStatus: "terminee",
      aiAnalysis: {
        create: {
          confidence: 0.95,
          suggestedSeverity: "haute",
          isDuplicate: false,
          summary: "XSS confirmé sur le paramètre de redirection. Impact direct sur les sessions utilisateurs.",
          reproductionLikelihood: 0.9,
        },
      },
    },
  });

  await prisma.report.create({
    data: {
      title: "SQLi sur endpoint /users",
      description: "Injection SQL on the filtre de recherche utilisateurs",
      severity: "critique",
      status: "en_analyse",
      hackerId: ghost.id,
      programmeId: progPortail.id,
      entrepriseId: gabonTelecom.id,
      reward: 0,
      createdAt: new Date("2024-07-15"),
      vulnerability: "SQLi",
      vrtCategory: "Server-side Injection",
      vrtType: "SQL Injection",
      proof: "Payload: ' OR 1=1 --",
      analysisStatus: "en_cours",
      aiAnalysis: {
        create: {
          confidence: 0.88,
          suggestedSeverity: "critique",
          isDuplicate: false,
          summary: "Potentielle injection SQL détectée. Accès possible à l'intégralité de la base de données.",
          reproductionLikelihood: 0.85,
        },
      },
    },
  });

  await prisma.programme.update({ where: { id: progGouv.id }, data: { reportsCount: 1 } });
  await prisma.programme.update({ where: { id: progPortail.id }, data: { reportsCount: 1 } });

  console.log("Seeding system config...");
  await prisma.systemConfig.create({
    data: {
      id: 1,
      platformName: "Gabon Bug Bounty AI",
      contactEmail: "admin@bugbounty.ga",
      supportUrl: "https://support.bugbounty.ga",
      maintenanceMode: false,
      autoTriage: true,
      enterpriseValidation: true,
      triageLimitHours: 48,
      aiSensitivity: 75,
      require2FA: false,
      ipWhitelisting: false,
      sessionTimeout: 60,
      passwordComplexity: "standard",
    },
  });

  console.log("\nDone. Demo accounts (password for all: \"" + DEMO_PASSWORD + "\"):");
  for (const u of DEMO_USERS) console.log(`  - ${u.email}  (${u.role})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
