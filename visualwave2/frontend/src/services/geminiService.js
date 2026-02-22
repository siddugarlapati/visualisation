/**
 * geminiService.js
 * Calls Google Gemini API to generate 3D visualization scripts
 * for any user-requested concept topic.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Engine API Reference (for the AI prompt):
 *
 * engine.reset()                                   – clear the scene
 * engine.createArrayAPI(name, data, x?, y?)        – create a labeled array of boxes
 * engine.arrayHighlight(name, index, hexColor)     – highlight box at index
 * engine.arrayMovePointer(name, index, label)      – move pointer arrow to index
 * engine.arrayUpdate(name, index, value)           – update label of box
 * engine.arraySwap(name, i, j)                     – animate swap of two boxes
 * engine.graphCreateNode(id, label, x, y, type)    – create a 3D node
 *   valid types: 'database','server','frontend','backend','cloud','security',
 *                'cache','queue','kubernetes','ml_model'
 * engine.graphConnect(fromId, toId, directed)      – draw edge between nodes
 * engine.highlight(nodeId, hexColor)               – color a node
 * engine.pulse(nodeId)                             – animate a pulse on node
 *
 * All methods are available on the engine object.
 * Use "await delay(ms)" for pauses between steps.
 * Call "onStep({ title: string, explanation: string })" to update the narration panel.
 */

const SYSTEM_PROMPT = `You are an expert computer science educator and you generate 3D visualization scripts for programming concepts.

Given a topic/concept, generate a JSON response with this structure:
{
  "title": "Topic Name",
  "icon": "emoji",
  "code": "code example as a string (use \\n for newlines)",
  "desc": "one-sentence description",
  "steps": [
    {
      "title": "Step title",
      "explanation": "Clear, educational explanation of this step"
    }
  ],
  "engineScript": "JavaScript async function body — use engine.* methods and onStep({title,explanation}) calls to animate the concept step by step"
}

Available engine API (all synchronous unless noted):
- engine.reset() — clear scene first
- engine.createArrayAPI(name, values[], x=0, y=0) — shows array of labeled boxes
- engine.arrayHighlight(name, index, 0xHEXCOLOR) — highlight a box (use 0x3b82f6=blue, 0x10b981=green, 0xef4444=red, 0xfbbf24=yellow, 0xec4899=pink, 0x6366f1=purple)
- engine.arrayMovePointer(name, index, label) — draw pointer arrow to index
- engine.arrayUpdate(name, index, newValue) — change box label
- engine.arraySwap(name, i, j) — swap two boxes (returns promise, await it)
- engine.graphCreateNode(id, label, x, y, type) where type is one of: database,server,frontend,backend,cloud,security,cache,queue,kubernetes,ml_model
- engine.graphConnect(fromId, toId, directed) — arrow between nodes
- engine.highlight(nodeId, 0xHEXCOLOR) — set node color
- engine.pulse(nodeId) — animate pulse

Rules:
1. Start with engine.reset()
2. Call onStep() BEFORE each visual change to narrate what's about to happen
3. Use await delay(ms) between steps (1000-1500ms is ideal)
4. Each visualization should have 5-8 meaningful steps
5. Use graphCreateNode for abstract concepts (processes, architecture, concepts)
6. Use createArrayAPI for data structures, sequences, or step-by-step processes
7. Make the visualization educational and clear
8. The engineScript must be valid JavaScript — it runs inside: async function(engine, onStep) { const delay = ms => new Promise(r=>setTimeout(r,ms)); ENGINE_SCRIPT_HERE }

Return ONLY valid JSON. No markdown, no code fences, no extra text.`;

export async function generateVisualization(topic) {
    const prompt = `Generate a comprehensive 3D visualization for: "${topic}"

Make it visually rich and educationally clear. Cover the key concepts step by step.`;

    const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Understood. I will generate valid JSON only for 3D visualization scripts.' }] },
                { role: 'user', parts: [{ text: prompt }] }
            ],
            generationConfig: {
                temperature: 0.65,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        let msg = `Gemini API error ${response.status}`;
        try {
            const parsed = JSON.parse(err);
            const detail = parsed?.error?.message || '';
            if (detail.includes('quota') || response.status === 429) {
                msg = 'API rate limit reached. Please wait a moment and try again.';
            } else {
                msg = detail || msg;
            }
        } catch { /* ignore */ }
        throw new Error(msg);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown fences if present
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (e) {
        throw new Error(`Failed to parse Gemini response as JSON: ${e.message}\n\nRaw: ${rawText.slice(0, 500)}`);
    }

    // Build a play() function from the engineScript string
    // eslint-disable-next-line no-new-func
    const playFn = new Function('engine', 'onStep', `
        const delay = ms => new Promise(r => setTimeout(r, ms));
        return (async () => {
            ${parsed.engineScript}
        })();
    `);

    return {
        id: `ai_${Date.now()}`,
        title: parsed.title || topic,
        icon: parsed.icon || '✨',
        code: parsed.code || `// ${topic}`,
        desc: parsed.desc || `AI-generated visualization for: ${topic}`,
        isAIGenerated: true,
        play: (engine, onStep) => playFn(engine, onStep),
    };
}
