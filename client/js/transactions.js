// ════════════════════════════════════════════════════════════
// js/transactions.js — Gestion complète des transactions
// ════════════════════════════════════════════════════════════
 
const Transactions = {
 
  // ── ÉTAT LOCAL DU MODULE ─────────────────────────────────
  // Ces variables n'appartiennent qu'à ce module
  filterMonth: '',       // filtre actif : '2026-03' ou '' pour tout
  filterCategory: '',    // filtre catégorie actif
  filterType: '',        // filtre type : 'depense'|'revenu'|''
  editingId: null,       // null = création, string = modification en cours
  currentPage: 1,        // page courante pour la pagination
  itemsPerPage: 15,      // nombre de lignes par page
 
  // ── RENDU HTML DE LA PAGE ────────────────────────────────
  // Reçoit l'état global et retourne une chaîne HTML
  // innerHTML = chaîne HTML → le navigateur parse et affiche
  render(state) {
    const filtered = this.applyFilters(state.transactions);
    const paginated = this.paginate(filtered);
 
    return `
      <div class='page transactions-page'>
        <header class='page-header'>
          <h1>💳 Transactions</h1>
          <span class='badge'>${state.transactions.length} au total</span>
        </header>
 
        <!-- ── FORMULAIRE D'AJOUT/MODIFICATION ── -->
        <form id='form-tx' class='card form-card'>
          <h2 id='form-tx-title'>Nouvelle transaction</h2>
 
          <!-- Description : champ texte libre -->
          <div class='field'>
            <label for='tx-desc'>Description</label>
            <input id='tx-desc' type='text' placeholder='Ex: Courses Lidl'
                   maxlength='100' required>
          </div>
 
          <!-- Montant : number empêche les lettres, step='0.01' autorise les centimes -->
          <div class='field'>
            <label for='tx-amount'>Montant (€)</label>
            <input id='tx-amount' type='number' step='0.01' min='0.01' required>
          </div>
 
          <!-- Type : radio buttons pour dépense ou revenu -->
          <div class='field field-row'>
            <label>
              <input type='radio' name='tx-type' value='depense' checked> 💸 Dépense
            </label>
            <label>
              <input type='radio' name='tx-type' value='revenu'> 💰 Revenu
            </label>
          </div>
 
          <!-- Catégorie : liste déroulante des catégories prédéfinies -->
          <div class='field'>
            <label for='tx-cat'>Catégorie</label>
            <select id='tx-cat'>
              ${this.renderCategoryOptions()}
            </select>
          </div>
 
          <!-- Date : pré-remplie avec aujourd'hui via utils.js -->
          <div class='field'>
            <label for='tx-date'>Date</label>
            <input id='tx-date' type='date'
                   value='${new Date().toISOString().split('T')[0]}'>
          </div>
 
          <button type='submit' class='btn btn-primary' id='btn-tx-submit'>
            Ajouter
          </button>
          <button type='button' class='btn btn-ghost' id='btn-tx-cancel'
                  style='display:none'>Annuler</button>
        </form>
 
        <!-- ── FILTRES ── -->
        <div class='filters card'>
          <select id='filter-month'>${this.renderMonthOptions()}</select>
          <select id='filter-cat'><option value=''>Toutes catégories</option>
            ${this.renderCategoryOptions(true)}</select>
          <select id='filter-type'>
            <option value=''>Tous types</option>
            <option value='depense'>Dépenses</option>
            <option value='revenu'>Revenus</option>
          </select>
          <button id='btn-reset-filters' class='btn btn-ghost'>Réinitialiser</button>
        </div>
 
        <!-- ── LISTE PAGINÉE ── -->
        <div class='transactions-list card'>
          <div class='list-header'>
            <span>${filtered.length} transaction(s) trouvée(s)</span>
          </div>
          ${this.renderList(paginated)}
          ${this.renderPagination(filtered.length)}
        </div>
      </div>
    `;
  },
 
  // ── CATÉGORIES PRÉDÉFINIES ───────────────────────────────
  // Centralisées ici pour être cohérentes partout dans l'app
  CATEGORIES: ['Alimentation','Transport','Logement','Loisirs',
               'Santé','Épargne','Salaire','Autre'],
 
  renderCategoryOptions(asFilter = false) {
    const prefix = asFilter ? '<option value="">Toutes catégories</option>' : '';
    return prefix + this.CATEGORIES
      .map(c => `<option value='${c}'>${c}</option>`)
      .join('');
  },
 
  // ── OPTIONS DE MOIS (12 derniers) ────────────────────────
  renderMonthOptions() {
    const months = Utils.getLast6Months(); // retourne ['2026-03','2026-02',...]
    const allOption = `<option value=''>Tous les mois</option>`;
    return allOption + months.map(m => {
      const [year, mo] = m.split('-');
      const label = new Date(year, mo - 1).toLocaleDateString('fr-FR', {month:'long',year:'numeric'});
      return `<option value='${m}'>${label}</option>`;
    }).join('');
  },
 
  // ── RENDU D'UNE LIGNE DE TRANSACTION ────────────────────
  renderList(transactions) {
    if (transactions.length === 0) {
      return `<p class='empty-state'>Aucune transaction. Ajoutez-en une !</p>`;
    }
    return transactions.map(t => `
      <div class='tx-row ${t.type}' data-id='${t.id}'>
        <span class='tx-cat-icon'>${this.getCategoryIcon(t.category)}</span>
        <div class='tx-info'>
          <strong>${Utils.sanitize(t.description)}</strong>
          <small>${Utils.formatDate(t.date)} · ${t.category}</small>
        </div>
        <span class='tx-amount ${t.type}'>
          ${t.type === 'depense' ? '-' : '+'}${Utils.formatCurrency(t.amount)}
        </span>
        <div class='tx-actions'>
          <button class='btn-icon' onclick='Transactions.startEdit("${t.id}")'>✏️</button>
          <button class='btn-icon' onclick='Transactions.delete("${t.id}")'>🗑️</button>
        </div>
      </div>
    `).join('');
  },
 
  // ── PAGINATION ───────────────────────────────────────────
  paginate(items) {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return items.slice(start, start + this.itemsPerPage);
  },
 
  renderPagination(total) {
    const pages = Math.ceil(total / this.itemsPerPage);
    if (pages <= 1) return '';
    let html = `<div class='pagination'>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button class='page-btn ${i===this.currentPage?'active':''}' 
               onclick='Transactions.goPage(${i})'>${i}</button>`;
    }
    return html + '</div>';
  },
 
  goPage(n) {
    this.currentPage = n;
    App.refresh(); // re-render avec la nouvelle page
  },
 
  // ── FILTRES ──────────────────────────────────────────────
  applyFilters(transactions) {
    return transactions.filter(t => {
      // Chaque condition doit être vraie (ET logique)
      const okMonth = !this.filterMonth || t.date.startsWith(this.filterMonth);
      const okCat   = !this.filterCategory || t.category === this.filterCategory;
      const okType  = !this.filterType || t.type === this.filterType;
      return okMonth && okCat && okType;
    // Tri : plus récent en premier (comparaison de chaînes ISO fonctionne)
    }).sort((a, b) => b.date.localeCompare(a.date));
  },
 
  // ── LIAISON DES ÉVÉNEMENTS ───────────────────────────────
  // Appelée APRÈS render() car les éléments DOM doivent exister
  bindEvents(app) {
    // Soumission du formulaire
    document.getElementById('form-tx')
      .addEventListener('submit', e => {
        e.preventDefault(); // CRUCIAL : empêche le rechargement de page
        this.editingId ? this.saveEdit(app) : this.add(app);
      });
 
    // Bouton annuler modification
    document.getElementById('btn-tx-cancel')
      .addEventListener('click', () => this.cancelEdit(app));
 
    // Changements de filtre → re-render immédiat
    ['filter-month','filter-cat','filter-type'].forEach(id => {
      document.getElementById(id).addEventListener('change', e => {
        if (id === 'filter-month') this.filterMonth = e.target.value;
        if (id === 'filter-cat')   this.filterCategory = e.target.value;
        if (id === 'filter-type')  this.filterType = e.target.value;
        this.currentPage = 1; // remettre sur la page 1 quand on filtre
        app.refresh();
      });
    });
 
    // Reset filtres
    document.getElementById('btn-reset-filters')
      .addEventListener('click', () => {
        this.filterMonth = this.filterCategory = this.filterType = '';
        app.refresh();
      });
  },
 
  // ── AJOUTER UNE TRANSACTION ──────────────────────────────
  add(app) {
    const tx = this.readForm(); // lit et valide le formulaire
    if (!tx) return;           // validation échouée → stop
 
    Storage.add('transactions', tx); // persiste dans localStorage
    app.state.transactions = Storage.getAll('transactions'); // sync état
    AIModule.clearCache(); // l'analyse IA est maintenant obsolète
    this.resetForm();
    app.refresh();
  },
 
  // ── LECTURE ET VALIDATION DU FORMULAIRE ─────────────────
  readForm() {
    const desc   = document.getElementById('tx-desc').value.trim();
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const type   = document.querySelector('input[name=tx-type]:checked').value;
    const cat    = document.getElementById('tx-cat').value;
    const date   = document.getElementById('tx-date').value;
 
    // Validations manuelles en plus des attributs HTML required
    if (!desc) { this.showError('La description est requise'); return null; }
    if (isNaN(amount) || amount <= 0) { this.showError('Montant invalide'); return null; }
    if (!date) { this.showError('La date est requise'); return null; }
 
    return { description: desc, amount, type, category: cat, date };
  },
 
  showError(msg) {
    // Affichage non-bloquant (pas de alert())
    const existing = document.getElementById('form-error');
    if (existing) existing.remove();
    const el = document.createElement('p');
    el.id = 'form-error';
    el.className = 'error-msg';
    el.textContent = msg;
    document.getElementById('form-tx').prepend(el);
    setTimeout(() => el.remove(), 3000); // disparaît après 3s
  },
 
  resetForm() {
    document.getElementById('form-tx').reset();
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    this.editingId = null;
    document.getElementById('form-tx-title').textContent = 'Nouvelle transaction';
    document.getElementById('btn-tx-submit').textContent = 'Ajouter';
    document.getElementById('btn-tx-cancel').style.display = 'none';
  },
 
  // ── DÉMARRER UNE MODIFICATION ────────────────────────────
  startEdit(id) {
    const tx = Storage.getById('transactions', id);
    if (!tx) return;
    this.editingId = id;
    // Pré-remplir le formulaire avec les valeurs existantes
    document.getElementById('tx-desc').value = tx.description;
    document.getElementById('tx-amount').value = tx.amount;
    document.querySelector(`input[name=tx-type][value=${tx.type}]`).checked = true;
    document.getElementById('tx-cat').value = tx.category;
    document.getElementById('tx-date').value = tx.date;
    document.getElementById('form-tx-title').textContent = 'Modifier la transaction';
    document.getElementById('btn-tx-submit').textContent = 'Enregistrer';
    document.getElementById('btn-tx-cancel').style.display = 'inline-block';
    // Scroller vers le formulaire pour que l'utilisateur le voit
    document.getElementById('form-tx').scrollIntoView({ behavior: 'smooth' });
  },
 
  saveEdit(app) {
    const changes = this.readForm();
    if (!changes) return;
    Storage.update('transactions', this.editingId, changes);
    this.editingId = null;
    AIModule.clearCache();
    this.resetForm();
    app.refresh();
  },
 
  cancelEdit(app) {
    this.editingId = null;
    this.resetForm();
  },
 
  // ── SUPPRIMER ────────────────────────────────────────────
  delete(id) {
    if (!confirm('Supprimer cette transaction ?')) return;
    Storage.remove('transactions', id);
    AIModule.clearCache();
    App.refresh(); // App est global → accessible directement
  },
 
  // ── ICÔNES PAR CATÉGORIE ─────────────────────────────────
  getCategoryIcon(cat) {
    const icons = {
      Alimentation:'🛒', Transport:'🚗', Logement:'🏠',
      Loisirs:'🎮', Santé:'💊', Épargne:'🐷', Salaire:'💼', Autre:'📦'
    };
    return icons[cat] || '📦';
  }
};
 
window.Transactions = Transactions;