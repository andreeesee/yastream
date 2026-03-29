import { Buffer } from "buffer";
import * as crypto from "crypto";
import { axiosGet } from "./axios.js";
import { cache } from "./cache.js";
import { Logger } from "./logger.js";

const logger = new Logger("SUB");

interface DecryptionKeys {
  [key: string]: {
    key: Buffer;
    iv: Buffer;
  };
}

const DECRYPT_KEYS: DecryptionKeys = {
  txt: {
    key: Buffer.from("8056483646328763"),
    iv: Buffer.from("6852612370185273"),
  },
  txt1: {
    key: Buffer.from("AmSmZVcH93UQUezi"),
    iv: Buffer.from("ReBKWW8cqdjPEnF6"),
  },
  default: {
    key: Buffer.from("sWODXX04QRTkHdlZ"),
    iv: Buffer.from("8pwhapJeC4hrS9hO"),
  },
};
function isEncrypted(line: string) {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(line.trim()) && line.length > 4;
}

function decrypt(data: string, key: Buffer, iv: Buffer): string {
  const lines = data.split(/\r?\n/);
  const decryptedLines = lines
    .map((line) => {
      if (isEncrypted(line)) {
        try {
          const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
          let decryptedLine = decipher.update(line, "base64", "utf8");
          decryptedLine += decipher.final("utf8");
          return decryptedLine;
        } catch (error) {
          logger.error(`Fail to decrypt | ${line}`);
          return line;
        }
      }
      return line;
    })
    .join("\n");
  return decryptedLines;
}

function getKeyForFormat(format: string): { key: Buffer; iv: Buffer } {
  return (DECRYPT_KEYS[format] || DECRYPT_KEYS.default) as {
    key: Buffer;
    iv: Buffer;
  };
}

function detectFormat(url: string): string {
  const lowerUrl = url.split("?")[0]?.toLowerCase() || url.toLowerCase();
  if (lowerUrl.endsWith(".txt1")) {
    return "txt1";
  } else if (lowerUrl.endsWith(".txt")) {
    return "txt";
  }
  return "default";
}

export async function getSetDecryptedSubtitle(
  subtitleUrl: string,
): Promise<string | null> {
  const decryptSubKey = `decrypt_sub:${subtitleUrl}`;

  const cached = cache.get(decryptSubKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const data = await axiosGet<string>(subtitleUrl, {
      responseType: "text",
      timeout: 20000,
    });
    const encryptedData = data;
    if (!encryptedData) return null;
    logger.log(`Decrypt | ${subtitleUrl}`);
    const format = detectFormat(subtitleUrl);
    const { key, iv } = getKeyForFormat(format);
    const decrypted = decrypt(encryptedData, key, iv);
    cache.set(decryptSubKey, decrypted);
    return decrypted;
  } catch (error: any) {
    logger.error(`Failed to decrypt | ${error.message}`);
    return null;
  }
}

export { detectFormat };
