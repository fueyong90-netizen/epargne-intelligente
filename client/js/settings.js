// ════════════════════════════════════════════════════════════
// js/settings.js — Page Paramètres
// ════════════════════════════════════════════════════════════

const Settings = {

  render(state) {
    const settings = state.settings || {};
    return `
      <div class="page settings-page">
        <header class="page-header">
          <h1>⚙️ Paramètres</h1>
        </header>

        <!-- APPARENCE -->
        <div class="card">
          <h2>Apparence</h2>

          <div class="field">
            <label>Thème</label>
            <div class="toggle-group">
              <button class="btn ${settings.theme !== 'dark' ? 'btn-primary' : 'btn-ghost'}"
                      onclick="Settings.setTheme('light')">
                ☀️ Clair
              </button>
              <button class="btn ${settings.theme === 'dark' ? 'btn-primary' : 'btn-ghost'}"
                      onclick="Settings.setTheme('dark')">
                🌙 Sombre
              </button>
            </div>
          </div>

          <div class="field">
            <label for="set-currency">Devise</label>
            <select id="set-currency" onchange="Settings.setCurrency(this.value)">
              <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>€ Euro</option>
              <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>$ Dollar</option>
              <option value="XAF" ${settings.currency === 'XAF' ? 'selected' : ''}>FCFA</option>
            </select>
          </div>
        </div>

        <!-- DONNÉES -->
        <div class="card">
          <h2>Données</h2>

          <div class="field">
            <label>Export CSV</label>
            <button class="btn btn-outline" onclick="Settings.exportCSV()">
              📥 Télécharger mes transactions
            </button>
          </div>

          <div class="field">
            <label>Réinitialiser</label>
            <button class="btn btn-danger" onclick="Settings.resetAll()">
              🗑️ Effacer toutes les données
            </button>
          </div>
        </div>

        <!-- INFOS -->
        <div class="card">
          <h2>À propos</h2>
          <p>Épargne Intelligente v1.0</p>
          <p style="color:var(--color-text-muted); margin-top:8px">
            Stack : HTML/CSS/JS · Node.js · SQLite · API Claude
          </p>
        </div>
      </div>
    `;
  },

  bindEvents(app) {
    // Les boutons utilisent onclick= directement dans le HTML
    // donc pas besoin de addEventListener ici
  },

  setTheme(theme) {
    App.updateSettings({ theme });
    App.refresh();
  },

  setCurrency(currency) {
    App.updateSettings({ currency });
  },

  // Export des transactions en fichier CSV téléchargeable
  exportCSV() {
    const transactions = Storage.getAll('transactions');
    if (transactions.length === 0) {
      alert('Aucune transaction à exporter.');
      return;
    }

    // Construire le contenu CSV
    const header = 'Date,Description,Montant,Type,Categorie\n';
    const rows = transactions.map(t =>
      `${t.date},"${t.description}",${t.amount},${t.type},${t.category}`
    ).join('\n');

    const csv = header + rows;

    // Créer un lien de téléchargement temporaire
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `transactions-${Utils.getCurrentMonth()}.csv`;
    link.click();

    // Libérer la mémoire
    URL.revokeObjectURL(url);
  },

  // Réinitialisation complète
  resetAll() {
    if (!confirm('⚠️ Supprimer TOUTES les données ? Cette action est irréversible !')) return;
    if (!confirm('Vraiment tout supprimer ? Transactions, objectifs, paramètres ?')) return;
    Storage.clearAll();
    App.state.transactions = [];
    App.state.goals = [];
    App.state.settings = { currency: 'EUR', theme: 'light' };
    App.refresh();
    alert('✅ Données réinitialisées.');
  }
};

window.Settings = Settings;
EOF
