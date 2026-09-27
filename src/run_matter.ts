import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MatterIntake } from "./matter_contracts.js";
import { openMatter } from "./matter_workflow.js";
import { SignedDeliveryStore } from "./signed_delivery.js";

const intake: MatterIntake = {
  matterId: "matter-1042",
  clientName: "Jordan Lee",
  matterType: "contract",
  summary: "Signed supplier agreement awaiting the counterparty response.",
  signedDocumentName: "supplier-agreement-signed.pdf",
  responseDueOn: "2026-10-02",
  requestId: "82b06e68-e833-40f8-90b5-db18664e62c8"
};

const root = await mkdtemp(join(tmpdir(), "legal-image-demo-"));
const store = new SignedDeliveryStore(root, "local-demo-signing-secret");
const record = await openMatter(
  intake,
  async () => ({ bytes: Buffer.from("demo image bytes"), mediaType: "image/png" }),
  store,
  "2026-09-25"
);

console.log(JSON.stringify(record, null, 2));
