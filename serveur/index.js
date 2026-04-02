// ════════════════════════════════════════════════════════════
// server/index.js — Serveur Express — point d'entrée backend
// ════════════════════════════════════════════════════════════
 
// ── VARIABLES D'ENVIRONNEMENT ────────────────────────────
// dotenv lit server/.env et met les valeurs dans process.env
// DOIT être appelé AVANT tout require() qui utilise process.env
require('dotenv').config();
 
const express = require('express');
const cors    = require('cors');       // gestion CORS
const helmet  = require('helmet');     // headers sécurité
const rateLimit = require('express-rate-limit'); // anti-abus
 
// Modules locaux (les nôtres)
const db       = require('./db');      // connexion base de données
const aiRouter = require('./ai');      // routes IA
const authRouter = require('./auth');  // routes authentification (Phase 3)
 
const app = express();
 
// ── MIDDLEWARES GLOBAUX ──────────────────────────────────
// Les middlewares s'exécutent dans l'ordre pour chaque requête
 
// Helmet : ajoute ~14 headers HTTP de sécurité (X-Frame-Options, etc.)
app.use(helmet());
 
// CORS : autorise uniquement notre frontend à appeler le backend
// Sans ça, le navigateur bloque les requêtes cross-origin
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5500',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
 
// express.json() : parse automatiquement les corps JSON des requêtes
// Sans ça, req.body serait undefined pour les POST avec JSON
app.use(express.json({ limit: '10kb' })); // limite la taille du corps
 
// ── RATE LIMITING ────────────────────────────────────────
// Protège contre les attaques par force brute et le scraping
const generalLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // fenêtre de 15 minutes
  max: 100,                  // max 100 requêtes par IP par fenêtre
  message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
  standardHeaders: true,     // inclut Retry-After dans les headers
});
 
// Limite plus stricte pour l'IA (chaque appel coute des tokens)
const aiLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // fenêtre d'1 heure
  max: 20,                   // max 20 analyses IA par heure
});
 
app.use(generalLimit);
 
// ── ROUTE DE SANTÉ ───────────────────────────────────────
// Utilisée par les services d'hébergement pour vérifier que l'app tourne
// Railway/Vercel pingue cette route et redémarre si elle ne répond pas
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
 
// ── ROUTES TRANSACTIONS ──────────────────────────────────
// GET /api/transactions : lire toutes les transactions
app.get('/api/transactions', (req, res) => {
  try {
    // req.query : paramètres URL (?userId=123&month=2026-03)
    const userId = req.query.userId || 'demo';
    const { month, category, type } = req.query;
    const transactions = db.getTransactions(userId, { month, category, type });
    res.json(transactions); // envoie le tableau JSON au client
  } catch (err) {
    console.error(err);
    // 500 = Internal Server Error (erreur côté serveur)
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
 
// POST /api/transactions : créer une nouvelle transaction
app.post('/api/transactions', (req, res) => {
  try {
    // req.body : corps de la requête (parsé par express.json())
    const newTx = db.addTransaction(req.body);
    // 201 = Created (succès de création, différent de 200 = OK)
    res.status(201).json(newTx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// PUT /api/transactions/:id : modifier une transaction existante
// :id = paramètre dynamique dans l'URL (ex: /api/transactions/abc123)
app.put('/api/transactions/:id', (req, res) => {
  try {
    // req.params.id : valeur extraite de l'URL
    const updated = db.updateTransaction(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// DELETE /api/transactions/:id : supprimer
app.delete('/api/transactions/:id', (req, res) => {
  try {
    db.deleteTransaction(req.params.id);
    res.json({ success: true }); // 200 avec confirmation
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ── ROUTES OBJECTIFS ─────────────────────────────────────
app.get('/api/goals',        (req, res) => res.json(db.getGoals(req.query.userId || 'demo')));
app.post('/api/goals',       (req, res) => res.status(201).json(db.addGoal(req.body)));
app.put('/api/goals/:id',    (req, res) => res.json(db.updateGoal(req.params.id, req.body)));
app.delete('/api/goals/:id', (req, res) => { db.deleteGoal(req.params.id); res.json({ success: true }); });
 
// ── ROUTES IA ────────────────────────────────────────────
// Monter le router IA avec le rate limiter spécifique
// Toutes les routes dans ai.js seront préfixées par /api/ai
app.use('/api/ai', aiLimit, aiRouter);
 
// ── ROUTES AUTH (Phase 3) ─────────────────────────────────
app.use('/api/auth', authRouter);
 
// ── GESTION DES ERREURS 404 ──────────────────────────────
// Ce middleware est appelé si aucune route ne correspond
app.use((req, res) => {
  res.status(404).json({ error: `Route introuvable : ${req.method} ${req.path}` });
});
 
// ── GESTION GLOBALE DES ERREURS ─────────────────────────
// Middleware d'erreur : 4 paramètres (err, req, res, next)
// Express le reconnaît comme gestionnaire d'erreur grâce aux 4 params
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err.stack);
  res.status(500).json({ error: 'Une erreur interne est survenue' });
});
 
// ── DÉMARRAGE ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré : http://localhost:${PORT}`);
  // Initialiser la base de données (crée les tables si inexistantes)
  db.init();
});
 
module.exports = app; // exporté pour les tests Jest