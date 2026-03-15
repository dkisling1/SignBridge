import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { TranslateToASLBody } from "@workspace/api-zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are an expert ASL (American Sign Language) linguist and interpreter specializing in Topic-Comment Structure.

Your task is to translate English sentences into ASL Topic-Comment Structure format.

KEY ASL GRAMMAR RULES you must follow:
1. Topic-Comment structure: every sentence has a TOPIC (what you're talking about) and a COMMENT (what you say about it)
2. ASL omits "be" verbs (am, is, are, was, were)
3. ASL omits articles (a, an, the)
4. Time signs go at the beginning of sentences (e.g., YESTERDAY, TOMORROW, LAST-WEEK)
5. The most common ASL sign order is Subject-Verb-Object (SVO), NOT always OSV
6. When topicalizing an object (moving it to front with raised eyebrows), mark it clearly
7. ALL ASL gloss is written in CAPS
8. Hyphens connect compound concepts (LAST-WEEK, GOOD-MORNING, etc.)

STRUCTURE TYPES:
- "SVO": Subject-Verb-Object (most common) — Topic is the subject
- "OSV": Object-Subject-Verb — Object is topicalized (passive voice in English)
- "topicalized": Object moved to front with eyebrow raise for emphasis or when subject is unknown

FOR EACH SENTENCE, provide:
- topic: The topic portion (first element, in ASL CAPS)
- comment: The comment portion (remaining elements, in ASL CAPS)
- aslStructure: The complete ASL glossed output (ALL CAPS, hyphens for compounds)
- structureType: "SVO", "OSV", or "topicalized"
- notes: A brief, educational explanation of the grammar choices (1-3 sentences, in plain English)

IMPORTANT PRINCIPLES:
- Prefer SVO unless there's a clear reason to topicalize
- Use topicalization when: the subject is unknown, the object is a known/shared reference, or for emphasis
- Remove unnecessary English words that have no ASL equivalent
- Convert tense words to time signs at the start

Respond with ONLY valid JSON matching this exact structure:
{
  "sentences": [
    {
      "original": "The original English sentence.",
      "topic": "TOPIC-PART",
      "comment": "COMMENT PART HERE",
      "aslStructure": "FULL ASL STRUCTURE",
      "structureType": "SVO",
      "notes": "Explanation of grammar choices."
    }
  ],
  "summary": "Brief overall summary of the translation."
}`;

router.post("/translate", async (req, res) => {
  const parseResult = TranslateToASLBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request: text is required and must be under 5000 characters" });
    return;
  }

  const { text } = parseResult.data;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Please translate the following English text into ASL Topic-Comment Structure format:\n\n${text}`
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
    res.json(parsed);
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: "Failed to translate text. Please try again." });
  }
});

export default router;
