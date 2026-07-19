import { useState } from "react";
import { toast } from "sonner";

import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone } from "lucide-react";
import { useContent } from "@/hooks/api/content";

export default function Contact() {
  const contactEmail = useContent("contact.email", "contact@bugbounty.com");
  const contactPhone = useContent("contact.phone", "+241 00 00 00 00");
  const intro = useContent("contact.intro", "Une question sur la plateforme ? Envoyez-nous un message.");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Remplissez tous les champs du formulaire");
      return;
    }
    toast.success("Message envoyé (démo)");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="container px-4 relative z-10 max-w-4xl">
          <div className="text-center mb-10">
            <span className="font-mono text-primary text-sm tracking-widest uppercase">Support</span>
            <h1 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-foreground">Contact</h1>
            <p className="text-muted-foreground">{intro}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card rounded-xl border-glow p-5 lg:col-span-1 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Canaux</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> {contactEmail}</p>
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {contactPhone}</p>
              </div>
            </div>

            <div className="glass-card rounded-xl border-glow p-6 lg:col-span-2 space-y-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">Nom</label>
                <Input value={name} onChange={(event) => setName(event.target.value)} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">Email</label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">Sujet</label>
                <Input value={subject} onChange={(event) => setSubject(event.target.value)} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1">Message</label>
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="bg-secondary border-border min-h-[130px]" />
              </div>
              <Button onClick={handleSubmit} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Envoyer
              </Button>
            </div>
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
}
