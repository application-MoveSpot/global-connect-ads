import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { inlineStorageImage } from "../storage-image.server.ts";

const originalFetch = globalThis.fetch;
const origin = "https://storage.example.test";
const imageUrl = `${origin}/storage/v1/object/sign/vehicle-photos/photo.jpg?token=test`;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("sends image bytes inline with the actual MIME type, not a signed URL", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.redirect, "error");
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } });
  };
  assert.equal(await inlineStorageImage(imageUrl, origin), "data:image/png;base64,AQID");
});

test("rejects other hosts and non-storage URLs without fetching", async () => {
  globalThis.fetch = async () => {
    assert.fail("Untrusted URL must never be fetched");
  };
  await assert.rejects(inlineStorageImage("https://attacker.test/photo.jpg", origin));
  await assert.rejects(inlineStorageImage(`${origin}/auth/v1/`, origin));
});

test("does not send inaccessible photos to the provider", async () => {
  globalThis.fetch = async () => new Response(null, { status: 403 });
  await assert.rejects(inlineStorageImage(imageUrl, origin), /Photo inaccessible/);
});

test("rejects non-image and empty content", async () => {
  globalThis.fetch = async () => new Response("html", { headers: { "content-type": "text/html" } });
  await assert.rejects(inlineStorageImage(imageUrl, origin), /Format/);
  globalThis.fetch = async () =>
    new Response(new Uint8Array(), { headers: { "content-type": "image/jpeg" } });
  await assert.rejects(inlineStorageImage(imageUrl, origin), /vide/);
});

test("bounds image bytes while reading", async () => {
  globalThis.fetch = async () =>
    new Response(new Uint8Array(8 * 1024 * 1024 + 1), {
      headers: { "content-type": "image/jpeg" },
    });
  await assert.rejects(inlineStorageImage(imageUrl, origin), /volumineuse/);
});
