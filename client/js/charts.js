// ════════════════════════════════════════════════════════════
// js/charts.js — Visualisations Chart.js
// Chart.js est chargé via CDN dans index.html
// ════════════════════════════════════════════════════════════
 
const Charts = {
 
  // Références aux instances Chart.js — nécessaires pour les détruire
  donutChart: null,
  lineChart: null,
 
  // Palette de couleurs pour les catégories (correspondance avec CATEGORIES)
  CATEGORY_COLORS: [
    '#38A169','#3182CE','#D69E2E','#E53E3E',
    '#9F7AEA','#ED8936','#319795','#718096'
  ],
 
  // ── INITIALISATION DE TOUS LES GRAPHIQUES ───────────────
  // Appelée par app.js après le rendu du Dashboard
  initAll(state) {
    this.initDonut(state.transactions);
    this.initLine(state.transactions);
  },
 
  // ── GRAPHIQUE DONUT : répartition des dépenses ───────────
  // Montre visuellement où part l'argent ce mois-ci
  initDonut(transactions) {
    const canvas = document.getElementById('chart-donut');
    if (!canvas) return; // sécurité : le canvas n'existe que sur le dashboard
 
    // CRUCIAL : détruire l'instance précédente avant d'en créer une nouvelle
    // Sans ça : Chart.js empile les couches et les données se doublent
    if (this.donutChart) {
      this.donutChart.destroy();
      this.donutChart = null;
    }
 
    // Filtrer les dépenses du mois en cours uniquement
    const currentMonth = Utils.getCurrentMonth();
    const monthTx = transactions.filter(t =>
      t.date.startsWith(currentMonth) && t.type === 'depense'
    );
 
    // groupByCategory retourne { Alimentation: 320, Transport: 150, ... }
    const grouped = Utils.groupByCategory(monthTx);
    const labels = Object.keys(grouped);   // noms des catégories
    const data   = Object.values(grouped); // montants correspondants
 
    // Cas vide : pas de données ce mois
    if (labels.length === 0) {
      canvas.parentElement.innerHTML = '<p class="chart-empty">Aucune dépense ce mois-ci</p>';
      return;
    }
 
    // Création de l'instance Chart.js
    this.donutChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut', // 'pie' serait similaire mais sans le trou central
      data: {
        labels,
        datasets: [{
          data,
          // slice(0, labels.length) : prendre autant de couleurs que de catégories
          backgroundColor: this.CATEGORY_COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,      // s'adapte à la taille du conteneur
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }, // légende en bas
          tooltip: {
            callbacks: {
              // Personnaliser le tooltip : afficher le montant formaté
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a,b) => a+b, 0);
                const pct = Math.round(ctx.parsed / total * 100);
                return ` ${ctx.label}: ${Utils.formatCurrency(ctx.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  },
 
  // ── GRAPHIQUE LIGNE : évolution du solde ─────────────────
  // Montre la tendance de l'épargne sur 6 mois
  initLine(transactions) {
    const canvas = document.getElementById('chart-line');
    if (!canvas) return;
 
    if (this.lineChart) { this.lineChart.destroy(); this.lineChart = null; }
 
    const months = Utils.getLast6Months().reverse(); // chronologique (passé → présent)
    const balances = months.map(m => Utils.calculateMonthlyBalance(transactions, m));
 
    // Labels formatés pour l'axe X : 'janv.', 'févr.', etc.
    const labels = months.map(m => {
      const [y, mo] = m.split('-');
      return new Date(y, mo-1).toLocaleDateString('fr-FR', { month: 'short' });
    });
 
    this.lineChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Bilan mensuel (€)',
          data: balances,
          borderColor: '#38A169',      // ligne verte
          backgroundColor: 'rgba(56,161,105,0.1)', // remplissage léger
          fill: true,                  // colorer sous la courbe
          tension: 0.4,               // courbe lissée (0 = angles droits)
          pointBackgroundColor: '#38A169',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              // Formater l'axe Y en euros
              callback: val => Utils.formatCurrency(val)
            }
          }
        }
      }
    });
  },
 
  // ── RAFRAÎCHISSEMENT ─────────────────────────────────────
  refreshAll(state) {
    this.initDonut(state.transactions);
    this.initLine(state.transactions);
  }
};
 
window.Charts = Charts;