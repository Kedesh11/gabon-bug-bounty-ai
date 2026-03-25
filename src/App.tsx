import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Programmes from "./pages/Programmes";
import ProgrammeDetail from "./pages/ProgrammeDetail";
import Hackers from "./pages/Hackers";
import MCPAgents from "./pages/MCPAgents";
import Documentation from "./pages/Documentation";
import MentionsLegales from "./pages/MentionsLegales";
import Contact from "./pages/Contact";
import Connexion from "./pages/Connexion";
import Inscription from "./pages/Inscription";
import MotDePasseOublie from "./pages/MotDePasseOublie";
import ReinitialiserMotDePasse from "./pages/ReinitialiserMotDePasse";
import SoumettreRapport from "./pages/SoumettreRapport";
import SoumettreProgramme from "./pages/SoumettreProgramme";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUtilisateurs from "./pages/admin/AdminUtilisateurs";
import AdminProgrammes from "./pages/admin/AdminProgrammes";
import AdminRapports from "./pages/admin/AdminRapports";
import AdminParametres from "./pages/admin/AdminParametres";

import HackerDashboard from "./pages/hacker/HackerDashboard";
import HackerProgrammes from "./pages/hacker/HackerProgrammes";
import HackerRapports from "./pages/hacker/HackerRapports";
import HackerProfil from "./pages/hacker/HackerProfil";
import HackerParametres from "./pages/hacker/HackerParametres";

import EntrepriseDashboard from "./pages/entreprise/EntrepriseDashboard";
import EntrepriseProgrammes from "./pages/entreprise/EntrepriseProgrammes";
import EntrepriseRapports from "./pages/entreprise/EntrepriseRapports";
import EntrepriseParametres from "./pages/entreprise/EntrepriseParametres";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/programmes" element={<Programmes />} />
              <Route path="/programmes/:id" element={<ProgrammeDetail />} />
              <Route path="/hackers" element={<Hackers />} />
              <Route path="/mcp-agents" element={<MCPAgents />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/mentions-legales" element={<MentionsLegales />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/connexion" element={<Connexion />} />
              <Route path="/inscription" element={<Inscription />} />
              <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
              <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
              <Route path="/soumettre-programme" element={<SoumettreProgramme />} />
              <Route path="/soumettre-rapport" element={<ProtectedRoute roles={["hacker"]}><SoumettreRapport /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/utilisateurs" element={<ProtectedRoute roles={["admin"]}><AdminUtilisateurs /></ProtectedRoute>} />
              <Route path="/admin/programmes" element={<ProtectedRoute roles={["admin"]}><AdminProgrammes /></ProtectedRoute>} />
              <Route path="/admin/rapports" element={<ProtectedRoute roles={["admin"]}><AdminRapports /></ProtectedRoute>} />
              <Route path="/admin/parametres" element={<ProtectedRoute roles={["admin"]}><AdminParametres /></ProtectedRoute>} />

              {/* Hacker */}
              <Route path="/hacker" element={<ProtectedRoute roles={["hacker"]}><HackerDashboard /></ProtectedRoute>} />
              <Route path="/hacker/programmes" element={<ProtectedRoute roles={["hacker"]}><HackerProgrammes /></ProtectedRoute>} />
              <Route path="/hacker/rapports" element={<ProtectedRoute roles={["hacker"]}><HackerRapports /></ProtectedRoute>} />
              <Route path="/hacker/profil" element={<ProtectedRoute roles={["hacker"]}><HackerProfil /></ProtectedRoute>} />
              <Route path="/hacker/parametres" element={<ProtectedRoute roles={["hacker"]}><HackerParametres /></ProtectedRoute>} />

              {/* Entreprise */}
              <Route path="/entreprise" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseDashboard /></ProtectedRoute>} />
              <Route path="/entreprise/programmes" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseProgrammes /></ProtectedRoute>} />
              <Route path="/entreprise/rapports" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseRapports /></ProtectedRoute>} />
              <Route path="/entreprise/parametres" element={<ProtectedRoute roles={["entreprise"]}><EntrepriseParametres /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
