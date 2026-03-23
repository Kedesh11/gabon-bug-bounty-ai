import { Shield } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-black text-lg text-foreground">BugBounty<span className="text-primary">.ga</span></span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            © 2026 Plateforme Nationale de Bug Bounty — République Gabonaise
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Mentions légales</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
