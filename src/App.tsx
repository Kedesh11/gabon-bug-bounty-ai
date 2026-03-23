import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Programmes from "./pages/Programmes.tsx";
import Hackers from "./pages/Hackers.tsx";
import MCPAgents from "./pages/MCPAgents.tsx";
import Documentation from "./pages/Documentation.tsx";
import Connexion from "./pages/Connexion.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/programmes" element={<Programmes />} />
          <Route path="/hackers" element={<Hackers />} />
          <Route path="/mcp-agents" element={<MCPAgents />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
