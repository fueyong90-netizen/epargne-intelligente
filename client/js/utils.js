// ════════════════════════════════════════════════════════════
// js/utils.js — Fonctions utilitaires partagées
// Chargé EN PREMIER dans index.html (aucune dépendance)
// ════════════════════════════════════════════════════════════
 
const Utils = {
 
  // ── FORMATAGE MONÉTAIRE ─────────────────────────────────
  // Intl.NumberFormat : API native du navigateur pour formater
  // selon la locale (fr-FR = virgule + espace comme séparateur)
  // Entrée : 1234.5  →  Sortie affichée : '1 234,50 €'
  formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',   // affiche le symbole €
      currency: 'EUR',     // devise Euro
      minimumFractionDigits: 2  // toujours 2 décimales
    }).format(amount);
  },
 
  // ── FORMATAGE DE DATE ────────────────────────────────────
  // Entrée : '2026-03-15' (format ISO stocké en base)
  // Sortie : '15 mars 2026' (format lisible en français)
  // new Date() parse la chaîne ISO, toLocaleDateString la formate
  formatDate(isoDate) {
    return new Date(isoDate).toLocaleDateString('fr-FR', {
      day: 'numeric',    // 15
      month: 'long',     // mars (nom complet)
      year: 'numeric'    // 2026
    });
  },
 
  // ── FORMATAGE DATE COURTE ────────────────────────────────
  // Entrée : '2026-03-15'  →  Sortie : '15/03/2026'
  // Utilisé dans les tableaux où la place est limitée
  formatDateShort(isoDate) {
    return new Date(isoDate).toLocaleDateString('fr-FR');
  },
 
  // ── OBTENIR LE MOIS EN COURS ────────────────────────────
  // new Date() : date/heure actuelle
  // toISOString() : '2026-03-16T14:30:00.000Z'
  // slice(0, 7) : garde seulement '2026-03'
  // Utilisé pour filtrer les transactions du mois courant
  getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
  },
 
  // ── LISTE DES 6 DERNIERS MOIS ───────────────────────────
  // Retourne ['2026-03', '2026-02', '2026-01', '2025-12', '2025-11', '2025-10']
  // Utilisé par charts.js pour l'axe X du graphique linéaire
  getLast6Months() {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      // setMonth(n) modifie en place — on clone d'abord
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // padStart(2,'0') : '3' → '03' (format ISO sur 2 chiffres)
      months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    return months; // du plus récent au plus ancien
  },
 
  // ── GROUPER PAR CATÉGORIE ───────────────────────────────
  // Entrée : tableau de transactions
  // Sortie : { Alimentation: 320, Transport: 150, ... }
  // Utilisé par charts.js (donut) et ai.js (payload IA)
  groupByCategory(transactions) {
    return transactions
      .filter(t => t.type === 'depense') // on ignore les revenus
      .reduce((acc, t) => {
        // acc[cat] existe déjà ? on additionne. Sinon on part de 0
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {}); // {} = accumulateur de départ vide
  },
 
  // ── BILAN MENSUEL ────────────────────────────────────────
  // Calcule revenus - dépenses pour un mois donné
  // month : '2026-03'  →  filtre les dates qui commencent par ce préfixe
  // Retourne un nombre positif (épargne) ou négatif (déficit)
  calculateMonthlyBalance(transactions, month) {
    return transactions
      .filter(t => t.date.startsWith(month))
      .reduce((sum, t) => {
        return t.type === 'revenu' ? sum + t.amount : sum - t.amount;
      }, 0); // part de zéro
  },
 
  // ── TOTAL DÉPENSES D'UN MOIS ────────────────────────────
  // Similaire à calculateMonthlyBalance mais ne compte que les dépenses
  // Utilisé pour afficher le KPI 'Dépenses du mois'
  getMonthlyExpenses(transactions, month) {
    return transactions
      .filter(t => t.date.startsWith(month) && t.type === 'depense')
      .reduce((sum, t) => sum + t.amount, 0);
  },
 
  // ── TOTAL REVENUS D'UN MOIS ─────────────────────────────
  getMonthlyIncome(transactions, month) {
    return transactions
      .filter(t => t.date.startsWith(month) && t.type === 'revenu')
      .reduce((sum, t) => sum + t.amount, 0);
  },
 
  // ── GÉNÉRATION D'ID UNIQUE ──────────────────────────────
  // Date.now().toString(36) : timestamp en base 36 (lettres+chiffres)
  // Math.random().toString(36).substr(2) : partie aléatoire
  // Combinés → ID quasi-unique sans librairie externe
  // Exemple de sortie : 'lf2k8a4x9m'
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
 
  // ── CLAMP (limiter une valeur entre min et max) ──────────
  // Utilisé pour les barres de progression (0% à 100% max)
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },
 
  // ── ESTIMATION TEMPS RESTANT POUR UN OBJECTIF ───────────
  // Calcule combien de mois il faut pour atteindre targetAmount
  // en se basant sur le taux d'épargne mensuel moyen actuel
  estimateMonthsRemaining(currentAmount, targetAmount, monthlyRate) {
    if (monthlyRate <= 0) return null; // pas d'épargne → impossible à calculer
    const remaining = targetAmount - currentAmount;
    return Math.ceil(remaining / monthlyRate); // arrondi à l'entier supérieur
  },
 
  // ── DEBOUNCE ────────────────────────────────────────────
  // Évite d'appeler une fonction trop souvent (ex: saisie en temps réel)
  // fn : la fonction à ralentir
  // delay : temps d'attente en ms avant l'exécution réelle
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);          // annule l'appel précédent
      timer = setTimeout(() => fn(...args), delay); // repart à zéro
    };
  },
 
  // ── SANITIZE HTML ────────────────────────────────────────
  // Protège contre les injections XSS dans le DOM
  // Remplace les caractères dangereux par leurs entités HTML
  sanitize(str) {
    const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
  }
};
 
// Rend Utils disponible globalement (chargé via <script> dans index.html)
// Les autres modules peuvent écrire Utils.formatCurrency() directement
window.Utils = Utils;