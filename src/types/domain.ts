// View-model types rendered by the UI. Data used to live here as in-memory/localStorage
// mock state (src/stores/dataStore.ts); it now comes from the API (see src/hooks/api/*
// and src/lib/api/mappers.ts), but the shapes below are unchanged so components didn't
// need to be rewritten just to consume real data.

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

export type McpAgentType =
  | "vulnerability_analysis"
  | "severity_assessment"
  | "false_positive_detection"
  | "anti_fraud"
  | "recommendation"
  | "decision"
  | "reward";

export type McpAgentRunStatus = "pending" | "running" | "completed" | "failed";

// The 7-agent MCP pipeline (services/mcpAgents) — suggestion-only real analysis,
// distinct from the placeholder-ish AIAnalysis above. See src/pages/admin/AdminRapports.tsx.
export interface McpAgentOutput {
  id: string;
  agentType: McpAgentType;
  model: string;
  status: McpAgentRunStatus;
  output: Record<string, unknown> | null;
  errorMessage?: string;
  createdAt: string;
}

export interface McpAgentRun {
  id: string;
  status: McpAgentRunStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  outputs: McpAgentOutput[];
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
  vulnerabilityCategoryId?: string;
  affectedAsset?: string;
  stepsToReproduce?: string;
  impact?: string;
  remediation?: string;
  cvssVector?: string;
  cvssScore?: number;
  analysisStatus?: "en_attente" | "en_cours" | "terminee";
  aiAnalysis?: AIAnalysis;
  // Most recent run first, matching the API's ordering.
  mcpAgentRuns?: McpAgentRun[];
}

export interface HackerProfile {
  id: string;
  // The underlying Profile.id (auth-linked account) — distinct from `id` above
  // (HackerProfile.id). Needed to correlate this hacker with PlatformLog.userId,
  // which references Profile, not HackerProfile.
  profileId: string;
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
  config?: HackerPaymentConfig;
}

export type PaymentMethod = "mobile_money" | "bank_transfer" | "bank_card" | "paypal" | "crypto";
export type MobileMoneyProvider = "airtel" | "mtn" | "moov" | "orange";
export type CryptoType = "btc" | "eth" | "usdt";
export type PreferredCurrency = "USD" | "EUR" | "XAF";
export type CardBrand = "visa" | "mastercard" | "amex" | "other";

export interface HackerPaymentConfig {
  gainsEnabled: boolean;
  paymentMethods: PaymentMethod[];
  mobileMoneyProvider: MobileMoneyProvider;
  phoneNumber: string;
  accountName: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  bankCountry: string;
  cardBrand: CardBrand;
  cardHolderName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardBillingCountry: string;
  paypalEmail: string;
  cryptoType: CryptoType;
  walletAddress: string;
  preferredCurrency: PreferredCurrency;
  autoWithdrawal: boolean;
  minimumPayoutThreshold: string;
}

export interface EntrepriseProfile {
  id: string;
  // The underlying Profile.id — see the identical comment on HackerProfile.profileId.
  profileId: string;
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
  maintenanceUntil?: string | null;
  autoTriage: boolean;
  enterpriseValidation: boolean;
  triageLimitHours: number;
  aiSensitivity: number;
  require2FA: boolean;
  ipWhitelisting: boolean;
  sessionTimeout: number;
  passwordComplexity: "standard" | "elevated" | "military";
  globalNotificationsEnabled: boolean;
}

export interface PlatformLog {
  id: string;
  timestamp: string;
  type: "security" | "performance" | "user_action" | "system";
  level: "info" | "warning" | "error" | "critical";
  message: string;
  source: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}
