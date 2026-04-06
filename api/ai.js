const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { analysisType, currentMonth, trends, goals } = req.body;

  if (!analysisType || !currentMonth) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  const systemPrompt = `Tu es un conseiller financier expert et bienveillant.
Réponds UNIQUEMENT en JSON valide sans balises markdown :
{
  "resumeMensuel": "Résumé en 1-2 phrases",
  "conseils": [
    {
      "type": "economie|alerte|tendance|objectif",
      "titre": "Titre court max 60 caractères",
      "message": "Conseil détaillé en 2-3 phrases"
    }
  ]
}
Génère entre 3 et 5 conseils. Utilise les chiffres exacts. Sois encourageant.`;

  const userPrompt = `
Analyse ces données financières :

=== MOIS EN COURS (${currentMonth.month}) ===
- Revenus : ${currentMonth.totalIncome} €
- Dépenses : ${currentMonth.totalExpenses} €
- Bilan : ${currentMonth.balance} €

Répartition dépenses :
${Object.entries(currentMonth.byCategory || {})
  .map(([cat, amt]) => `- ${cat} : ${Number(amt).toFixed(2)} €`)
  .join('\n')}

=== TENDANCES 3 MOIS ===
${(trends || []).map(t =>
  `- ${t.month} : revenus ${t.income}€ / dépenses ${t.expenses}€ / bilan ${t.balance}€`
).join('\n')}

=== OBJECTIFS ===
${(goals || []).length > 0
  ? goals.map(g => `- ${g.name} : ${g.currentAmount}€/${g.targetAmount}€ (${g.percentage}%)`).join('\n')
  : 'Aucun objectif.'}
`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userPrompt);
    const rawText = result.response.text();

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed.conseils || !Array.isArray(parsed.conseils)) {
      throw new Error('Format invalide');
    }

    parsed.conseils = parsed.conseils.slice(0, 5);
    res.json(parsed);

  } catch (err) {
    console.error('Erreur Gemini:', err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: 'Quota dépassé. Réessayez.' });
    }
    res.status(500).json({ error: 'Erreur analyse IA' });
  }
};
