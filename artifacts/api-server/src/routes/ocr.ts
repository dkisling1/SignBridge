import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.post("/ocr", requireAuth, async (req, res) => {
  const { imageBase64, image, mimeType = "image/jpeg" } = req.body;
  const imageData = imageBase64 || image;

  if (!imageData) {
    res.status(400).json({ error: "Image data is required." });
    return;
  }

  try {
    const dataUrl = imageData.startsWith("data:")
      ? imageData
      : `data:${mimeType};base64,${imageData}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all readable text from this image. Return only the extracted text, exactly as it appears, with no commentary, no markdown formatting, and no extra explanation. If there is no readable text, return an empty string.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
      max_completion_tokens: 1024,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ text });
  } catch (err) {
    console.error("OCR error:", err);
    res.status(500).json({ error: "OCR failed. Please try again." });
  }
});

export default router;
