# Date Website — Design Spec

**Date:** 2026-06-30
**Auteur:** Lucas
**Statut:** Validé, prêt pour planification

## 1. Résumé

Mini-site fun à envoyer à ses matchs Hinge. Le lien contient le prénom de la
personne en paramètre d'URL (`?name=Camille`). À l'arrivée, une card centrale
demande « [Prénom], veux-tu venir en date avec moi ? » avec un bouton **Oui** et
un bouton **Non**. Le bouton Non a un comportement absurde (tiré au hasard parmi
6) qui empêche ou décourage de cliquer dessus. Le Oui mène à une card de
remerciement avec un champ « petit mot » optionnel. Discord est notifié à chaque
étape clé via webhooks.

Le ton : mélange **romantique × meme** — bordures épaisses, hard-shadow,
couleurs qui claquent, mais police propre (Poppins) et rose chaleureux.

## 2. Objectifs & non-objectifs

**Objectifs**
- Expérience drôle, rapide à comprendre, qui marche aussi bien sur mobile que desktop.
- Pool de comportements absurdes **extensible** (en ajouter de nouveaux facilement).
- Tracking léger via Discord (qui visite, qui revient, qui accepte, qui laisse un mot).
- Persistance du prénom même si la personne le retire de l'URL (avec un twist drôle).

**Non-objectifs (YAGNI)**
- Pas de backend, pas de base de données, pas d'authentification.
- Pas de routing (une seule page, états internes).
- Pas de TanStack (Router/Query) — inutile sans données serveur ni navigation.
- Pas de masquage serverless de l'URL du webhook (assumé en clair, voir §8).

## 3. Stack & déploiement

- **React + Vite + Tailwind CSS.**
- **shadcn/ui optionnel** — uniquement pour le composant `Input` de la card de
  remerciement. Tout le reste est custom-stylé (bordures meme, hard-shadow).
- **Police Poppins** (Google Fonts ou self-host).
- **Déploiement : Vercel** (import GitHub, redeploy auto au push, URL gratuite
  `*.vercel.app`).
- URL type à coller dans Hinge : `https://<projet>.vercel.app/?name=Camille`.

## 3bis. Conventions de nommage

- **Fichiers et dossiers** : `kebab-case`
  (ex. `question-card.tsx`, `use-person-name.ts`, `behaviors/grow-shrink.ts`).
- **Noms de composants React** : `PascalCase`
  (ex. le fichier `question-card.tsx` exporte le composant `QuestionCard`).
- Hooks : fichier `kebab-case` (`use-visitor-mode.ts`), identifiant `camelCase`
  préfixé `use` (`useVisitorMode`).

> Note : dans les tableaux §5/§7 ci-dessous, les libellés `App`, `QuestionCard`,
> `usePersonName`, etc. désignent les **identifiants** (composants/hooks) ; les
> **fichiers** correspondants sont en kebab-case (`app.tsx`, `question-card.tsx`,
> `use-person-name.ts`…).

## 4. Architecture

Une seule page pilotée par une **machine d'états** interne :

```
ASKING  ──(clic Oui)──>  ACCEPTED  ──(envoi du mot)──>  DONE
```

- `ASKING` — la card question avec Oui/Non et le comportement absurde actif.
- `ACCEPTED` — la card de remerciement + champ « petit mot » optionnel.
- `DONE` — état final « C'est noté, à très vite ! ✨ » après envoi du mot.

### Pattern « registre de comportements »

Chaque effet absurde est un **module isolé** exposant une interface commune.
Ajouter un effet = ajouter un fichier au registre, sans toucher au reste. C'est
ce qui permet de les implémenter **un par un** et d'étendre le pool plus tard.

Interface indicative d'un comportement :

```ts
interface Behavior {
  id: string;            // 'grow' | 'flee' | 'repel' | 'gravity' | 'guilt' | 'sad'
  // Reçoit l'état des boutons + helpers ; gère souris ET tactile.
  // Retourne les handlers/styles à appliquer aux boutons Oui/Non.
}
```

## 5. Découpage en composants / unités

| Unité | Rôle | Dépend de |
|---|---|---|
| `App` | Machine d'états, orchestration, branche le bon comportement | hooks, cards |
| `usePersonName` | Lit URL + localStorage, fallback « Toi », détecte la « maligne » | — |
| `useVisitorMode` | Tire l'effet au hasard ou lit `?mode=`, détecte desktop/tactile | — |
| `useVisitTracking` | Gère visite / retour / rate-limit, déclenche les webhooks d'arrivée | discord |
| `QuestionCard` | Card « [Prénom], veux-tu venir en date avec moi ? » + Oui/Non | behaviors |
| `behaviors/` | Registre des 6 effets (souris + tactile) | — |
| `ThankYouCard` | Card de remerciement + champ « petit mot » optionnel | discord, confetti |
| `discord.ts` | Les 5 fonctions webhook (fire-and-forget) | — |
| `confetti.ts` | Confettis roses (au Oui + à l'envoi du mot) | — |

Chaque unité a un rôle unique, une interface claire, et est testable
indépendamment.

## 6. Logique du prénom (URL ↔ localStorage)

1. **Arrivée avec `?name=Camille`** → stocke `name` en localStorage, affiche le
   prénom, déclenche le webhook d'arrivée (voir §8).
2. **Pas de param mais localStorage contient un prénom** → la personne a retiré
   le prénom de l'URL → webhook **🕵️ Maligne** **et** on réaffiche quand même
   son prénom (le twist drôle).
3. **Rien nulle part** (pas de param, pas de localStorage) → fallback **« Toi »**.

Le prénom est inséré tel quel dans la card et les messages Discord (échapper /
tronquer pour éviter tout débordement visuel ou mention Discord involontaire).

## 7. Les 6 comportements absurdes

Un seul comportement est actif par visiteuse, **tiré au hasard** à l'arrivée.
Override possible via `?mode=`. Chaque effet gère **souris ET tactile** (voir
adaptation mobile §9).

| # | id | Effet | Déclencheur desktop | Déclencheur tactile |
|---|---|---|---|---|
| 1 | `grow` | Oui grandit, Non rapetisse à chaque refus (jusqu'à l'absurde, Oui bouffe la card). Aucune limite. | clic sur Non | tap sur Non |
| 2 | `flee` | Le Non se téléporte à une position aléatoire, impossible à cliquer. | survol du Non | doigt qui approche (`touchstart`/`touchmove`) |
| 3 | `repel` | Le Non glisse doucement loin du curseur (répulsion magnétique). | position du curseur | position du doigt |
| 4 | `gravity` | Le Non « tombe » et rebondit en bas de l'écran. | survol du Non | tentative de tap |
| 5 | `guilt` | Le texte du Non change à chaque tentative : « Non » → « T'es sûre ? » → « Réfléchis bien… » → « Tu me brises le cœur 💔 » → « Aïe. » | survol/tentative | tap raté |
| 6 | `sad` | Le fond se ternit + emojis qui pleurent selon la proximité du Non ; redevient rose près du Oui. | proximité curseur | proximité doigt |

**Mapping `?mode=`** : `grow`, `flee`, `repel`, `gravity`, `guilt`, `sad`.
Valeur inconnue ou absente → tirage aléatoire.

Dans **tous les cas**, le bouton **Oui** déclenche l'acceptation (§8) et la
transition vers `ACCEPTED`.

## 8. Webhooks Discord

- **Un seul channel**, **URL du webhook en clair** dans le bundle (assumé : un
  webhook Discord ne permet que d'écrire dans le channel ; risque réel minime
  pour un usage perso).
- Tous les appels sont **fire-and-forget** : `try/catch` silencieux, un échec
  réseau **n'interrompt jamais** l'expérience.

| # | Événement | Quand | Message (exemple) |
|---|---|---|---|
| 1 | 👀 **Visite** | 1re visite (pas de flag localStorage) → pose le flag | « 👀 Camille vient d'arriver sur le site. » |
| 2 | 🔁 **Revenu·e** | Visite suivante (flag déjà présent), **rate-limité** | « 🔁 Camille est revenue. » |
| 3 | 🕵️ **Maligne** | Au chargement, si prénom retiré de l'URL (§6 cas 2) | « 🕵️ Camille a tenté d'enlever son prénom de l'URL, elle est maligne. » |
| 4 | ✅ **Accepté** | **Immédiatement** au clic Oui (indépendant du mot) | « ✅ Camille a accepté le date ! » |
| 5 | 💌 **Petit mot** | À l'envoi du champ (séparé, si rempli) | « 💌 Camille a laissé un mot : "<texte>" » |

**Ordre / robustesse** : le webhook ✅ Accepté part **avant** toute interaction
avec le champ « petit mot », pour capter l'acceptation même si la personne
quitte avant d'écrire.

### Rate-limit du « Revenu·e »

- localStorage stocke un tableau de timestamps des pings de retour déjà envoyés.
- À chaque retour : purge des timestamps de plus de 30 min, puis :
  - s'il en reste **< 10** dans la fenêtre glissante → envoyer le webhook +
    ajouter le timestamp courant,
  - sinon → **ne rien envoyer** (anti-spam).

## 9. Adaptation mobile (tactile)

La majorité des visiteuses ouvriront le lien **sur mobile** (Hinge). Comme le
**hover n'existe pas** au tactile, chaque comportement « survol/curseur » est
adapté à un équivalent tactile (colonne « tactile » du tableau §7) :

- Déclencheur « survol » → `touchstart` / `touchmove` (doigt qui approche ou tap raté).
- Déclencheur « position du curseur » → position du `touch`.
- `grow` (clic) fonctionne tel quel via tap.

Détection du type d'appareil dans `useVisitorMode` (ex. `matchMedia('(hover:
hover)')` / présence d'événements tactiles) pour brancher le bon déclencheur.

## 10. Card de remerciement (état ACCEPTED → DONE)

- Card : « Yesss 🥳 [Prénom], tu viens de faire ma journée ! »
- Champ texte **optionnel** « Laisse-moi un petit mot (ton insta, un créneau,
  ce que tu veux 👀) » + bouton **Envoyer**.
  - Placeholder qui pousse gentiment à filer l'insta, mais l'envoi reste optionnel.
- À l'envoi → webhook 💌 (si non vide) → état `DONE` « C'est noté, à très vite ! ✨ ».
- **Confettis roses** au moment du Oui **et** à l'envoi du mot.

## 11. Identité visuelle (validée)

Direction **« A — Rond & punchy »** validée pendant le brainstorming :

- Card blanche, coins **arrondis**, **bordure noire épaisse (3px)** + **hard-shadow**.
- Fond en **dégradé rose** (pastel → rose vif).
- **Police Poppins**, titres en gras.
- Bouton **Oui** rose plein, bordure noire + hard-shadow, avec cœur 💕.
- Bouton **Non** petit, blanc, bordure noire.
- Mélange assumé romantique (cœurs, rose doux) × meme (bordures, ombres dures, punch).

## 12. Gestion d'erreurs & cas limites

- Webhooks : fire-and-forget, jamais bloquants.
- Prénom : fallback « Toi », échappement du texte inséré.
- `?mode=` invalide → tirage aléatoire.
- Rechargements répétés → rate-limit du « Revenu·e » (§8).
- Effet tactile sur appareil sans tactile (et inversement) → détection
  d'appareil pour éviter un effet « mort ».

## 13. Stratégie de test

- **Hooks** (`usePersonName`, `useVisitTracking`, rate-limit) : tests unitaires
  sur la logique localStorage / fenêtre glissante / fallback / détection maligne.
- **Comportements** : chaque module testé isolément (état des boutons après N
  tentatives, repositionnement, changement de texte…).
- **discord.ts** : webhook mocké, vérifier qu'un échec ne propage pas d'erreur.
- **Manuel** : parcours complet desktop + mobile (chaque `?mode=`), vérif des
  messages Discord dans l'ordre attendu.

## 14. Plan d'implémentation (incrémental)

Construction **un comportement à la fois** (demande explicite) :

1. Scaffolding Vite + Tailwind + Poppins, déploiement Vercel « hello world ».
2. `QuestionCard` statique au style validé (Option A) + machine d'états de base.
3. `usePersonName` (URL/localStorage/fallback) + affichage du prénom.
4. `discord.ts` + webhooks Visite / Accepté (parcours heureux minimal).
5. Card de remerciement + champ + webhook Petit mot + confettis.
6. Registre de comportements + `useVisitorMode` (tirage + `?mode=` + détection appareil).
7. Comportements un par un : `grow` → `flee` → `repel` → `gravity` → `guilt` → `sad`
   (chacun desktop + tactile).
8. Tracking complet : Revenu·e (rate-limit) + Maligne.
9. Polish (animations, responsive, wording final) + passe de tests.
