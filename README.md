# Bug Bounty Gabon

Plateforme Bug Bounty Gabon — deux services séparés dans ce dépôt :

- **`/` (ce dossier)** — frontend React/Vite. Tourne encore sur `localStorage` (POC) ; le branchement sur l'API ci-dessous est un chantier en cours.
- **[`api/`](api/README.md)** — backend Express + Prisma + PostgreSQL (Supabase), authentification réelle, service de paiement Stripe/CinetPay. Voir [api/README.md](api/README.md) pour le détail complet (architecture, démarrage local, variables d'environnement, tests).

## Démarrage rapide (frontend)

```bash
npm install
npm run dev      # http://localhost:8080
npm test
npm run build
```

Pour le backend, voir [api/README.md](api/README.md).
