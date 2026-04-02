// ════════════════════════════════════════════════════════════
// server/auth.js — Authentification JWT (Phase 3)
// ════════════════════════════════════════════════════════════
 
const express = require('express');
const bcrypt  = require('bcrypt');  // hashage sécurisé des mots de passe
const jwt     = require('jsonwebtoken'); // génération/vérification de tokens
const db      = require('./db');
 
const router = express.Router();
 
// ── REGISTER : créer un compte ────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
 
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });
  }
 
  // bcrypt.hash : hash le mot de passe avec 12 rounds de salage
  // Plus le nombre est élevé, plus c'est sécurisé mais lent
  // 12 = bon compromis (recommandé en 2026)
  const hashedPassword = await bcrypt.hash(password, 12);
 
  try {
    const user = db.addUser({ email, password: hashedPassword });
    // Ne jamais renvoyer le mot de passe (même hashé) dans la réponse
    const { password: _, ...safeUser } = user;
    res.status(201).json({
      user: safeUser,
      token: generateToken(user) // génère le JWT immédiatement
    });
  } catch (err) {
    // SQLite lève une erreur UNIQUE si l'email existe déjà
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email déjà utilisé' }); // 409 Conflict
    }
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
});
 
// ── LOGIN : connexion ────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
 
  // Récupérer l'utilisateur par email
  const user = db.getUserByEmail(email);
  if (!user) {
    // Message volontairement vague pour ne pas révéler si l'email existe
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
 
  // bcrypt.compare : compare le mot de passe clair avec le hash stocké
  // Le salt est intégré dans le hash → pas besoin de le stocker séparément
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
 
  const { password: _, ...safeUser } = user; // exclure le hash du mot de passe
  res.json({
    user: safeUser,
    token: generateToken(user),
  });
});
 
// ── GÉNÉRATION DU JWT ────────────────────────────────────
function generateToken(user) {
  // jwt.sign(payload, secret, options)
  // payload : données non-sensibles encodées dans le token
  // JWT_SECRET : clé secrète définie dans .env — ne JAMAIS la committer
  // expiresIn : le token expire après 7 jours
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
 
// ── MIDDLEWARE D'AUTHENTIFICATION ────────────────────────
// Exporté et utilisé dans index.js pour protéger les routes
// Ex : app.get('/api/transactions', authMiddleware, handler)
function authMiddleware(req, res, next) {
  // Le token est envoyé dans le header : Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
 
  const token = authHeader.slice(7); // retire 'Bearer '
 
  try {
    // jwt.verify : vérifie la signature ET l'expiration
    // Si invalide → lève une exception
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // injecte les infos user dans req pour les handlers
    next(); // passe au middleware/handler suivant
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
    }
    res.status(401).json({ error: 'Token invalide' });
  }
}
 
module.exports = router;
module.exports.authMiddleware = authMiddleware;