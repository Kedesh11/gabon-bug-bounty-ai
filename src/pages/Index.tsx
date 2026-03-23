import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import MCPAgentsSection from "@/components/MCPAgentsSection";
import WorkflowSection from "@/components/WorkflowSection";
import AdvantagesSection from "@/components/AdvantagesSection";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <MCPAgentsSection />
      <WorkflowSection />
      <AdvantagesSection />
      <FooterSection />
    </div>
  );
};

export default Index;
