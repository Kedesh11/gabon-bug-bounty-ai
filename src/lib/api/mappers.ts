// Translates raw API JSON (Prisma models, ASCII enums) into the frontend view-model
// shapes in @/types/domain (unchanged since the localStorage-mock days), so page
// components don't need to be rewritten just because the data now comes from the API.
import {
  Programme,
  Report,
  HackerProfile,
  EntrepriseProfile,
  SystemConfig,
  HackerPaymentConfig,
  ProgrammeActivity,
  McpAgentType,
  McpAgentRunStatus,
} from "@/types/domain";
import { PROGRAMME_STATUS_FROM_API, REPORT_STATUS_FROM_API } from "./enumMaps";

export interface ApiRewardTier {
  severity: string;
  min: number;
  max: number;
  note?: string | null;
}

export interface ApiActivity {
  id: string;
  title: string;
  subtitle?: string | null;
  type: string;
  createdAt: string;
  priority?: string | null;
  amount?: number | null;
  hackerName?: string | null;
  programmeName?: string | null;
}

export interface ApiProgramme {
  id: string;
  name: string;
  entrepriseId: string;
  entreprise?: { profile: { name: string } };
  description: string;
  descriptionLong?: string | null;
  overview?: string | null;
  scope: string[];
  outOfScope: string[];
  methodology?: string | null;
  eligibility: string[];
  howItWorks: string[];
  responsibleDisclosure: string[];
  rulesOfEngagement: string[];
  hardwareResearchRegistration?: string | null;
  focusAreas: string[];
  nonQualifyingFindings: string[];
  terms: string[];
  disclosurePolicy?: string | null;
  communicationChannels: string[];
  tags: string[];
  sector?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  safeHarbor?: string | null;
  scopeRating?: number | null;
  testingPeriod?: string | null;
  startedAt?: string | null;
  statusText?: string | null;
  lastUpdated?: string | null;
  vulnerabilitiesRewarded?: number | null;
  validationWithinDays?: number | null;
  acceptanceRate?: number | null;
  averagePayout?: number | null;
  averagePayoutWindow?: string | null;
  programType: string;
  minReward: number;
  maxReward: number;
  rewardCurrency: string;
  rewardTiers?: ApiRewardTier[];
  payoutGuidelines?: string | null;
  payoutFactors: string[];
  rootAccessProgram?: string | null;
  hallOfFamers: string[];
  recentlyJoined: string[];
  totalResearchers?: number | null;
  additionalInformation?: string | null;
  triageTimeHours?: number | null;
  firstResponseHours?: number | null;
  resolutionDays?: number | null;
  isNew: boolean;
  status: string;
  validationStatus: string;
  rejectionReason?: string | null;
  validatedAt?: string | null;
  createdAt: string;
  reportsCount: number;
  activities?: ApiActivity[];
}

function mapActivity(activity: ApiActivity): ProgrammeActivity {
  return {
    id: activity.id,
    title: activity.title,
    subtitle: activity.subtitle ?? undefined,
    type: activity.type as ProgrammeActivity["type"],
    createdAt: activity.createdAt,
    priority: activity.priority ?? undefined,
    amount: activity.amount ?? undefined,
    hackerName: activity.hackerName ?? undefined,
    programmeName: activity.programmeName ?? undefined,
  };
}

export function mapProgramme(api: ApiProgramme): Programme {
  return {
    id: api.id,
    name: api.name,
    entrepriseId: api.entrepriseId,
    entrepriseName: api.entreprise?.profile.name ?? "",
    description: api.description,
    descriptionLong: api.descriptionLong ?? undefined,
    overview: api.overview ?? undefined,
    scope: api.scope,
    outOfScope: api.outOfScope,
    methodology: api.methodology ?? undefined,
    eligibility: api.eligibility,
    howItWorks: api.howItWorks,
    responsibleDisclosure: api.responsibleDisclosure,
    rulesOfEngagement: api.rulesOfEngagement,
    hardwareResearchRegistration: api.hardwareResearchRegistration ?? undefined,
    focusAreas: api.focusAreas,
    nonQualifyingFindings: api.nonQualifyingFindings,
    terms: api.terms,
    disclosurePolicy: api.disclosurePolicy ?? undefined,
    communicationChannels: api.communicationChannels,
    tags: api.tags,
    sector: api.sector ?? undefined,
    logoUrl: api.logoUrl ?? undefined,
    website: api.website ?? undefined,
    safeHarbor: (api.safeHarbor as Programme["safeHarbor"]) ?? undefined,
    scopeRating: api.scopeRating ?? undefined,
    testingPeriod: (api.testingPeriod as Programme["testingPeriod"]) ?? undefined,
    startedAt: api.startedAt ?? undefined,
    statusText: api.statusText ?? undefined,
    lastUpdated: api.lastUpdated ?? undefined,
    vulnerabilitiesRewarded: api.vulnerabilitiesRewarded ?? undefined,
    validationWithinDays: api.validationWithinDays ?? undefined,
    acceptanceRate: api.acceptanceRate ?? undefined,
    averagePayout: api.averagePayout ?? undefined,
    averagePayoutWindow: api.averagePayoutWindow ?? undefined,
    programType: api.programType as Programme["programType"],
    minReward: api.minReward,
    maxReward: api.maxReward,
    rewardCurrency: api.rewardCurrency as Programme["rewardCurrency"],
    rewardTiers: api.rewardTiers?.map((tier) => ({
      severity: tier.severity as "critique" | "haute" | "moyenne" | "faible",
      min: tier.min,
      max: tier.max,
      note: tier.note ?? undefined,
    })),
    payoutGuidelines: api.payoutGuidelines ?? undefined,
    payoutFactors: api.payoutFactors,
    rootAccessProgram: api.rootAccessProgram ?? undefined,
    hallOfFamers: api.hallOfFamers,
    recentlyJoined: api.recentlyJoined,
    totalResearchers: api.totalResearchers ?? undefined,
    additionalInformation: api.additionalInformation ?? undefined,
    triageTimeHours: api.triageTimeHours ?? undefined,
    firstResponseHours: api.firstResponseHours ?? undefined,
    resolutionDays: api.resolutionDays ?? undefined,
    isNew: api.isNew,
    status: PROGRAMME_STATUS_FROM_API[api.status] ?? "actif",
    validationStatus: (api.validationStatus as Programme["validationStatus"]) ?? "en_attente",
    rejectionReason: api.rejectionReason ?? undefined,
    validatedAt: api.validatedAt ?? undefined,
    createdAt: api.createdAt,
    reportsCount: api.reportsCount,
    recentActivity: api.activities?.map(mapActivity),
  };
}

export interface ApiAiAnalysis {
  confidence: number;
  suggestedSeverity: string;
  isDuplicate: boolean;
  duplicateOfId?: string | null;
  summary: string;
  reproductionLikelihood: number;
}

export interface ApiMcpAgentOutput {
  id: string;
  agentType: string;
  model: string;
  status: string;
  output: Record<string, unknown> | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface ApiMcpAgentRun {
  id: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  outputs: ApiMcpAgentOutput[];
}

export interface ApiReport {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  hackerId: string;
  hacker?: { profile: { name: string } };
  programmeId: string;
  programme?: { name: string };
  entrepriseId: string;
  reward: number;
  createdAt: string;
  updatedAt: string;
  triagedAt?: string | null;
  resolvedAt?: string | null;
  vulnerability: string;
  vrtCategory?: string | null;
  vrtType?: string | null;
  proof: string;
  pdfFileName?: string | null;
  vulnerabilityCategoryId?: string | null;
  affectedAsset?: string | null;
  stepsToReproduce?: string | null;
  impact?: string | null;
  remediation?: string | null;
  cvssVector?: string | null;
  cvssScore?: number | null;
  analysisStatus?: string | null;
  aiAnalysis?: ApiAiAnalysis | null;
  mcpAgentRuns?: ApiMcpAgentRun[];
}

export function mapReport(api: ApiReport): Report {
  return {
    id: api.id,
    title: api.title,
    description: api.description,
    severity: api.severity as Report["severity"],
    status: REPORT_STATUS_FROM_API[api.status] ?? "soumis",
    hackerId: api.hackerId,
    hackerName: api.hacker?.profile.name ?? "",
    programmeId: api.programmeId,
    programmeName: api.programme?.name ?? "",
    entrepriseId: api.entrepriseId,
    reward: api.reward,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    triagedAt: api.triagedAt ?? undefined,
    resolvedAt: api.resolvedAt ?? undefined,
    vulnerability: api.vulnerability,
    vrtCategory: api.vrtCategory ?? undefined,
    vrtType: api.vrtType ?? undefined,
    proof: api.proof,
    pdfFileName: api.pdfFileName ?? undefined,
    vulnerabilityCategoryId: api.vulnerabilityCategoryId ?? undefined,
    affectedAsset: api.affectedAsset ?? undefined,
    stepsToReproduce: api.stepsToReproduce ?? undefined,
    impact: api.impact ?? undefined,
    remediation: api.remediation ?? undefined,
    cvssVector: api.cvssVector ?? undefined,
    cvssScore: api.cvssScore ?? undefined,
    analysisStatus: (api.analysisStatus as Report["analysisStatus"]) ?? undefined,
    aiAnalysis: api.aiAnalysis
      ? {
          confidence: api.aiAnalysis.confidence,
          suggestedSeverity: api.aiAnalysis.suggestedSeverity as Report["severity"],
          isDuplicate: api.aiAnalysis.isDuplicate,
          duplicateOfId: api.aiAnalysis.duplicateOfId ?? undefined,
          summary: api.aiAnalysis.summary,
          reproductionLikelihood: api.aiAnalysis.reproductionLikelihood,
        }
      : undefined,
    mcpAgentRuns: api.mcpAgentRuns?.map((run) => ({
      id: run.id,
      status: run.status as McpAgentRunStatus,
      startedAt: run.startedAt ?? undefined,
      completedAt: run.completedAt ?? undefined,
      createdAt: run.createdAt,
      outputs: run.outputs.map((o) => ({
        id: o.id,
        agentType: o.agentType as McpAgentType,
        model: o.model,
        status: o.status as McpAgentRunStatus,
        output: o.output,
        errorMessage: o.errorMessage ?? undefined,
        createdAt: o.createdAt,
      })),
    })),
  };
}

export interface ApiBadge {
  name: string;
  icon: string;
  description: string;
}

export interface ApiHackerProfile {
  id: string;
  reputation: number;
  bugsFound: number;
  totalRewards: number;
  rank: number;
  specialties: string[];
  status: string;
  joinedAt: string;
  profile: { id: string; name: string; email: string };
  badges?: ApiBadge[];
  bio?: string | null;
  githubHandle?: string | null;
  twitterHandle?: string | null;
}

export function mapHacker(api: ApiHackerProfile): HackerProfile {
  return {
    id: api.id,
    profileId: api.profile.id,
    name: api.profile.name,
    email: api.profile.email,
    reputation: api.reputation,
    bugsFound: api.bugsFound,
    totalRewards: api.totalRewards,
    rank: api.rank,
    specialties: api.specialties,
    badges: api.badges ?? [],
    joinedAt: api.joinedAt,
    status: api.status as HackerProfile["status"],
    bio: api.bio ?? undefined,
    githubHandle: api.githubHandle ?? undefined,
    twitterHandle: api.twitterHandle ?? undefined,
  };
}

// Public leaderboard projection — deliberately PII-free (no email), unlike
// ApiHackerProfile above which staff-only endpoints return.
export interface ApiHackerLeaderboardEntry {
  id: string;
  reputation: number;
  bugsFound: number;
  totalRewards: number;
  rank: number;
  criticalBugsCount: number;
  joinedAt: string;
  profile: { name: string; avatar: string | null };
  badges: ApiBadge[];
}

export interface HackerLeaderboardEntry {
  id: string;
  name: string;
  avatar: string | null;
  reputation: number;
  bugsFound: number;
  totalRewards: number;
  rank: number;
  criticalBugsCount: number;
  joinedAt: string;
  badges: { name: string; icon: string; description: string }[];
}

export function mapHackerLeaderboardEntry(api: ApiHackerLeaderboardEntry): HackerLeaderboardEntry {
  return {
    id: api.id,
    name: api.profile.name,
    avatar: api.profile.avatar,
    reputation: api.reputation,
    bugsFound: api.bugsFound,
    totalRewards: api.totalRewards,
    rank: api.rank,
    criticalBugsCount: api.criticalBugsCount,
    joinedAt: api.joinedAt,
    badges: api.badges,
  };
}

export interface ApiEntrepriseProfile {
  id: string;
  sector: string;
  programmesCount: number;
  totalPaid: number;
  status: string;
  joinedAt: string;
  profile: { id: string; name: string; email: string };
}

export function mapEntreprise(api: ApiEntrepriseProfile): EntrepriseProfile {
  return {
    id: api.id,
    profileId: api.profile.id,
    name: api.profile.name,
    email: api.profile.email,
    sector: api.sector,
    programmesCount: api.programmesCount,
    totalPaid: api.totalPaid,
    joinedAt: api.joinedAt,
    status: api.status as EntrepriseProfile["status"],
  };
}

export function mapConfig(api: Record<string, unknown>): SystemConfig {
  return api as unknown as SystemConfig;
}

export interface ApiHackerPaymentConfig {
  gainsEnabled: boolean;
  paymentMethods: string[];
  mobileMoneyProvider?: string | null;
  phoneNumber?: string | null;
  accountName?: string | null;
  bankName?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  swiftCode?: string | null;
  bankCountry?: string | null;
  cardBrand?: string | null;
  cardHolderName?: string | null;
  cardNumberLast4?: string | null;
  cardExpiry?: string | null;
  cardBillingCountry?: string | null;
  paypalEmail?: string | null;
  cryptoType?: string | null;
  walletAddress?: string | null;
  preferredCurrency: string;
  autoWithdrawal: boolean;
  minimumPayoutThreshold: string;
}

// The API never returns (or accepts) a full card number or CVV — only the last 4 digits
// are stored. cardNumber/cardCvv are populated as empty so the form doesn't show stale data.
export function mapPaymentConfig(api: ApiHackerPaymentConfig): HackerPaymentConfig {
  return {
    gainsEnabled: api.gainsEnabled,
    paymentMethods: api.paymentMethods as HackerPaymentConfig["paymentMethods"],
    mobileMoneyProvider: (api.mobileMoneyProvider as HackerPaymentConfig["mobileMoneyProvider"]) ?? "airtel",
    phoneNumber: api.phoneNumber ?? "",
    accountName: api.accountName ?? "",
    bankName: api.bankName ?? "",
    accountHolderName: api.accountHolderName ?? "",
    accountNumber: api.accountNumber ?? "",
    iban: api.iban ?? "",
    swiftCode: api.swiftCode ?? "",
    bankCountry: api.bankCountry ?? "",
    cardBrand: (api.cardBrand as HackerPaymentConfig["cardBrand"]) ?? "visa",
    cardHolderName: api.cardHolderName ?? "",
    cardNumber: api.cardNumberLast4 ? `**** **** **** ${api.cardNumberLast4}` : "",
    cardExpiry: api.cardExpiry ?? "",
    cardCvv: "",
    cardBillingCountry: api.cardBillingCountry ?? "",
    paypalEmail: api.paypalEmail ?? "",
    cryptoType: (api.cryptoType as HackerPaymentConfig["cryptoType"]) ?? "usdt",
    walletAddress: api.walletAddress ?? "",
    preferredCurrency: api.preferredCurrency as HackerPaymentConfig["preferredCurrency"],
    autoWithdrawal: api.autoWithdrawal,
    minimumPayoutThreshold: api.minimumPayoutThreshold,
  };
}
