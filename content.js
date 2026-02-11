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

const header = document.createElement("div");
header.textContent = "Streetwise";
header.style.fontWeight = "600";

const addressLine = document.createElement("div");
addressLine.style.marginTop = "6px";

const coordsLine = document.createElement("div");
coordsLine.style.marginTop = "6px";

const statusLine = document.createElement("div");
statusLine.style.marginTop = "6px";
statusLine.style.color = "#6b7280";
statusLine.style.fontSize = "12px";

const chatContainer = document.createElement("div");
chatContainer.style.marginTop = "10px";
chatContainer.style.paddingTop = "8px";
chatContainer.style.borderTop = "1px solid #e5e7eb";

const chatLog = document.createElement("div");
chatLog.style.maxHeight = "160px";
chatLog.style.overflowY = "auto";
chatLog.style.background = "#f9fafb";
chatLog.style.border = "1px solid #e5e7eb";
chatLog.style.borderRadius = "8px";
chatLog.style.padding = "8px";
chatLog.style.fontSize = "12px";

const chatForm = document.createElement("form");
chatForm.style.display = "flex";
chatForm.style.gap = "6px";
chatForm.style.marginTop = "8px";

const chatInput = document.createElement("input");
chatInput.type = "text";
chatInput.placeholder = "Ask about this home...";
chatInput.style.flex = "1";
chatInput.style.fontSize = "12px";
chatInput.style.padding = "6px 8px";
chatInput.style.border = "1px solid #d1d5db";
chatInput.style.borderRadius = "6px";

const chatButton = document.createElement("button");
chatButton.type = "submit";
chatButton.textContent = "Send";
chatButton.style.fontSize = "12px";
chatButton.style.padding = "6px 10px";
chatButton.style.border = "1px solid #d1d5db";
chatButton.style.borderRadius = "6px";
chatButton.style.background = "#111827";
chatButton.style.color = "#fff";
chatButton.style.cursor = "pointer";

chatForm.appendChild(chatInput);
chatForm.appendChild(chatButton);
chatContainer.appendChild(chatLog);
chatContainer.appendChild(chatForm);

box.appendChild(header);
box.appendChild(addressLine);
box.appendChild(coordsLine);
box.appendChild(statusLine);
box.appendChild(chatContainer);

let backendUrl = null;

function loadBackendUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["backendUrl"], (result) => {
      backendUrl = result.backendUrl || null;
      resolve(backendUrl);
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
let lastCoords = null;
let chatInFlight = false;
const chatMessages = [];

function setStatus(message) {
  statusLine.textContent = message || "";
}

function renderChat() {
  chatLog.innerHTML = "";
  if (chatMessages.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "Ask a question about this listing.";
    empty.style.color = "#6b7280";
    chatLog.appendChild(empty);
    return;
  }
  chatMessages.forEach((message) => {
    const row = document.createElement("div");
    row.style.marginBottom = "6px";
    row.textContent = `${message.role}: ${message.content}`;
    chatLog.appendChild(row);
  });
}

async function sendQuestion(question) {
  if (!question) return;
  if (!backendUrl) {
    await loadBackendUrl();
  }
  if (!backendUrl) {
    setStatus("Set your backend URL.");
    return;
  }
  if (chatInFlight) return;
  chatInFlight = true;
  setStatus("Asking assistant...");
  chatMessages.push({ role: "user", content: question });
  renderChat();
  try {
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        listing: {
          address: lastAddress,
          lat: lastCoords?.lat ?? null,
          lon: lastCoords?.lon ?? null,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`Chat error: ${response.status}`);
    }
    const data = await response.json();
    chatMessages.push({
      role: "assistant",
      content: data?.answer || "No response.",
    });
    renderChat();
    setStatus("");
  } catch (error) {
    chatMessages.push({
      role: "assistant",
      content: "Failed to get a response.",
    });
    renderChat();
    setStatus("");
  } finally {
    chatInFlight = false;
  }
}

async function geocodeAddress(address) {
  if (geocodeCache.has(address)) return geocodeCache.get(address);

  if (!backendUrl) {
    await loadBackendUrl();
  }
  if (!backendUrl) {
    throw new Error("Missing backend URL");
  }

  const response = await fetch(`${backendUrl}/api/geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!response.ok) {
    throw new Error(`Geocode error: ${response.status}`);
  }
  const data = await response.json();
  if (!data || data.lat == null || data.lon == null) {
    throw new Error("No coordinates found");
  }

  const result = { lat: data.lat, lon: data.lon };
  geocodeCache.set(address, result);
  return result;
}

async function updateBoxIfChanged() {
  const address = getAddress() || getAddressFromUrl() || getAddressFromTitle();
  if (!address || address === lastAddress) return;
  lastAddress = address;
  addressLine.textContent = `Address: ${address}`;
  coordsLine.textContent = "Lat: -  Lng: -";
  if (inFlight) return;
  inFlight = true;
  setStatus("Looking up coordinates...");
  try {
    const { lat, lon } = await geocodeAddress(address);
    lastCoords = { lat, lon };
    coordsLine.textContent = `Lat: ${lat}  Lng: ${lon}`;
    setStatus("");
  } catch (error) {
    if (error.message === "Missing backend URL") {
      setStatus("Set your backend URL.");
    } else {
      setStatus("Failed to fetch coordinates.");
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
renderChat();

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = chatInput.value.trim();
  if (!question) return;
  chatInput.value = "";
  sendQuestion(question);
});

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
