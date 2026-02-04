// create box
const box = document.createElement("div");

box.style.position = "fixed";
box.style.bottom = "20px";
box.style.right = "20px";
box.style.padding = "12px 14px";
box.style.background = "rgba(255, 255, 255, 0.96)";
box.style.border = "1px solid #e5e7eb";
box.style.borderRadius = "12px";
box.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
box.style.zIndex = "999999";
box.style.fontSize = "14px";
box.style.lineHeight = "1.4";
box.style.color = "#111827";
box.style.fontFamily =
  "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
box.style.whiteSpace = "pre-line";
box.style.maxWidth = "280px";

const GEOAPIFY_BASE_URL = "https://api.geoapify.com/v1/geocode/search";
let geoapifyApiKey = null;

function loadApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["geoapifyApiKey"], (result) => {
      geoapifyApiKey = result.geoapifyApiKey || null;
      resolve(geoapifyApiKey);
    });
  });
}

// helper to find address text on Zillow
function getAddress() {
  const h1 =
    document.querySelector("div[class*='AddressWrapper'] h1") ||
    document.querySelector("h1");
  if (!h1) return null;

  // Clean up non-breaking spaces (&nbsp;)
  return h1.innerText.replace(/\u00A0/g, " ").trim();
}

function getAddressFromUrl() {
  const path = location.pathname;
  const match = path.match(/\/homedetails\/([^/]+)\//);
  if (!match) return null;
  const slug = match[1];
  // Drop trailing zpid if present
  const cleaned = slug.replace(/_\d+_zpid$/, "");
  // Convert slug to readable address
  return decodeURIComponent(cleaned).replace(/-/g, " ").trim();
}

function getAddressFromTitle() {
  const title = document.title || "";
  const cleaned = title.split("|")[0]?.trim();
  if (!cleaned) return null;
  if (cleaned.toLowerCase().includes("zillow")) return null;
  return cleaned;
}

let lastAddress = null;
let inFlight = false;
const geocodeCache = new Map();

async function geocodeAddress(address) {
  if (geocodeCache.has(address)) return geocodeCache.get(address);

  if (!geoapifyApiKey) {
    await loadApiKey();
  }
  if (!geoapifyApiKey) {
    throw new Error("Missing Geoapify API key");
  }

  const url = `${GEOAPIFY_BASE_URL}?text=${encodeURIComponent(
    address
  )}&format=json&apiKey=${geoapifyApiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geoapify error: ${response.status}`);
  }
  const data = await response.json();
  const first = data?.results?.[0];
  if (!first || first.lat == null || first.lon == null) {
    throw new Error("No coordinates found");
  }

  const result = { lat: first.lat, lon: first.lon };
  geocodeCache.set(address, result);
  return result;
}

async function updateBoxIfChanged() {
  const address = getAddress() || getAddressFromUrl() || getAddressFromTitle();
  if (!address || address === lastAddress) return;
  lastAddress = address;
  if (inFlight) return;
  inFlight = true;
  box.innerText = `Looking up coordinates:\n${address}`;
  try {
    const { lat, lon } = await geocodeAddress(address);
    box.innerText = `Address:\n${address}\n\nLat: ${lat}\nLng: ${lon}`;
  } catch (error) {
    if (error.message === "Missing Geoapify API key") {
      box.innerText = `Address:\n${address}\n\nAdd your Geoapify API key.`;
    } else {
      box.innerText = `Address:\n${address}\n\nFailed to fetch coordinates.`;
    }
  } finally {
    inFlight = false;
  }
}

// add to page
if (document.body) {
  document.body.appendChild(box);
} else {
  document.addEventListener(
    "DOMContentLoaded",
    () => document.body.appendChild(box),
    { once: true }
  );
}

// initial update
setTimeout(updateBoxIfChanged, 300);

// update every 5 seconds
setInterval(updateBoxIfChanged, 5000);

// update immediately when URL changes
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    updateBoxIfChanged();
  }
}, 1000);

// update when the document title changes (SPA navigation)
if (document.head) {
  const titleObserver = new MutationObserver(() => {
    updateBoxIfChanged();
  });
  titleObserver.observe(document.head, { childList: true, subtree: true });
}
