import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // 1. Erlaube deinem Spiel, auf diesen Server zuzugreifen (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Beantworte die Vorab-Sicherheitsanfrage des Browsers
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Wir akzeptieren nur POST-Anfragen
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    try {
        const { name } = req.body;
        if (!name || name.trim() === "") {
            return res.status(200).json({ isBad: true });
        }

        // 3. Mit Gemini verbinden (Key kommt sicher aus den Vercel Settings)
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 4. Der strenge Prompt für die KI
        const prompt = `Du bist ein strenger Filter für Spielernamen eines Schulquiz. Prüfe den Namen "${name}" auf: Schimpfwörter, sexuelle Begriffe, Leetspeak (wie p!mm3l oder w1xXer), unangebrachte Jugendwörter (goon, edger etc.) und Diktatoren. Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in exakt diesem Format: {"isBad": true} oder {"isBad": false}. Schreibe absolut keinen anderen Text.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // 5. Lese die KI Antwort und sende sie ans Spiel zurück
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonResult = JSON.parse(jsonMatch[0]);
            return res.status(200).json({ isBad: jsonResult.isBad });
        } else {
            return res.status(200).json({ isBad: false }); 
        }

    } catch (error) {
        console.error("Gemini API Fehler:", error);
        return res.status(200).json({ isBad: false });
    }
}
