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
  type: "submission" | "reward" | "announcement" | "update";
  createdAt: string;
  priority?: string;
  amount?: number;
  hackerName?: string;
  programmeName?: string;
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

export interface AIAnalysis {
  confidence: number;
  suggestedSeverity: "critique" | "haute" | "moyenne" | "faible" | "info";
  isDuplicate: boolean;
  duplicateOfId?: string;
  summary: string;
  reproductionLikelihood: number;
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
  vrtCategory?: string;
  vrtType?: string;
  proof: string;
  pdfFileName?: string;
  analysisStatus?: "en_attente" | "en_cours" | "terminee";
  aiAnalysis?: AIAnalysis;
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
  badges: { name: string; icon: string; description: string }[];
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

export interface SystemConfig {
  platformName: string;
  contactEmail: string;
  supportUrl: string;
  maintenanceMode: boolean;
  autoTriage: boolean;
  enterpriseValidation: boolean;
  triageLimitHours: number;
  aiSensitivity: number;
  // Security settings
  require2FA: boolean;
  ipWhitelisting: boolean;
  sessionTimeout: number;
  passwordComplexity: "standard" | "elevated" | "military";
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
    id: "prog-3", name: "Audit de Sécurité - SEEG", entrepriseId: "entreprise-3", entrepriseName: "SEEG Gabon",
    description: "Audit complet de l'infrastructure critique et des portails de facturation.",
    descriptionLong: "Ce programme vise à sécuriser les systèmes de gestion de l'énergie et de l'eau. Les chercheurs doivent se concentrer sur les fuites de données clients et les vulnérabilités SCADA simulées.",
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
    rewardTiers: [
      { severity: "critique", min: 5000000, max: 10000000, note: "Accès réseau industriel" },
      { severity: "haute", min: 1500000, max: 4500000, note: "Fuite massive base clients" },
      { severity: "moyenne", min: 500000, max: 1200000, note: "Contournement facturation" },
      { severity: "faible", min: 200000, max: 450000, note: "Bugs mineurs" },
    ],
    triageTimeHours: 48,
    firstResponseHours: 24,
    resolutionDays: 45,
    isNew: true,
    status: "actif",
    createdAt: "2024-07-20",
    reportsCount: 0,
  },
];

const INITIAL_REPORTS: Report[] = [
  {
    id: "rep-1", title: "XSS Réfléchi sur /login", description: "Injection XSS via le paramètre redirect_url",
    severity: "haute", status: "accepté", hackerId: "hacker-1", hackerName: "CyberPanther",
    programmeId: "prog-1", programmeName: "API Gouvernementale v2", entrepriseId: "entreprise-1",
    reward: 500000, createdAt: "2024-07-10", updatedAt: "2024-07-12",
    vulnerability: "XSS", vrtCategory: "Server-side Injection", vrtType: "Cross-site Scripting (XSS)", proof: "URL: /login?redirect=javascript:alert(1)",
    aiAnalysis: {
      confidence: 0.95,
      suggestedSeverity: "haute",
      isDuplicate: false,
      summary: "XSS confirmé sur le paramètre de redirection. Impact direct sur les sessions utilisateurs.",
      reproductionLikelihood: 0.9
    }
  },
  {
    id: "rep-2", title: "SQLi sur endpoint /users", description: "Injection SQL on the filtre de recherche utilisateurs",
    severity: "critique", status: "en_analyse", hackerId: "hacker-2", hackerName: "Gh0stNet",
    programmeId: "prog-2", programmeName: "Portail Citoyen", entrepriseId: "entreprise-2",
    reward: 0, createdAt: "2024-07-15", updatedAt: "2024-07-15",
    vulnerability: "SQLi", vrtCategory: "Server-side Injection", vrtType: "SQL Injection", proof: "Payload: ' OR 1=1 --",
    aiAnalysis: {
      confidence: 0.88,
      suggestedSeverity: "critique",
      isDuplicate: false,
      summary: "Potentielle injection SQL détectée. Accès possible à l'intégralité de la base de données.",
      reproductionLikelihood: 0.85
    }
  },
];

const INITIAL_HACKERS: HackerProfile[] = [
  { id: "hacker-1", name: "CyberPanther", email: "hacker@bugbounty.com", reputation: 2450, bugsFound: 34, totalRewards: 4500000, rank: 1, specialties: ["XSS", "IDOR", "API"], badges: [{name: "Top Hacker 2024", icon: "🏆", description: "Classé 1er au Gabon"}], joinedAt: "2024-03-15", status: "actif" },
  { id: "hacker-2", name: "Gh0stNet", email: "ghost@mail.com", reputation: 1890, bugsFound: 21, totalRewards: 3200000, rank: 2, specialties: ["SQLi", "RCE"], badges: [{name: "Bug Hunter", icon: "🐞", description: "Plus de 20 bugs validés"}], joinedAt: "2024-04-01", status: "actif" },
];

const INITIAL_ENTREPRISES: EntrepriseProfile[] = [
  { id: "entreprise-1", name: "Ministère Numérique", email: "entreprise@bugbounty.com", sector: "Gouvernement", programmesCount: 3, totalPaid: 4500000, joinedAt: "2024-02-10", status: "actif" },
  { id: "entreprise-3", name: "SEEG Gabon", email: "security@seeg.ga", sector: "Énergie", programmesCount: 1, totalPaid: 0, joinedAt: "2024-07-15", status: "actif" },
];

const INITIAL_ACTIVITIES: ProgrammeActivity[] = [
  { id: "act-1", title: "Nouveau Rapport Soumis", subtitle: "XSS trouvé sur API Gouvernementale", type: "submission", createdAt: "2024-07-18T10:00:00Z", hackerName: "CyberPanther", programmeName: "API Gouvernementale v2" },
  { id: "act-2", title: "Récompense Payée", subtitle: "500,000 XAF versés", type: "reward", createdAt: "2024-07-17T15:30:00Z", amount: 500000, hackerName: "CyberPanther", programmeName: "API Gouvernementale v2" },
  { id: "act-3", title: "Nouveau Partenaire Stratégique", subtitle: "La SEEG a lancé son audit de sécurité", type: "update", createdAt: "2024-07-20T09:00:00Z", programmeName: "Audit de Sécurité - SEEG" },
];

const INITIAL_CONFIG: SystemConfig = {
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
  passwordComplexity: "standard"
};

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
  const [activities, setActivities] = useState<ProgrammeActivity[]>(() => loadData("bb_activities", INITIAL_ACTIVITIES));
  const [config, setConfig] = useState<SystemConfig>(() => loadData("bb_config", INITIAL_CONFIG));

  // Reset Platform
  const resetPlatform = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  // Config Update
  const updateConfig = useCallback((data: Partial<SystemConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...data };
      saveData("bb_config", updated);
      return updated;
    });
  }, []);

  // Activities
  const addActivity = useCallback((a: Omit<ProgrammeActivity, "id" | "createdAt">) => {
    setActivities(prev => {
      const updated = [{ ...a, id: `act-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev].slice(0, 50);
      saveData("bb_activities", updated);
      return updated;
    });
  }, []);

  // Programmes CRUD
  const addProgramme = useCallback((p: Omit<Programme, "id" | "createdAt" | "reportsCount">) => {
    setProgrammes(prev => {
      const updated = [...prev, { ...p, id: `prog-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0], reportsCount: 0 }];
      saveData("bb_programmes", updated);
      return updated;
    });
    addActivity({ title: "Nouveau Programme", subtitle: p.name, type: "update", programmeName: p.name });
  }, [addActivity]);

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
  const addReport = useCallback((r: Omit<Report, "id" | "createdAt" | "updatedAt" | "status" | "reward" | "aiAnalysis">) => {
    setReports(prev => {
      const now = new Date().toISOString();
      
      const aiAnalysis: AIAnalysis = {
        confidence: 0.7 + Math.random() * 0.25,
        suggestedSeverity: r.severity,
        isDuplicate: false,
        summary: `Analyse automatique de "${r.title}". Le PoC semble valide. Vulnérabilité de type ${r.vulnerability} confirmée par analyse syntaxique.`,
        reproductionLikelihood: 0.8
      };

      const newReport: Report = { 
        ...r, 
        id: `rep-${Date.now()}`, 
        createdAt: now.split("T")[0], 
        updatedAt: now.split("T")[0], 
        status: "soumis" as const, 
        reward: 0,
        aiAnalysis
      };

      const updated = [...prev, newReport];
      saveData("bb_reports", updated);
      return updated;
    });

    addActivity({ 
      title: "Nouveau Rapport Soumis", 
      subtitle: `${r.vulnerability} sur ${r.programmeName}`, 
      type: "submission", 
      hackerName: r.hackerName, 
      programmeName: r.programmeName 
    });
  }, [addActivity]);

  const updateReport = useCallback((id: string, data: Partial<Report>) => {
    setReports(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString().split("T")[0] } : r);
      saveData("bb_reports", updated);
      return updated;
    });

    if (data.reward && data.reward > 0) {
      const r = reports.find(report => report.id === id);
      if (r) {
        addActivity({ 
          title: "Récompense Payée", 
          subtitle: `${data.reward.toLocaleString()} XAF versés`, 
          type: "reward", 
          amount: data.reward, 
          hackerName: r.hackerName, 
          programmeName: r.programmeName 
        });
      }
    }
  }, [reports, addActivity]);

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
    activities, addActivity,
    config, updateConfig, resetPlatform
  };
}
