import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext.tsx";
import { DataProvider } from "@/contexts/DataContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Programmes from "./pages/Programmes";
import SoumettreRapport from "./pages/SoumettreRapport";
import SoumettreProgramme from "./pages/SoumettreProgramme";
import Connexion from "./pages/Connexion";
import Inscription from "./pages/Inscription";
import Hackers from "./pages/Hackers";
import Documentation from "./pages/Documentation";
import MCPAgents from "./pages/MCPAgents";

// Admin & Roles
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminParametres from "./pages/admin/AdminParametres";
import AdminUtilisateurs from "./pages/admin/AdminUtilisateurs";
import AdminProgrammes from "./pages/admin/AdminProgrammes";
import AdminRapports from "./pages/admin/AdminRapports";
import TriageDashboard from "./pages/admin/TriageDashboard";
import FinanceDashboard from "./pages/admin/FinanceDashboard";
import SupportDashboard from "./pages/admin/SupportDashboard";

// Hacker
import HackerDashboard from "./pages/hacker/HackerDashboard";
import HackerRapports from "./pages/hacker/HackerRapports";
import HackerParametres from "./pages/hacker/HackerParametres";
import HackerProfil from "./pages/hacker/HackerProfil";

// Entreprise
import EntrepriseDashboard from "./pages/entreprise/EntrepriseDashboard";
import EntrepriseProgrammes from "./pages/entreprise/EntrepriseProgrammes";
import EntrepriseRapports from "./pages/entreprise/EntrepriseRapports";
import EntrepriseParametres from "./pages/entreprise/EntrepriseParametres";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" closeButton richColors />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <DataProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/programmes" element={<Programmes />} />
              <Route path="/soumettre-rapport" element={<SoumettreRapport />} />
              <Route path="/soumettre-programme" element={<SoumettreProgramme />} />
              <Route path="/connexion" element={<Connexion />} />
              <Route path="/inscription" element={<Inscription />} />
              <Route path="/hackers" element={<Hackers />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/mcp-agents" element={<MCPAgents />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/utilisateurs" element={<ProtectedRoute roles={["admin", "support"]}><AdminUtilisateurs /></ProtectedRoute>} />
              <Route path="/admin/programmes" element={<ProtectedRoute roles={["admin"]}><AdminProgrammes /></ProtectedRoute>} />
              <Route path="/admin/rapports" element={<ProtectedRoute roles={["admin", "triage"]}><AdminRapports /></ProtectedRoute>} />
              <Route path="/admin/parametres" element={<ProtectedRoute roles={["admin", "triage", "finance", "support"]}><AdminParametres /></ProtectedRoute>} />
              <Route path="/admin/triage" element={<ProtectedRoute roles={["admin", "triage"]}><TriageDashboard /></ProtectedRoute>} />
              <Route path="/admin/finance" element={<ProtectedRoute roles={["admin", "finance"]}><FinanceDashboard /></ProtectedRoute>} />
              <Route path="/admin/support" element={<ProtectedRoute roles={["admin", "support"]}><SupportDashboard /></ProtectedRoute>} />

              {/* Hacker Routes */}
              <Route path="/hacker" element={<ProtectedRoute roles={["hacker"]}><HackerDashboard /></ProtectedRoute>} />
              <Route path="/hacker/programmes" element={<ProtectedRoute roles={["hacker"]}><HackerDashboard /></ProtectedRoute>} />
              <Route path="/hacker/rapports" element={<ProtectedRoute roles={["hacker"]}><HackerRapports /></ProtectedRoute>} />
              <Route path="/hacker/parametres" element={<ProtectedRoute roles={["hacker"]}><HackerParametres /></ProtectedRoute>} />
              <Route path="/hacker/profil" element={<ProtectedRoute roles={["hacker"]}><HackerProfil /></ProtectedRoute>} />

              {/* Entreprise Routes */}
              <Route path="/entreprise" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseDashboard /></ProtectedRoute>} />
              <Route path="/entreprise/programmes" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseProgrammes /></ProtectedRoute>} />
              <Route path="/entreprise/rapports" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseRapports /></ProtectedRoute>} />
              <Route path="/entreprise/parametres" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseParametres /></ProtectedRoute>} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
