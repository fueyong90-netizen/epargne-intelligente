// ════════════════════════════════════════════════════════════
// server/db.js — Couche d'accès aux données (SQLite)
// ════════════════════════════════════════════════════════════

const Database = require('better-sqlite3');
const path = require('path');
const fs   = require('fs');

// ── POURQUOI L'ERREUR SE PRODUISAIT ─────────────────────────
// Le code original utilisait :
//   path.join(__dirname, '../db/epargne.sqlite')
//
// __dirname = le dossier du fichier actuel
// Dans ton cas : /root/epargne-intelligente/serveur
//                                           ^^^^^^^ (avec un 'e')
//
// Donc le chemin calculé était :
//   /root/epargne-intelligente/serveur/../db/epargne.sqlite
//   = /root/epargne-intelligente/db/epargne.sqlite  ✅ correct
//
// MAIS le vrai problème : new Database() est appelé IMMÉDIATEMENT
// au chargement du fichier, AVANT que dotenv charge le .env
// Donc process.env.DB_PATH est UNDEFINED à ce moment-là.
// better-sqlite3 reçoit un chemin et si le DOSSIER n'existe pas
// encore, il lève l'erreur "directory does not exist".
//
// SOLUTION : utiliser path.resolve() avec __dirname
// et s'assurer que le dossier db/ existe avant d'ouvrir la DB.

// ── CHEMIN VERS LA BASE DE DONNÉES ──────────────────────────
// path.resolve() : construit un chemin absolu depuis __dirname
// __dirname ici = /root/epargne-intelligente/serveur
// '../db/epargne.sqlite' remonte d'un niveau → va dans db/
// Résultat final : /root/epargne-intelligente/db/epargne.sqlite
const dbPath = path.resolve(__dirname, '../db/epargne.sqlite');

// ── CRÉER LE DOSSIER db/ S'IL N'EXISTE PAS ──────────────────
// C'est la correction clé qui manquait dans la version originale
// path.dirname(dbPath) = /root/epargne-intelligente/db
// fs.mkdirSync avec { recursive: true } :
//   - crée tous les dossiers intermédiaires si besoin
//   - NE plante PAS si le dossier existe déjà (sans recursive: true
//     ça lèverait une erreur EEXIST)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Dossier db/ créé automatiquement :', dbDir);
}

// ── CONNEXION À LA BASE ──────────────────────────────────────
// new Database() ouvre le fichier SQLite
// Si le fichier .sqlite n'existe pas, better-sqlite3 le CRÉE
// automatiquement — mais le DOSSIER parent doit exister (d'où
// le mkdirSync ci-dessus)
// verbose : en mode development, affiche chaque requête SQL
// dans le terminal — utile pour déboguer
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

console.log('📦 Base de données connectée :', dbPath);

// ── OPTIMISATIONS SQLITE ─────────────────────────────────────
// WAL = Write-Ahead Logging
// Mode d'écriture plus performant : les lectures ne bloquent
// plus les écritures et vice-versa
db.pragma('journal_mode = WAL');

// SQLite désactive les clés étrangères par défaut (compatibilité)
// On les active pour que nos FOREIGN KEY dans schema.sql soient
// réellement respectées (ex: supprimer un user supprime ses transactions)
db.pragma('foreign_keys = ON');

// ── OBJET DB : toutes les fonctions d'accès aux données ─────
const DB = {

  // ── INITIALISATION ────────────────────────────────────────
  // Appelée UNE SEULE FOIS au démarrage dans index.js : db.init()
  // Lit schema.sql et crée les tables si elles n'existent pas encore
  // CREATE TABLE IF NOT EXISTS = ne plante pas si la table existe déjà
  init() {
    // path.resolve depuis __dirname pour trouver schema.sql
    // /root/epargne-intelligente/serveur/../db/schema.sql
    // = /root/epargne-intelligente/db/schema.sql
    const schemaPath = path.resolve(__dirname, '../db/schema.sql');

    // Vérification de sécurité : schema.sql doit exister
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql introuvable : ${schemaPath}`);
    }

    // Lire le contenu SQL du fichier en texte
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // db.exec() : exécute plusieurs instructions SQL d'un seul coup
    // Parfait pour les fichiers SQL complets
    db.exec(schema);

    console.log('✅ Tables créées / vérifiées depuis :', schemaPath);
  },

  // ── TRANSACTIONS — LIRE ───────────────────────────────────
  // Retourne les transactions d'un utilisateur avec filtres optionnels
  // userId  : identifiant de l'utilisateur ('demo' en Phase 1/2)
  // options : { month: '2026-03', category: 'Alimentation', type: 'depense' }
  getTransactions(userId, options = {}) {
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    // On ajoute les filtres dynamiquement selon ce qui est fourni
    // strftime('%Y-%m', date) extrait '2026-03' d'une date '2026-03-15'
    if (options.month) {
      query += " AND strftime('%Y-%m', date) = ?";
      params.push(options.month);
    }
    if (options.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }
    if (options.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }

    // Tri : plus récente en premier, puis par date de création
    query += ' ORDER BY date DESC, created_at DESC';

    // db.prepare() compile la requête (optimisation)
    // .all(...params) exécute et retourne un tableau de tous les résultats
    return db.prepare(query).all(...params);
  },

  // ── TRANSACTIONS — CRÉER ──────────────────────────────────
  // data : { userId, description, amount, type, category, date }
  // Retourne l'objet créé avec son ID auto-généré par SQLite
  addTransaction(data) {
    const stmt = db.prepare(`
      INSERT INTO transactions
        (user_id, description, amount, type, category, date)
      VALUES
        (@userId, @description, @amount, @type, @category, @date)
    `);

    // .run() exécute l'INSERT et retourne { lastInsertRowid, changes }
    // lastInsertRowid = l'ID auto-généré par SQLite AUTOINCREMENT
    const result = stmt.run({
      userId:      data.userId || 'demo',
      description: data.description,
      amount:      data.amount,
      type:        data.type,
      category:    data.category,
      date:        data.date,
    });

    return { id: result.lastInsertRowid, ...data };
  },

  // ── TRANSACTIONS — MODIFIER ───────────────────────────────
  // id      : ID de la transaction à modifier
  // changes : { description, amount, type, category, date }
  updateTransaction(id, changes) {
    const stmt = db.prepare(`
      UPDATE transactions
      SET description = @description,
          amount      = @amount,
          type        = @type,
          category    = @category,
          date        = @date
      WHERE id = @id
    `);
    stmt.run({ ...changes, id });
    return { id, ...changes };
  },

  // ── TRANSACTIONS — SUPPRIMER ──────────────────────────────
  // Supprime la transaction avec cet ID
  // Pas de retour : le frontend sait que c'est OK si pas d'erreur
  deleteTransaction(id) {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  },

  // ── OBJECTIFS — LIRE ──────────────────────────────────────
  getGoals(userId) {
    return db.prepare(
      'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
  },

  // ── OBJECTIFS — CRÉER ─────────────────────────────────────
  addGoal(data) {
    const stmt = db.prepare(`
      INSERT INTO goals
        (user_id, name, emoji, target_amount, current_amount, deadline)
      VALUES
        (@userId, @name, @emoji, @targetAmount, @currentAmount, @deadline)
    `);
    const result = stmt.run({
      userId:        data.userId || 'demo',
      name:          data.name,
      emoji:         data.emoji || '🎯',
      targetAmount:  data.targetAmount,
      currentAmount: data.currentAmount || 0,
      deadline:      data.deadline || null,
    });
    return { id: result.lastInsertRowid, ...data };
  },

  // ── OBJECTIFS — MODIFIER ──────────────────────────────────
  updateGoal(id, changes) {
    db.prepare(`
      UPDATE goals
      SET name           = @name,
          emoji          = @emoji,
          target_amount  = @targetAmount,
          current_amount = @currentAmount,
          deadline       = @deadline
      WHERE id = @id
    `).run({ ...changes, id });
    return { id, ...changes };
  },

  // ── OBJECTIFS — SUPPRIMER ─────────────────────────────────
  deleteGoal(id) {
    db.prepare('DELETE FROM goals WHERE id = ?').run(id);
  },

  // ── USERS (Phase 3 — Auth JWT) ────────────────────────────
  getUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  addUser(data) {
    const stmt = db.prepare(`
      INSERT INTO users (email, password) VALUES (@email, @password)
    `);
    const result = stmt.run(data);
    return { id: result.lastInsertRowid, ...data };
  }
};

module.exports = DB;
