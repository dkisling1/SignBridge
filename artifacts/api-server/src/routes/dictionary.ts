import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { LookupWordBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function fetchMerriamWebster(word: string): Promise<{ definition: string; partOfSpeech: string } | null> {
  const apiKey = process.env.MERRIAM_WEBSTER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0 || typeof data[0] === "string") {
      return null;
    }

    const entry = data[0];
    const definition = entry.shortdef?.[0] ?? null;
    const partOfSpeech = entry.fl ?? null;

    if (!definition) return null;

    return { definition, partOfSpeech };
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You are an expert ASL (American Sign Language) linguist and dictionary specialist.

When given a word, provide:
1. The word's part of speech (noun, verb, adjective, etc.)
2. A clear, concise English definition
3. Two example sentences that demonstrate the word in use, each expressed in ASL Topic-Comment structure

ASL GRAMMAR RULES for the example sentences:
- Write ASL gloss in ALL CAPS
- Omit "be" verbs (am, is, are, was, were)
- Omit articles (a, an, the)
- Use hyphens for compound signs (LAST-WEEK, GOOD-MORNING)
- Time signs go at the beginning of the sentence
- Most common structure: Subject-Verb-Object (SVO)
- Use topicalization (OSV) when appropriate for emphasis or when subject is unknown

STRUCTURE TYPES:
- "SVO": Subject-Verb-Object (most common)
- "OSV": Object-Subject-Verb (object topicalized)
- "topicalized": object moved front with eyebrow raise

Make the two example sentences clearly different from each other — one should ideally use SVO and one should use OSV or topicalization to show variety.

Respond ONLY with valid JSON in this exact structure:
{
  "word": "the word",
  "partOfSpeech": "noun",
  "definition": "Clear English definition here.",
  "examples": [
    {
      "english": "Example sentence in English.",
      "topic": "TOPIC-PART",
      "comment": "COMMENT PART",
      "aslStructure": "FULL ASL GLOSS",
      "structureType": "SVO",
      "notes": "Brief grammar explanation."
    },
    {
      "english": "Second example sentence in English.",
      "topic": "TOPIC-PART",
      "comment": "COMMENT PART",
      "aslStructure": "FULL ASL GLOSS",
      "structureType": "OSV",
      "notes": "Brief grammar explanation."
    }
  ]
}`;

const MW_SYSTEM_PROMPT = `You are an expert ASL (American Sign Language) linguist and dictionary specialist.

You will be given a word along with its English definition and part of speech from Merriam-Webster. Your job is to generate two example sentences using that word, expressed in ASL Topic-Comment structure.

ASL GRAMMAR RULES for the example sentences:
- Write ASL gloss in ALL CAPS
- Omit "be" verbs (am, is, are, was, were)
- Omit articles (a, an, the)
- Use hyphens for compound signs (LAST-WEEK, GOOD-MORNING)
- Time signs go at the beginning of the sentence
- Most common structure: Subject-Verb-Object (SVO)
- Use topicalization (OSV) when appropriate for emphasis or when subject is unknown

STRUCTURE TYPES:
- "SVO": Subject-Verb-Object (most common)
- "OSV": Object-Subject-Verb (object topicalized)
- "topicalized": object moved front with eyebrow raise

Make the two example sentences clearly different — one SVO and one OSV or topicalized.

Respond ONLY with valid JSON in this exact structure:
{
  "examples": [
    {
      "english": "Example sentence in English.",
      "topic": "TOPIC-PART",
      "comment": "COMMENT PART",
      "aslStructure": "FULL ASL GLOSS",
      "structureType": "SVO",
      "notes": "Brief grammar explanation."
    },
    {
      "english": "Second example sentence in English.",
      "topic": "TOPIC-PART",
      "comment": "COMMENT PART",
      "aslStructure": "FULL ASL GLOSS",
      "structureType": "OSV",
      "notes": "Brief grammar explanation."
    }
  ]
}`;

router.post("/dictionary", async (req, res) => {
  const parseResult = LookupWordBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request: word is required and must be under 100 characters" });
    return;
  }

  const { word } = parseResult.data;

  try {
    const mwData = await fetchMerriamWebster(word);

    if (mwData) {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 4096,
        messages: [
          { role: "system", content: MW_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Word: "${word}"\nPart of speech: ${mwData.partOfSpeech}\nDefinition: ${mwData.definition}\n\nGenerate two ASL Topic-Comment example sentences for this word.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        res.status(500).json({ error: "No response from AI model" });
        return;
      }

      const parsed = JSON.parse(raw);
      res.json({
        word,
        partOfSpeech: mwData.partOfSpeech,
        definition: mwData.definition,
        examples: parsed.examples ?? [],
      });
    } else {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Look up the word: "${word}"` }
        ],
        response_format: { type: "json_object" }
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        res.status(500).json({ error: "No response from AI model" });
        return;
      }

      res.json(JSON.parse(raw));
    }
  } catch (err) {
    console.error("Dictionary error:", err);
    res.status(500).json({ error: "Failed to look up word. Please try again." });
  }
});

export default router;
