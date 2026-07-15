# Bug Bounty Gabon

Plateforme nationale de bug bounty pour le Gabon : met en relation des chercheurs en sécurité (« hackers ») avec des organisations (« entreprises ») qui financent des programmes de recherche de vulnérabilités, avec triage et gestion administrative (rôles `admin`, `triage`, `finance`, `support`).

## État actuel du projet

Le dépôt contient **deux services séparés, pas encore branchés l'un à l'autre** :

| Service | État | Détail |
|---|---|---|
| **Frontend** (`/`) | POC fonctionnel | Toutes les interfaces sont construites et navigables, mais l'authentification est simulée et toutes les données vivent dans `localStorage` du navigateur (voir [État du frontend](#état-du-frontend)) |
| **Backend** (`api/`) | Fondations posées | API réelle (auth, base de données, RBAC serveur, paiements) fonctionnelle et testée, mais le frontend ne l'appelle pas encore |

Le prochain chantier structurant est le branchement du frontend sur `api/` (remplacement de `localStorage`/l'auth simulée par de vrais appels API).

## Architecture

```
gabon-bug-bounty-ai/
├── src/            Frontend — React + Vite + TypeScript (ce README)
├── api/            Backend — Express + Prisma + PostgreSQL (voir api/README.md)
└── .github/workflows/ci.yml   CI : un job par service, indépendants
```

Les deux services ne partagent aucun code ni build : ils ne communiqueront que via HTTP (API REST) une fois branchés. Chacun a son propre `package.json`, ses propres dépendances, sa propre suite de tests et son propre job CI.

## Stack technique

**Frontend** (`src/`) :
- React 18 + TypeScript + Vite
- shadcn/ui (Radix UI) + Tailwind CSS
- React Router, TanStack Query, React Hook Form + Zod
- Vitest + Testing Library, ESLint

**Backend** (`api/`) — détails complets dans [api/README.md](api/README.md) :
- Express + TypeScript, Prisma ORM, PostgreSQL
- Supabase (hébergement Postgres + authentification — hash mdp, JWT, MFA natif)
- Stripe (paiement carte) et CinetPay (paiement mobile money : Airtel/Moov/MTN)
- Vitest + Supertest

## Structure du frontend

```
src/
├── pages/
│   ├── admin/        Tableaux de bord admin, triage, finance, support
│   ├── entreprise/    Espace entreprise (programmes, rapports, paramètres)
│   ├── hacker/         Espace hacker (programmes, rapports, profil, paramètres)
│   └── *.tsx            Pages publiques (accueil, programmes, connexion, inscription...)
├── components/
│   ├── ui/               Composants shadcn/ui (générés, ne pas modifier à la main)
│   └── *.tsx              Composants applicatifs (Navbar, DashboardLayout, ProtectedRoute...)
├── contexts/            AuthContext (auth simulée), DataContext (données mockées)
├── stores/dataStore.ts   Modèle de données complet + CRUD en mémoire/localStorage
├── lib/paymentValidation.ts   Validations paiement (Luhn, IBAN, adresses crypto, téléphone Gabon) — testées unitairement
└── test/                 Setup Vitest
```

### État du frontend

Points à connaître avant de construire dessus :

- **Authentification simulée** (`src/contexts/AuthContext.tsx`) : n'importe quel mot de passe est accepté pour un email connu ; un email inconnu crée un compte hacker à la volée. Attendu pour un POC, à remplacer par de vrais appels à `api/` (`POST /api/auth/login`).
- **Toutes les données sont en `localStorage`** (`src/stores/dataStore.ts`), réinitialisables via le bouton de reset plateforme dans les paramètres admin.
- **RBAC côté client uniquement** (`src/components/ProtectedRoute.tsx`) — contournable via les DevTools ; le vrai RBAC vit désormais côté serveur dans `api/` et devra faire autorité une fois le branchement fait.
- Rôles gérés : `hacker`, `entreprise`, `admin`, `triage`, `finance`, `support` (`src/types/auth.ts`).

## Démarrage rapide

### Frontend

```bash
npm install
npm run dev        # http://localhost:8080
npm run lint
npm test
npm run build
```

### Backend

Voir [api/README.md](api/README.md) pour la procédure complète (stack Supabase locale, migrations, seed, variables d'environnement, service de paiement). En résumé :

```bash
cd api
npm install
supabase start
cp .env.example .env   # à remplir avec la sortie de `supabase status`
npx prisma migrate dev
npm run prisma:seed    # optionnel : données de démo
npm run dev             # http://localhost:4000
```

## Tests & CI

Chaque service a sa propre suite de tests et son propre job dans `.github/workflows/ci.yml` (lint + typecheck + tests + build), avec un conteneur PostgreSQL de service pour le job `api`. Les deux jobs doivent être verts avant fusion.

## Documentation complémentaire

- [api/README.md](api/README.md) — architecture backend, modèle de données, authentification/RBAC, service de paiement, déploiement.
