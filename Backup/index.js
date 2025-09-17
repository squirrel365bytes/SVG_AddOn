// ---- Safe handshake (helper first, fallback to raw postMessage) ----
function startHandshake() {
  if (typeof initWithSquirrel === "function") {
    initWithSquirrel();                 // preferred API
  } else {
    // fallback if helper wasn't loaded
    window.parent.postMessage({ type: "initWithSquirrel" }, "*");
  }
}

// ---- Render helpers (adjust to your DOM) ----
const $display = document.getElementById("display");
const $editor  = document.getElementById("editor");
const renderDisplay = v => ($display.textContent = v ?? "");
const renderEditor  = v => { const s = v ?? ""; if ($editor.value !== s) $editor.value = s; };

// ---- Receive (supports both helper CustomEvents and raw postMessage) ----
function onInit(e) {
  const state = (e.detail && e.detail.state) || (e.data && e.data.detail && e.data.detail.state) || {};
  renderDisplay(state.displayText);
  renderEditor(state.inputText);
  console.log("[Squirrel] onInitState", state);
}
function onChange(e) {
  const property = (e.detail && e.detail.property) || (e.data && e.data.detail && e.data.detail.property);
  const value    = (e.detail && e.detail.value)    || (e.data && e.data.detail && e.data.detail.value);
  if (!property) return;
  if (property === "displayText") renderDisplay(value);
  if (property === "inputText")   renderEditor(value);
  console.log("[Squirrel] onPropertyChange", property, value);
}

// Helper library dispatches CustomEvents named exactly like the docs
window.addEventListener("onInitState", onInit);
window.addEventListener("onPropertyChange", onChange);

// Raw postMessage fallback (what Squirrel uses under the hood)
window.addEventListener("message", (evt) => {
  if (!evt?.data?.type) return;
  if (evt.data.type === "onInitState") onInit(evt);
  if (evt.data.type === "onPropertyChange") onChange(evt);
});

// ---- Send back to Squirrel (use helper if present to auto-pad) ----
function sendBack(prop, value) {
  if (typeof sendToSquirrel === "function") {
    // helper auto-pads to the bound range by default (padData = true)
    sendToSquirrel(prop, value);
  } else {
    // minimal fallback: no padding
    window.parent.postMessage({ type: "sendToSquirrel", detail: { property: prop, value } }, "*");
  }
}
$editor.addEventListener("input", (e) => sendBack("inputText", e.target.value));

// Start handshake once DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startHandshake);
} else {
  startHandshake();
}
