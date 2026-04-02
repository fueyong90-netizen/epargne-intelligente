-- ════════════════════════════════════════════════════════════
-- db/schema.sql — Définition des tables SQLite
-- Exécuté par server/db.js au démarrage (CREATE TABLE IF NOT EXISTS)
-- ════════════════════════════════════════════════════════════
 
-- ── TABLE USERS ──────────────────────────────────────────
-- Phase 3 : authentification multi-utilisateurs
-- En Phase 1/2, on utilise l'userId 'demo' par défaut
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT, -- SQLite génère l'ID automatiquement
  email      TEXT    UNIQUE NOT NULL,            -- UNIQUE : pas deux comptes avec le même email
  password   TEXT    NOT NULL,                   -- JAMAIS en clair ! Hashé avec bcrypt
  currency   TEXT    DEFAULT 'EUR',              -- devise préférée
  theme      TEXT    DEFAULT 'light',            -- préférence thème
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- date d'inscription automatique
);
 
-- ── TABLE TRANSACTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER  NOT NULL,
  description TEXT     NOT NULL,
  -- CHECK : contrainte de validation directement dans la base
  -- amount > 0 : interdit les montants nuls ou négatifs (le type gère le signe)
  amount      REAL     NOT NULL CHECK(amount > 0),
  -- CHECK avec IN : seules ces deux valeurs sont acceptées
  type        TEXT     NOT NULL CHECK(type IN ('depense', 'revenu')),
  category    TEXT     NOT NULL,
  date        DATE     NOT NULL, -- format 'YYYY-MM-DD'
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- FOREIGN KEY : user_id doit exister dans la table users
  -- ON DELETE CASCADE : si un user est supprimé, ses transactions aussi
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
 
-- ── TABLE GOALS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL,
  name           TEXT    NOT NULL,
  emoji          TEXT    DEFAULT '🎯',
  target_amount  REAL    NOT NULL CHECK(target_amount > 0),
  current_amount REAL    DEFAULT 0 CHECK(current_amount >= 0),
  deadline       DATE,   -- nullable : pas obligatoire de fixer une date
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
 
-- ── INDEX DE PERFORMANCES ────────────────────────────────
-- Sans index, SQLite fait un 'full table scan' (lit toute la table)
-- Avec index, la recherche est O(log n) grâce à un B-tree
-- On indexe les colonnes utilisées dans les WHERE et ORDER BY fréquents
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);       -- filtre par mois
CREATE INDEX IF NOT EXISTS idx_tx_cat  ON transactions(category);   -- filtre catégorie
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);