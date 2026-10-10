
/* ===== SPA (Ganpati guide): routing + SEO. Events live on static pages. ===== */
const SEO_DATA = __SEO__;
const SITE = 'https://www.puneganpatilive.in';
const NAV9 = [['Shailaputri','Orange','#f97316'],['Brahmacharini','White','#f1f5f9'],['Chandraghanta','Red','#dc2626'],['Kushmanda','Royal Blue','#1d4ed8'],['Skandamata','Yellow','#facc15'],['Katyayani','Green','#16a34a'],['Kalaratri','Grey','#6b7280'],['Mahagauri','Purple','#7e22ce'],['Siddhidatri','Peacock Green','#0f766e']];
const N_START = new Date('2026-10-11T00:00:00+05:30');
const DIWALI = new Date('2026-11-08T00:00:00+05:30');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const navDay = () => Math.floor((Date.now() - N_START) / 864e5) + 1;
function festStatus() {
  const d = navDay(), now = Date.now();
  if (d < 1) { const n = Math.ceil((N_START - now) / 864e5); return { h: n <= 1 ? 'Navratri begins tomorrow in Pune' : `Navratri begins in ${n} days`, s: 'Sunday 11 October. Find garba nights, Devi darshan and what to wear.' }; }
  if (d <= 9) { const c = NAV9[d-1]; return { h: `Day ${d} of Navratri: wear ${c[1].toLowerCase()} today`, s: `${c[0]} is worshipped today. Find tonight's events in Pune.` }; }
  if (d === 10) return { h: 'Happy Vijayadashami, Pune', s: 'Dussehra is today. Diwali is on 8 November.' };
  const n = Math.ceil((DIWALI - now) / 864e5);
  return n > 0 ? { h: `Diwali is in ${n} days`, s: 'Dhanteras 6 Nov, Lakshmi Puja 8 Nov.' } : { h: 'Pune festival guide', s: 'Maps, routes, events and helplines.' };
}
function colourStrip() {
  const d = navDay();
  return `<ol class="grid grid-cols-9 gap-1" aria-label="Nine Navratri colours">` + NAV9.map((c, i) => `<li><span class="block h-3 md:h-4 rounded-full ${d === i+1 ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#1b1740]' : ''}" style="background:${c[2]}" title="Day ${i+1}: ${c[1]}"></span></li>`).join('') + `</ol>`;
}
function festivalHero() {
  const s = festStatus();
  return `<section class="rounded-2xl bg-[#1b1740] text-white p-5 md:p-7 mb-5">
    <h2 class="text-2xl md:text-4xl font-black tracking-tight leading-tight">${esc(s.h)}</h2>
    <p class="mt-1 text-sm md:text-base text-indigo-100 max-w-xl">${esc(s.s)}</p>
    <div class="mt-4 max-w-xs">${colourStrip()}</div>
    <div class="mt-4 flex flex-wrap gap-2">
      <a href="/events/pune" class="px-4 py-2.5 bg-amber-400 text-indigo-950 font-extrabold text-sm rounded-xl">All events in Pune</a>
      <a href="/navratri" class="px-4 py-2.5 border border-white/30 font-bold text-sm rounded-xl">Navratri guide</a></div></section>`;
}
function routeFromPath() {
  const p = location.pathname.replace(/\/+$/, '') || '/', m = p.match(/^\/pune-ganpati\/([\w-]+)$/);
  return m && MANDALS_DATA.some(x => x.id === m[1]) ? ['mandal', m[1]] : ['home', null];
}
function applySEO(path) {
  const m = SEO_DATA.meta[path] || SEO_DATA.meta['/ganpati'], url = SITE + path, q = s => document.querySelector(s);
  document.title = m.t;
  const set = (s, v) => { const e = q(s); if (e) e.setAttribute('content', v); };
  set('meta[name="description"]', m.d); set('meta[property="og:title"]', m.t); set('meta[property="og:description"]', m.d); set('meta[property="og:url"]', url);
  set('meta[name="twitter:title"]', m.t); set('meta[name="twitter:description"]', m.d);
  const c = q('link[rel="canonical"]'); if (c) c.href = url;
  const s = document.getElementById('dynamic-schema');
  if (s) s.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": SEO_DATA.graphs[path] || SEO_DATA.graphs['/ganpati'] });
}
const _nav = navigateTo;
navigateTo = function (view, param = null, push = true) {
  _nav(view, param);
  const path = view === 'mandal' ? '/pune-ganpati/' + param : '/ganpati';
  if (push && location.pathname !== path) history.pushState({}, '', path);
  applySEO(path);
};
const _rh = renderHomeView; renderHomeView = function () { return festivalHero() + _rh(); };
window.onload = function () { lucide.createIcons(); const r = routeFromPath(); navigateTo(r[0], r[1], false); };
window.onpopstate = function () { const r = routeFromPath(); navigateTo(r[0], r[1], false); };
