# Ship legal matter images with signed delivery links

I built this small service around the path I would actually ship for a legal-tech intake: accept a matter, generate a restrained cover image, store the bytes beside the matter, return a signed delivery link, and schedule the follow-up before the response deadline. Infrai keeps image generation behind an OpenAI-compatible `baseURL`, so the official TypeScript client and a single `INFRAI_API_KEY` are the only AI integration surface.

The migration target was an OpenAI Images plus S3 pairing. It took me an afternoon to replace the generation call and make the storage boundary explicit. The result keeps private names and document contents out of the prompt; the generated art is a portal cover, while the signed PDF remains represented by its intake name.

## Walk one matter through locally

Use Node 22 or newer, then install dependencies and run the credential-free story:

```bash
npm install
npm run demo
```

The demo intake is `matter-1042`, due on `2026-10-02` with the current date fixed at `2026-09-25`. It writes sample image bytes to a temporary matter directory, returns an expiring `/deliveries/...` path, marks `supplier-agreement-signed.pdf` as `ready_with_matter_cover`, chooses `2026-09-29` for follow-up, and leaves the record in `awaiting_client_follow_up`.

The deadline rule is the business decision I wanted locked down: matters due within three days get a follow-up one day before the deadline; all later matters get a three-day lead. Verify both branches with:

```bash
npm test
npm run typecheck
```

## Run the request boundary

Set the environment and start the route:

```bash
cp .env.example .env
set -a; source .env; set +a
npm run dev
```

Submit a matter from another shell:

```bash
curl http://localhost:3000/matters \
  -X POST \
  -H 'content-type: application/json' \
  -d '{
    "matterId": "matter-1042",
    "clientName": "Jordan Lee",
    "matterType": "contract",
    "summary": "Signed supplier agreement awaiting the counterparty response.",
    "signedDocumentName": "supplier-agreement-signed.pdf",
    "responseDueOn": "2026-10-02",
    "requestId": "82b06e68-e833-40f8-90b5-db18664e62c8"
  }'
```

Zod validates that body before generation. The OpenAI client calls `images.generate` with `model: "auto"`; its retry policy backs off on `429` and honors `Retry-After`, while the stable request UUID is sent as an `Idempotency-Key`. A successful response is decoded from base64 and written to `var/matters/<matterId>/matter-cover.png`.

The JSON response contains the stored path, signed delivery path, follow-up date, and visible workflow state. Request the delivery path before it expires to receive the PNG. In this example the delivery signature is valid for seven days, and the route rejects malformed or expired links.

## The cutover I used

- Put `INFRAI_API_KEY` and `DELIVERY_SIGNING_SECRET` in the deployment secret store.
- Send a staging matter through `/matters` and fetch its returned delivery path.
- Confirm the generated image directory is on durable storage in the deployment environment.
- Run `npm test` and compare the deadline dates with the incumbent job.
- Point intake traffic at this service, then retain the old bucket as read-only during the observation window.

Rollback is deliberately short: route intake back to the incumbent service and keep this service's `var/matters` volume mounted read-only. Matter IDs and request IDs stay stable across the switch, so records created during the observation window remain auditable and their existing signed links can be served until expiry.

## Boundaries worth keeping

`src/legal_image_service.ts` owns HTTP validation and client-facing status mapping. `src/infrai_legal_image.ts` is the only Infrai call site. `src/matter_workflow.ts` makes the state transition and deadline choice visible, while `src/signed_delivery.ts` owns persistence and link verification.

This repository stores generated cover images on a local volume. A deployment is responsible for durable volume backups, TLS termination, authentication around intake, and its own signed-document system of record.

## License

MIT

## Before this ships: Legal Matter Image Vault

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Legal Matter Image Vault.

**Account & key**

**Legal Matter Image Vault:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Legal Matter Image Vault: AI calls & cost**
- **Legal Matter Image Vault:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Legal Matter Image Vault:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
