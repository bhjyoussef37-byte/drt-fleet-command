# CASABUS · Réseau Al Baida — Centre de commande

Une simulation interactive du réseau de bus de Casablanca, habillée aux couleurs de
**Casabus / Al Baida** : jaune vif, gris anthracite, blanc et noir. Le prototype fait
tourner une simulation entièrement dans le navigateur : les voyageurs arrivent aux
arrêts, les files vieillissent selon l’urgence, les bus circulent sur le maillage et un
optimiseur de dispatch rééquilibre la flotte en continu.

> **Prototype non affilié.** Projet de démonstration indépendant, sans lien avec
> Casabus, Alsa Al Baida, Casa Transport ou les autorités de Casablanca. Les données,
> prévisions et décisions de dispatch sont simulées.

Développé avec **React 19**, **Vite 7**, **Tailwind CSS 4** et **Lucide React**.

## Démo en ligne

**https://bhjyoussef37-byte.github.io/drt-fleet-command/**

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrez l’URL affichée (par défaut `http://localhost:5173`).

```bash
npm run build    # bundle de production dans dist/
npm run preview  # sert le bundle de production
npm run smoke    # vérifications headless de la simulation
```

## Contenu

### Carte du réseau en direct
- 10 arrêts casablancais interconnectés : Casa Port, Anfa, Aïn Diab, Maârif, Habous,
  Casa Voyageurs, Hay Hassani, Oasis, Aïn Sebaâ et Sidi Moumen.
- Les points de demande s’accumulent à chaque arrêt et passent du vert au jaune puis au
  rouge selon le temps d’attente.
- Les bus Casabus se déplacent, se redéploient selon la demande et embarquent ou
  déposent des voyageurs.
- Trait de côte atlantique, blocs urbains et étiquettes de quartiers en français.
- Mise en page portrait dédiée aux téléphones ; les libellés restent lisibles.
- Cliquez sur un arrêt pour ouvrir sa fiche : file d’attente, attente moyenne, ETA,
  lignes desservies, prévision à 15 min et action **Prioriser la desserte**.

### Poste de commande
- Démarrer / Pause, Réinitialiser et **Déploiement manuel** (jusqu’à 8 unités actives).
- Curseur de vitesse de simulation : 1×, 2× ou 5×.
- Scénarios de demande : **Trafic normal**, **Heure de pointe** et
  **Match au Complexe** (afflux au Complexe Mohammed V, autour de Maârif).
  Changer de scénario injecte un pic de demandes et rééquilibre l’optimiseur.

### Prévision de la demande (IA)
- Quatre tranches de 15 minutes sur la prochaine heure, avec cumuls à 15 / 30 / 60 min.
- Indice de confiance, pic prévu et trois points chauds prioritaires.
- Les points chauds guident les redirections de l’optimiseur, visibles dans le journal.

### Moteur d’optimisation
- Les passes de flotte redirigent l’unité la plus proche vers les points chauds prévus.
- Pression des files, attente maximale, hausse prévue, distance en arrêts et couverture
  entrent dans le choix de la cible.
- Chaque déploiement, redirection, changement de scénario et réinitialisation est
  expliqué dans le journal en direct.

### Bandeau d’indicateurs
- Attente moyenne des voyageurs avec tendance et sparkline.
- Flotte active vs réserve au dépôt, taux d’utilisation.
- Total de voyageurs servis dans la journée.

## Structure du projet

```
src/
  App.jsx                 Coque du tableau de bord, mise en page, notifications
  components/
    Header.jsx            Marque Casabus, état direct, horloge de simulation
    MetricsBar.jsx        Cartes d’indicateurs et sparklines
    ControlDeck.jsx       Contrôles de vitesse, scénarios et actions
    TransitMap.jsx        Réseau SVG interactif, bus, fiche arrêt
    ForecastPanel.jsx     Graphique de prévision et points chauds
    OptimizationLog.jsx   Flux des décisions de dispatch
  simulation/engine.js    Reducer, boucle de tick, routage, optimiseur, métriques
  data/network.js         Arrêts, liaisons, scénarios, routage BFS
  lib/forecast.js         Modèle de prévision simulé
  lib/format.js           Formatage français et échelle d’urgence
  hooks/                  Intervalle de simulation et hooks responsive
scripts/smoke.mjs         Assertions Node sur le cœur de simulation
```

## Déploiement

Le build de production est publié sur la branche `gh-pages` :

```bash
npm run deploy
```

Cette commande construit l’application et pousse `dist/` vers GitHub Pages. La base Vite
est relative (`./`), donc le build fonctionne à la racine comme sous un sous-chemin de
projet GitHub Pages.

## Remarques

- Toute la prévision et l’optimisation sont volontairement simulées pour la démo, mais
  l’état est réel et réagit aux files en direct plutôt que de rejouer une vidéo.
- La simulation est déterministe dans ses règles ; le bruit d’arrivée rend chaque
  session différente.
- Identité visuelle inspirée du jaune vif et du gris anthracite de la nouvelle flotte
  de bus de Casablanca. Aucun logo officiel n’est utilisé.
