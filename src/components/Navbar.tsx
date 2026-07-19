import { Shield, Menu, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { resolveDashboardPath } from "@/lib/roleNav";
import { useNavbarItems, type NavbarItem } from "@/hooks/api/content";
import { usePublicPlatformName } from "@/hooks/api/config";

// Shown while the real navbar-items query is loading/unavailable, so the navbar
// never flashes empty — matches what /admin/contenu seeds by default.
const FALLBACK_ITEMS: Pick<NavbarItem, "label" | "url" | "isExternal">[] = [
  { label: "Programmes", url: "/programmes", isExternal: false },
  { label: "Soumettre Rapport", url: "/soumettre-rapport", isExternal: false },
  { label: "Hackers", url: "/hackers", isExternal: false },
  { label: "Agents MCP", url: "/mcp-agents", isExternal: false },
  { label: "Documentation", url: "/documentation", isExternal: false },
];

function NavLink({ item, className, onClick }: { item: Pick<NavbarItem, "label" | "url" | "isExternal">; className: string; onClick?: () => void }) {
  if (item.isExternal) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {item.label}
      </a>
    );
  }
  return (
    <Link to={item.url} className={className} onClick={onClick}>
      {item.label}
    </Link>
  );
}

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { data: navItems } = useNavbarItems();
  const { data: platformName } = usePublicPlatformName();
  const items = navItems ?? FALLBACK_ITEMS;
  const brandName = platformName ?? "Bug Bounty";

  const handleLogout = () => {
    logout();
    navigate("/");
    setOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
      <div className="container px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-black text-lg text-foreground">{brandName}</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {items.map((item) => (
            <NavLink key={item.url + item.label} item={item} className="text-sm text-muted-foreground hover:text-primary transition-colors" />
          ))}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link to={resolveDashboardPath(user)}>
                <Button size="sm" variant="outline" className="font-mono text-xs">
                  <LayoutDashboard className="w-3 h-3 mr-1" /> Tableau de bord
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={handleLogout} className="text-destructive text-xs">
                <LogOut className="w-3 h-3 mr-1" /> Déconnexion
              </Button>
            </div>
          ) : (
            <Link to="/connexion">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs">
                Connexion
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass-card border-t border-border px-4 py-4 space-y-3">
          {items.map((item) => (
            <NavLink
              key={item.url + item.label}
              item={item}
              className="block text-sm text-muted-foreground hover:text-primary"
              onClick={() => setOpen(false)}
            />
          ))}
          {isAuthenticated && user ? (
            <>
              <Link to={resolveDashboardPath(user)} onClick={() => setOpen(false)} className="block text-sm text-primary font-semibold">Tableau de bord</Link>
              <button onClick={handleLogout} className="block text-sm text-destructive">Déconnexion</button>
            </>
          ) : (
            <Link to="/connexion" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs">Connexion</Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
