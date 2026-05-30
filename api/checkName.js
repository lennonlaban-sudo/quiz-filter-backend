const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

export default async function handler(req, res) {
  // 1. CORS-Header setzen (Behebt den "NetworkError")
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Erlaubt den Zugriff von überall
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 2. Preflight-Anfrage (OPTIONS) sofort erfolgreich beantworten
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Wir akzeptieren nur POST-Anfragen
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST-Anfragen sind erlaubt' });
  }

  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Kein Name übergeben' });
  }

  try {
    // 3. Gemini API initialisieren (Der Key muss in den Vercel Einstellungen als Environment Variable liegen!)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 4. Sicherheitsfilter lockern! (Sehr wichtig, damit "Unterhose" nicht direkt geblockt wird)
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ];

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings: safetySettings,
    });

    // 5. Der genaue Prompt, der den Unterschied zwischen Spaß und Beleidigung erklärt
    const prompt = `
    Du bist ein Namensfilter für ein lockeres, lustiges Schul-Quiz. Deine Aufgabe ist es zu entscheiden, ob ein Spielername erlaubt ist oder blockiert werden muss.

    ERLAUBT (Antworte mit ACCEPT):
    - Normale Vornamen und Namen (z.B. "Max", "Julia")
    - Alberne Wörter, Kleidungsstücke und Alltagsgegenstände (z.B. "Unterhose", "Höschen", "Socke", "Käsefuß")
    - Leichte, kindische Scherze (z.B. "Furzkissen", "Dummkopf", "Lauch", "Affe", "Streber", "Affe", "Knecht")
    - Typische Namen für Gruppen bei Wettbewerben (z.B. "Koboldclan", "Gulaschgruppe")

    VERBOTEN (Antworte mit REJECT):
    - Harte Beleidigungen und Schimpfwörter (z.B. "Hurensohn", "Wichser", "Fotze")
    - Harter Rassismus, Antisemitismus, Nazisymbole (z.B. "Hitler", "N-Wort")
    - Echte Pornografie oder extrem sexuelle Begriffe.
    - Menschenfeindliche Namen
    - Sexistische Namen (zb. "Huhre", "Schlampe", "Fotze")
    - sexuelle Begriffe (z.B. "Sex", "Runterholen", "Wichsen", "Wichse", "Wichser", "Wixxer")
    - Und generell alle möglichen Umschreibungen von diesen Namen (z.B. "P1mm3l", "W1chser")
    - Und alle deutschen Beleidigungen, die extrem unangemessen sind (aber nicht z.B. "Lauch", "Pflaume", "Hohlkopf", "Warmduscher", "Affe", "Esel", "Knecht", etc.)
    


    Bewerte diesen Namen: "${name}"

    Antworte AUSSCHLIESSLICH mit exakt einem Wort: ACCEPT oder REJECT.
    `;

    // Anfrage an die KI senden
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().toUpperCase();

    // Auswerten: Wenn die KI "REJECT" sagt, ist der Name unangebracht (isBad = true)
    const isBad = responseText.includes('REJECT');

    // Antwort an dein HTML Frontend zurücksenden
    return res.status(200).json({ isBad: isBad });

  } catch (error) {
    console.error('Gemini API Fehler:', error);
    // Bei einem Fehler (z.B. API Key falsch) senden wir einen Server-Fehler.
    // Dein Frontend erkennt das und nutzt automatisch den lokalen 5-Wörter Notfall-Filter!
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
