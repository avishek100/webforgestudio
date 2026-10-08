import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const [saltHex, keyHex] = String(storedHash ?? "").split(":");
  if (!saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(keyHex)) {
    return false;
  }

  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function verifyAdminPassword(password, storedHash) {
  const candidate = await scrypt(password, Buffer.from("webforgestudio-admin-v1"), 64);
  const expected = Buffer.from(storedHash, "hex");
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export async function hashAdminPassword(password) {
  const derivedKey = await scrypt(password, Buffer.from("webforgestudio-admin-v1"), 64);
  return derivedKey.toString("hex");
}
