import { z } from "zod";

export const matterIntakeSchema = z.object({
  matterId: z.string().min(3).regex(/^[a-zA-Z0-9_-]+$/),
  clientName: z.string().min(1),
  matterType: z.enum(["contract", "employment", "property", "other"]),
  summary: z.string().min(20).max(2_000),
  signedDocumentName: z.string().min(1).max(120),
  responseDueOn: z.iso.date(),
  requestId: z.string().uuid()
});

export type MatterIntake = z.infer<typeof matterIntakeSchema>;

export type GeneratedMatterImage = {
  bytes: Uint8Array;
  mediaType: "image/png";
};

export type MatterImageGenerator = (
  intake: MatterIntake
) => Promise<GeneratedMatterImage>;

export type MatterRecord = {
  matterId: string;
  imagePath: string;
  deliveryPath: string;
  signedDocumentDelivery: {
    documentName: string;
    status: "ready_with_matter_cover";
  };
  followUpOn: string;
  state: "awaiting_client_follow_up";
};
