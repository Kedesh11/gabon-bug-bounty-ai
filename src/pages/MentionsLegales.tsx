import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useJsonContent } from "@/hooks/api/content";

interface LegalSection {
  title: string;
  content: string;
}

const DEFAULT_SECTIONS: LegalSection[] = [
  {
    title: "Éditeur de la plateforme",
    content:
      "BugBounty est une plateforme de coordination en cybersécurité destinée aux organisations et hackers éthiques. Pour toute demande légale, utilisez le formulaire de contact.",
  },
  {
    title: "Utilisation de la plateforme",
    content:
      "Les utilisateurs s'engagent à respecter le cadre légal applicable, le périmètre des programmes publiés et les règles de divulgation responsable.",
  },
  {
    title: "Protection des données",
    content:
      "Les données des comptes, rapports et programmes sont utilisées uniquement pour l'exploitation de la plateforme, l'analyse des vulnérabilités et le suivi des récompenses.",
  },
  {
    title: "Responsabilité",
    content:
      "Toute activité hors périmètre autorisé engage la responsabilité de son auteur. Les organisations restent responsables de la validation finale des rapports soumis.",
  },
];

export default function MentionsLegales() {
  const sections = useJsonContent<LegalSection[]>("mentions-legales.sections", DEFAULT_SECTIONS);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="container px-4 relative z-10 max-w-4xl">
          <div className="text-center mb-10">
            <span className="font-mono text-primary text-sm tracking-widest uppercase">Légal</span>
            <h1 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-foreground">Mentions légales</h1>
            <p className="text-muted-foreground">Informations juridiques et responsabilités d'usage.</p>
          </div>

          <div className="glass-card rounded-xl border-glow p-6 md:p-8 space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-bold text-foreground mb-2">{section.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
}
