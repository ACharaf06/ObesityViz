# 🍔 Obesity Insights - Tableau de bord interactif

Tableau de bord interactif de visualisation de données explorant l'obésité chez les adultes aux États-Unis. Ce projet universitaire analyse les données du système de surveillance BRFSS (Behavioral Risk Factor Surveillance System) à travers différentes dimensions : géographique, comportementale, démographique et socio-économique.


## 📊 Visualisations disponibles

### 1. **Carte choroplèthe animée** 
Visualisation géographique du taux d'obésité par État avec évolution temporelle. Permet de repérer immédiatement les régions les plus touchées et d'observer les tendances au fil des années.

**Technologies** : D3.js v7, TopoJSON

### 2. **Profil de santé (Radar)**
Diagramme radar combinant plusieurs indicateurs comportementaux par État : obésité, consommation de fruits et légumes, et activité physique de loisir.

**Technologies** : D3.js v7

### 3. **Analyse démographique**
Comparaison des taux d'obésité selon l'âge (lollipop chart) et le genre (barres divergentes), avec filtres par année et zone géographique.

**Technologies** : D3.js v7

### 4. **Facteurs socio-économiques**
Exploration des disparités d'obésité selon trois dimensions :
- Revenu annuel du ménage
- Niveau d'éducation
- Origine ethnique

**Technologies** : D3.js v7

## 🚀 Installation et utilisation

### Prérequis
Aucune installation de dépendances nécessaire ! Le projet utilise uniquement D3.js via CDN.

### Lancement du projet

#### Option 1 : Extension Live Server (VSCode) - **Recommandé**
1. Installer l'extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) dans VSCode
2. Ouvrir le dossier du projet dans VSCode
3. Clic droit sur `index.html` → **"Open with Live Server"**
4. Le projet s'ouvrira automatiquement dans votre navigateur par défaut

#### Option 2 : Serveur HTTP Python
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Puis ouvrir `http://localhost:8000` dans votre navigateur.

#### Option 3 : Node.js http-server
```bash
# Installation globale
npm install -g http-server

# Lancement
http-server -p 8000
```
Puis ouvrir `http://localhost:8000` dans votre navigateur.

#### Option 4 : N'importe quel serveur web
Vous pouvez utiliser n'importe quel serveur web local (Apache, Nginx, etc.) en pointant vers le dossier du projet.

> ⚠️ **Important** : Ne pas ouvrir directement `index.html` dans le navigateur (double-clic). Les requêtes AJAX vers le fichier CSV ne fonctionneront pas à cause des restrictions CORS. Utilisez toujours un serveur HTTP local.

## 📁 Structure du projet

```
Obesity_viz/
├── index.html              # Page d'accueil
├── README.md               # Ce fichier
│
├── css/
│   ├── style.css          # Styles principaux
│   └── navbar.css         # (vide, réservé pour extension future)
│
├── js/
│   ├── main.js            # Script principal (minimal)
│   ├── map.js             # Carte choroplèthe
│   ├── activity.js        # Diagramme radar
│   ├── demographics.js    # Visualisations démographiques
│   └── socioeconomic.js   # Facteurs socio-économiques
│
├── pages/
│   ├── map.html           # Page carte
│   ├── activity.html      # Page profil de santé
│   ├── demographics.html  # Page démographie
│   ├── socioeconomic.html # Page socio-économique
│   └── about.html         # Documentation du projet
│
└── data/
    ├── us-states.json     # GeoJSON des États américains
    └── Nutrition_Physical_Activity_and_Obesity_BRFSS.csv
                           # Données source (106k+ lignes)
```

## 🔍 À propos des données

**Source** : Behavioral Risk Factor Surveillance System (BRFSS)  
**Période couverte** : 2011-2025  
**Nombre d'enregistrements** : 106,262 lignes  
**Indicateur principal** : "Percent of adults aged 18 years and older who have obesity"

### Champs clés utilisés

- **YearStart** : Année de référence
- **LocationAbbr / LocationDesc** : État ou zone nationale (US)
- **Question / QuestionID** : Type d'indicateur mesuré
- **Data_Value** : Pourcentage d'adultes concernés
- **StratificationCategory1** : Type de stratification (âge, genre, revenu, éducation, race)
- **Stratification1** : Valeur spécifique de la stratification

### Questions exploitées

| QuestionID | Description |
|------------|-------------|
| Q036 | Obésité (IMC ≥ 30) |
| Q018 | Consommation de fruits < 1 fois/jour |
| Q019 | Consommation de légumes < 1 fois/jour |
| Q047 | Aucune activité physique de loisir |

## 🛠️ Technologies utilisées

- **HTML5** : Structure des pages
- **CSS3** : Design responsive et moderne
- **JavaScript ES6+** : Logique applicative
- **D3.js v7** : Visualisations de données interactives
- **TopoJSON** : Géométries cartographiques optimisées

## 🎨 Caractéristiques techniques

✅ **Responsive** : Adapté aux écrans desktop et mobile  
✅ **Interactif** : Tooltips, filtres dynamiques, animations  
✅ **Performant** : Gestion efficace de 106k+ lignes de données  
✅ **Accessible** : Navigation claire et intuitive  
✅ **Documentation intégrée** : Explications pédagogiques sur chaque page  

## 👥 Équipe projet

- El Mehdi Sassi
- Mohamed Glim
- Enzo Laino
- Jeremy Kayser
- Charafeddine Achir

**Contexte** : Projet universitaire de visualisation de données - 2025

## 📝 Justification des choix de visualisation

### Carte choroplèthe
Idéale pour montrer des patterns géographiques et observer l'évolution temporelle de l'obésité à travers les États américains.

### Diagramme radar
Permet de représenter simultanément plusieurs dimensions comportementales et de dresser un profil multivariable de santé par État.

### Lollipop charts
Facilite la comparaison entre catégories (tranches d'âge, niveaux de revenu, origines ethniques) tout en restant visuellement épuré.

### Barres divergentes
Met en évidence les écarts relatifs entre groupes (genre, comparaisons bilatérales) autour d'un axe central.

### Barres horizontales
Adaptées aux labels textuels longs (niveaux d'éducation, tranches de revenu) et permettent une lecture facile des comparaisons.

## 🔗 Navigation

- **Accueil** (`index.html`) : Vue d'ensemble et navigation vers les différentes visualisations
- **Carte** (`pages/map.html`) : Carte choroplèthe animée par année
- **Activité & profil** (`pages/activity.html`) : Radar comportemental
- **Démographie** (`pages/demographics.html`) : Analyse par âge et genre
- **Socio-économique** (`pages/socioeconomic.html`) : Disparités économiques et sociales
- **À propos** (`pages/about.html`) : Documentation complète du projet et des données

## 📄 Licence

Projet universitaire à des fins éducatives uniquement.

---

**© 2025** – Projet universitaire de visualisation de données
