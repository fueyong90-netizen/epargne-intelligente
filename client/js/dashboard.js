// ════════════════════════════════════════════════════════════
// js/dashboard.js — Page d'accueil : KPIs + résumé
// ════════════════════════════════════════════════════════════

const Dashboard = {

  render(state) {
    const month = Utils.getCurrentMonth();
    const income   = Utils.getMonthlyIncome(state.transactions, month);
    const expenses = Utils.getMonthlyExpenses(state.transactions, month);
    const balance  = Utils.calculateMonthlyBalance(state.transactions, month);
    const totalGoals = state.goals.length;
    const completedGoals = state.goals.filter(g =>
      g.currentAmount >= g.targetAmount
    ).length;

    return `
      <div class="page dashboard-page">
        <header class="page-header">
          <h1>🏠 Dashboard</h1>
          <p class="page-subtitle">${this.getGreeting()} — ${this.formatMonthLabel(month)}</p>
        </header>

        <!-- KPI CARDS -->
        <div class="kpi-grid">
          <div class="kpi-card kpi-balance">
            <div class="kpi-icon">💰</div>
            <div class="kpi-info">
              <span class="kpi-label">Bilan du mois</span>
              <span class="kpi-value ${balance >= 0 ? 'positive' : 'negative'}">
                ${Utils.formatCurrency(balance)}
              </span>
            </div>
          </div>

          <div class="kpi-card kpi-income">
            <div class="kpi-icon">📈</div>
            <div class="kpi-info">
              <span class="kpi-label">Revenus</span>
              <span class="kpi-value positive">${Utils.formatCurrency(income)}</span>
            </div>
          </div>

          <div class="kpi-card kpi-expenses">
            <div class="kpi-icon">📉</div>
            <div class="kpi-info">
              <span class="kpi-label">Dépenses</span>
              <span class="kpi-value negative">${Utils.formatCurrency(expenses)}</span>
            </div>
          </div>

          <div class="kpi-card kpi-goals">
            <div class="kpi-icon">🎯</div>
            <div class="kpi-info">
              <span class="kpi-label">Objectifs</span>
              <span class="kpi-value">${completedGoals} / ${totalGoals}</span>
            </div>
          </div>
        </div>

        <!-- GRAPHIQUES -->
        <div class="charts-grid">
          <div class="card chart-card">
            <h2>Dépenses par catégorie</h2>
            <div class="chart-container">
              <canvas id="chart-donut"></canvas>
            </div>
          </div>

          <div class="card chart-card">
            <h2>Évolution du solde (6 mois)</h2>
            <div class="chart-container">
              <canvas id="chart-line"></canvas>
            </div>
          </div>
        </div>

        <!-- DERNIÈRES TRANSACTIONS -->
        <div class="card">
          <div class="section-header">
            <h2>Dernières transactions</h2>
            <a href="#transactions" class="btn btn-ghost btn-sm">Voir tout →</a>
          </div>
          ${this.renderRecentTransactions(state.transactions)}
        </div>

        <!-- OBJECTIFS EN COURS -->
        ${state.goals.length > 0 ? `
        <div class="card">
          <div class="section-header">
            <h2>Objectifs en cours</h2>
            <a href="#goals" class="btn btn-ghost btn-sm">Voir tout →</a>
          </div>
          ${this.renderGoalsSummary(state.goals)}
        </div>` : ''}
      </div>
    `;
  },

  // 5 dernières transactions triées par date
  renderRecentTransactions(transactions) {
    if (transactions.length === 0) {
      return `<p class="empty-state">Aucune transaction. <a href="#transactions">Ajoutez-en une !</a></p>`;
    }
    const recent = [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    return recent.map(t => `
      <div class="tx-row ${t.type}">
        <span class="tx-cat-icon">${Transactions.getCategoryIcon(t.category)}</span>
        <div class="tx-info">
          <strong>${Utils.sanitize(t.description)}</strong>
          <small>${Utils.formatDate(t.date)} · ${t.category}</small>
        </div>
        <span class="tx-amount ${t.type}">
          ${t.type === 'depense' ? '-' : '+'}${Utils.formatCurrency(t.amount)}
        </span>
      </div>
    `).join('');
  },

  // Barres de progression des objectifs
  renderGoalsSummary(goals) {
    return goals.slice(0, 3).map(g => {
      const pct = Utils.clamp(
        Math.round(g.currentAmount / g.targetAmount * 100), 0, 100
      );
      return `
        <div class="goal-summary-row">
          <span class="goal-emoji">${Utils.sanitize(g.emoji)}</span>
          <div class="goal-summary-info">
            <div class="goal-summary-header">
              <span>${Utils.sanitize(g.name)}</span>
              <span>${pct}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Message d'accueil selon l'heure
  getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  },

  // Ex: '2026-03' → 'Mars 2026'
  formatMonthLabel(month) {
    const [y, m] = month.split('-');
    return new Date(y, m - 1).toLocaleDateString('fr-FR', {
      month: 'long', year: 'numeric'
    });
  }
};

window.Dashboard = Dashboard;
EOF
