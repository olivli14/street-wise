const input = document.getElementById("apiKey");
const status = document.getElementById("status");
const saveButton = document.getElementById("save");

function setStatus(message) {
  status.textContent = message;
  if (!message) return;
  setTimeout(() => {
    status.textContent = "";
  }, 2000);
}

function loadKey() {
  chrome.storage.sync.get(["geoapifyApiKey"], (result) => {
    if (result.geoapifyApiKey) {
      input.value = result.geoapifyApiKey;
    }
  });
}

function saveKey() {
  const value = input.value.trim();
  chrome.storage.sync.set({ geoapifyApiKey: value }, () => {
    setStatus("Saved.");
  });
}

saveButton.addEventListener("click", saveKey);
document.addEventListener("DOMContentLoaded", loadKey);
