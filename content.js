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
function updateBoxIfChanged() {
  const address = getAddress() || getAddressFromUrl() || getAddressFromTitle();
  if (!address || address === lastAddress) return;
  lastAddress = address;
  box.innerText = `Checking safety near:\n${address}`;
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
