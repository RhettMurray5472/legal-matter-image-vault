import express from "express";
import OpenAI from "openai";
import { z } from "zod";
import { createInfraiLegalImageGenerator } from "./infrai_legal_image.js";
import { matterIntakeSchema } from "./matter_contracts.js";
import { openMatter } from "./matter_workflow.js";
import { SignedDeliveryStore } from "./signed_delivery.js";

const secret = process.env.DELIVERY_SIGNING_SECRET;
if (!secret) throw new Error("Set DELIVERY_SIGNING_SECRET before starting the service");

const app = express();
const store = new SignedDeliveryStore("var/matters", secret);
const generateImage = createInfraiLegalImageGenerator();
app.use(express.json({ limit: "32kb" }));

app.post("/matters", async (request, response) => {
  const parsed = matterIntakeSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "invalid_matter_intake", issues: z.treeifyError(parsed.error) });
    return;
  }

  try {
    response.status(201).json(await openMatter(parsed.data, generateImage, store));
  } catch (error) {
    if (error instanceof OpenAI.APIStatusError && error.status < 500) {
      response.status(error.status).json({ error: "image_request_rejected", detail: error.message });
      return;
    }
    throw error;
  }
});

app.get("/deliveries/:matterId", async (request, response) => {
  const query = z.object({ expires: z.coerce.number().int(), signature: z.string() }).safeParse(request.query);
  if (!query.success) {
    response.status(400).json({ error: "invalid_delivery_link" });
    return;
  }
  const image = await store.read(request.params.matterId, query.data.expires, query.data.signature);
  if (!image) {
    response.status(403).json({ error: "delivery_link_denied" });
    return;
  }
  response.type("png").send(image);
});

app.listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Legal image service listening on http://localhost:${process.env.PORT ?? 3000}`);
});
