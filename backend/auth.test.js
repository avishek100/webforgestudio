import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createToken,
  hashAdminPassword,
  hashPassword,
  hashToken,
  verifyAdminPassword,
  verifyPassword,
} from "./auth.js";

describe("portal authentication helpers", () => {
  it("hashes client passwords with a per-password salt", async () => {
    const firstHash = await hashPassword("a-long-client-password");
    const secondHash = await hashPassword("a-long-client-password");

    assert.notEqual(firstHash, secondHash);
    assert.equal(await verifyPassword("a-long-client-password", firstHash), true);
    assert.equal(await verifyPassword("wrong-password", firstHash), false);
    assert.equal(await verifyPassword("password", "not-a-password-hash"), false);
  });

  it("verifies the configured administrator password", async () => {
    const storedHash = await hashAdminPassword("a-long-admin-password");

    assert.equal(await verifyAdminPassword("a-long-admin-password", storedHash), true);
    assert.equal(await verifyAdminPassword("incorrect-password", storedHash), false);
  });

  it("creates random setup tokens and stable token hashes", () => {
    const token = createToken();
    const anotherToken = createToken();

    assert.notEqual(token, anotherToken);
    assert.equal(hashToken(token), hashToken(token));
    assert.notEqual(hashToken(token), hashToken(anotherToken));
  });
});
