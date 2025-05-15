/**
 * encrypt.js
 * 
 * This script encrypts a video file using the Web Crypto API (AES-GCM).
 * It does the following:
 *   1. Reads the video file from disk as binary data.
 *   2. Converts it to an ArrayBuffer (a low-level representation of binary data).
 *   3. Generates a random 256-bit AES key and a 12-byte Initialization Vector (IV).
 *   4. Encrypts the ArrayBuffer using AES-GCM.
 *   5. Prepends the IV to the ciphertext so the IV is available during decryption.
 *   6. Writes out the encrypted video file (encryptedVideo.bin) and a JSON file (encryptionKey.json)
 *      containing the raw key and IV.
 * 
 * A Blob is an object that represents immutable raw binary data (such as video or images).
 * An ArrayBuffer is a low-level binary data container that the Web Crypto API uses for encryption.
 */

import fs from 'fs';
import { webcrypto } from 'crypto';

async function encryptVideo(filePath) {
  // 1. Read the video file from disk as a Node.js Buffer.
  const fileBuffer = fs.readFileSync(filePath);

  // 2. Convert the Buffer to an ArrayBuffer (required by the Web Crypto API).
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  // 3. Generate a 256-bit AES-GCM key (symmetric encryption key).
  const key = await webcrypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 4. Export the key as raw bytes (Uint8Array) so it can be stored or later used for decryption.
  const rawKey = new Uint8Array(await webcrypto.subtle.exportKey('raw', key));

  // 5. Generate a random 12-byte Initialization Vector (IV) for AES-GCM.
  const iv = webcrypto.getRandomValues(new Uint8Array(12));

  // 6. Encrypt the video file (ArrayBuffer) using the generated key and IV.
  const encryptedArrayBuffer = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  );

  // 7. Prepend the IV to the ciphertext.
  // This means our encrypted output is [IV | ciphertext].
  const ivAndCiphertext = new Uint8Array(iv.byteLength + encryptedArrayBuffer.byteLength);
  ivAndCiphertext.set(iv, 0);
  ivAndCiphertext.set(new Uint8Array(encryptedArrayBuffer), iv.byteLength);

  // 8. Write the encrypted data to a file (this file will be uploaded to IPFS).
  fs.writeFileSync('encryptedVideo.bin', Buffer.from(ivAndCiphertext.buffer));

  // 9. Write the encryption key and IV to a JSON file.
  // Note: In a production scenario, you should secure these values (e.g. in environment variables).
  fs.writeFileSync('encryptionKey.json', JSON.stringify({
    key: Array.from(rawKey),
    iv: Array.from(iv)
  }, null, 2));

  console.log("✅ Video encrypted successfully!");
  console.log("Output files: 'encryptedVideo.bin' and 'encryptionKey.json'");
}

// Get the video file path from command line arguments
const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node encrypt.js path/to/video.mp4");
  process.exit(1);
}

// Run the encryption script
encryptVideo(filePath).catch(error => {
  console.error("Encryption failed:", error);
});
