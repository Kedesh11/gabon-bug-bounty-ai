import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useFooterColumns } from "@/hooks/api/content";
import { usePublicPlatformName } from "@/hooks/api/config";

// Shown while the real footer-columns query is loading/unavailable, so the footer
// never flashes empty — matches what /admin/contenu seeds by default.
const FALLBACK_LINKS = [
  { id: "mentions-legales", label: "Mentions légales", url: "/mentions-legales" },
  { id: "contact", label: "Contact", url: "/contact" },
];

const FooterSection = () => {
  const { data: columns } = useFooterColumns();
  const { data: platformName } = usePublicPlatformName();
  const brandName = platformName ? platformName.replace(/\s+/g, "") : "BugBounty";

  // A single column (the seeded default) renders as a flat row of links, matching
  // the original layout exactly. Once an admin adds a second column from
  // /admin/contenu, each renders as its own titled group instead of silently
  // dropping the extra links.
  const resolvedColumns = columns ?? [{ id: "fallback", title: "Liens", order: 0, links: FALLBACK_LINKS.map((l) => ({ ...l, columnId: "fallback", order: 0 })) }];
  const isSingleColumn = resolvedColumns.length <= 1;

  return (
    <footer className="border-t border-border py-12">
      <div className="container px-4">
        <div className={`flex flex-col ${isSingleColumn ? "md:flex-row items-center" : "md:flex-row items-start"} justify-between gap-8`}>
          <div className="flex items-center gap-2 shrink-0">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-black text-lg text-foreground">{brandName}</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Plateforme Nationale de Bug Bounty — République Gabonaise
          </p>
          {isSingleColumn ? (
            <div className="flex gap-6 flex-wrap justify-center">
              {resolvedColumns[0].links.map((link) => (
                <Link key={link.id} to={link.url} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex gap-10 flex-wrap justify-center">
              {resolvedColumns.map((column) => (
                <div key={column.id} className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-foreground">{column.title}</p>
                  <div className="flex flex-col gap-1.5">
                    {column.links.map((link) => (
                      <Link key={link.id} to={link.url} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
