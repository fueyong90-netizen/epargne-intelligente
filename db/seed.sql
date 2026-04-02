-- ════════════════════════════════════════════════════════════
-- db/seed.sql — Données de test
-- Exécuter : sqlite3 db/epargne.sqlite < db/seed.sql
-- ════════════════════════════════════════════════════════════
 
-- Utilisateur de démonstration (mot de passe : 'demo1234' hashé avec bcrypt)
INSERT OR IGNORE INTO users (id, email, password) VALUES
  (1, 'demo@epargne.fr', '$2b$10$example_hash_here');
 
-- ── MARS 2026 ────────────────────────────────────────────
INSERT INTO transactions (user_id, description, amount, type, category, date) VALUES
  (1, 'Salaire mars',       2500.00, 'revenu',  'Salaire',       '2026-03-01'),
  (1, 'Loyer mars',          800.00, 'depense', 'Logement',      '2026-03-02'),
  (1, 'Courses Lidl',         87.40, 'depense', 'Alimentation',  '2026-03-04'),
  (1, 'Abonnement Netflix',   17.99, 'depense', 'Loisirs',       '2026-03-05'),
  (1, 'Essence',              62.00, 'depense', 'Transport',     '2026-03-07'),
  (1, 'Restaurant avec amis', 45.00, 'depense', 'Loisirs',       '2026-03-09'),
  (1, 'Pharmacie',            23.50, 'depense', 'Santé',         '2026-03-11'),
  (1, 'Courses Carrefour',    94.20, 'depense', 'Alimentation',  '2026-03-14'),
  (1, 'Virement épargne',    200.00, 'depense', 'Épargne',       '2026-03-15'),
  (1, 'Freelance mission',   450.00, 'revenu',  'Salaire',       '2026-03-16'),
  (1, 'Assurance voiture',    65.00, 'depense', 'Transport',     '2026-03-18'),
  (1, 'Courses bio',          52.80, 'depense', 'Alimentation',  '2026-03-21'),
  (1, 'Cinéma',              12.00, 'depense', 'Loisirs',       '2026-03-22'),
  (1, 'Électricité',          89.00, 'depense', 'Logement',      '2026-03-25'),
  (1, 'Livres Amazon',        34.99, 'depense', 'Loisirs',       '2026-03-27');
 
-- ── FÉVRIER 2026 ─────────────────────────────────────────
INSERT INTO transactions (user_id, description, amount, type, category, date) VALUES
  (1, 'Salaire février',    2500.00, 'revenu',  'Salaire',       '2026-02-01'),
  (1, 'Loyer février',       800.00, 'depense', 'Logement',      '2026-02-03'),
  (1, 'Courses semaine 1',    76.50, 'depense', 'Alimentation',  '2026-02-05'),
  (1, 'Abonnements streaming',35.00, 'depense', 'Loisirs',       '2026-02-06'),
  (1, 'Médecin généraliste',  25.00, 'depense', 'Santé',         '2026-02-10'),
  (1, 'Courses semaine 2',    91.30, 'depense', 'Alimentation',  '2026-02-12'),
  (1, 'Virement épargne',    150.00, 'depense', 'Épargne',       '2026-02-15'),
  (1, 'Essence × 2',         110.00, 'depense', 'Transport',     '2026-02-17'),
  (1, 'Sortie karting',       55.00, 'depense', 'Loisirs',       '2026-02-21'),
  (1, 'Courses semaine 4',    68.90, 'depense', 'Alimentation',  '2026-02-26');
 
-- ── OBJECTIFS DE DÉMONSTRATION ──────────────────────────
INSERT INTO goals (user_id, name, emoji, target_amount, current_amount, deadline) VALUES
  (1, 'Vacances Japon',  '✈️', 3000.00, 650.00, '2026-12-31'),
  (1, 'MacBook Pro',     '💻', 2499.00, 200.00, '2026-09-01'),
  (1, 'Fonds urgence',   '🛡️', 5000.00, 1200.00, null);