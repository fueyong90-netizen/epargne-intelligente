// ════════════════════════════════════════════════════════════
// js/app.js — Point d'entrée principal de l'application SPA
// Chargé EN DERNIER dans index.html (tous les modules déjà disponibles)
// ════════════════════════════════════════════════════════════
 
// ── DÉMARRAGE ────────────────────────────────────────────
// DOMContentLoaded se déclenche quand le HTML est parsé
// (avant que les images/CSS soient complètement chargés)
// C'est le bon moment pour initialiser l'app
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
 
const App = {
 
  // ── ÉTAT GLOBAL PARTAGÉ ──────────────────────────────────
  // Tous les modules lisent/écrivent dans App.state
  // C'est la 'source de vérité' de l'application
  state: {
    transactions: [], // tableau de toutes les transactions
    goals: [],        // tableau de tous les objectifs d'épargne
    settings: {       // préférences utilisateur
      currency: 'EUR',
      theme: 'light',
      language: 'fr'
    },
    user: null,       // null en Phase 1, objet user en Phase 3 (auth)
    currentPage: 'dashboard',
  },
 
  // ── INITIALISATION ───────────────────────────────────────
  // Appelée une seule fois au chargement de la page
  init() {
    // Charger les données persistées depuis localStorage
    this.state.transactions = Storage.getAll('transactions');
    this.state.goals = Storage.getAll('goals');
    this.state.settings = Storage.get('settings', this.state.settings);
 
    // Appliquer le thème sauvegardé (light/dark)
    this.applyTheme(this.state.settings.theme);
 
    // Écouter les changements de route (clic sidebar ou navigation navigateur)
    // hashchange se déclenche quand l'URL passe de #dashboard à #transactions
    window.addEventListener('hashchange', () => this.router());
 
    // Lancer le routeur pour afficher la page initiale
    // Si pas de hash dans l'URL, on part sur le dashboard
    this.router();
  },
 
  // ── ROUTEUR SPA ──────────────────────────────────────────
  // Lit le hash de l'URL et affiche la bonne page
  // Ne recharge JAMAIS la page (Single Page Application)
  router() {
    // window.location.hash = '#dashboard' → slice(1) → 'dashboard'
    // Si pas de hash → on affiche le dashboard par défaut
    const page = window.location.hash.slice(1) || 'dashboard';
    this.state.currentPage = page;
 
    // Mettre à jour l'état 'actif' dans la sidebar
    // querySelectorAll retourne tous les liens <a> de la sidebar
    document.querySelectorAll('#sidebar a').forEach(link => {
      // classList.toggle(class, condition) : ajoute si true, retire si false
      link.classList.toggle('active', link.getAttribute('href') === '#' + page);
    });
 
    // Cibler la zone de contenu principal
    const content = document.getElementById('app-content');
 
    // Afficher la page correspondante
    // Chaque module expose une méthode render() qui retourne du HTML
    switch (page) {
      case 'dashboard':    content.innerHTML = Dashboard.render(this.state); break;
      case 'transactions': content.innerHTML = Transactions.render(this.state); break;
      case 'goals':        content.innerHTML = Goals.render(this.state); break;
      case 'ai':           content.innerHTML = AIModule.render(this.state); break;
      case 'settings':     content.innerHTML = Settings.render(this.state); break;
      default:             content.innerHTML = Dashboard.render(this.state);
    }
 
    // Après avoir injecté le HTML, initialiser les comportements interactifs
    // (event listeners, graphiques Chart.js, etc.)
    // On doit le faire APRÈS le rendu car les éléments DOM doivent exister
    this.initPageBehaviors(page);
  },
 
  // ── INITIALISATION COMPORTEMENTS PAR PAGE ────────────────
  initPageBehaviors(page) {
    switch (page) {
      case 'dashboard':
        Charts.initAll(this.state); // dessine les graphiques Chart.js
        break;
      case 'transactions':
        Transactions.bindEvents(this); // branche les event listeners du formulaire
        break;
      case 'goals':
        Goals.bindEvents(this);
        break;
      case 'ai':
        AIModule.bindEvents(this);
        break;
      case 'settings':
        Settings.bindEvents(this);
        break;
    }
  },
 
  // ── RECHARGEMENT D'UNE PAGE (après modification des données) ─
  // Appelé par transactions.js, goals.js après chaque CRUD
  // Resynchonise l'état puis re-render la page courante
  refresh() {
    this.state.transactions = Storage.getAll('transactions');
    this.state.goals = Storage.getAll('goals');
    this.router(); // re-affiche la page avec les nouvelles données
  },
 
  // ── APPLICATION DU THÈME ─────────────────────────────────
  // Ajoute/retire la classe 'dark' sur <body>
  // Le CSS gère les couleurs selon cette classe
  applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
  },
 
  // ── MISE À JOUR DES SETTINGS ─────────────────────────────
  updateSettings(changes) {
    this.state.settings = { ...this.state.settings, ...changes };
    Storage.set('settings', this.state.settings);
    if (changes.theme) this.applyTheme(changes.theme);
  }
};
 
window.App = App;
