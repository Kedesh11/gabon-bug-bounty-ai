# Bug Bounty Gabon — API

Backend Express + Prisma + PostgreSQL de la plateforme Bug Bounty Gabon, **séparé du frontend** (`../src`, SPA React/Vite qui l'appelle en HTTP). Base de données et authentification hébergées sur **Supabase**. Paiements via **Stripe** (carte) et **PVit** (mobile money Gabon : Airtel Money, Moov Money).

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
│   │   ├── auth.ts                 requireAuth / optionalAuth : vérifie le token Supabase (Bearer) → req.user
│   │   ├── requirePermission.ts    Garde RBAC par permission (données, pas de rôle codé en dur)
│   │   ├── rateLimit.ts            Limiteurs des endpoints sensibles (login, reset, vérification, MFA)
│   │   └── errorHandler.ts         Traduit HttpError / ZodError en réponses JSON propres
│   ├── routes/                     auth, mfa, programmes, reports, hackers, entreprises, roles, config, taxonomy, content, logs,
│   │                               tickets, kyc, compliance, kb, fraud, mcpAgents, payments, payouts, webhooks...
│   └── services/payments/          Voir "Service de paiement" plus bas
├── prisma/
│   ├── schema.prisma                Schéma complet (40 modèles, migrations versionnées)
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
| `API_BASE_URL` | non (défaut `http://localhost:4000`) | Base URL publique de l'API, utilisée pour construire les callbacks (`notify_url` CinetPay) |
| `CORS_ORIGIN` | non (défaut `http://localhost:8080`) | Origine autorisée en CORS (le frontend) |
| `FRONTEND_URL` | non (défaut `http://localhost:8080`) | Base des liens envoyés par email (reset, vérification, activation staff) |
| `TRUST_PROXY_HOPS` | non (défaut `0`) | Nombre de reverse proxies devant l'API (1 derrière nginx/un load balancer) |
| `OPENROUTER_API_KEY` | non* | Agents d'analyse de rapports (timeout 60 s par appel) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | non* | Emails transactionnels |
| `DATABASE_URL` | **oui** | Connection string Postgres (Prisma) |
| `SUPABASE_URL` | **oui** | URL du projet Supabase (local ou cloud) |
| `SUPABASE_SERVICE_ROLE_KEY` | **oui** | Clé service_role — jamais côté client |
| `STRIPE_SECRET_KEY` | **oui** | Clé secrète/restreinte Stripe (sandbox ou live) |
| `STRIPE_WEBHOOK_SECRET` | non* | Secret de signature webhook (`stripe listen` en local) — sans elle, l'endpoint webhook Stripe répond 400 |
| `MOBILE_MONEY_PROVIDER` | non (défaut `pvit`) | Agrégateur mobile money : `pvit` (Gabon) ou `cinetpay` (ne dessert pas le Gabon) |
| `PVIT_OPERATION_ACCOUNT_CODE`, `PVIT_SECRET_PASSWORD`, `PVIT_RENEW_SECRET_URL`, `PVIT_PAYMENT_URL`, `PVIT_STATUS_URL`, `PVIT_CALLBACK_URL_CODE` | non* | PVit — à copier depuis le tableau de bord mypvit.pro (URL complètes, telles qu'affichées dans le menu APIs) |
| `PVIT_BALANCE_URL` | non | Active la vérification du solde avant un versement |
| `PVIT_CALLBACK_IP_ALLOWLIST` | non | IP sources autorisées sur le webhook PVit (liste séparée par des virgules) |
| `CINETPAY_API_KEY` / `CINETPAY_SITE_ID` | non* | Identifiants Checkout CinetPay (inutiles avec PVit) |
| `CINETPAY_TRANSFER_LOGIN` / `CINETPAY_TRANSFER_PASSWORD` | non* | Identifiants Transfer CinetPay (inutiles avec PVit) |

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

`prisma/schema.prisma` est la source de vérité du modèle de données. Principaux modèles :

- **`Profile`** — mirroir applicatif de `auth.users` (géré par Supabase Auth) : `id` identique, porte `role`/`name`/`avatar`.
- **`HackerProfile`** / **`EntrepriseProfile`** — 1:1 avec `Profile`.
- **`Programme`** — relations `RewardTier[]`, `TargetGroup[]`, `Announcement[]`, `Activity[]`. Deux états distincts : `status` (actif/pause/ferme, piloté par l'entreprise) et `validationStatus` (en_attente/valide/refuse, décidé par le staff). Seul un programme `valide` est public ; un programme validé dont l'entreprise réécrit les termes repart en validation.
- **`Report`** — un rapport ne peut cibler qu'un programme validé et actif. `aiAnalysis` est un placeholder déterministe ; l'analyse réelle vient des 7 agents (`services/mcpAgents`, via OpenRouter) qui ne font que *suggérer* au triage.
- **`Payment`** / **`Payout`** — voir section paiement.
- **`SystemConfig`** — ligne singleton (`id` fixe).

Écart volontaire par rapport au frontend : **`cardCvv` n'est jamais persisté**, nulle part dans le schéma — règle PCI de base, pas une option.

## Authentification & RBAC

L'auth est déléguée à **Supabase Auth** (hash de mot de passe, émission JWT, MFA/TOTP natif) plutôt que réimplémentée à la main :

**Session = cookies httpOnly.** `/login`, `/mfa/login-verify`, `/mfa/enroll/confirm` et `/refresh` posent deux cookies (`bb_at`, access token, `Path=/` ; `bb_rt`, refresh token, `Path=/api/auth`) et ne renvoient **jamais** les tokens dans le corps. `requireAuth` lit le cookie, ou un en-tête `Bearer` explicite (scripts, tests ; il l'emporte sur le cookie). `/logout` révoque la session côté Supabase et efface les cookies. Réglages : `COOKIE_SAMESITE` (`lax` par défaut ; `none` exige `COOKIE_SECURE=true` et ne sert que si frontend et API sont sur des sites différents), `COOKIE_SECURE` (vrai par défaut en production), `COOKIE_DOMAIN`.

**Protection CSRF** (`middleware/csrf.ts`), nécessaire dès que l'authentification part toute seule avec le navigateur : sur toute requête qui modifie l'état, (1) un en-tête `Origin` présent doit être exactement `CORS_ORIGIN` (bloque aussi le « login CSRF »), (2) une requête portant des cookies de session et sans `Bearer` doit porter `X-Requested-With: bb-web`, qu'une page tierce ne peut pas envoyer sans préflight CORS (que l'API ne valide que pour son frontend, avec `credentials: true`). Les webhooks (Stripe, CinetPay) n'ont ni `Origin` ni cookies : non concernés.

**Second facteur** : un compte avec un facteur TOTP vérifié n'est servi que sur une session `aal2`. Le token `aal1` renvoyé par `/login` (`aal1AccessToken`) ne sert qu'à `/mfa/login-verify`, il est refusé partout ailleurs.

1. `POST /api/auth/register` crée un compte `hacker` ou `entreprise` **non confirmé** : aucune session tant que l'email n'est pas vérifié (`/verify-email`, lien à usage unique de 24 h).
2. `POST /api/auth/login` renvoie `{ profile }` (tokens en cookies), ou `{ mfaRequired, factorId, aal1AccessToken }` si un facteur TOTP est enrôlé (second temps : `POST /api/auth/mfa/login-verify`).
3. Chaque requête protégée porte le cookie `bb_at` (ou un `Authorization: Bearer`). `middleware/auth.ts` vérifie le token auprès de Supabase, charge le `Profile` et ses permissions, les attache à `req.user`. `optionalAuth` fait de même sans jamais rejeter (routes publiques dont la réponse dépend de l'appelant).
4. `requirePermission(...keys)` bloque avec 403 si le rôle de l'appelant n'a aucune de ces permissions — **c'est la seule barrière d'autorisation** (voir note RLS plus haut). Les permissions sont des données (`services/roles/permissionCatalog.ts`), éditables par un admin.
5. Réinitialisation de mot de passe et vérification d'email : jetons aléatoires de 32 octets, seul le hash SHA-256 est stocké, usage unique garanti par une mise à jour conditionnelle (deux requêtes simultanées ne passent pas toutes les deux). Une réinitialisation ferme toutes les sessions du compte.
6. Les comptes staff (admin, triage, finance, support, rôles personnalisés) sont créés par un admin avec un mot de passe aléatoire inconnu ; la personne reçoit un lien d'activation (72 h). Si l'email n'a pas pu partir, l'API renvoie ce lien à l'admin pour qu'il le transmette. Garde-fou : on ne peut ni retirer `roles.manage` au dernier rôle qui le détient, ni supprimer le dernier compte qui l'a.
7. `SystemConfig.require2FA` n'est qu'une **incitation** (bandeau pour les comptes admin/entreprise sans 2FA), pas un blocage de connexion.

**Durcissement HTTP** : `helmet` (en-têtes de sécurité) et rate limiting en mémoire sur login, mot de passe oublié, renvoi de vérification et vérification MFA. Derrière un reverse proxy, renseigner `TRUST_PROXY_HOPS` (sinon toutes les IP se confondent). Le rate limiting est par instance : à plusieurs instances, il faudra un store partagé (voir `middleware/rateLimit.ts`).

**KYC** : les pièces sont envoyées dans un bucket Storage privé (`kyc-documents`, PDF/JPEG/PNG, 5 Mo, type vérifié sur les octets), consultables via un lien signé de 5 minutes par le staff ou le titulaire. Un document sans fichier ne peut pas être validé.

## Service de paiement

`src/services/payments/` — deux sous-services indépendants derrière un orchestrateur commun (`paymentService.ts`) :

- **`stripe/`** — encaissement via Checkout Sessions (l'entreprise finance un programme) ; reversement via **Connect v2, comptes Recipient** (`stripe/connect.ts` + `stripe/payout.ts`). Pattern "separate charges and transfers / hold-and-release" : l'entreprise finance en amont, la plateforme retient, et reverse plus tard au hacker sur un rapport accepté précis.
- **`pvit/`** — mobile money au Gabon (Airtel Money, Moov Money) : encaissement (`PAYMENT`) et versement (`GIVE_CHANGE`) via l'agrégateur PVit. Voir « PVit » plus bas. **Agrégateur par défaut** (`MOBILE_MONEY_PROVIDER=pvit`).
- **`cinetpay/`** — mêmes deux sens via CinetPay. **CinetPay ne dessert pas le Gabon** (ni sa liste de pays officielle, ni son SDK) : conservé, non utilisé par défaut, pour un autre marché éventuel. Le webhook CinetPay ne fait **jamais confiance** à la notification brute — il revérifie systématiquement via l'API de vérification CinetPay avant de mettre à jour quoi que ce soit.

Flux :
- `POST /api/payments/programmes/:id/fund` (`entreprise` propriétaire ou `admin`) — crée un `Payment`. Carte (Stripe) : renvoie une URL de paiement hébergée. Mobile money (PVit) : exige `phoneNumber` et `operator` (`airtel`/`moov`), XAF uniquement, et renvoie `awaitingPhoneConfirmation` (pas d'URL : le payeur valide par code PIN sur son téléphone).
- `POST /api/payments/onboarding/stripe` (`hacker`) — crée/lie un compte Stripe Connect et renvoie un lien d'onboarding hébergé.
- `POST /api/payouts/reports/:id` (permission `payouts.create`) — déclenche le reversement de `Report.reward`, dans la devise du programme : Stripe si le compte Connect du hacker a réellement la capacité de transfert active, sinon le mobile money (PVit par défaut) s'il a du mobile money (XAF uniquement), sinon `422` explicite *sans créer de versement*. Un versement `failed` se relance sur la même ligne (même clé d'idempotence Stripe : pas de double paiement) ; `pending`/`succeeded` renvoient `409`.
- Webhooks : `POST /api/webhooks/stripe` (signature vérifiée, monté **avant** `express.json()` car Stripe a besoin du corps brut) `POST /api/webhooks/pvit` et `POST /api/webhooks/cinetpay`. Stripe : un paiement ne passe à `succeeded` que si la session est payée **et** que montant/devise correspondent à ceux enregistrés ; `expired`/`async_payment_failed` le passent à `failed` ; un paiement déjà réglé n'est jamais rétrogradé.

**État des intégrations** : Stripe est vérifié avec de vraies clés sandbox (Checkout Session réelle créée, webhook signé réellement vérifié). **CinetPay n'a pas encore de clés de test réelles** — la logique est couverte par des tests avec les appels HTTP mockés ; les noms exacts de champs de réponse de leur API sont à confirmer contre un vrai compte sandbox avant mise en production.

**PVit (Gabon)** — documentation : [docs.mypvit.pro](https://docs.mypvit.pro). Authentification par clé `X-Secret` valable 1 h, renouvelée automatiquement. Chaque API a sa propre URL, copiée du tableau de bord (la doc est incohérente sur le préfixe `/v2`). Commencer avec le « Compte TEST » : un montant < 1000 XAF réussit, > 1000 XAF échoue, et PVit exige au moins 2 simulations de chaque (avec accusé de réception du callback) avant d'ouvrir la production.
- *Encaissement* : `PAYMENT`, statut `PENDING` immédiat, statut final par callback. Le payeur ne paie que `amount` + commission (`owner_charge: CUSTOMER`).
- *Versement* : `GIVE_CHANGE`, traité **de façon synchrone** (la réponse porte le statut final). La plateforme supporte les frais (`MERCHANT`) pour que le hacker reçoive la récompense entière. Une vérification de solde (`PVIT_BALANCE_URL`) a lieu avant l'envoi.
- *Callback* `POST /api/webhooks/pvit` : l'accusé exigé par PVit (HTTP 200 + écho dynamique de `transactionId` et `code`) est renvoyé ; le corps n'est **pas** cru (aucune signature) — il sert à identifier la transaction, dont l'état est relu via l'API de statut, en vérifiant référence, compte et montant. Filtre d'IP optionnel.
- *Références* : 20 caractères alphanumériques max, dérivées de l'id (`C…` encaissement, `P…<tentative>` versement).
- *Issue incertaine* (timeout, 5xx) : un versement reste `pending` et n'est **jamais** relancé automatiquement (risque de double paiement) ; il se tranche à la main, après vérification dans le tableau de bord PVit, par `POST /api/payouts/:id/resolve` (justification obligatoire, journalisée). Seul un refus explicite de PVit passe un versement en `failed`.
- *Réconciliation* : toutes les 5 minutes, les transactions PVit en attente depuis plus de 3 minutes sont revérifiées.
- *Non exercé contre PVit en réel* (pas de compte marchand) : seul le contrat OpenAPI de la documentation a servi. À confirmer en sandbox : le format exact des numéros (`077123456`), et surtout que PVit autorise `GIVE_CHANGE` vers un numéro qui n'a jamais payé (la doc le décrit comme un remboursement/rendu de monnaie).

**CinetPay (non utilisé par défaut), versements mobile money (asynchrones)** : l'ordre de transfert est « accepté » (`pending`), jamais présumé réglé. Le règlement arrive par le callback `POST /api/webhooks/cinetpay-transfer` (`notify_url`), dont le corps n'est **pas** cru — il sert seulement à identifier le versement, dont le vrai statut est relu via `GET /transfer/check/money` (`VAL` → `succeeded`, `REJ` → `failed`, `NEW`/`REC` → toujours `pending`). Filet de sécurité : une tâche toutes les 5 minutes revérifie les versements restés `pending` plus de 2 minutes (notification perdue), et `POST /api/payouts/:id/sync` le fait à la demande. Montant : multiple de 5 exigé (422 avant tout envoi). Relance d'un versement `failed` : un nouvel `client_transaction_id` est utilisé (`<id>-<tentative>`), mais **après** avoir demandé à CinetPay ce qu'il est advenu de la tentative précédente — si elle a abouti ou est en cours, elle est adoptée et rien n'est renvoyé ; si CinetPay est injoignable, la relance s'arrête (mieux vaut un retard qu'un double paiement). Côté encaissement, le montant et la devise confirmés par CinetPay doivent correspondre au paiement enregistré, et `EXPIRED`/`CANCELLED`/`REFUSED` passent le paiement à `failed`.

**Non vérifié en réel** : aucune clé CinetPay n'est disponible, donc cette intégration n'a été exercée que contre des réponses simulées, dont la forme vient de la documentation publique de CinetPay (lue via des extraits de recherche, les pages elles-mêmes n'étant pas joignables depuis cet environnement). Le point le plus incertain est la forme exacte de la réponse de `/transfer/check/money` (objet ou liste, lue des deux façons) : à confirmer contre un compte sandbox avant la production.

**Explicitement hors scope pour l'instant** (pas un oubli) : logique de marge/frais plateforme, remboursements/litiges, réconciliation d'un solde de financement par programme, autres agrégateurs mobile money.

## Tests

```bash
npm test
```

Vitest + supertest contre une **vraie base Postgres** (celle de `supabase start`) — seuls Supabase Auth et les SDK Stripe/CinetPay/PVit sont mockés (`test/setup.ts`), tout le reste (Prisma, RBAC, validation Zod) s'exécute réellement. `npm test` réutilise la base de dev configurée dans `.env` et ne la nettoie pas après coup — relancer `npm run prisma:seed` si les tests ont laissé des données de test qui gênent.

## CI

Job `api` dans `.github/workflows/ci.yml` : lint, typecheck, migrations Prisma contre un conteneur `postgres:16` de service, tests, build. Indépendant du job frontend existant.

## Déploiement

Non couvert par ce chantier. Pour passer d'un dev local à un vrai environnement :
1. Créer un vrai projet Supabase (cloud) et y appliquer les migrations (`prisma migrate deploy`).
2. Remplacer les clés sandbox Stripe/PVit par des clés live (PVit : créer les comptes d'opération de production, déclarer l'IP sortante du serveur dans « Adresses IP », autoriser les IP de PVit en entrée), et reconfigurer le webhook Stripe sur l'URL publique réelle.
3. Renseigner `API_BASE_URL`/`CORS_ORIGIN`/`FRONTEND_URL` avec les vraies URLs de production.
4. Activer "Confirm email" dans Authentication → Providers → Email du dashboard Supabase cloud — `supabase/config.toml` ne s'applique qu'à la stack locale ; sans ça, l'inscription crée des comptes non confirmés qu'aucun réglage cloud ne bloquera à la connexion.
5. MFA (TOTP) : rien à activer côté dashboard cloud, contrairement à `supabase/config.toml` en local (`[auth.mfa.totp]`) — TOTP standard est disponible sur le plan Free de Supabase, aucun palier payant requis (seul le MFA par téléphone/SMS est un add-on payant, non utilisé ici).
