# Mathématiques des modèles Casabus

Ce document décrit le socle mathématique des deux modèles d’IA utilisés dans la
démo Casabus · Réseau Al Baida :

1. **Modèle de prévision de la demande** — gradient boosting (Python → JSON).
2. **Modèle de décision de dispatch** — réseau de neurones (MLP) qui choisit l’unité
   optimale pour un arrêt donné.

Les deux modèles sont entraînés hors ligne en Python et évalués dans le
navigateur à partir de leurs poids exportés.

---

## 1. Notation commune

| Symbole | Signification |
|---|---|
| \(s \in \mathcal{S}\) | arrêt (10 arrêts casablancais) |
| \(t\) | temps de simulation (minutes) |
| \(h = t/60\) | heure de la journée |
| \(\phi(h)\) | facteur horaire (double pic matin/soir) |
| \(q_s(t)\) | nombre de voyageurs en file à l’arrêt \(s\) |
| \(\bar w_s(t)\) | attente moyenne à l’arrêt \(s\) |
| \(w^{\max}_s(t)\) | attente maximale à l’arrêt \(s\) |
| \(\lambda_{s,\text{sc}}\) | multiplicateur de scénario pour \(s\) |
| \(r_s\) | taux de base de l’arrêt \(s\) (voyageurs / 15 min) |
| \(u \in \mathcal{U}\) | unité de bus active |
| \(p_u \in [0,1]\) | progression de \(u\) sur son tronçon courant |
| \(o_u\) | voyageurs à bord de \(u\) |
| \(C\) | capacité d’une unité (8) |
| \(\operatorname{dist}(u,s)\) | distance en nombre d’arrêts (BFS) entre \(u\) et \(s\) |

Facteur horaire (repris du simulateur) :

\[
\phi(h)=0{,}42+0{,}72\,e^{-\frac12\left(\frac{h-8{,}1}{1{,}25}\right)^2}
+0{,}9\,e^{-\frac12\left(\frac{h-17{,}35}{1{,}7}\right)^2}
+0{,}18\,e^{-\frac12\left(\frac{h-12{,}7}{2{,}4}\right)^2}.
\]

---

## 2. Modèle 1 — prévision de la demande (gradient boosting)

### 2.1 Objectif

Prédire le nombre de voyageurs qui arriveront à un arrêt \(s\) dans les 30
prochaines minutes :

\[
\hat y_s(t) = f(\mathbf{x}_{s,t}) \approx \mathbb{E}[Y_{s,t+30}\mid \mathbf{x}_{s,t}].
\]

### 2.2 Vecteur de features \(\mathbf{x}_{s,t}\in\mathbb{R}^{12}\)

\[
\mathbf{x}=
\begin{bmatrix}
r_s,\;
\phi(t+15),\;
m_{\text{sc}},\;
\lambda_{s,\text{sc}},\;
q_s,\;
\bar w_s,\;
w^{\max}_s,\;
\sin(2\pi h/24),\;
\cos(2\pi h/24),\;
\mathbf{1}_{\text{pic}},\;
r_s\,\phi(t+15)\,m_{\text{sc}}\,\lambda_{s,\text{sc}}\cdot 15,\;
\mathbf{1}_{\text{hub}}
\end{bmatrix}^{\!\top}.
\]

### 2.3 Cible et transformation

La cible \(y\) est un comptage (Poisson). On entraîne sur \(z=\log(1+y)\) pour
stabiliser la variance :

\[
z = \log(1+y),\qquad \hat y = \exp(\hat z)-1.
\]

### 2.4 Fonction de coût (MSE sur \(z\))

\[
\mathcal{L}(f)=\frac1N\sum_{i=1}^N \bigl(f(\mathbf{x}_i)-z_i\bigr)^2.
\]

### 2.5 Gradient boosting — équations

Initialisation par la moyenne :

\[
F_0(\mathbf{x}) = \frac1N\sum_i z_i.
\]

Pour \(m=1,\dots,M\) :

1. Pseudo-résidus (gradient négatif) :
\[
r_{im} = -\left.\frac{\partial \mathcal{L}}{\partial F}\right|_{F=F_{m-1}(\mathbf{x}_i)}
= z_i - F_{m-1}(\mathbf{x}_i).
\]

2. Ajuster un arbre de régression \(h_m(\mathbf{x})\) aux résidus \(r_{im}\).

3. Mise à jour avec taux d’apprentissage \(\eta\in(0,1)\) :
\[
F_m(\mathbf{x}) = F_{m-1}(\mathbf{x}) + \eta\,h_m(\mathbf{x}).
\]

Prédiction finale :

\[
\hat y(\mathbf{x}) = \exp\!\left(F_M(\mathbf{x})\right)-1.
\]

Paramètres retenus : \(M=90\), profondeur 3, \(\eta=0{,}08\), sous-échantillonnage
\(0{,}9\). Résultat : MAE ≈ 4,56 pax/30 min, \(R^2\approx 0{,}98\).

### 2.6 Inférence dans le navigateur

Chaque arbre est exporté avec ses nœuds (`feature`, `threshold`, `left`,
`right`, `value`). L’évaluation est une descente récursive :

\[
\text{tree}(\mathbf{x}) = \begin{cases}
\text{value}_n & \text{si } n \text{ est une feuille},\\
\text{tree}_{\text{gauche}}(\mathbf{x}) & \text{si } x_{\text{feature}_n}\le \text{threshold}_n,\\
\text{tree}_{\text{droite}}(\mathbf{x}) & \text{sinon}.
\end{cases}
\]

Puis \(\hat z = F_0 + \eta\sum_{m=1}^M \text{tree}_m(\mathbf{x})\).

---

## 3. Modèle 2 — décision de dispatch (réseau de neurones)

### 3.1 Problème d’optimisation

On cherche, pour un arrêt chaud \(s^*\), l’unité \(u^*\) qui minimise le coût de
desserte :

\[
u^* = \arg\min_{u\in\mathcal{U}_{\text{actif}}} \Bigl[
\operatorname{dist}(u,s^*) + (1-p_u) - 0{,}9\,\mathbf{1}_{\{target_u=s^*\}}
\Bigr].
\]

Sous contraintes :

\[
\sum_u \mathbf{1}_{\{target_u=s\}} \le K_s,\qquad
o_u \le C,\qquad
u \text{ actif}.
\]

### 3.2 Imitation learning (réseau de neurones)

Au lieu de résoudre l’optimisation à chaque pas (coûteux), on entraîne un MLP
qui **prédit le coût** \(c(u,s)\) à partir de features \(\mathbf{z}_{u,s}\).
L’unité choisie est celle de coût minimal prédit :

\[
\hat c(u,s)=g(\mathbf{z}_{u,s};\theta),\qquad
u^*=\arg\min_u \hat c(u,s).
\]

### 3.3 Vecteur de features \(\mathbf{z}\in\mathbb{R}^{13}\)

\[
\mathbf{z}=
\begin{bmatrix}
p_u,\; o_u,\; C,\; \operatorname{dist}(u,s),\; \eta_{u,s},\;
q_s,\; \bar w_s,\; w^{\max}_s,\;
\hat y_s,\; a_s,\; m_{\text{sc}},\; \phi(h),\;
\mathbf{1}_{\text{hub}}
\end{bmatrix}^{\!\top},
\]
où \(\eta_{u,s}=(\operatorname{dist}+(1-p_u))\cdot 2{,}15\) et \(a_s\) le nombre
d’unités déjà affectées à \(s\).

### 3.4 Standardisation

\[
\tilde z_j = \frac{z_j-\mu_j}{\sigma_j}.
\]

### 3.5 Propagation avant (MLP)

Couches : \(13 \to 32 \to 16 \to 1\), activation ReLU, sortie linéaire.

\[
\mathbf{h}^{(1)} = \operatorname{ReLU}\!\left(W^{(1)}\tilde{\mathbf{z}}+\mathbf{b}^{(1)}\right),\quad
\mathbf{h}^{(2)} = \operatorname{ReLU}\!\left(W^{(2)}\mathbf{h}^{(1)}+\mathbf{b}^{(2)}\right),
\]

\[
\hat c = W^{(3)}\mathbf{h}^{(2)}+b^{(3)}.
\]

avec \(\operatorname{ReLU}(x)=\max(0,x)\).

### 3.6 Fonction de coût et apprentissage

MSE sur le coût heuristique \(c^*\) :

\[
\mathcal{L}_{\text{MLP}}=\frac1N\sum_i \bigl(\hat c_i - c^*_i\bigr)^2.
\]

Optimisation par Adam (rétropropagation). Résultat : MAE ≈ 0,23, \(R^2\approx 0{,}91\).

### 3.7 Décision finale

\[
u^* = \arg\min_{u} \hat c(u,s^*).
\]

---

## 4. Chemin de recherche mathématique

### Étape 0 — Heuristique (état actuel)
- Score linéaire, greedy, interprétable.
- Limite : pas d’anticipation multi-horizon, pas de coordination entre unités.

### Étape 1 — Modèles prédictifs supervisés (actuel)
- Gradient boosting pour la demande.
- MLP pour le coût de dispatch (imitation).
- Gain : meilleure généralisation, features non linéaires.

### Étape 2 — Réseaux de neurones profonds
- Remplacer le MLP par un réseau plus profond avec attention sur les arrêts.
- Ajouter des embeddings pour les lignes et les arrêts.
- Fonction de coût multi-tâche : demande + attente + émissions.

### Étape 3 — Graph Neural Networks (GNN)
- Le réseau de bus est un graphe \((\mathcal{S},\mathcal{E})\).
- Propagation de messages entre arrêts voisins pour capturer la congestion
  spatiale :
\[
\mathbf{h}_s^{(k+1)} = \sigma\!\left(W^{(k)}\sum_{s'\in\mathcal{N}(s)}\mathbf{h}_{s'}^{(k)} + B^{(k)}\mathbf{h}_s^{(k)}\right).
\]

### Étape 4 — Apprentissage par renforcement
- État : files, positions, scénario.
- Action : affecter une unité à un arrêt.
- Récompense : \(-(\alpha \bar w + \beta \cdot \text{distance} + \gamma \cdot \text{CO}_2)\).
- Algorithme : PPO / SAC avec fonction de valeur \(V(s)\) et avantage \(A_t\).

### Étape 5 — Optimisation multi-objectif
- Minimiser simultanément attente, distance parcourue, émissions.
- Front de Pareto, scalarisation pondérée :
\[
\min_u \; \lambda_1 \bar w + \lambda_2 d + \lambda_3 e.
\]

### Étape 6 — Neurones et recherche
- Architecture neuronale dédiée au graphe de transport (Transformers sur graphes).
- Apprentissage auto-supervisé sur les trajectoires simulées.
- Distillation : un gros modèle enseigne un petit modèle embarqué.

---

## 5. Adaptation au système de bus marocain

Au Maroc, le réseau Casabus est organisé en **lignes numérotées** (1, 2, 5, 7,
10, 15, 40, 60, 70, 90). La démo reflète cette structure :

- `LINES` dans `src/data/network.js` associe chaque ligne à une séquence d’arrêts.
- Chaque arrêt expose les lignes qui le desservent (`stop.lines`).
- Chaque bus porte un champ `line` et affiche son numéro sur la carte.
- Les fiches arrêt listent les lignes desservies.

Cette organisation par lignes est la base pour de futures extensions :
attribution stricte d’une unité à une ligne, transferts entre lignes, et
optimisation au niveau ligne plutôt qu’au niveau unité.

---

## 6. Fichiers concernés

- `src/lib/demandModel.js` — inférence du modèle de demande.
- `src/lib/decisionModel.js` — inférence du réseau de neurones de dispatch.
- `src/lib/forecast.js` — orchestration de la prévision.
- `src/simulation/engine.js` — optimiseur utilisant le réseau neuronal.
- `ml/train.py`, `ml/train_decision.py` — entraînement.
- `ml/generate_data.py`, `ml/generate_decision_data.py` — données.
- `src/data/demand-model.json`, `src/data/decision-model.json` — poids exportés.
