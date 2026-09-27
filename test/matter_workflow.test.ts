import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chooseFollowUpDate, openMatter } from "../src/matter_workflow.js";
import { SignedDeliveryStore } from "../src/signed_delivery.js";

test("a close deadline moves follow-up to the day before it is due", () => {
  assert.equal(chooseFollowUpDate("2026-09-28", "2026-09-25"), "2026-09-27");
});

test("a later deadline leaves a three-day follow-up window", () => {
  assert.equal(chooseFollowUpDate("2026-10-02", "2026-09-25"), "2026-09-29");
});

test("intake exposes the signed document delivery state", async () => {
  const root = await mkdtemp(join(tmpdir(), "matter-test-"));
  const result = await openMatter(
    {
      matterId: "matter-1042",
      clientName: "Jordan Lee",
      matterType: "contract",
      summary: "Signed supplier agreement awaiting the counterparty response.",
      signedDocumentName: "supplier-agreement-signed.pdf",
      responseDueOn: "2026-10-02",
      requestId: "82b06e68-e833-40f8-90b5-db18664e62c8"
    },
    async () => ({ bytes: Buffer.from("cover"), mediaType: "image/png" }),
    new SignedDeliveryStore(root, "test-signing-secret"),
    "2026-09-25"
  );

  assert.deepEqual(result.signedDocumentDelivery, {
    documentName: "supplier-agreement-signed.pdf",
    status: "ready_with_matter_cover"
  });
  assert.equal(result.followUpOn, "2026-09-29");
});
