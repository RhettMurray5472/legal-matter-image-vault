import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export class SignedDeliveryStore {
  private readonly root: string;
  private readonly secret: string;

  constructor(root: string, secret: string) {
    this.root = root;
    this.secret = secret;
  }

  async put(matterId: string, bytes: Uint8Array): Promise<string> {
    const path = join(this.root, matterId, "matter-cover.png");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    return path;
  }

  issuePath(matterId: string, expiresAt: number): string {
    const payload = `${matterId}.${expiresAt}`;
    const signature = createHmac("sha256", this.secret).update(payload).digest("hex");
    return `/deliveries/${matterId}?expires=${expiresAt}&signature=${signature}`;
  }

  async read(matterId: string, expiresAt: number, signature: string): Promise<Buffer | null> {
    if (expiresAt <= Math.floor(Date.now() / 1_000)) return null;
    const expected = createHmac("sha256", this.secret)
      .update(`${matterId}.${expiresAt}`)
      .digest("hex");
    const supplied = Buffer.from(signature, "utf8");
    const wanted = Buffer.from(expected, "utf8");
    if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) return null;
    return readFile(join(this.root, matterId, "matter-cover.png"));
  }
}
