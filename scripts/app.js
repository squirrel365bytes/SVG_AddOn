(() => {
  "use strict";

  // Keep original event wiring
  Squirrel.addEventListener("eventDispatch", (e) => eval(`${e.detail.name}(e)`));
  Squirrel.initWithSquirrel();

  // ---------- Sanitizer: basic HTML + inline SVG with autosize ----------
  const HTML_ALLOWED = new Set(["B","STRONG","I","EM","U","BR","SPAN"]);
  const SVG_ALLOWED  = new Set([
    "SVG","G","RECT","CIRCLE","ELLIPSE","LINE","POLYLINE","POLYGON","PATH","TEXT","TSPAN"
  ]);

  // Safe SVG attributes (no events, no href/xlink)
  const SVG_ATTRS = new Set([
    "WIDTH","HEIGHT","VIEWBOX","PRESERVEASPECTRATIO","TRANSFORM","OPACITY",
    "FILL","STROKE","STROKE-WIDTH","STROKE-LINECAP","STROKE-LINEJOIN","STROKE-DASHARRAY","STROKE-DASHOFFSET",
    "X","Y","X1","Y1","X2","Y2","CX","CY","R","RX","RY","DX","DY","POINTS",
    "D","FONT-SIZE","FONT-FAMILY","FONT-WEIGHT","TEXT-ANCHOR","DOMINANT-BASELINE",
    "ROLE","ARIA-LABEL"
  ]);

  const SVG_NS = "http://www.w3.org/2000/svg";

  function sanitizeToFragment(input) {
    const out = document.createDocumentFragment();
    if (input == null) return out;

    const template = document.createElement("template");
    template.innerHTML = String(input);

    function clean(node, inSvg = false) {
      if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.nodeValue);
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      const tag = node.tagName.toUpperCase();
      const isSvgRoot = tag === "SVG";
      const nextInSvg = inSvg || isSvgRoot;

      let allow = false, useSvgNS = false;
      if (nextInSvg) { allow = SVG_ALLOWED.has(tag); useSvgNS = true; }
      else           { allow = HTML_ALLOWED.has(tag); }

      // Sanitize children first
      const kids = [];
      for (const c of Array.from(node.childNodes)) {
        const k = clean(c, nextInSvg);
        if (k) kids.push(k);
      }

      if (!allow) {
        const frag = document.createDocumentFragment();
        for (const k of kids) frag.appendChild(k);
        return frag;
      }

      const el = useSvgNS ? document.createElementNS(SVG_NS, tag.toLowerCase())
                          : document.createElement(tag.toLowerCase());

      // Track whether width/height/preserveAspectRatio were provided on <svg>
      let hasWidth = false, hasHeight = false, hasPAR = false;

      // Copy only safe attributes
      for (const a of Array.from(node.attributes || [])) {
        const name = a.name;
        const upper = name.toUpperCase();
        if (useSvgNS) {
          if (upper.startsWith("ON")) continue;        // block events
          if (upper.includes("HREF")) continue;        // block links
          if (!SVG_ATTRS.has(upper)) continue;         // whitelist
          el.setAttribute(name, a.value);
          if (tag === "SVG") {
            if (upper === "WIDTH") hasWidth = true;
            if (upper === "HEIGHT") hasHeight = true;
            if (upper === "PRESERVEASPECTRATIO") hasPAR = true;
          }
        } else {
          // For allowed HTML tags we keep no attributes (safe baseline)
        }
      }

      // Append sanitized children
      for (const k of kids) el.appendChild(k);

      // --- Autosize logic for inline <svg> ---
      if (tag === "SVG") {
        // Make SVG behave like a block
        el.style.display = "block";
        // If author omitted width/height, fill the parent box
        if (!hasWidth)  el.setAttribute("width", "100%");
        if (!hasHeight) el.setAttribute("height", "100%");
        // Maintain proportions by default (center + letterbox when needed)
        if (!hasPAR) el.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }

      return el;
    }

    for (const n of Array.from(template.content.childNodes)) {
      const cleaned = clean(n, false);
      if (cleaned) out.appendChild(cleaned);
    }
    return out;
  }

  // ---------- App logic (same behavior + HTML/SVG rendering) ----------
  function processData(value) {
    const host = document.getElementById("svg_shapeText");
    // Ensure host fills component and doesn't introduce extra spacing
    host.style.width = "100%";
    host.style.height = "100%";
    host.style.display = "block";
    host.style.margin = "0";

    const safe = sanitizeToFragment(value);
    host.replaceChildren(safe);

    // Uppercase echo back
    Squirrel.sendToSquirrel("svg_shapeResponse", String(value ?? "").toUpperCase());
  }

  function onPropertyChange(e) {
    const propertyName = e.detail.property;
    const propertyValue = e.detail.value;

    switch (Squirrel.getGenericProperty(propertyName)) {
      case "svg_shapeData":
        processData(propertyValue);
        break;
      default:
        console.log("Unknown message type: " + propertyName);
        break;
    }
  }

  function onInitState(e) {
    const state = e.detail.state;
    if (state != null) processData(state.svg_shapeData);
  }

  function onPropertyChangesComplete() {}
  function onSetCanvas(e) {}
  function onSetRuntimeMode(e) {}
  function onSetSize(e) {}
  function onSetPosition(e) {}
})();