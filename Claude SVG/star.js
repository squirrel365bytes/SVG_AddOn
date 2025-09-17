/* global SquirrelHelper */
class StarAddon extends SquirrelHelper {
  constructor() {
    super();
    this.starEl = null;
    this._raf = null;
  }

  _initDom() { this.starEl = document.getElementById("star"); }

  onInitState(e) { if (super.onInitState) super.onInitState(e); if (!this.starEl) this._initDom(); this._scheduleRender(); }
  onPropertyChange(e) { if (super.onPropertyChange) super.onPropertyChange(e); this._scheduleRender(); }
  onPropertyChangesComplete(e){ if (super.onPropertyChangesComplete) super.onPropertyChangesComplete(e); this._scheduleRender(); }

  _scheduleRender(){
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this._render());
  }

  _normalizePoints(v){
    // Accept string, 1D array, 2D array (e.g., bound to a range)
    if (Array.isArray(v)) {
      const flat = v.flat(Infinity).filter(x => x !== null && x !== undefined).map(x => String(x).trim()).filter(Boolean);
      // If all tokens are numeric and even count, treat as x,y pairs
      const allNum = flat.every(t => !isNaN(Number(t)));
      if (allNum && flat.length % 2 === 0) {
        const pairs = [];
        for (let i = 0; i < flat.length; i += 2) {
          pairs.push(`${flat[i]},${flat[i+1]}`);
        }
        return pairs.join(" ");
      }
      // Otherwise just join as-is (covers already-formed "x,y" tokens)
      return flat.join(" ");
    }
    return (v ?? "").toString().trim();
  }

  _normalizeColor(v, fallback){
    const s = (v ?? "").toString().trim();
    return s || fallback;
  }

  _normalizeNumberLike(v, fallback){
    // Keep as string because SVG attribute takes a string; sanitize whitespace
    const s = (v ?? "").toString().trim();
    return s || fallback;
  }

  _render() {
    const s = this.getCopyOfState ? this.getCopyOfState() : {};
    const pts = this._normalizePoints(s?.points) || "50,5 61,39 98,39 68,61 79,95 50,75 21,95 32,61 2,39 39,39";
    const fill = this._normalizeColor(s?.fill, "gold");
    const stroke = this._normalizeColor(s?.stroke, "orange");
    const strokeWidth = this._normalizeNumberLike(s?.strokeWidth, "2");

    if (this.starEl) {
      this.starEl.setAttribute("points", pts);
      this.starEl.setAttribute("fill", fill);
      this.starEl.setAttribute("stroke", stroke);
      this.starEl.setAttribute("stroke-width", strokeWidth);
    }
  }
}

window.addon = new StarAddon();
window.addon.initWithSquirrel();
