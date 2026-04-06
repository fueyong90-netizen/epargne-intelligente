// ════════════════════════════════════════════════════════════
// js/storage.js — Couche d'abstraction du stockage de données
// Phase 1 : localStorage (tout dans le navigateur, sans serveur)
// Phase 2 : remplacer les méthodes par des appels fetch() vers le backend
// ════════════════════════════════════════════════════════════
 
const Storage = {
 
  // ── BASE URL DU BACKEND ─────────────────────────────────
  // En Phase 2, toutes les requêtes partent vers cette adresse
  // En prod, remplacer par l'URL Railway : 'https://mon-app.railway.app'
  API_URL: '/api',
 
  // ── MODE COURANT ─────────────────────────────────────────
  // 'local' = Phase 1 (localStorage)
  // 'api'   = Phase 2 (requêtes HTTP vers le backend)
  mode: 'local',
 
  // ── RÉCUPÉRER TOUTES LES ENTRÉES D'UN TYPE ──────────────
  // type : 'transactions' | 'goals' | 'settings'
  // Retourne toujours un tableau, jamais null
  getAll(type) {
    if (this.mode === 'local') {
      // localStorage.getItem : retourne null si la clé n'existe pas
      const raw = localStorage.getItem(type);
      // JSON.parse transforme la chaîne stockée en tableau JS
      // raw || '[]' : si null, on parse un tableau vide
      return raw ? JSON.parse(raw) : [];
    }
    // Phase 2 — décommentez et supprimez le bloc 'local' ci-dessus :
    // const token = localStorage.getItem('jwt_token');
    // const res = await fetch(`${this.API_URL}/${type}`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // return await res.json();
  },
 
  // ── RÉCUPÉRER UNE ENTRÉE PAR SON ID ─────────────────────
  // Cherche dans le tableau retourné par getAll()
  // Retourne l'objet trouvé ou undefined
  getById(type, id) {
    return this.getAll(type).find(item => item.id === id);
  },
 
  // ── AJOUTER UNE ENTRÉE ───────────────────────────────────
  // data : objet JS sans ID (l'ID est généré ici)
  // Retourne l'objet complet avec son ID assigné
  add(type, data) {
    const items = this.getAll(type);
    // Enrichissement de l'objet avant stockage
    const newItem = {
      ...data,                              // copie toutes les propriétés de data
      id: Utils.generateId(),               // ID unique généré par utils.js
      createdAt: new Date().toISOString(),  // date ISO : '2026-03-15T14:30:00.000Z'
    };
    items.push(newItem); // ajout en fin de tableau
    // JSON.stringify : convertit le tableau JS en chaîne pour localStorage
    localStorage.setItem(type, JSON.stringify(items));
    return newItem; // retourné pour que l'appelant ait l'ID
  },
 
  // ── METTRE À JOUR UNE ENTRÉE ─────────────────────────────
  // id : identifiant de l'entrée à modifier
  // changes : objet avec seulement les propriétés à changer
  // Ex: Storage.update('transactions', 'abc123', { amount: 50 })
  update(type, id, changes) {
    const items = this.getAll(type).map(item => {
      if (item.id !== id) return item; // pas le bon → on le laisse intact
      return {
        ...item,                          // garde toutes les propriétés existantes
        ...changes,                       // écrase celles modifiées
        updatedAt: new Date().toISOString() // horodatage de la modif
      };
    });
    localStorage.setItem(type, JSON.stringify(items));
  },
 
  // ── SUPPRIMER UNE ENTRÉE ─────────────────────────────────
  // filter() crée un nouveau tableau sans l'élément à supprimer
  // item.id !== id : garde tout SAUF l'élément ciblé
  remove(type, id) {
    const items = this.getAll(type).filter(item => item.id !== id);
    localStorage.setItem(type, JSON.stringify(items));
  },
 
  // ── STOCKER UNE VALEUR SIMPLE (paramètres) ──────────────
  // Pour les settings (devise, thème, etc.) qui ne sont pas des tableaux
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
 
  // ── LIRE UNE VALEUR SIMPLE ───────────────────────────────
  // defaultValue : retourné si la clé n'existe pas encore
  get(key, defaultValue = null) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  },
 
  // ── TOUT EFFACER (reset complet) ──────────────────────────
  // Utilisé par la page Paramètres pour réinitialiser l'app
  // Attention : irréversible !
  clearAll() {
    localStorage.clear();
  }
};
 
window.Storage = Storage;