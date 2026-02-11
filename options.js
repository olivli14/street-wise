const input = document.getElementById("backendUrl");
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
  chrome.storage.sync.get(["backendUrl"], (result) => {
    if (result.backendUrl) {
      input.value = result.backendUrl;
    }
  });
}

function saveKey() {
  const value = input.value.trim();
  chrome.storage.sync.set({ backendUrl: value }, () => {
    setStatus("Saved.");
  });
}

saveButton.addEventListener("click", saveKey);
document.addEventListener("DOMContentLoaded", loadKey);
