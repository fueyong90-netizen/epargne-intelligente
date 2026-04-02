// ════════════════════════════════════════════════════════════
// js/goals.js — Gestion des objectifs d'épargne
// ════════════════════════════════════════════════════════════
 
const Goals = {
 
  render(state) {
    const goals = state.goals;
    // Calcul du taux d'épargne mensuel moyen (pour estimer délais)
    // On prend les 3 derniers mois et on fait la moyenne
    const avgMonthlySavings = this.calcAverageSavings(state.transactions);
 
    return `
      <div class='page goals-page'>
        <header class='page-header'>
          <h1>🎯 Objectifs d'épargne</h1>
        </header>
 
        <!-- Formulaire de création d'objectif -->
        <form id='form-goal' class='card form-card'>
          <h2>Nouvel objectif</h2>
          <div class='field'>
            <label>Emoji</label>
            <input id='goal-emoji' type='text' value='🎯' maxlength='2'>
          </div>
          <div class='field'>
            <label>Nom de l'objectif</label>
            <input id='goal-name' type='text' placeholder='Ex: Vacances au Japon' required>
          </div>
          <div class='field'>
            <label>Montant cible (€)</label>
            <input id='goal-target' type='number' step='0.01' min='1' required>
          </div>
          <div class='field'>
            <label>Date limite (optionnel)</label>
            <input id='goal-deadline' type='date'>
          </div>
          <button type='submit' class='btn btn-primary'>Créer l'objectif</button>
        </form>
 
        <!-- Liste des objectifs -->
        <div class='goals-grid'>
          ${goals.length === 0
            ? `<p class='empty-state'>Aucun objectif. Créez-en un !</p>`
            : goals.map(g => this.renderGoalCard(g, avgMonthlySavings)).join('')}
        </div>
      </div>
    `;
  },
 
  // ── RENDU D'UNE CARTE OBJECTIF ───────────────────────────
  renderGoalCard(goal, avgSavings) {
    // clamp : la progression ne dépasse jamais 100%
    const pct = Utils.clamp(
      Math.round(goal.currentAmount / goal.targetAmount * 100), 0, 100
    );
    const remaining = goal.targetAmount - goal.currentAmount;
    const months = Utils.estimateMonthsRemaining(
      goal.currentAmount, goal.targetAmount, avgSavings
    );
 
    return `
      <div class='goal-card card ${pct >= 100 ? 'completed' : ''}'>
        <div class='goal-header'>
          <span class='goal-emoji'>${Utils.sanitize(goal.emoji)}</span>
          <div>
            <h3>${Utils.sanitize(goal.name)}</h3>
            ${goal.deadline
              ? `<small>Échéance : ${Utils.formatDate(goal.deadline)}</small>`
              : ''}
          </div>
          <button class='btn-icon' onclick='Goals.delete("${goal.id}")'>🗑️</button>
        </div>
 
        <!-- Barre de progression -->
        <div class='progress-bar'>
          <div class='progress-fill' style='width:${pct}%'></div>
        </div>
        <div class='goal-stats'>
          <span>${Utils.formatCurrency(goal.currentAmount)} / ${Utils.formatCurrency(goal.targetAmount)}</span>
          <span class='pct-badge'>${pct}%</span>
        </div>
 
        ${pct < 100 ? `
          <p class='goal-estimate'>
            Il reste ${Utils.formatCurrency(remaining)}
            ${months ? `· ~${months} mois à ce rythme` : ''}
          </p>
          <!-- Alimenter manuellement l'objectif -->
          <div class='goal-feed'>
            <input type='number' step='0.01' min='0.01' 
                   id='feed-${goal.id}' placeholder='Montant à ajouter'>
            <button onclick='Goals.feed("${goal.id}")' class='btn btn-sm'>
              + Ajouter
            </button>
          </div>
        ` : `<p class='goal-complete'>🎉 Objectif atteint !</p>`}
      </div>
    `;
  },
 
  bindEvents(app) {
    document.getElementById('form-goal')
      .addEventListener('submit', e => {
        e.preventDefault();
        this.create(app);
      });
  },
 
  create(app) {
    const goal = {
      emoji: document.getElementById('goal-emoji').value || '🎯',
      name: document.getElementById('goal-name').value.trim(),
      targetAmount: parseFloat(document.getElementById('goal-target').value),
      currentAmount: 0, // on part de zéro
      deadline: document.getElementById('goal-deadline').value || null,
    };
    if (!goal.name || goal.targetAmount <= 0) return;
    Storage.add('goals', goal);
    app.refresh();
  },
 
  // ── ALIMENTER UN OBJECTIF ────────────────────────────────
  feed(id) {
    const input = document.getElementById(`feed-${id}`);
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) return;
    const goal = Storage.getById('goals', id);
    // Math.min : on ne dépasse pas le montant cible
    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
    Storage.update('goals', id, { currentAmount: newAmount });
    App.refresh();
  },
 
  delete(id) {
    if (!confirm('Supprimer cet objectif ?')) return;
    Storage.remove('goals', id);
    App.refresh();
  },
 
  // ── CALCUL ÉPARGNE MENSUELLE MOYENNE ────────────────────
  // Prend les 3 derniers mois, calcule la moyenne des soldes positifs
  calcAverageSavings(transactions) {
    const months = Utils.getLast6Months().slice(0, 3);
    const balances = months.map(m => Utils.calculateMonthlyBalance(transactions, m));
    const positives = balances.filter(b => b > 0);
    if (positives.length === 0) return 0;
    return positives.reduce((s, b) => s + b, 0) / positives.length;
  }
};
 
window.Goals = Goals;
