import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Book, Shield, FileText, Terminal, ChevronRight } from "lucide-react";
import { useState } from "react";

const sections = [
  {
    id: "introduction",
    icon: Book,
    title: "Introduction",
    content: [
      {
        subtitle: "Contexte",
        text: "La transformation numérique au Gabon s'accompagne d'une exposition accrue aux cybermenaces. Les approches traditionnelles de cybersécurité ne suffisent plus à répondre à la complexité et à la rapidité des attaques modernes. L'intégration de systèmes intelligents et autonomes devient essentielle."
      },
      {
        subtitle: "Objectifs de la plateforme",
        text: "La plateforme BugBounty est un système collaboratif de cybersécurité permettant à des organisations de faire tester leurs systèmes par des hackers éthiques, avec l'appui d'un moteur intelligent basé sur des agents décisionnels (MCP)."
      },
    ],
  },
  {
    id: "getting-started",
    icon: Terminal,
    title: "Démarrage Rapide",
    content: [
      {
        subtitle: "Pour les Hackers",
        text: "1. Créez votre compte sur la plateforme\n2. Complétez votre profil et vérifiez votre identité\n3. Parcourez les programmes disponibles\n4. Choisissez un programme et lisez attentivement le scope\n5. Commencez votre recherche de vulnérabilités\n6. Soumettez vos rapports via le formulaire dédié"
      },
      {
        subtitle: "Pour les Organisations",
        text: "1. Inscrivez votre organisation\n2. Définissez le périmètre de test (scope)\n3. Configurez les récompenses par niveau de sévérité\n4. Publiez votre programme\n5. Recevez et traitez les rapports via le tableau de bord"
      },
    ],
  },
  {
    id: "mcp",
    icon: Shield,
    title: "Agents MCP",
    content: [
      {
        subtitle: "Architecture",
        text: "Le système MCP (Multi-Agent Control Platform) est composé de 6 agents spécialisés qui travaillent de manière coordonnée : Agent d'Analyse, Agent de Sévérité, Agent Anti-Fraude, Agent Décisionnel, Agent de Recommandation, et Agent de Récompenses."
      },
      {
        subtitle: "Fonctionnement",
        text: "Chaque rapport soumis passe par le pipeline MCP complet. Les agents communiquent entre eux pour partager les informations, affiner les décisions et réduire les erreurs. Le système s'améliore continuellement grâce à l'apprentissage des décisions passées."
      },
    ],
  },
  {
    id: "rules",
    icon: FileText,
    title: "Règles & Politiques",
    content: [
      {
        subtitle: "Règles de divulgation",
        text: "• Ne testez que les systèmes inclus dans le scope\n• Ne tentez pas d'accéder aux données personnelles\n• Signalez immédiatement toute vulnérabilité critique\n• Ne divulguez pas les vulnérabilités publiquement avant correction\n• Respectez un délai de 90 jours avant divulgation"
      },
      {
        subtitle: "Récompenses",
        text: "Les récompenses sont calculées automatiquement par l'Agent MCP dédié selon : la gravité (CVSS), l'impact métier, la complexité de découverte, et la qualité du rapport. Les paiements sont effectués sous 30 jours après validation."
      },
    ],
  },
];

const Documentation = () => {
  const [activeSection, setActiveSection] = useState("introduction");

  const currentSection = sections.find((s) => s.id === activeSection)!;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="container px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="font-mono text-primary text-sm tracking-widest uppercase">Ressources</span>
            <h1 className="text-4xl md:text-6xl font-black mt-3 mb-4">
              <span className="text-gradient-cyber">Documentation</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tout ce que vous devez savoir pour utiliser la plateforme BugBounty
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="glass-card rounded-xl border-glow p-4 sticky top-24 space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                      activeSection === section.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <section.icon className="w-4 h-4 flex-shrink-0" />
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="glass-card rounded-xl border-glow p-8">
                <div className="flex items-center gap-3 mb-6">
                  <currentSection.icon className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">{currentSection.title}</h2>
                </div>

                <div className="space-y-8">
                  {currentSection.content.map((block, i) => (
                    <div key={i}>
                      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-primary" />
                        {block.subtitle}
                      </h3>
                      <div className="text-muted-foreground leading-relaxed whitespace-pre-line pl-6 border-l-2 border-primary/20">
                        {block.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
};

export default Documentation;
