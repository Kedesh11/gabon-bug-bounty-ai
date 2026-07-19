import { vi } from "vitest";
import { prisma } from "../src/prisma.js";
import { seedSystemRolesAndPermissions } from "../src/services/roles/seedSystemRoles.js";
import { seedVulnerabilityTaxonomy } from "../src/services/taxonomy/seedTaxonomy.js";

try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {
  // CI injects env vars directly; no .env file present there.
}
process.env.NODE_ENV = "test";

// Profile.roleId is a required FK — tests (createTestUser in test/helpers.ts) need the
// 6 system roles + permission catalog to exist before creating any profile. Idempotent,
// safe to run once per test file even though setupFiles re-executes per isolated module.
await seedSystemRolesAndPermissions(prisma);
await seedVulnerabilityTaxonomy(prisma);

// CinetPay isn't configured with real credentials yet (see api/.env.example) — the
// HTTP layer is fully mocked below, but requireCheckoutCredentials()/
// requireTransferCredentials() still need non-empty values to not short-circuit.
process.env.CINETPAY_API_KEY ||= "test-api-key";
process.env.CINETPAY_SITE_ID ||= "test-site-id";
process.env.CINETPAY_TRANSFER_LOGIN ||= "test-login";
process.env.CINETPAY_TRANSFER_PASSWORD ||= "test-password";
process.env.STRIPE_WEBHOOK_SECRET ||= "whsec_test";

// Auth is tested against Supabase's local stack in the "verification" step of the
// roadmap item, but unit/integration tests here don't need a live GoTrue instance:
// we stub token verification and let every other layer (Prisma, RBAC, validation)
// run for real against a real Postgres.
const tokenToUserId = new Map<string, string>();

export function registerTestToken(token: string, userId: string) {
  tokenToUserId.set(token, userId);
}

// Storage: never hit real Supabase Storage from tests. Behaves like an always-empty,
// always-succeeding bucket — good enough to exercise reportStorage.ts's own logic
// (upload/signed-url calls happen for real against these mocks) without a live stack.
export const storageMocks = {
  listBuckets: vi.fn().mockResolvedValue({ data: [], error: null }),
  createBucket: vi.fn().mockResolvedValue({ data: { name: "report-attachments" }, error: null }),
  upload: vi.fn().mockResolvedValue({ data: { path: "mock-path" }, error: null }),
  createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://mock.local/signed" }, error: null }),
};

vi.mock("../src/lib/supabaseAdmin.js", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn((token: string) => {
        const userId = tokenToUserId.get(token);
        if (!userId) {
          return Promise.resolve({ data: { user: null }, error: new Error("invalid token") });
        }
        return Promise.resolve({ data: { user: { id: userId } }, error: null });
      }),
      admin: {
        createUser: vi.fn(),
        signOut: vi.fn(),
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
      },
      signInWithPassword: vi.fn(),
    },
    storage: {
      listBuckets: storageMocks.listBuckets,
      createBucket: storageMocks.createBucket,
      from: vi.fn(() => ({
        upload: storageMocks.upload,
        createSignedUrl: storageMocks.createSignedUrl,
      })),
    },
  },
}));

// Payments: never hit real Stripe/CinetPay from tests. The mock functions are
// exported so individual tests can configure return values / assert calls.
export const stripeMocks = {
  checkoutSessionsCreate: vi.fn(),
  checkoutSessionsList: vi.fn().mockResolvedValue({ data: [] }),
  accountsCreate: vi.fn(),
  accountsRetrieve: vi.fn(),
  accountLinksCreate: vi.fn(),
  transfersCreate: vi.fn(),
  webhooksConstructEvent: vi.fn(),
};

vi.mock("../src/services/payments/stripe/client.js", () => ({
  stripe: {
    checkout: { sessions: { create: stripeMocks.checkoutSessionsCreate, list: stripeMocks.checkoutSessionsList } },
    v2: {
      core: {
        accounts: { create: stripeMocks.accountsCreate, retrieve: stripeMocks.accountsRetrieve },
        accountLinks: { create: stripeMocks.accountLinksCreate },
      },
    },
    transfers: { create: stripeMocks.transfersCreate },
    webhooks: { constructEvent: stripeMocks.webhooksConstructEvent },
  },
}));

// MCP agents: never hit real OpenRouter from tests. Default resolves to `parsed:
// null`, which fails every agent's zod validation deterministically and fast — so
// createReport()'s fire-and-forget pipeline trigger (which fires on every report
// creation across the whole suite, not just mcpAgents tests) completes quickly with
// every agent recorded "failed" instead of racing a real network call. Individual
// mcpAgents tests override this per-call via mockResolvedValueOnce/mockImplementation.
export const openRouterMocks = {
  callOpenRouter: vi.fn().mockResolvedValue({ raw: "", parsed: null, promptTokens: null, completionTokens: null, latencyMs: 0 }),
};

vi.mock("../src/services/mcpAgents/openRouterClient.js", () => ({
  callOpenRouter: openRouterMocks.callOpenRouter,
}));

// Defaults to the real fetch so unrelated code that happens to call fetch (e.g.
// @react-pdf/renderer's yoga-layout WASM loader) keeps working; CinetPay tests
// override this explicitly per-call via mockResolvedValue(Once), which still wins.
const realFetch = globalThis.fetch;
export const cinetpayFetchMock = vi.fn(realFetch);
vi.stubGlobal("fetch", cinetpayFetchMock);

export function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) };
}
