# Liens serverless (id + admin) — Design Spec

**Date:** 2026-07-02
**Auteur:** Lucas
**Statut:** Validé, prêt pour planification
**Évolution de :** [2026-06-30-date-website-design.md](./2026-06-30-date-website-design.md)

## 1. Résumé

Faire évoluer le site (aujourd'hui 100 % front) pour que **le prénom et la phrase
d'accroche soient stockés côté serveur sous un id court**. Le lien envoyé devient
`https://<projet>.vercel.app/?id=x7k2` : court, et il ne révèle ni le prénom ni
la phrase (vraie surprise). Une **page admin** protégée par mot de passe permet
de générer ces liens (prénom + phrase + comportement), de lister les liens créés
et de voir des stats par lien (visites, accepté). Bonus sécurité : l'envoi des
webhooks Discord passe **côté serveur**, donc l'URL du webhook n'est plus visible
dans le bundle.

On reste sur **le même repo et le même déploiement Vercel** : on ajoute une
couche serverless (`/api` + Upstash Redis) à côté du SPA Vite existant.

## 2. Objectifs & non-objectifs

**Objectifs**
- Liens courts `?id=` dont le contenu (prénom + phrase) est stocké côté serveur.
- Phrase d'accroche personnalisable par lien, avec jeton `{prenom}`.
- Page admin (mot de passe) : générer un lien, lister les liens, stats par lien.
- Cacher l'URL du webhook Discord (envoi côté serveur).
- **Rétrocompatibilité totale** : les liens `?name=`/`?mode=` déjà envoyés
  continuent de fonctionner exactement comme avant.
- Ne jamais casser l'expérience si le serveur/Redis est indisponible.

**Non-objectifs (YAGNI)**
- Pas de comptes utilisateurs / multi-admin (un seul mot de passe partagé).
- Pas d'édition d'une entrée existante (on crée / supprime ; pas de update).
- Pas d'expiration automatique des liens (TTL) dans cette version.
- Pas de migration des anciens liens `?name=` vers des id (ils restent tels quels).

## 3. Stack & contraintes

- **Frontend** : le SPA React + Vite + Tailwind existant (inchangé à ~90 %).
- **Serverless** : fonctions Vercel dans un dossier **`/api`** (supporté pour un
  projet Vite, sans Next.js). Runtime Node.
- **Stockage** : **Upstash Redis** via `@upstash/redis` (intégration Vercel,
  free tier). Remplace l'ancien « Vercel KV » (déprécié).
- **Génération d'id** : `nanoid` (~8 caractères base62, non devinables).
- Réutilisation du module de sanitisation existant côté serveur (mentions,
  troncature) — extrait dans un module partageable client/serveur si besoin.

## 4. Architecture & flux

### Flux d'une visite via `?id=`
```
Visiteur ouvre /?id=x7k2
  → SPA : GET /api/entry?id=x7k2
      → Redis : lit entry:x7k2  { name, phrase, mode }
      → Redis : HINCRBY stats:x7k2 visits 1
  → la QuestionCard affiche la phrase (jeton {prenom} remplacé)
  → tracking (localStorage décide) : POST /api/track { event, id, name }
      → serveur construit le message sanitisé
      → POST vers Discord (DISCORD_WEBHOOK_URL, caché côté serveur)
```

### Résolution de la source (ordre de priorité)
Un module unique produit toujours `{ name, phrase, mode }` :
1. **`?id=`** présent → `GET /api/entry` (Redis).
2. sinon **`?name=`** (+ `?q=` optionnel, `?mode=`) → rétrocompat, 100 % client.
3. sinon **cache localStorage** (un id vu précédemment) → cas « maligne ».
4. sinon **fallback** générique : `name = "Toi"`, phrase par défaut, mode aléatoire.

### Rétrocompatibilité & résilience
- Un lien `?name=Camille&mode=flee` (sans `id`) **saute `/api/entry`** et se
  comporte exactement comme aujourd'hui.
- Si `/api/entry` échoue (réseau/Redis down) : on retombe sur `?name=` si présent,
  sinon fallback « Toi ». Le site ne plante jamais.

## 5. Modèle de données (Redis)

```
entry:<id>   → JSON string  { name, phrase, mode, createdAt }
stats:<id>   → hash         { visits, accepted, noted }
entries      → set          des <id> existants (pour l'admin)
```

- **`entry:<id>`** : `mode` peut valoir `"random"` ou un `BehaviorId` précis.
- **`stats:<id>`** : compteurs incrémentés côté serveur via `HINCRBY` (atomiques,
  pas de read-modify-write) — `visits` sur `/api/entry`, `accepted` et `noted`
  sur `/api/track`.
- **`entries`** : set des id pour que `/api/list` reconstruise le dashboard.
- **Pas de TTL** (les liens persistent jusqu'à suppression).

### Limites de contenu (validées serveur)
- `name` : ≤ 40 caractères.
- `phrase` : ≤ 200 caractères.
- `mode` : ∈ `{ random, grow, flee, repel, gravity, guilt, sad }`.
- Sanitisation (neutralisation des mentions Discord, retrait des caractères de
  contrôle) appliquée à `name` et à toute valeur réinjectée dans un message.

## 6. Endpoints `/api`

| Endpoint | Méthode | Auth | Rôle |
|---|---|---|---|
| `/api/create` | POST | 🔒 admin | Valide `{name, phrase, mode}` → génère `id` → écrit `entry:<id>`, `SADD entries <id>` → `{ id }` |
| `/api/entry` | GET | public | Lit `entry:<id>` ; `HINCRBY stats:<id> visits 1` ; `404` si inconnu |
| `/api/track` | POST | public | Event typé `{ event, name, id? , note? }` → construit + envoie le message Discord ; `HINCRBY` `accepted`/`noted` si `id` fourni |
| `/api/list` | GET | 🔒 admin | Renvoie toutes les entrées + leurs stats (dashboard) |
| `/api/delete` | POST | 🔒 admin | `{ id }` → supprime `entry:<id>`, `stats:<id>`, `SREM entries <id>` |

- **🔒 admin** : header `x-admin-secret` comparé à `ADMIN_SECRET` (comparaison à
  temps constant) ; sinon `401`.
- **`/api/track` n'accepte qu'un event typé** (`visit | return | sneaky |
  accepted | note`), jamais du texte libre. Le serveur compose le message à
  partir de l'event + `name` sanitisé → impossible de poster du contenu arbitraire.
- **Événement → message** (repris de l'existant, réutilisé côté serveur) :
  - `visit` → « 👀 {name} vient d'arriver sur le site. »
  - `return` → « 🔁 {name} est revenue. »
  - `sneaky` → « 🕵️ {name} a tenté d'enlever son prénom de l'URL, elle est maligne. »
  - `accepted` → « ✅ {name} a accepté le date ! »
  - `note` → « 💌 {name} a laissé un mot : "{note}" » (`note` sanitisé, ≤ 500)

## 7. Frontend — changements

- **`hooks/use-entry.ts`** (nouveau) : si `?id=` présent, appelle `GET /api/entry`,
  expose `{ status: 'loading'|'ok'|'notfound'|'error', data? }`.
- **Module de résolution de source** (pur, testable) : applique l'ordre §4 et
  renvoie toujours `{ name, phrase, mode }`.
- **`components/question-card.tsx`** : affiche `phrase` avec le jeton `{prenom}`
  remplacé par `name`. Si la phrase ne contient pas `{prenom}`, elle est affichée
  telle quelle. Défaut (aucune phrase) : « {prenom}, veux-tu venir en date avec
  moi ? » (comportement actuel préservé).
- **`lib/discord.ts`** : mêmes fonctions publiques (`notifyVisit`, `notifyReturn`,
  `notifySneaky`, `notifyAccepted`, `notifyNote`), mais le transport passe de
  « `fetch` Discord direct » à « `fetch('/api/track', …)` » avec l'event typé et
  l'`id` courant si disponible. La logique de décision (rate-limit, maligne)
  reste dans les hooks existants, inchangée.
- **Page admin** (`components/admin/…`, affichée quand `?admin` est dans l'URL) :
  - Champ **mot de passe** (retenu en localStorage) envoyé en header sur les
    appels admin.
  - **Formulaire** : prénom, phrase (avec aide sur `{prenom}`), menu **mode**
    (« aléatoire » par défaut, ou un mode précis) → `POST /api/create` → affiche
    le lien + bouton **Copier**.
  - **Liste** des liens (`GET /api/list`) : prénom, phrase, lien, stats
    (👁 visites, ✅ accepté), bouton **Supprimer** (`POST /api/delete`).
  - Reste isolée : rendue seulement en présence de `?admin`, jamais chargée pour
    un visiteur normal.

## 8. Mécanisme « maligne » & cas limites

- Au premier passage sur `?id=x7k2`, on **cache l'id (et le prénom)** en
  localStorage.
- **Suppression de `?id=`** (URL sans `id` ni `name`, mais cache présent) →
  on **re-fetch la card cachée** et on envoie l'event `sneaky` → « 🕵️ haha
  {prénom} tu es maligne ». Le prénom reste affiché.
- **Autre `?id=` valide** → on honore le nouveau lien et on met à jour le cache
  (on ne cherche pas à distinguer « nouveau lien légitime » d'une triche : on
  reste bienveillant).
- **id inconnu / invalide** (`404`) → fallback générique (« Toi » + phrase par
  défaut), pas d'écran cassé.
- **`/api` ou Redis indisponible** → fallback sur `?name=` si présent, sinon
  « Toi ». Jamais de plantage.

## 9. Sécurité

- **Webhook Discord caché** : `DISCORD_WEBHOOK_URL` en variable d'env **serveur**
  (plus de préfixe `VITE_`), utilisé uniquement par `/api/track`. L'ancienne
  variable client `VITE_DISCORD_WEBHOOK_URL` est supprimée.
- **Endpoints admin** protégés par `ADMIN_SECRET` (header, comparaison à temps
  constant) → `401` sans le bon secret.
- **`/api/track` typé** (pas de texte libre) → pas d'usage comme proxy de spam.
- **ids non devinables** : `nanoid` ~8 caractères base62.
- **Validation & sanitisation serveur** systématiques (limites §5, mentions
  neutralisées).
- **Secrets jamais commités** ; `.env.example` documente les variables.

## 10. Variables d'environnement & déploiement

| Variable | Portée | Rôle |
|---|---|---|
| `DISCORD_WEBHOOK_URL` | serveur | URL du webhook (cachée) |
| `ADMIN_SECRET` | serveur | mot de passe admin |
| `UPSTASH_REDIS_REST_URL` | serveur | auto-injectée par l'intégration Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | serveur | auto-injectée par l'intégration Upstash |

- **Migration** : passer de `VITE_DISCORD_WEBHOOK_URL` (client) à
  `DISCORD_WEBHOOK_URL` (serveur). Retirer la variable client de Vercel après
  déploiement.
- **Setup one-time** : ajouter l'intégration Upstash au projet Vercel ; définir
  `ADMIN_SECRET`.
- **Dev local** : `.env.local` avec les 4 variables + **`vercel dev`** (fait
  tourner le SPA et les fonctions `/api` ensemble). `npm run dev` seul ne sert
  pas les fonctions `/api`.

## 11. Stratégie de test

- **Logique pure (TDD)** : génération/validation d'id, sanitisation serveur,
  event → message, résolution de source (`id` › `name` › cache › fallback),
  remplacement du jeton `{prenom}`, validation des limites.
- **Handlers `/api`** (Redis + fetch mockés) : `create` (auth ok/ko, écrit
  entry + index), `entry` (trouvé/404, incrément visites), `track` (event typé →
  bon message, auth, incrément accepted/noted), `list`/`delete` (auth).
- **Frontend** : `use-entry` (loading/ok/notfound/error via `fetch` mocké) ;
  résolution de source ; page admin (form → create → affichage du lien).
- **Régression** : un lien `?name=` legacy fonctionne toujours, tracking inclus.
- **Manuel** : admin → créer un lien → l'ouvrir → vérifier la card, Discord et
  les compteurs ; tester le cas « maligne » ; tester un id invalide et Redis down.

## 12. Découpage d'implémentation (indicatif)

1. Setup Upstash + `/api` + `vercel dev` (un `/api/health` minimal).
2. Sanitisation partagée + construction des messages (pur, TDD).
3. `/api/track` (relais Discord typé) + bascule `discord.ts` vers `/api/track`.
4. Modèle Redis + `/api/create` + `/api/entry` (avec compteurs).
5. `use-entry` + module de résolution de source + affichage de la `phrase`.
6. `/api/list` + `/api/delete` + page admin (form, mot de passe, liste, stats).
7. Mécanisme « maligne » basé sur l'id caché + fallbacks (404, Redis down).
8. Migration du webhook (`VITE_` → serveur) + doc `.env.example` + déploiement.
9. Passe de tests + vérif manuelle (dont rétrocompat `?name=`).
