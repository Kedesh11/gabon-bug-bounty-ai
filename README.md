# Bug Bounty Gabon

Plateforme nationale de bug bounty pour le Gabon : met en relation des chercheurs en sécurité (« hackers ») avec des organisations (« entreprises ») qui financent des programmes de recherche de vulnérabilités, avec triage et gestion administrative (rôles `admin`, `triage`, `finance`, `support`).

## État actuel du projet

Deux services indépendants qui communiquent uniquement en HTTP :

| Service | Rôle |
|---|---|
| **Frontend** (`/`) | SPA React : espaces hacker, entreprise et staff, branchée sur l'API (auth réelle, plus aucune donnée simulée) |
| **Backend** (`api/`) | API Express : auth, RBAC par permissions, programmes (avec validation staff), rapports, paiements, KYC, détection de fraude, agents d'analyse IA, CMS, journaux d'audit |

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
- Supabase (Postgres, authentification, Storage privé pour les pièces jointes et le KYC)
- Stripe (carte, Connect) et PVit (mobile money Gabon : Airtel Money, Moov Money)
- Resend (emails transactionnels), OpenRouter (agents d'analyse de rapports)
- Vitest + Supertest

## Structure du frontend

```
src/
├── pages/
│   ├── admin/        Tableaux de bord staff (admin, triage, finance, support), rôles, fraude, CMS...
│   ├── entreprise/   Espace entreprise (programmes, rapports, paramètres)
│   ├── hacker/       Espace hacker (programmes, rapports, profil, paramètres)
│   └── *.tsx         Pages publiques (accueil, programmes, connexion, inscription...)
├── components/
│   ├── ui/           Composants shadcn/ui (générés, ne pas modifier à la main)
│   └── *.tsx         Composants applicatifs (Navbar, DashboardLayout, ProtectedRoute, MfaSection, KycSection...)
├── contexts/         AuthContext (session réelle via l'API)
├── hooks/api/        Un hook TanStack Query par ressource de l'API
├── lib/              apiClient (session + refresh), mappers API → domaine, validations paiement
└── test/             Setup Vitest
```

### Points à connaître

- **Authentification réelle** : le frontend appelle `api/` (`/api/auth/*`). La session (access + refresh token) vit uniquement dans des **cookies httpOnly** posés par l'API : le JavaScript de la page ne peut pas les lire, donc un XSS ne peut pas les voler. [src/lib/apiClient.ts](src/lib/apiClient.ts) envoie les requêtes avec `credentials: "include"` et l'en-tête anti-CSRF, et rafraîchit la session sur un 401. Seul un indice non sensible (`bugbounty_session_hint`) reste dans le `localStorage`. Connexion en deux temps si un facteur TOTP est enrôlé.
- **RBAC** : `ProtectedRoute` ne fait que masquer des pages. Le serveur fait autorité : chaque route de l'API vérifie une *permission* (`requirePermission`), jamais un nom de rôle codé en dur.
- **Rôles** : `hacker` et `entreprise` s'inscrivent eux-mêmes ; tous les autres comptes (admin, triage, finance, support, rôles personnalisés) sont créés par un admin, qui envoie un lien d'activation à usage unique (aucun mot de passe n'est transmis par email).

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

Les tests de l'API tournent contre une vraie base : lancez `supabase start` **depuis `api/`** (pas depuis la racine : c'est `api/supabase/config.toml` qui fixe les ports 55321-55329 attendus par `api/.env`).

## Documentation complémentaire

- [api/README.md](api/README.md) — architecture backend, modèle de données, authentification/RBAC, service de paiement, déploiement.
