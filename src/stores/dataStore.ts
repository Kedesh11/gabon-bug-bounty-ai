import { useState, useCallback } from "react";

// Types
export interface ProgrammeTarget {
  name: string;
  tags?: string[];
  knownIssues?: string;
}

export interface ProgrammePayoutBand {
  priority: string;
  min: number;
  max: number;
}

export interface ProgrammeTargetGroup {
  title: string;
  description?: string;
  scopeRating?: string;
  inScope: boolean;
  payoutChart?: ProgrammePayoutBand[];
  targets?: ProgrammeTarget[];
}

export interface ProgrammeAnnouncement {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  content: string;
}

export interface ProgrammeActivity {
  id: string;
  title: string;
  subtitle?: string;
  createdAt: string;
  priority?: string;
}

export interface ProgrammeThingsToKnow {
  testingProblems?: string;
  engagementRules?: string;
  coordinatedDisclosure?: string;
}

export interface Programme {
  id: string;
  name: string;
  entrepriseId: string;
  entrepriseName: string;
  description: string;
  descriptionLong?: string;
  overview?: string;
  scope: string[];
  outOfScope?: string[];
  methodology?: string;
  eligibility?: string[];
  howItWorks?: string[];
  responsibleDisclosure?: string[];
  rulesOfEngagement?: string[];
  hardwareResearchRegistration?: string;
  focusAreas?: string[];
  nonQualifyingFindings?: string[];
  terms?: string[];
  disclosurePolicy?: string;
  communicationChannels?: string[];
  tags?: string[];
  sector?: string;
  logoUrl?: string;
  website?: string;
  safeHarbor?: "partiel" | "complet" | "aucun";
  scopeRating?: number;
  testingPeriod?: "ongoing" | "scheduled" | "closed";
  startedAt?: string;
  statusText?: string;
  lastUpdated?: string;
  vulnerabilitiesRewarded?: number;
  validationWithinDays?: number;
  acceptanceRate?: number;
  averagePayout?: number;
  averagePayoutWindow?: string;
  programType?: "public" | "private" | "vdp";
  minReward: number;
  maxReward: number;
  rewardCurrency?: "USD" | "EUR" | "XAF";
  rewardTiers?: {
    severity: "critique" | "haute" | "moyenne" | "faible";
    min: number;
    max: number;
    note?: string;
  }[];
  targetGroups?: ProgrammeTargetGroup[];
  inScopeTargets?: ProgrammeTarget[];
  outOfScopeTargets?: ProgrammeTarget[];
  payoutGuidelines?: string;
  payoutFactors?: string[];
  rootAccessProgram?: string;
  announcements?: ProgrammeAnnouncement[];
  recentActivity?: ProgrammeActivity[];
  hallOfFamers?: string[];
  recentlyJoined?: string[];
  totalResearchers?: number;
  additionalInformation?: string;
  thingsToKnow?: ProgrammeThingsToKnow;
  triageTimeHours?: number;
  firstResponseHours?: number;
  resolutionDays?: number;
  isNew?: boolean;
  status: "actif" | "pause" | "fermé";
  createdAt: string;
  reportsCount: number;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  severity: "critique" | "haute" | "moyenne" | "faible" | "info";
  status: "soumis" | "en_analyse" | "accepté" | "rejeté" | "résolu";
  hackerId: string;
  hackerName: string;
  programmeId: string;
  programmeName: string;
  entrepriseId: string;
  reward: number;
  createdAt: string;
  updatedAt: string;
  vulnerability: string;
  proof: string;
  pdfFileName?: string;
  analysisStatus?: "en_attente" | "en_cours" | "terminee";
}

export interface HackerProfile {
  id: string;
  name: string;
  email: string;
  reputation: number;
  bugsFound: number;
  totalRewards: number;
  rank: number;
  specialties: string[];
  joinedAt: string;
  status: "actif" | "banni" | "suspendu";
}

export interface EntrepriseProfile {
  id: string;
  name: string;
  email: string;
  sector: string;
  programmesCount: number;
  totalPaid: number;
  joinedAt: string;
  status: "actif" | "suspendu";
}

// Initial mock data
const INITIAL_PROGRAMMES: Programme[] = [
  {
    id: "prog-1", name: "API Gouvernementale v2", entrepriseId: "entreprise-1", entrepriseName: "Ministère Numérique",
    description: "Test de sécurité de l'API REST gouvernementale",
    descriptionLong: "Programme orienté API et authentification. Les chercheurs sont invités à tester la logique métier, les contrôles d'accès et les flux OAuth2.",
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
    rewardTiers: [
      { severity: "critique", min: 1000000, max: 2000000, note: "Prise de contrôle système / exfiltration massive" },
      { severity: "haute", min: 400000, max: 900000, note: "Contournement auth, accès privilégié" },
      { severity: "moyenne", min: 150000, max: 350000, note: "Impact partiel significatif" },
      { severity: "faible", min: 50000, max: 140000, note: "Impact limité / exposition faible" },
    ],
    triageTimeHours: 24,
    firstResponseHours: 12,
    resolutionDays: 21,
    isNew: false,
    status: "actif",
    createdAt: "2024-06-01",
    reportsCount: 12,
  },
  {
    id: "prog-2", name: "Portail Citoyen", entrepriseId: "entreprise-2", entrepriseName: "Gabon Telecom",
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
    rewardTiers: [
      { severity: "critique", min: 2500000, max: 5000000, note: "Compte admin / RCE / fuite massive" },
      { severity: "haute", min: 700000, max: 2400000, note: "Escalade privilèges / IDOR critique" },
      { severity: "moyenne", min: 250000, max: 650000, note: "Altération partielle de données" },
      { severity: "faible", min: 100000, max: 240000, note: "Faible exposition sans impact direct" },
    ],
    triageTimeHours: 36,
    firstResponseHours: 18,
    resolutionDays: 30,
    isNew: false,
    status: "actif",
    createdAt: "2024-05-15",
    reportsCount: 8,
  },
  {
    id: "prog-3", name: "Mobile Banking App", entrepriseId: "entreprise-3", entrepriseName: "BGFI Bank",
    description: "Tests de l'application mobile bancaire",
    descriptionLong: "Programme bancaire critique incluant API mobile, sessions utilisateurs, mécanismes MFA et contrôles de transactions.",
    scope: ["app.bgfi.com", "api.bgfi.com/mobile", "mfa.bgfi.com"],
    outOfScope: ["ATM physiques", "Phishing clients", "DoS volumétrique"],
    methodology: "Tests applicatifs manuels avec PoC détaillé obligatoire.",
    terms: ["Aucun test sur comptes clients réels", "Rapport confidentiel", "Preuves chiffrées recommandées"],
    disclosurePolicy: "Divulgation restreinte, publication sur autorisation explicite.",
    communicationChannels: ["security@bgfi.com", "manager de programme dédié"],
    tags: ["Web", "API", "Finance", "Mobile"],
    sector: "Finance",
    website: "https://bgfi.com",
    logoUrl: "https://dummyimage.com/128x128/0b111f/14f195.png&text=BGFI",
    programType: "private",
    minReward: 200000,
    maxReward: 10000000,
    rewardCurrency: "XAF",
    rewardTiers: [
      { severity: "critique", min: 6000000, max: 10000000, note: "Vol de fonds / contournement MFA" },
      { severity: "haute", min: 1500000, max: 5500000, note: "Prise de compte / transaction non autorisée" },
      { severity: "moyenne", min: 500000, max: 1400000, note: "Impact partiel sensible" },
      { severity: "faible", min: 200000, max: 490000, note: "Surface réduite / faible impact business" },
    ],
    triageTimeHours: 18,
    firstResponseHours: 8,
    resolutionDays: 14,
    isNew: true,
    status: "actif",
    createdAt: "2024-07-01",
    reportsCount: 5,
  },
];

const INITIAL_REPORTS: Report[] = [
  {
    id: "rep-1", title: "XSS Réfléchi sur /login", description: "Injection XSS via le paramètre redirect_url",
    severity: "haute", status: "accepté", hackerId: "hacker-1", hackerName: "CyberPanther",
    programmeId: "prog-1", programmeName: "API Gouvernementale v2", entrepriseId: "entreprise-1",
    reward: 500000, createdAt: "2024-07-10", updatedAt: "2024-07-12",
    vulnerability: "XSS", proof: "URL: /login?redirect=javascript:alert(1)"
  },
  {
    id: "rep-2", title: "SQLi sur endpoint /users", description: "Injection SQL sur le filtre de recherche utilisateurs",
    severity: "critique", status: "en_analyse", hackerId: "hacker-2", hackerName: "Gh0stNet",
    programmeId: "prog-2", programmeName: "Portail Citoyen", entrepriseId: "entreprise-2",
    reward: 0, createdAt: "2024-07-15", updatedAt: "2024-07-15",
    vulnerability: "SQLi", proof: "Payload: ' OR 1=1 --"
  },
  {
    id: "rep-3", title: "IDOR sur profil utilisateur", description: "Accès aux données d'autres utilisateurs via manipulation d'ID",
    severity: "haute", status: "soumis", hackerId: "hacker-1", hackerName: "CyberPanther",
    programmeId: "prog-3", programmeName: "Mobile Banking App", entrepriseId: "entreprise-3",
    reward: 0, createdAt: "2024-07-18", updatedAt: "2024-07-18",
    vulnerability: "IDOR", proof: "GET /api/users/OTHER_USER_ID retourne les données"
  },
  {
    id: "rep-4", title: "CSRF sur changement email", description: "Absence de token CSRF permettant le changement d'email",
    severity: "moyenne", status: "résolu", hackerId: "hacker-3", hackerName: "ZeroDayGA",
    programmeId: "prog-1", programmeName: "API Gouvernementale v2", entrepriseId: "entreprise-1",
    reward: 250000, createdAt: "2024-06-20", updatedAt: "2024-07-01",
    vulnerability: "CSRF", proof: "Formulaire HTML forgé qui change l'email"
  },
];

const INITIAL_HACKERS: HackerProfile[] = [
  { id: "hacker-1", name: "CyberPanther", email: "hacker@bugbounty.com", reputation: 2450, bugsFound: 34, totalRewards: 4500000, rank: 1, specialties: ["XSS", "IDOR", "API"], joinedAt: "2024-03-15", status: "actif" },
  { id: "hacker-2", name: "Gh0stNet", email: "ghost@mail.com", reputation: 1890, bugsFound: 21, totalRewards: 3200000, rank: 2, specialties: ["SQLi", "RCE"], joinedAt: "2024-04-01", status: "actif" },
  { id: "hacker-3", name: "ZeroDayGA", email: "zeroday@mail.com", reputation: 1650, bugsFound: 18, totalRewards: 2800000, rank: 3, specialties: ["CSRF", "Auth Bypass"], joinedAt: "2024-04-10", status: "actif" },
  { id: "hacker-4", name: "ShadowByte", email: "shadow@mail.com", reputation: 980, bugsFound: 9, totalRewards: 1200000, rank: 4, specialties: ["SSRF"], joinedAt: "2024-05-20", status: "suspendu" },
];

const INITIAL_ENTREPRISES: EntrepriseProfile[] = [
  { id: "entreprise-1", name: "Ministère Numérique", email: "entreprise@bugbounty.com", sector: "Gouvernement", programmesCount: 3, totalPaid: 4500000, joinedAt: "2024-02-10", status: "actif" },
  { id: "entreprise-2", name: "Gabon Telecom", email: "sec@gabontelecom.com", sector: "Télécommunications", programmesCount: 2, totalPaid: 3200000, joinedAt: "2024-03-01", status: "actif" },
  { id: "entreprise-3", name: "BGFI Bank", email: "security@bgfi.com", sector: "Finance", programmesCount: 1, totalPaid: 8000000, joinedAt: "2024-04-15", status: "actif" },
];

function loadData<T>(key: string, initial: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initial;
  } catch {
    return initial;
  }
}

function saveData<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useDataStore() {
  const [programmes, setProgrammes] = useState<Programme[]>(() => loadData("bb_programmes", INITIAL_PROGRAMMES));
  const [reports, setReports] = useState<Report[]>(() => loadData("bb_reports", INITIAL_REPORTS));
  const [hackers, setHackers] = useState<HackerProfile[]>(() => loadData("bb_hackers", INITIAL_HACKERS));
  const [entreprises, setEntreprises] = useState<EntrepriseProfile[]>(() => loadData("bb_entreprises", INITIAL_ENTREPRISES));

  // Programmes CRUD
  const addProgramme = useCallback((p: Omit<Programme, "id" | "createdAt" | "reportsCount">) => {
    setProgrammes(prev => {
      const updated = [...prev, { ...p, id: `prog-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0], reportsCount: 0 }];
      saveData("bb_programmes", updated);
      return updated;
    });
  }, []);

  const updateProgramme = useCallback((id: string, data: Partial<Programme>) => {
    setProgrammes(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...data } : p);
      saveData("bb_programmes", updated);
      return updated;
    });
  }, []);

  const deleteProgramme = useCallback((id: string) => {
    setProgrammes(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveData("bb_programmes", updated);
      return updated;
    });
  }, []);

  // Reports CRUD
  const addReport = useCallback((r: Omit<Report, "id" | "createdAt" | "updatedAt" | "status" | "reward">) => {
    setReports(prev => {
      const now = new Date().toISOString().split("T")[0];
      const updated = [...prev, { ...r, id: `rep-${Date.now()}`, createdAt: now, updatedAt: now, status: "soumis" as const, reward: 0 }];
      saveData("bb_reports", updated);
      return updated;
    });
  }, []);

  const updateReport = useCallback((id: string, data: Partial<Report>) => {
    setReports(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString().split("T")[0] } : r);
      saveData("bb_reports", updated);
      return updated;
    });
  }, []);

  const deleteReport = useCallback((id: string) => {
    setReports(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveData("bb_reports", updated);
      return updated;
    });
  }, []);

  // Hackers CRUD
  const updateHacker = useCallback((id: string, data: Partial<HackerProfile>) => {
    setHackers(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, ...data } : h);
      saveData("bb_hackers", updated);
      return updated;
    });
  }, []);

  const deleteHacker = useCallback((id: string) => {
    setHackers(prev => {
      const updated = prev.filter(h => h.id !== id);
      saveData("bb_hackers", updated);
      return updated;
    });
  }, []);

  // Entreprises CRUD
  const updateEntreprise = useCallback((id: string, data: Partial<EntrepriseProfile>) => {
    setEntreprises(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...data } : e);
      saveData("bb_entreprises", updated);
      return updated;
    });
  }, []);

  const deleteEntreprise = useCallback((id: string) => {
    setEntreprises(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveData("bb_entreprises", updated);
      return updated;
    });
  }, []);

  return {
    programmes, addProgramme, updateProgramme, deleteProgramme,
    reports, addReport, updateReport, deleteReport,
    hackers, updateHacker, deleteHacker,
    entreprises, updateEntreprise, deleteEntreprise,
  };
}
