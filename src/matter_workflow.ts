import type {
  MatterImageGenerator,
  MatterIntake,
  MatterRecord
} from "./matter_contracts.js";
import { SignedDeliveryStore } from "./signed_delivery.js";

const DAY_MS = 86_400_000;

export function chooseFollowUpDate(responseDueOn: string, today: string): string {
  const due = Date.parse(`${responseDueOn}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  const daysUntilDue = Math.ceil((due - current) / DAY_MS);
  const leadDays = daysUntilDue <= 3 ? 1 : 3;
  return new Date(Math.max(current, due - leadDays * DAY_MS))
    .toISOString()
    .slice(0, 10);
}

export async function openMatter(
  intake: MatterIntake,
  generateImage: MatterImageGenerator,
  store: SignedDeliveryStore,
  today = new Date().toISOString().slice(0, 10)
): Promise<MatterRecord> {
  const image = await generateImage(intake);
  const imagePath = await store.put(intake.matterId, image.bytes);
  const expiresAt = Math.floor(Date.now() / 1_000) + 7 * 24 * 60 * 60;

  return {
    matterId: intake.matterId,
    imagePath,
    deliveryPath: store.issuePath(intake.matterId, expiresAt),
    signedDocumentDelivery: {
      documentName: intake.signedDocumentName,
      status: "ready_with_matter_cover"
    },
    followUpOn: chooseFollowUpDate(intake.responseDueOn, today),
    state: "awaiting_client_follow_up"
  };
}
