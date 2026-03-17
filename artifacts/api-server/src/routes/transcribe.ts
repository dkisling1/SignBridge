import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.post("/transcribe", requireAuth, async (req, res) => {
  const { audioBase64, audio, mimeType = "audio/m4a" } = req.body;
  const audioData = audioBase64 || audio;

  if (!audioData) {
    res.status(400).json({ error: "Audio data is required." });
    return;
  }

  try {
    const buffer = Buffer.from(audioData, "base64");
    const ext = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" :
                mimeType.includes("webm") ? "webm" :
                mimeType.includes("ogg") ? "ogg" :
                mimeType.includes("wav") ? "wav" : "mp3";

    const file = new File([buffer], `audio.${ext}`, { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });

    res.json({ text: transcription.text });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ error: "Transcription failed. Please try again." });
  }
});

export default router;
