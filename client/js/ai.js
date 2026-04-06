// ════════════════════════════════════════════════════════════
// js/ai.js — Interface IA côté navigateur
// ════════════════════════════════════════════════════════════
 
const AIModule = {
 
  // Cache de la dernière analyse pour éviter des appels redondants
  // null = pas d'analyse en cache, objet = analyse disponible
  cache: null,
 
  // ── RENDU DE LA PAGE IA ──────────────────────────────────
  render(state) {
    return `
      <div class='page ai-page'>
        <header class='page-header'>
          <h1>🤖 Analyse IA</h1>
          <p>Basée sur ${state.transactions.length} transactions</p>
        </header>
 
        <div class='ai-controls card'>
          <p>Choisissez votre type d'analyse :</p>
          <div class='ai-types'>
            <button class='btn btn-primary' data-type='monthly'> 📊 Analyse mensuelle</button>
            <button class='btn btn-outline' data-type='tips'>    💡 Conseils personnalisés</button>
            <button class='btn btn-outline' data-type='forecast'>📈 Prévision de budget</button>
            <button class='btn btn-outline' data-type='plan'>    🎯 Plan d'épargne</button>
          </div>
        </div>
 
        <!-- Zone d'affichage des résultats -->
        <div id='ai-results'>
          ${this.cache
            ? this.renderResults(this.cache)
            : '<p class="ai-prompt">Sélectionnez une analyse ci-dessus.</p>'}
        </div>
      </div>
    `;
  },
 
  bindEvents(app) {
    // Délégation d'événements : un seul listener sur le conteneur
    // plutôt qu'un listener par bouton — plus performant
    document.querySelector('.ai-types')
      .addEventListener('click', e => {
        const btn = e.target.closest('[data-type]');
        if (!btn) return; // clic en dehors d'un bouton → ignorer
        const type = btn.dataset.type;
        this.analyze(type, app.state);
      });
  },
 
  // ── PRÉPARATION DU PAYLOAD ───────────────────────────────
  // Ne jamais envoyer les transactions brutes !
  // On envoie uniquement des totaux agrégés et anonymisés
  preparePayload(type, state) {
    const { transactions, goals } = state;
    const month = Utils.getCurrentMonth();
 
    return {
      analysisType: type, // 'monthly' | 'tips' | 'forecast' | 'plan'
 
      // Agrégats du mois courant — pas de descriptions individuelles
      currentMonth: {
        month,
        totalIncome:   Utils.getMonthlyIncome(transactions, month),
        totalExpenses: Utils.getMonthlyExpenses(transactions, month),
        balance:       Utils.calculateMonthlyBalance(transactions, month),
        byCategory:    Utils.groupByCategory(transactions.filter(t => t.date.startsWith(month))),
      },
 
      // Tendances sur 3 mois (pour comparaison et détection de tendances)
      trends: Utils.getLast6Months().slice(0, 3).map(m => ({
        month: m,
        income:   Utils.getMonthlyIncome(transactions, m),
        expenses: Utils.getMonthlyExpenses(transactions, m),
        balance:  Utils.calculateMonthlyBalance(transactions, m),
      })),
 
      // Objectifs : nom + pourcentage (pas d'historique d'alimentation)
      goals: goals.map(g => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        percentage: Math.round(g.currentAmount / g.targetAmount * 100)
      })),
    };
  },
 
  // ── APPEL AU BACKEND ─────────────────────────────────────
  async analyze(type, state) {
    const resultsEl = document.getElementById('ai-results');
    resultsEl.innerHTML = `
      <div class='loading-card card'>
        <div class='spinner'></div>
        <p>Claude analyse vos finances…</p>
      </div>`;
 
    try {
      const payload = this.preparePayload(type, state);
 
      // fetch : API native pour les requêtes HTTP (remplace XMLHttpRequest)
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // indique que le corps est JSON
        body: JSON.stringify(payload) // objet JS → chaîne JSON
      });
 
      // response.ok : true si status HTTP 200-299
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
 
      // response.json() : lit le corps et parse le JSON
      const data = await response.json();
 
      this.cache = data; // mettre en cache pour éviter un re-appel
      resultsEl.innerHTML = this.renderResults(data);
 
    } catch (err) {
      console.error('Erreur IA:', err);
      resultsEl.innerHTML = `
        <div class='error-card card'>
          <p>⚠️ Impossible de contacter le serveur.</p>
          <p>Vérifiez que le backend est démarré sur le port 3000.</p>
        </div>`;
    }
  },
 
  // ── RENDU DES CARTES DE CONSEILS ────────────────────────
  renderResults(data) {
    const typeIcons = { economie:'💡', alerte:'⚠️', objectif:'🎯', tendance:'📈', general:'💬' };
    const typeColors = { economie:'green', alerte:'orange', objectif:'blue', tendance:'purple', general:'gray' };
 
    let html = '';
    if (data.resumeMensuel) {
      html += `<div class='ai-summary card'><p>${Utils.sanitize(data.resumeMensuel)}</p></div>`;
    }
 
    if (data.conseils && data.conseils.length > 0) {
      html += data.conseils.map(c => `
        <div class='conseil-card card color-${typeColors[c.type] || 'gray'}'>
          <span class='conseil-icon'>${typeIcons[c.type] || '💬'}</span>
          <div class='conseil-body'>
            <h3>${Utils.sanitize(c.titre)}</h3>
            <p>${Utils.sanitize(c.message)}</p>
          </div>
        </div>
      `).join('');
    }
 
    return html || '<p>Aucun conseil disponible.</p>';
  },
 
  // Appelé par transactions.js et goals.js après chaque modification
  clearCache() { this.cache = null; }
};
 
window.AIModule = AIModule;