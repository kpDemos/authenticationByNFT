// --- Function for Part 4 ---
// This function fetches the encrypted video from IPFS, decrypts it using the AES key and IV,
// and then plays it in the video element.
async function loadAndDisplay() {
  // Get references to the video element and its container
  const videoPlayer = document.getElementById('videoPlayer');
  const videoContainer = document.getElementById('videoContainer');

  try {
    // 1. Fetch the encrypted video file from IPFS.
    // Add a cache-busting query parameter to avoid caching issues.
    const response = await fetch(`${VIDEO_URL}?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch encrypted video: ${response.status}`);
    }
    // Read the response as a Blob (Binary large object)
    const encryptedBlob = await response.blob();
    // Convert the Blob into an ArrayBuffer.
    const encryptedArrayBuffer = await encryptedBlob.arrayBuffer();
    // Convert the ArrayBuffer into a Uint8Array for easier manipulation.
    const encryptedBytes = new Uint8Array(encryptedArrayBuffer);

    // 2. Since the encryption script prepended the IV to the ciphertext,
    // extract the IV (first 12 bytes) and the ciphertext (rest of the data).
    const ivFromFile = encryptedBytes.slice(0, 12);      // The first 12 bytes are the IV.
    const ciphertext = encryptedBytes.slice(12);         // The rest is the actual ciphertext.

    // 3. Fetch the encryption key and IV from the local JSON file.
    // For local testing, ensure 'encryptionKey.json' is served in the same folder.
    const keyResponse = await fetch("api/getEncryptionKey.js");
    if (!keyResponse.ok) {
      throw new Error(`Failed to fetch encryption key: ${keyResponse.status}`);
    }
    const keyData = await keyResponse.json();
    // Convert the stored key and IV from the JSON file into Uint8Arrays.
    const rawKey = new Uint8Array(keyData.key);
    const ivFromKey = new Uint8Array(keyData.iv);

    // 4. (Optional) For debugging, log the IVs to check that they match.
    console.log("IV extracted from file:", ivFromFile);
    console.log("IV from encryptionKey.json:", ivFromKey);

    // 5. Import the raw AES key (rawKey) into a CryptoKey object for decryption.
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",           // Format of the key
      rawKey,          // The raw key as a Uint8Array
      { name: "AES-GCM" }, // Algorithm details
      false,           // Whether the key is extractable (we don't need it to be)
      ["decrypt"]      // Allowed operations for this key
    );

    // 6. Decrypt the ciphertext using the CryptoKey and the IV from the key file.
    // We use ivFromKey, which should match the IV we prepended to the file.
    const decryptedArrayBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivFromKey },
      cryptoKey,
      ciphertext
    );

    // 7. Convert the decrypted ArrayBuffer into a Blob (with the appropriate MIME type)
    const decryptedBlob = new Blob([decryptedArrayBuffer], { type: "video/mp4" });
    // Create an object URL from the decrypted Blob.
    const blobUrl = URL.createObjectURL(decryptedBlob);

    // 8. Set the video element's source to the decrypted Blob URL and unhide the video container.
    videoPlayer.src = blobUrl;
    videoPlayer.style.display = "block";
    videoContainer.style.display = "block";
    message.textContent += " | Video loaded!";
  } catch (error) {
    console.error("Decryption failed:", error);
    message.textContent = "❌ Decryption failed.";
  }
}
