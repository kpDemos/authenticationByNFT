// Global cache object to store IPFS responses
// Note: This cache is stored in memory on the serverless instance and is ephemeral.
let cache = {};

// Define a Time-To-Live (TTL) for cache entries in milliseconds (e.g., 5 minutes)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  // Extract the 'cid' parameter from the query string.
  const { cid } = req.query;
  
  // Return error if CID is missing.
  if (!cid) {
    return res.status(400).json({ error: "Missing CID" });
  }
  
  const now = Date.now();

  // Check if we have a valid cache entry for this CID.
  if (cache[cid] && (now - cache[cid].timestamp < CACHE_TTL)) {
    // Cache hit: return the cached response.
    console.log(`Cache hit for CID: ${cid}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", cache[cid].contentType || "application/octet-stream");
    return res.status(200).send(cache[cid].data);
  }
  
  // If no valid cache entry, construct the URL to fetch from the Pinata gateway.
  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
  
  try {
    // Fetch the file from the IPFS gateway.
    const response = await fetch(ipfsUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch IPFS content" });
    }
    // Read the response as an ArrayBuffer.
    const buffer = await response.arrayBuffer();
    // Retrieve the Content-Type from the response headers.
    const contentType = response.headers.get("Content-Type");

    // Convert the ArrayBuffer to a Buffer.
    const dataBuffer = Buffer.from(buffer);
    
    // Cache the fetched data along with the current timestamp.
    cache[cid] = {
      data: dataBuffer,
      contentType: contentType,
      timestamp: now
    };

    // Set CORS headers so that the response can be read by the browser.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    
    // Send the fetched data as the response.
    return res.status(200).send(dataBuffer);
  } catch (error) {
    // If an error occurs, return a 500 error with the error message.
    return res.status(500).json({ error: error.message });
  }
}
