import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { LookupWordBody } from "@workspace/api-zod";
import * as cheerio from "cheerio";
import { getSetting } from "./settings";

const router: IRouter = Router();

async function fetchAslBloomSign(word: string): Promise<string | null> {
  try {
    const slug = word.toLowerCase().trim().replace(/\s+/g, "-");
    const url = `https://www.aslbloom.com/signs/${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SignBridge/1.0)"
      }
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    let signDescription: string | null = null;

    $("h2").each((_, el) => {
      const heading = $(el).text().trim();
      if (heading === "How to sign") {
        const descDiv = $(el).nextAll(".w-richtext").first();
        if (descDiv.length) {
          signDescription = descDiv.text().trim() || null;
        }
        if (!signDescription) {
          const descP = $(el).nextAll("p").not(".w-condition-invisible").first();
          if (descP.length) {
            signDescription = descP.text().trim() || null;
          }
        }
      }
    });

    return signDescription;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You are an expert ASL (American Sign Language) linguist and dictionary specialist.

When given a word, provide:
1. The word's part of speech (noun, verb, adjective, etc.)
2. A clear, concise English definition
3. A brief description of the ASL sign (handshape, movement, location — described in plain English)
4. Two example sentences that demonstrate the word in use, each expressed in ASL Topic-Comment structure

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
  "aslSign": "Brief description of the ASL sign for this word.",
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

const AI_SIGN_PROMPT = `You are an expert ASL (American Sign Language) linguist and dictionary specialist.

When given a word, provide ONLY:
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

router.post("/dictionary", async (req, res) => {
  const parseResult = LookupWordBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request: word is required and must be under 100 characters" });
    return;
  }

  const { word } = parseResult.data;

  try {
    const [aslBloomSign, howToSignEnabled] = await Promise.all([
      fetchAslBloomSign(word),
      getSetting("howToSignEnabled"),
    ]);
    const showHowToSign = howToSignEnabled !== "false";

    if (aslBloomSign && showHowToSign) {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 4096,
        messages: [
          { role: "system", content: AI_SIGN_PROMPT },
          { role: "user", content: `Look up the word: "${word}"` }
        ],
        response_format: { type: "json_object" }
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        res.status(500).json({ error: "No response from AI model" });
        return;
      }

      const parsed = JSON.parse(raw);
      parsed.aslSign = aslBloomSign;
      res.json(parsed);
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

      const parsed = JSON.parse(raw);
      if (!showHowToSign) {
        delete parsed.aslSign;
      }
      res.json(parsed);
    }
  } catch (err) {
    console.error("Dictionary error:", err);
    res.status(500).json({ error: "Failed to look up word. Please try again." });
  }
});

export default router;
