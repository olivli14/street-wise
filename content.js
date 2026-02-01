// create box
const box = document.createElement("div");

box.style.position = "fixed";
box.style.bottom = "20px";
box.style.right = "20px";
box.style.padding = "12px";
box.style.background = "white";
box.style.border = "1px solid black";
box.style.zIndex = "999999";
box.style.fontSize = "14px";
box.style.whiteSpace = "pre-line";

// helper to find address text on Zillow
function getAddress() {
    const h1 = document.querySelector("h1");
    if (!h1) return null;
  
    // Clean up non-breaking spaces (&nbsp;)
    return h1.innerText.replace(/\u00A0/g, " ").trim();
  }
  
// get address
const address = getAddress();

// set text
box.innerText = address
  ? `Checking safety near:\n${address}`
  : "Address not found";

// add to page
document.body.appendChild(box);
