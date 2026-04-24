// Decryption
import crypto from "crypto";
const KEY_HEX = Buffer.from(
  "Njk2ZDM3MzI2MzY4NjE3MjUwNjE3MzczNzc2ZjcyNjQ2ZjY2NjQ0OTZlNjk3NDU2NjU2Mzc0NmY3MjUzNzQ2ZA==",
  "base64",
).toString();
const IV_HEX = Buffer.from(
  "Njk2ZDM3MzI2MzY4NjE3MjUwNjE3MzczNzc2ZjcyNjQ=",
  "base64",
).toString();
const KEY = Buffer.from(KEY_HEX, "hex");
const IV = Buffer.from(IV_HEX, "hex");

function normalizeCustomAlphabet(s: string): string {
  return s.replace(/-_\./g, "/").replace(/@/g, "+").replace(/\s+/g, "");
}

function base64ToBytes(b64: string): Uint8Array {
  let base64 = b64;
  const pad = base64.length % 4;
  if (pad !== 0) base64 += "=".repeat(4 - pad);
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    throw new Error("Invalid base64");
  }
}

function parseResult(text: string): any {
  try {
    const json = JSON.parse(text);
    const res = json;
    return typeof res === "string" ? JSON.parse(res) : res || json;
  } catch {
    return text;
  }
}

export function decryptString<T>(input: string): T {
  try {
    const normalized = normalizeCustomAlphabet(input);
    const cipherBytes = base64ToBytes(normalized);
    if (cipherBytes.length % 16 !== 0) {
      throw new Error(
        `Ciphertext length (${cipherBytes.length}) not multiple of 16`,
      );
    }
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, IV);
    const decrypted = Buffer.concat([
      decipher.update(cipherBytes),
      decipher.final(),
    ]);
    return parseResult(decrypted.toString("utf8"));
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Decryption failed");
  }
}

// console.log(decryptString("K5@AeyvDate8WuIvULCet6FdMapTy2YSbhamEMeZotrIjkhdK56tcBOOktirKulSmCLcSggN7plq0g4i1A@W7A=="));