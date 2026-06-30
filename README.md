# 💘 date-website

> Le site le plus malhonnête pour décrocher un date. Tu envoies un lien, la personne ouvre, une card lui demande _« [Prénom], veux-tu venir en date avec moi ? »_ — et le bouton **Non** fait... tout sauf se laisser cliquer.

Spoiler : il n'y a qu'une seule bonne réponse, et le site fait en sorte que ce soit la seule possible. 🎯

---

## 🌸 C'est quoi le délire ?

1. Tu génères un lien avec le prénom de ton match : `https://ton-site.vercel.app/?name=Camille`
2. Elle ouvre → une card rose, bordures qui claquent, _« Camille, veux-tu venir en date avec moi ? »_, un gros **Oui 💕** et un petit **Non**.
3. Le **Non** est piégé (voir les 6 comportements ci-dessous). Tiré au hasard à chaque visite.
4. Elle clique **Oui** (parce qu'elle n'a pas vraiment le choix) → **confettis roses** 🎉 + une card de remerciement où elle peut te laisser un petit mot (son insta 👀).
5. Toi, pendant ce temps, tu reçois tout sur **Discord** en direct.

C'est absurde, c'est rose, c'est inoffensif. Exactement comme prévu.

---

## 🎭 Les 6 comportements du bouton « Non »

Un seul est actif par visite (tiré au sort). Tu peux en forcer un avec `?mode=` (pratique pour tester, ou pour réserver le plus cruel à quelqu'un de spécial).

| `?mode=` | Petit nom | Ce qu'il fait |
|----------|-----------|---------------|
| `grow` | **Grow/Shrink** | Chaque clic sur Non fait grossir le Oui et rapetisser le Non. Jusqu'à l'absurde, le Oui bouffe la card. |
| `flee` | **Fuyard** | Le Non se téléporte ailleurs dès que le curseur (ou le doigt) l'approche. Insaisissable. |
| `repel` | **Aimant inversé** | Le Non glisse loin du curseur/doigt, comme un aimant qui repousse. (Il reste à l'écran, promis.) |
| `gravity` | **Gravité** | Le Non « tombe » et rebondit en bas de l'écran. |
| `guilt` | **Culpabilisateur** | Le texte du Non change à chaque tentative : `Non` → `T'es sûre ?` → `Réfléchis bien…` → `Tu me brises le cœur 💔` → `Aïe.` |
| `sad` | **Ambiance triste** | Plus tu approches du Non, plus l'écran s'assombrit et pleure des emojis. Ça redevient rose près du Oui. |

> 📱 Tout est adapté au **tactile** : sur mobile, « survol » devient « doigt qui approche / tap raté ». Et comme la plupart des liens s'ouvrent depuis Hinge sur téléphone, c'est là que ça compte le plus.

---

## 🔗 Paramètres d'URL

| Param | Rôle | Exemple |
|-------|------|---------|
| `name` | Le prénom affiché sur la card | `?name=Camille` |
| `mode` | Force un comportement précis (sinon aléatoire) | `?mode=flee` |

### Et si la personne est maligne ? 🕵️
Le prénom est **mis en cache** (localStorage). Si elle retire `?name=` de l'URL pour « casser » le truc, le site réaffiche quand même son prénom **et** t'envoie un webhook _« X a tenté d'enlever son prénom de l'URL, elle est maligne »_. Sans prénom du tout (toi qui testes, par ex.), fallback sur _« Toi »_.

---

## 📡 Les notifications Discord

Tout passe par **un seul webhook Discord** (fire-and-forget : si Discord est down, l'expérience continue normalement). Tu es notifié pour :

| | Quand |
|---|---|
| 👀 **Visite** | Première arrivée de quelqu'un |
| 🔁 **Revenue** | Visites suivantes (limité à **10 par 30 min** pour ne pas spammer) |
| 🕵️ **Maligne** | Elle a viré le prénom de l'URL |
| ✅ **Accepté** | Clic sur Oui (envoyé **immédiatement**, même si elle ferme l'onglet juste après) |
| 💌 **Petit mot** | Le message qu'elle laisse (son insta, un créneau…) |

---

## 🚀 Démarrage rapide

```bash
# 1. Installer
npm install

# 2. Configurer le webhook Discord
cp .env.example .env.local
# puis colle ton URL dans .env.local :
# VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXX/YYYY

# 3. Lancer en local
npm run dev
# → http://localhost:5173/?name=Camille
```

**Récupérer un webhook Discord** : ton salon → _Modifier le salon → Intégrations → Webhooks → Nouveau webhook → Copier l'URL_.

> ⚠️ L'URL du webhook est **inlinée dans le bundle** (site 100 % front). C'est assumé : un webhook Discord ne permet que d'**écrire** dans ton salon, jamais de lire. Risque minime pour un usage perso. `.env.local` est git-ignoré, donc ton URL ne part jamais sur GitHub.

---

## ☁️ Déploiement (Vercel)

```bash
npm i -g vercel   # si besoin
vercel            # lie le projet (framework auto-détecté : Vite)
```
Puis dans le dashboard Vercel → _Settings → Environment Variables_, ajoute `VITE_DISCORD_WEBHOOK_URL` (Production + Preview), et :
```bash
vercel --prod
```
Teste l'URL finale **sur un vrai téléphone** (les gags tactiles, c'est là que ça brille), puis envoie `https://<projet>.vercel.app/?name=Prénom` à tes matchs. 💌

---

## 🛠️ Stack & scripts

**React 18 + Vite 5 + TypeScript + Tailwind CSS 3**, confettis via `canvas-confetti`, tests avec **Vitest** + Testing Library. Pas de backend, pas de router, pas de base de données — une seule page pilotée par une mini machine d'états (`asking` → `accepted`).

```bash
npm run dev      # serveur de dev
npm run build    # type-check + build de prod (dist/)
npm run preview  # prévisualise le build
npm test         # lance toute la suite de tests
```

---

## 🗂️ Sous le capot

```
src/
├─ app.tsx                  # machine d'états + orchestration
├─ lib/
│  ├─ sanitize.ts           # nettoie le texte avant Discord (anti-@everyone)
│  ├─ person-name.ts        # logique prénom : URL ↔ localStorage ↔ fallback
│  ├─ visit-tracking.ts     # décision visite/retour + rate-limit 30 min
│  ├─ mode.ts               # tirage du comportement / lecture de ?mode=
│  ├─ discord.ts            # les 5 webhooks (fire-and-forget)
│  └─ confetti.ts           # 🎉 rose
├─ hooks/                   # branchent la logique pure au navigateur
├─ components/
│  ├─ question-card.tsx     # la card « veux-tu venir en date ? »
│  ├─ thank-you-card.tsx    # la card de remerciement + petit mot
│  └─ buttons.tsx           # Oui / Non partagés
└─ behaviors/               # 1 fichier = 1 comportement absurde
   ├─ index.ts              # le registre (mode → composant)
   ├─ grow-shrink.tsx · flee.tsx · repel.tsx
   └─ gravity.tsx · guilt.tsx · sad.tsx
```

Le **registre de comportements** rend le pool extensible : ajouter un nouveau gag = un fichier dans `behaviors/` + une ligne dans `ids.ts` et `index.ts`. La logique « dure » (prénom, rate-limit, maths des effets) est isolée dans des modules purs et testés.

---

## ⚖️ Disclaimer

À utiliser avec humour et bienveillance. Le but, c'est de faire sourire — pas de forcer qui que ce soit. Si quelqu'un veut vraiment dire non… bon, le bouton ne l'aidera pas, mais un petit message honnête fera toujours mieux le job. 😄

Fait avec beaucoup de rose et un peu de mauvaise foi. 💕

---

## ❤️ Le vrai « non », lui, ne se discute pas

Ce projet est une blague sur un bouton. Dans la vraie vie, **le consentement n'est jamais un jeu**. Un « non » est un « non » — complet, définitif, sans bouton qui rétrécit, sans négociation, sans insistance. L'absence de « oui » clair et enthousiaste est aussi un « non ».

Nous condamnons **sans aucune réserve toute forme d'agression et de violence sexuelles**. Rien ne les excuse, jamais.

Et à toute personne qui en a été victime : **ce n'est pas ta faute, tu es cru·e, et tu mérites tout le soutien du monde.** 💙

> 🆘 **Besoin d'aide ou d'écoute (France)** : **3919** (Violences Femmes Info, anonyme et gratuit) · **17** en cas d'urgence · **CRIAVS** et associations locales pour un accompagnement. Tu n'es pas seul·e.
