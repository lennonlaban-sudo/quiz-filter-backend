import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // 1. CORS-Header: Erlaubt deinem Spiel, auf diesen Server zuzugreifen
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Beantworte die Vorab-Sicherheitsanfrage des Browsers
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Wir akzeptieren nur POST-Anfragen
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    try {
        const { name } = req.body;
        
        // Leere Namen sofort blockieren
        if (!name || name.trim() === "") {
            return res.status(200).json({ isBad: true });
        }

        // 2. Mit Gemini verbinden
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Wir nutzen das schnelle Flash-Modell
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 3. Das ist das "Gehirn" des Filters. Hier stehen die exakten Regeln:
        const prompt = `Du bist ein hochintelligenter und strenger Filter für Spielernamen eines Schulquiz für Kinder und Jugendliche. 
Dein Ziel ist es, zu entscheiden, ob der Name "${name}" verboten werden muss.

REGELN FÜR VERBOT (isBad: true):
- Starke deutsche und englische Schimpfwörter/Beleidigungen (z.B. Hurensohn, fuck, bitch, cunt, wixxer, wichser).
- Sexuelle Begriffe, Körperteile und Pornografie (Pimmel, Fotze, Titten, dick, cock, vagina, porno, etc.).
- Unangebrachte Jugendwörter/Internetslang im sexuellen Kontext (goon, goonen, edger, etc.).
- Diktatoren und extremistische Begriffe (Hitler, Nazi, Stalin).
- ACHTUNG: Erkenne unbedingt Umschreibungen und Täuschungsversuche! Leetspeak (P1mm3l, h!tl3r, @sshole), fehlende oder zusätzliche Buchstaben (wixer, wixxxer, fck, b!tch) oder versteckte Leerzeichen (f u c k, p i m m e l) müssen gnadenlos blockiert werden.

REGELN FÜR ERLAUBT (isBad: false):
- Normale Vornamen und harmlose Fantasienamen.
- "Weiche" Schimpfwörter aus dem Tier- oder Pflanzenreich (LASS DIESE ZU: Esel, Affe, Pflaume, Lauch, Gurke, Banane).
- Harmlose Alltagsgegenstände und Kleidungsstücke (LASS DIESE ZU: Unterhose, Höschen, Socke, Schlüpfer).

Analysiere den Namen "${name}" genau nach diesen Regeln. 
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt in exakt diesem Format: {"isBad": true} oder {"isBad": false}. Schreibe absolut keinen anderen Text oder Erklärungen.`;

        // 4. KI fragen
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // 5. Antwort auswerten (JSON extrahieren, falls die KI aus Versehen noch Text drumherum schreibt)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonResult = JSON.parse(jsonMatch[0]);
            return res.status(200).json({ isBad: jsonResult.isBad === true });
        } else {
            // Fallback, falls die KI komisch antwortet
            return res.status(200).json({ isBad: false }); 
        }

    } catch (error) {
        console.error("Gemini API Fehler:", error);
        // Bei einem Server-Fehler lassen wir das Spiel lieber weiterlaufen, statt es kaputt zu machen
        return res.status(200).json({ isBad: false });
    }
}
