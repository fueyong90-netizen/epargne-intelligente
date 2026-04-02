const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Initialisation du client Gemini
// La clé est lue depuis .env — jamais écrite en dur
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Modèle Gemini à utiliser
// gemini-1.5-flash : rapide et gratuit
// gemini-1.5-pro   : plus puissant mais quota limité
const MODEL = 'gemini-1.5-flash';

// Prompts système par type d'analyse
const SYSTEM_PROMPTS = {
  monthly: `Tu es un conseiller financier expert et bienveillant.
Tu analyses des données budgétaires mensuelles agrégées.
Réponds UNIQUEMENT en JSON valide sans balises markdown, sans texte avant ou après :
{
  "resumeMensuel": "Résumé en 1-2 phrases",
  "conseils": [
    {
      "type": "economie|alerte|tendance|objectif",
      "titre": "Titre court max 60 caractères",
      "message": "Conseil détaillé et actionnable en 2-3 phrases"
    }
  ]
}
Génère entre 3 et 5 conseils. Utilise les chiffres exacts fournis. Sois encourageant.`,

  tips: `Tu es un coach financier personnel.
Analyse les habitudes de dépenses et génère 5 conseils pratiques pour économiser.
Réponds UNIQUEMENT en JSON valide sans balises markdown :
{
  "resumeMensuel": "Résumé en 1 phrase",
  "conseils": [
    {
      "type": "economie|alerte|tendance|objectif",
      "titre": "Titre court",
      "message": "Conseil actionnable"
    }
  ]
}`,

  forecast: `Tu es un analyste financier.
Prévois le solde de fin de mois basé sur les habitudes passées.
Réponds UNIQUEMENT en JSON valide sans balises markdown :
{
  "resumeMensuel": "Prévision en 1 phrase",
  "conseils": [
    {
      "type": "tendance",
      "titre": "Titre",
      "message": "Explication détaillée"
    }
  ]
}`,

  plan: `Tu es un planificateur financier.
Crée un plan d'épargne mensuel pour atteindre les objectifs listés.
Réponds UNIQUEMENT en JSON valide sans balises markdown :
{
  "resumeMensuel": "Résumé du plan",
  "conseils": [
    {
      "type": "objectif",
      "titre": "Titre",
      "message": "Étape concrète du plan"
    }
  ]
}`
};

// Route POST /api/ai/analyze
router.post('/analyze', async (req, res) => {
  const { analysisType, currentMonth, trends, goals } = req.body;

  // Validation des données reçues
  if (!analysisType || !currentMonth) {
    return res.status(400).json({
      error: 'Données manquantes : analysisType et currentMonth requis'
    });
  }

  // Sélection du prompt selon le type d'analyse
  const systemPrompt = SYSTEM_PROMPTS[analysisType] || SYSTEM_PROMPTS.monthly;

  // Construction du prompt utilisateur avec les données réelles
  const userPrompt = `
Analyse ces données financières et génère des conseils personnalisés.

=== MOIS EN COURS (${currentMonth.month}) ===
- Revenus : ${currentMonth.totalIncome} €
- Dépenses : ${currentMonth.totalExpenses} €
- Bilan : ${currentMonth.balance} €

Répartition des dépenses :
${Object.entries(currentMonth.byCategory || {})
  .map(([cat, amt]) => `- ${cat} : ${Number(amt).toFixed(2)} €`)
  .join('\n')}

=== TENDANCES (3 derniers mois) ===
${(trends || []).map(t =>
  `- ${t.month} : revenus ${t.income}€ / dépenses ${t.expenses}€ / bilan ${t.balance}€`
).join('\n')}

=== OBJECTIFS D'ÉPARGNE ===
${(goals || []).length > 0
  ? goals.map(g => `- ${g.name} : ${g.currentAmount}€ / ${g.targetAmount}€ (${g.percentage}%)`).join('\n')
  : 'Aucun objectif défini.'}
`;

  try {
    // Initialiser le modèle Gemini
    const model = genAI.getGenerativeModel({
      model: MODEL,
      // systemInstruction : équivalent du prompt système dans Gemini
      systemInstruction: systemPrompt,
    });

    // Appel à l'API Gemini
    const result = await model.generateContent(userPrompt);

    // Extraire le texte de la réponse
    const rawText = result.response.text();

    // Nettoyer les éventuelles balises markdown que Gemini ajoute parfois
    // Ex: ```json ... ``` → on retire les backticks
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/,    '')
      .trim();

    // Parser le JSON retourné par Gemini
    const parsed = JSON.parse(cleaned);

    // Validation minimale de la structure
    if (!parsed.conseils || !Array.isArray(parsed.conseils)) {
      throw new Error('Format de réponse Gemini invalide');
    }

    // Limiter à 5 conseils maximum
    parsed.conseils = parsed.conseils.slice(0, 5);

    // Envoyer la réponse au frontend
    res.json(parsed);

  } catch (err) {
    console.error('Erreur API Gemini:', err.message);

    // Quota dépassé
    if (err.status === 429) {
      return res.status(429).json({
        error: 'Quota Gemini dépassé. Réessayez dans quelques minutes.'
      });
    }

    // Erreur de parsing JSON
    if (err instanceof SyntaxError) {
      return res.status(500).json({
        error: 'Réponse Gemini non parseable en JSON'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de l analyse IA'
    });
  }
});

module.exports = router;
