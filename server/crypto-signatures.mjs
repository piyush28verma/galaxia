import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYS_FILE = path.join(__dirname, "..", ".ed25519_keys.json");

let keyPair = null;

/**
 * Initialize or load durable Ed25519 keypair
 */
export function initEd25519Keys() {
  const pub = process.env.GALAXIA_PUBLIC_KEY || process.env.CODELENS_PUBLIC_KEY;
  const priv = process.env.GALAXIA_PRIVATE_KEY || process.env.CODELENS_PRIVATE_KEY;
  if (pub && priv) {
    keyPair = {
      publicKey: pub,
      privateKey: priv,
    };
    return keyPair;
  }

  if (fs.existsSync(KEYS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(KEYS_FILE, "utf-8"));
      if (data.publicKey && data.privateKey) {
        keyPair = data;
        return keyPair;
      }
    } catch {
      // re-generate if corrupted
    }
  }

  // Generate fresh standard Ed25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  keyPair = { publicKey, privateKey };
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keyPair, null, 2), "utf-8");
  } catch {
    // storage fallback
  }

  return keyPair;
}

// Auto-init on module load
initEd25519Keys();

/**
 * Sign canonical payload with Ed25519
 */
export function signDocket(payload) {
  if (!keyPair) initEd25519Keys();
  const canonicalString = JSON.stringify(payload, Object.keys(payload).sort());
  const signatureBuffer = crypto.sign(null, Buffer.from(canonicalString), keyPair.privateKey);
  const signature = signatureBuffer.toString("base64");
  
  return {
    signature: `sig_ed25519_${signature}`,
    publicKey: keyPair.publicKey,
    algorithm: "Ed25519",
    digest: crypto.createHash("sha256").update(canonicalString).digest("hex")
  };
}

/**
 * Verify an Ed25519 signature against canonical payload
 */
export function verifySignature(payload, signatureStr, publicKeyPem = null) {
  try {
    const rawSig = signatureStr.replace(/^sig_ed25519_/, "");
    const canonicalString = JSON.stringify(payload, Object.keys(payload).sort());
    const key = publicKeyPem || keyPair.publicKey;

    const isValid = crypto.verify(
      null,
      Buffer.from(canonicalString),
      key,
      Buffer.from(rawSig, "base64")
    );

    return {
      valid: isValid,
      algorithm: "Ed25519",
      verifiedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message,
      verifiedAt: new Date().toISOString()
    };
  }
}

export function getPublicKey() {
  if (!keyPair) initEd25519Keys();
  return keyPair.publicKey;
}

