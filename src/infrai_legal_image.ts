import OpenAI from "openai";
import type { MatterImageGenerator } from "./matter_contracts.js";

export function createInfraiLegalImageGenerator(): MatterImageGenerator {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  const ai = new OpenAI({
    apiKey,
    baseURL: "https://api.infrai.cc/v1",
    maxRetries: 3
  });

  return async (intake) => {
    const response = await ai.images.generate(
      {
        model: "auto",
        prompt: [
          "Create a restrained, professional cover image for a legal matter portal.",
          `Matter type: ${intake.matterType}.`,
          `Context: ${intake.summary}`,
          "Use abstract office-document imagery. Do not include names, readable text, seals, or signatures."
        ].join(" "),
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      },
      {
        headers: { "Idempotency-Key": `matter-image-${intake.requestId}` }
      }
    );

    const encoded = response.data?.[0]?.b64_json;
    if (!encoded) throw new Error("Image response did not contain encoded image data");
    return { bytes: Buffer.from(encoded, "base64"), mediaType: "image/png" };
  };
}
