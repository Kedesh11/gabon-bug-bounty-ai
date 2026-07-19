# Bug Bounty Gabon — API

Backend Express + Prisma + PostgreSQL de la plateforme Bug Bounty Gabon, **séparé du frontend** (`../src`, POC React/Vite qui tourne encore sur `localStorage` — le branchement est un chantier à part). Base de données et authentification hébergées sur **Supabase**. Paiements via **Stripe** (carte) et **CinetPay** (mobile money).

## Sommaire

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Démarrage local](#démarrage-local)
- [Variables d'environnement](#variables-denvironnement)
- [Scripts npm](#scripts-npm)
- [Modèle de données](#modèle-de-données)
- [Authentification & RBAC](#authentification--rbac)
- [Service de paiement](#service-de-paiement)
- [Tests](#tests)
- [CI](#ci)
- [Déploiement](#déploiement)

## Architecture

```
api/
├── src/
│   ├── index.ts                    Point d'entrée Express (CORS, routes, webhooks, error handler)
│   ├── env.ts                      Validation des variables d'env (zod) — l'app refuse de démarrer si une variable requise manque
│   ├── prisma.ts                   Client Prisma singleton
│   ├── lib/
│   │   ├── supabaseAdmin.ts        Client Supabase (clé service_role — jamais exposée au frontend)
│   │   └── asyncHandler.ts         Wrapper pour propager les erreurs async vers errorHandler
│   ├── middleware/
│   │   ├── auth.ts                 Vérifie le token Supabase (Bearer) → req.user
│   │   ├── requireRole.ts          Garde RBAC — mêmes rôles que src/components/ProtectedRoute.tsx côté frontend
│   │   └── errorHandler.ts         Traduit HttpError / ZodError en réponses JSON propres
│   ├── routes/                     auth, programmes, reports, hackers, entreprises, config, payments, payouts, webhooks
│   └── services/payments/          Voir "Service de paiement" plus bas
├── prisma/
│   ├── schema.prisma                Schéma complet (15+ modèles, migrations versionnées)
│   ├── migrations/
│   └── seed.ts                      Recrée les données de démo du frontend avec de vrais comptes Supabase Auth
├── supabase/                        Config de la stack Supabase locale (générée par `supabase init`)
└── test/                            vitest + supertest, base réelle + SDK externes mockés
```

**Pourquoi cette séparation ?** Le frontend (`../src`) et ce service ne partagent aucun code ni build. Ils communiquent uniquement via l'API HTTP décrite ci-dessous. Ça permet de déployer, versionner et scaler les deux indépendamment.

**Pourquoi pas de Row Level Security (RLS) Postgres ?** Prisma se connecte à la base avec une connection string directe (rôle propriétaire), ce qui contourne les policies RLS de Supabase (RLS ne s'applique qu'aux connexions via PostgREST/supabase-js avec le JWT d'un utilisateur). L'autorisation est donc **entièrement portée par le middleware Express** (`requireRole`), pas par la base — un seul endroit à auditer pour la sécurité d'accès.

## Prérequis

- Node.js 20+
- Docker (pour la stack Supabase locale)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`supabase` dans le PATH)
- Pour le paiement carte : [Stripe CLI](https://stripe.com/docs/stripe-cli) (installé comme devDependency, utilisable via `npx stripe`)

## Démarrage local

```bash
cd api
npm install

# 1. Lance Postgres + Auth (Supabase) en local via Docker
supabase start
# Note les URLs/clés affichées, notamment la "Secret key" → SUPABASE_SERVICE_ROLE_KEY

# 2. Copie et remplis les variables d'environnement
cp .env.example .env
# Remplis DATABASE_URL / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY avec la sortie de `supabase status`

# 3. Génère les clés Stripe sandbox (aucun compte requis)
npx stripe sandbox create --email toi@example.com
# Colle secret_key dans STRIPE_SECRET_KEY

# 4. Applique le schéma
npx prisma migrate dev

# 5. (Optionnel) Peuple la base avec les données de démo du frontend
npm run prisma:seed

# 6. Lance l'API
npm run dev   # http://localhost:4000
```

**Pour tester les webhooks Stripe en local**, dans un second terminal :
```bash
npx stripe listen --forward-to localhost:4000/api/webhooks/stripe
# Copie le "webhook signing secret" affiché → STRIPE_WEBHOOK_SECRET dans .env, puis redémarre `npm run dev`
```

Si `supabase start` échoue avec un conflit de port, un autre projet Supabase tourne déjà sur cette machine sur les ports par défaut (54321-54329) : ce projet est configuré pour utiliser la plage **55321-55329** à la place (voir `supabase/config.toml`) précisément pour éviter ce conflit — vérifie qu'aucun autre outil n'utilise déjà cette plage-là avant de relancer.

## Variables d'environnement

Voir `.env.example` pour la liste complète et à jour. Résumé :

| Variable | Requise | Description |
|---|---|---|
| `PORT` | non (défaut 4000) | Port d'écoute de l'API |
| `API_BASE_URL` | non (défaut `http://localhost:4000`) | Base URL publique de l'API, utilisée pour construire les callbacks `notify_url` (CinetPay) |
| `CORS_ORIGIN` | non (défaut `http://localhost:8080`) | Origine autorisée en CORS (le frontend) |
| `DATABASE_URL` | **oui** | Connection string Postgres (Prisma) |
| `SUPABASE_URL` | **oui** | URL du projet Supabase (local ou cloud) |
| `SUPABASE_SERVICE_ROLE_KEY` | **oui** | Clé service_role — jamais côté client |
| `STRIPE_SECRET_KEY` | **oui** | Clé secrète/restreinte Stripe (sandbox ou live) |
| `STRIPE_WEBHOOK_SECRET` | non* | Secret de signature webhook (`stripe listen` en local) — sans elle, l'endpoint webhook Stripe répond 400 |
| `CINETPAY_API_KEY` / `CINETPAY_SITE_ID` | non* | Identifiants Checkout CinetPay (encaissement mobile money) |
| `CINETPAY_TRANSFER_LOGIN` / `CINETPAY_TRANSFER_PASSWORD` | non* | Identifiants Transfer CinetPay (reversement mobile money) |

\* Non requises pour démarrer l'app, mais les endpoints correspondants échouent explicitement tant qu'elles ne sont pas renseignées — pas d'échec silencieux.

## Scripts npm

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de dev avec rechargement (`tsx watch`) |
| `npm run build` / `npm start` | Build de production puis lancement |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | vitest |
| `npm run prisma:migrate` | Crée + applique une migration à partir du schéma |
| `npm run prisma:studio` | Explorateur de données Prisma Studio |
| `npm run prisma:seed` | Réinitialise et repeuple la base avec les données de démo |

## Modèle de données

`prisma/schema.prisma` traduit fidèlement les interfaces déjà définies côté frontend (`../src/stores/dataStore.ts`, `../src/types/auth.ts`) :

- **`Profile`** — mirroir applicatif de `auth.users` (géré par Supabase Auth) : `id` identique, porte `role`/`name`/`avatar`.
- **`HackerProfile`** / **`EntrepriseProfile`** — 1:1 avec `Profile`.
- **`Programme`** — tous les champs de l'interface `Programme`, plus relations `RewardTier[]`, `TargetGroup[]`, `Announcement[]`, `Activity[]`.
- **`Report`** — relation `aiAnalysis` 1:1 (placeholder déterministe pour l'instant, pas une vraie IA — voir le commentaire dans `routes/reports.routes.ts`).
- **`Payment`** / **`Payout`** — voir section paiement.
- **`SystemConfig`** — ligne singleton (`id` fixe).

Écart volontaire par rapport au frontend : **`cardCvv` n'est jamais persisté**, nulle part dans le schéma — règle PCI de base, pas une option.

## Authentification & RBAC

L'auth est déléguée à **Supabase Auth** (hash de mot de passe, émission JWT, MFA/TOTP natif) plutôt que réimplémentée à la main :

1. `POST /api/auth/register` / `POST /api/auth/login` — le serveur appelle le SDK admin Supabase et renvoie `{ profile, session }`. Le frontend doit conserver `session.access_token`.
2. Chaque requête protégée envoie `Authorization: Bearer <access_token>`.
3. `middleware/auth.ts` vérifie le token auprès de Supabase (`supabase.auth.getUser`), charge le `Profile` correspondant, l'attache à `req.user`.
4. `middleware/requireRole(...roles)` bloque avec 403 si le rôle de `req.user` n'est pas autorisé — **c'est la seule barrière d'autorisation** (voir note RLS plus haut). Rôles : `hacker`, `entreprise`, `admin`, `triage`, `finance`, `support` (identiques à `UserRole` côté frontend).

## Service de paiement

`src/services/payments/` — deux sous-services indépendants derrière un orchestrateur commun (`paymentService.ts`) :

- **`stripe/`** — encaissement via Checkout Sessions (l'entreprise finance un programme) ; reversement via **Connect v2, comptes Recipient** (`stripe/connect.ts` + `stripe/payout.ts`). Pattern "separate charges and transfers / hold-and-release" : l'entreprise finance en amont, la plateforme retient, et reverse plus tard au hacker sur un rapport accepté précis.
- **`cinetpay/`** — mêmes deux sens via l'agrégateur mobile money CinetPay (Airtel/Moov/MTN au Gabon). Le webhook CinetPay ne fait **jamais confiance** à la notification brute — il revérifie systématiquement via l'API de vérification CinetPay avant de mettre à jour quoi que ce soit.

Flux :
- `POST /api/payments/programmes/:id/fund` (`entreprise` propriétaire ou `admin`) — crée un `Payment` et renvoie une URL de paiement hébergée (Stripe ou CinetPay selon `method`).
- `POST /api/payments/onboarding/stripe` (`hacker`) — crée/lie un compte Stripe Connect et renvoie un lien d'onboarding hébergé.
- `POST /api/payouts/reports/:id` (`admin`/`finance`) — déclenche le reversement de `Report.reward` au hacker : Stripe s'il a un compte Connect actif, sinon CinetPay s'il a du mobile money configuré (`HackerPaymentConfig`), sinon erreur explicite.
- Webhooks : `POST /api/webhooks/stripe` (signature vérifiée, monté **avant** `express.json()` car Stripe a besoin du corps brut) et `POST /api/webhooks/cinetpay`.

**État des intégrations** : Stripe est vérifié avec de vraies clés sandbox (Checkout Session réelle créée, webhook signé réellement vérifié). **CinetPay n'a pas encore de clés de test réelles** — la logique est couverte par des tests avec les appels HTTP mockés ; les noms exacts de champs de réponse de leur API sont à confirmer contre un vrai compte sandbox avant mise en production.

**Explicitement hors scope pour l'instant** (pas un oubli) : logique de marge/frais plateforme, remboursements/litiges, réconciliation d'un solde de financement par programme, autres agrégateurs mobile money.

## Tests

```bash
npm test
```

Vitest + supertest contre une **vraie base Postgres** (celle de `supabase start`) — seuls Supabase Auth et les SDK Stripe/CinetPay sont mockés (`test/setup.ts`), tout le reste (Prisma, RBAC, validation Zod) s'exécute réellement. `npm test` réutilise la base de dev configurée dans `.env` et ne la nettoie pas après coup — relancer `npm run prisma:seed` si les tests ont laissé des données de test qui gênent.

## CI

Job `api` dans `.github/workflows/ci.yml` : lint, typecheck, migrations Prisma contre un conteneur `postgres:16` de service, tests, build. Indépendant du job frontend existant.

## Déploiement

Non couvert par ce chantier. Pour passer d'un dev local à un vrai environnement :
1. Créer un vrai projet Supabase (cloud) et y appliquer les migrations (`prisma migrate deploy`).
2. Remplacer les clés sandbox Stripe/CinetPay par des clés live, et reconfigurer le webhook Stripe sur l'URL publique réelle.
3. Renseigner `API_BASE_URL`/`CORS_ORIGIN` avec les vraies URLs de production.
