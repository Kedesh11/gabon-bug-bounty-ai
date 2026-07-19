import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext.tsx";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import MaintenanceGate from "@/components/MaintenanceGate";

import Index from "./pages/Index";

const Programmes = lazy(() => import("./pages/Programmes"));
const ProgrammeDetails = lazy(() => import("./pages/ProgrammeDetails"));
const SoumettreRapport = lazy(() => import("./pages/SoumettreRapport"));
const SoumettreProgramme = lazy(() => import("./pages/SoumettreProgramme"));
const Connexion = lazy(() => import("./pages/Connexion"));
const Inscription = lazy(() => import("./pages/Inscription"));
const MotDePasseOublie = lazy(() => import("./pages/MotDePasseOublie"));
const ReinitialiserMotDePasse = lazy(() => import("./pages/ReinitialiserMotDePasse"));
const Hackers = lazy(() => import("./pages/Hackers"));
const Documentation = lazy(() => import("./pages/Documentation"));
const MCPAgents = lazy(() => import("./pages/MCPAgents"));
const Contact = lazy(() => import("./pages/Contact"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin & Roles
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminParametres = lazy(() => import("./pages/admin/AdminParametres"));
const AdminUtilisateurs = lazy(() => import("./pages/admin/AdminUtilisateurs"));
const AdminProgrammes = lazy(() => import("./pages/admin/AdminProgrammes"));
const AdminRapports = lazy(() => import("./pages/admin/AdminRapports"));
const TriageDashboard = lazy(() => import("./pages/admin/TriageDashboard"));
const FinanceDashboard = lazy(() => import("./pages/admin/FinanceDashboard"));
const SupportDashboard = lazy(() => import("./pages/admin/SupportDashboard"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminTicketDetail = lazy(() => import("./pages/admin/AdminTicketDetail"));
const AdminKnowledgeBase = lazy(() => import("./pages/admin/AdminKnowledgeBase"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));
const AdminFraud = lazy(() => import("./pages/admin/AdminFraud"));
const AdminTaxonomy = lazy(() => import("./pages/admin/AdminTaxonomy"));
const AdminContenu = lazy(() => import("./pages/admin/AdminContenu"));

// Hacker
const HackerDashboard = lazy(() => import("./pages/hacker/HackerDashboard"));
const HackerProgrammes = lazy(() => import("./pages/hacker/HackerProgrammes"));
const HackerRapports = lazy(() => import("./pages/hacker/HackerRapports"));
const HackerParametres = lazy(() => import("./pages/hacker/HackerParametres"));
const HackerProfil = lazy(() => import("./pages/hacker/HackerProfil"));

// Entreprise
const EntrepriseDashboard = lazy(() => import("./pages/entreprise/EntrepriseDashboard"));
const EntrepriseProgrammes = lazy(() => import("./pages/entreprise/EntrepriseProgrammes"));
const EntrepriseRapports = lazy(() => import("./pages/entreprise/EntrepriseRapports"));
const EntrepriseParametres = lazy(() => import("./pages/entreprise/EntrepriseParametres"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" closeButton richColors />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <AuthProvider>
            <MaintenanceGate>
            <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/programmes" element={<Programmes />} />
                  <Route path="/programmes/:id" element={<ProgrammeDetails />} />
                  <Route path="/soumettre-rapport" element={<SoumettreRapport />} />
                  <Route path="/soumettre-programme" element={<SoumettreProgramme />} />
                  <Route path="/connexion" element={<Connexion />} />
                  <Route path="/inscription" element={<Inscription />} />
                  <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
                  <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
                  <Route path="/hackers" element={<Hackers />} />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/mcp-agents" element={<MCPAgents />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/mentions-legales" element={<MentionsLegales />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<ProtectedRoute permissions={["dashboard.admin.view"]}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/utilisateurs" element={<ProtectedRoute permissions={["users.view"]}><AdminUtilisateurs /></ProtectedRoute>} />
                  <Route path="/admin/programmes" element={<ProtectedRoute permissions={["programmes.manage.view"]}><AdminProgrammes /></ProtectedRoute>} />
                  <Route path="/admin/rapports" element={<ProtectedRoute permissions={["reports.manage.view"]}><AdminRapports /></ProtectedRoute>} />
                  <Route path="/admin/parametres" element={<ProtectedRoute permissions={["settings.view"]}><AdminParametres /></ProtectedRoute>} />
                  <Route path="/admin/triage" element={<ProtectedRoute permissions={["dashboard.triage.view"]}><TriageDashboard /></ProtectedRoute>} />
                  <Route path="/admin/finance" element={<ProtectedRoute permissions={["dashboard.finance.view"]}><FinanceDashboard /></ProtectedRoute>} />
                  <Route path="/admin/support" element={<ProtectedRoute permissions={["dashboard.support.view"]}><SupportDashboard /></ProtectedRoute>} />
                  <Route path="/admin/logs" element={<ProtectedRoute permissions={["logs.view"]}><AdminLogs /></ProtectedRoute>} />
                  <Route path="/admin/utilisateurs/:id" element={<ProtectedRoute permissions={["users.view"]}><AdminUserDetail /></ProtectedRoute>} />
                  <Route path="/admin/support/ticket/:id" element={<ProtectedRoute permissions={["support.tickets.view"]}><AdminTicketDetail /></ProtectedRoute>} />
                  <Route path="/admin/support/kb" element={<ProtectedRoute permissions={["support.kb.view"]}><AdminKnowledgeBase /></ProtectedRoute>} />
                  <Route path="/admin/roles" element={<ProtectedRoute permissions={["roles.manage"]}><AdminRoles /></ProtectedRoute>} />
                  <Route path="/admin/fraude" element={<ProtectedRoute permissions={["fraud.review"]}><AdminFraud /></ProtectedRoute>} />
                  <Route path="/admin/taxonomie" element={<ProtectedRoute permissions={["taxonomy.manage"]}><AdminTaxonomy /></ProtectedRoute>} />
                  <Route path="/admin/contenu" element={<ProtectedRoute permissions={["content.manage"]}><AdminContenu /></ProtectedRoute>} />

                  {/* Hacker Routes */}
                  <Route path="/hacker" element={<ProtectedRoute roles={["hacker"]}><HackerDashboard /></ProtectedRoute>} />
                  <Route path="/hacker/programmes" element={<ProtectedRoute roles={["hacker"]}><HackerProgrammes /></ProtectedRoute>} />
                  <Route path="/hacker/rapports" element={<ProtectedRoute roles={["hacker"]}><HackerRapports /></ProtectedRoute>} />
                  <Route path="/hacker/parametres" element={<ProtectedRoute roles={["hacker"]}><HackerParametres /></ProtectedRoute>} />
                  <Route path="/hacker/profil" element={<ProtectedRoute roles={["hacker"]}><HackerProfil /></ProtectedRoute>} />

                  {/* Entreprise Routes */}
                  <Route path="/entreprise" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseDashboard /></ProtectedRoute>} />
                  <Route path="/entreprise/programmes" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseProgrammes /></ProtectedRoute>} />
                  <Route path="/entreprise/rapports" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseRapports /></ProtectedRoute>} />
                  <Route path="/entreprise/parametres" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseParametres /></ProtectedRoute>} />

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
            </MaintenanceGate>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
