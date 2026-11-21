/* VERTEX avatars — a small set of suggested avatars users can pick in their profile. VXAV.svg(id, name) returns SVG markup. */
(function () {
  var G = [['#2f78c4', '#7fb6ff'], ['#f0a53a', '#f6c27a'], ['#3fb37f', '#8fe0b8'], ['#8e5cf7', '#c7a8ff'], ['#e5534b', '#ff9b8f'], ['#00a99d', '#7fe3d8']];
  var ICON = {
    hat: '<path d="M18 40h28M20 40c0-8 5-14 12-14s12 6 12 14" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M32 26v-4" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>',
    crane: '<path d="M22 46V18h22M22 22l20 0M40 18v10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="36" y="28" width="8" height="6" rx="1" fill="#fff"/>',
    compass: '<circle cx="32" cy="20" r="3.5" fill="#fff"/><path d="M32 23L22 46M32 23l10 23M25 38h14" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>',
    plan: '<rect x="18" y="18" width="28" height="28" rx="3" fill="none" stroke="#fff" stroke-width="3.5"/><path d="M18 30h14V18M32 38h14" fill="none" stroke="#fff" stroke-width="3"/>',
    spark: '<path d="M32 16l4 11 11 5-11 5-4 11-4-11-11-5 11-5z" fill="#fff"/>',
    leaf: '<path d="M20 44c0-16 10-26 26-26 0 16-10 26-26 26zM20 44l14-14" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
    face: '<circle cx="32" cy="27" r="8" fill="#fff"/><path d="M18 48c2-8 8-12 14-12s12 4 14 12" fill="#fff"/>',
    v: '<path d="M20 20l12 24 12-24" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="44" r="3.5" fill="#f0a53a"/>'
  };
  var L = [];
  Object.keys(ICON).forEach(function (k, i) { L.push({ id: k + i % G.length, icon: k, g: G[i % G.length] }) });
  G.forEach(function (g, i) { L.push({ id: 'init' + i, icon: '', g: g }) });
  function find(id) { for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function svg(id, name, size) {
    var a = find(id) || L[L.length - 6], gid = 'vg' + Math.random().toString(36).slice(2, 7), s = size || 44;
    var inner = a.icon ? ICON[a.icon] : '<text x="32" y="41" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" font-family="Vazirmatn,system-ui,sans-serif">' + esc(String(name || '؟').trim().charAt(0)) + '</text>';
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 64 64" role="img" aria-label="آواتار"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a.g[0] + '"/><stop offset="1" stop-color="' + a.g[1] + '"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#' + gid + ')"/>' + inner + '</svg>';
  }
  window.VXAV = { list: L, svg: svg };
})();
