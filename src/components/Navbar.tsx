import { Shield, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
      <div className="container px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-black text-lg text-foreground">BugBounty<span className="text-primary">.ga</span></span>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/programmes" className="text-sm text-muted-foreground hover:text-primary transition-colors">Programmes</Link>
          <Link to="/hackers" className="text-sm text-muted-foreground hover:text-primary transition-colors">Hackers</Link>
          <Link to="/mcp-agents" className="text-sm text-muted-foreground hover:text-primary transition-colors">MCP Agents</Link>
          <Link to="/documentation" className="text-sm text-muted-foreground hover:text-primary transition-colors">Documentation</Link>
          <Link to="/connexion">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs">
              Connexion
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass-card border-t border-border px-4 py-4 space-y-3">
          <a href="#" className="block text-sm text-muted-foreground hover:text-primary">Programmes</a>
          <a href="#" className="block text-sm text-muted-foreground hover:text-primary">Hackers</a>
          <a href="#" className="block text-sm text-muted-foreground hover:text-primary">MCP Agents</a>
          <a href="#" className="block text-sm text-muted-foreground hover:text-primary">Documentation</a>
          <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs">
            Connexion
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
