// Runs on Vercel at every deploy: pulls published events/products from Firestore, falls back to data/*.json seeds,
// and writes the whole static site into dist/.
import fs from 'node:fs';
import path from 'node:path';
const R = process.cwd(), D = process.env.DATA_DIR || path.join(R, 'data'), OUT = process.env.OUT_DIR || path.join(R, 'dist'), PUB = path.join(R, 'public');
const PID = 'puneganpatilive';
const J = f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
const SJ = J('site.json'); const { SITE, CITIES, CATS, FEST, FAQ, PAGES, NAV9, MANDALS, ORG, BWU, GP } = SJ;
const TODAY = process.env.BUILD_DATE || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
const money = x => { const n = Number(String(x ?? '').replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : 0; };
const inr = n => 'Rs ' + Number(n).toLocaleString('en-IN');
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// ---------- Firestore (public REST, published docs only) ----------
const dec = v => 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'timestampValue' in v ? v.timestampValue : 'arrayValue' in v ? (v.arrayValue.values || []).map(dec) : 'mapValue' in v ? decf(v.mapValue.fields || {}) : null;
const decf = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, dec(v)]));
async function fsQuery(col) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents:runQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } } } }) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).filter(x => x.document).map(x => ({ id: x.document.name.split('/').pop(), ...decf(x.document.fields || {}) }));
}
async function fsDoc(p) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents/${p}`, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return decf((await r.json()).fields || {});
}
async function load(col, seed) {
  let s = []; try { s = J(seed); } catch {}
  let live = []; try { live = await fsQuery(col); console.log(`Firestore ${col}: ${live.length} published`); } catch (e) { console.warn(`Firestore ${col} skipped (${e.message}); using seed only`); }
  const m = new Map(); [...s, ...live].forEach(x => x.id && m.set(x.id, x)); return [...m.values()];
}
let SET = {}; try { SET = J('settings.json'); } catch {} try { SET = { ...SET, ...(await fsDoc('settings/site')) }; } catch {}
const WA = String(SET.whatsapp || '').replace(/\D/g, ''), EMAIL = SET.email || 'shubhamshri.1110@gmail.com';
// Poster uploaded in /admin or via the public form is stored as a small data URL; write it out as a real image file.
const IMG = (kind, id, d) => { const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(d || '')); if (!m) return ''; const rel = `img/${kind}-${slugify(id)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`; const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(m[2], 'base64')); return SITE + '/' + rel; };
// ---------- normalise ----------
const t24 = t => { const m = String(t || '').trim().toUpperCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/); if (!m) return null; let h = +m[1]; const ap = m[3]; if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0; return String(h).padStart(2, '0') + ':' + (m[2] || '00'); };
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !isNaN(new Date(d + 'T00:00:00Z'));
const EV = []; for (const r of await load('events', 'events.json')) {
  const e = { ...r, slug: r.id }; e.city = String(e.city || '').toLowerCase(); e.category = String(e.category || '').toLowerCase();
  if (!e.title || !CITIES[e.city] || !CATS[e.category] || !isDate(e.start_date)) { console.warn('SKIP event', r.id); continue; }
  if (!isDate(e.end_date)) e.end_date = e.start_date;
  e.passes = (Array.isArray(e.passes) ? e.passes : []).filter(p => p && p.name).map(p => ({ name: String(p.name), price: money(p.price), buy_url: safeUrl(p.buy_url), note: p.note || '' }));
  e.ticket_url = safeUrl(e.ticket_url); e.image_url = IMG('ev', r.id, e.image_data) || safeUrl(e.image_url); delete e.image_data; e.t24 = t24(e.start_time);
  e.from = e.passes.length ? Math.min(...e.passes.map(p => p.price)) : money(e.price);
  e.free = !e.passes.some(p => p.price > 0) && e.from === 0; e.feat = e.featured === true || String(e.featured).toLowerCase() === 'yes';
  e.canbuy = e.passes.length > 0 || !!e.ticket_url || (!e.free && !!WA); EV.push(e);
}
const up = e => e.end_date >= TODAY;
const UP = EV.filter(up).sort((a, b) => a.start_date.localeCompare(b.start_date) || (b.feat - a.feat));
const FEAT_FIRST = [...UP].sort((a, b) => (b.feat - a.feat) || a.start_date.localeCompare(b.start_date));
const PR = []; for (const r of await load('products', 'products.json')) {
  const p = { ...r, slug: r.id }; if (!p.title || !money(p.price)) { console.warn('SKIP product', r.id); continue; }
  p.price = money(p.price); p.mrp = money(p.mrp) > p.price ? money(p.mrp) : 0; p.image_url = IMG('pr', r.id, p.image_data) || safeUrl(p.image_url); delete p.image_data; p.buy_url = safeUrl(p.buy_url);
  p.cat = String(p.category || 'General').trim(); p.instock = String(p.stock || 'in') !== 'out'; p.feat = p.featured === true; PR.push(p);
}
PR.sort((a, b) => (b.feat - a.feat) || a.title.localeCompare(b.title));
const HASSHOP = PR.length > 0;
// ---------- helpers ----------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pd = d => new Date(d + 'T00:00:00Z');
const fd = d => { const x = pd(d); return `${DAY[x.getUTCDay()]} ${x.getUTCDate()} ${MON[x.getUTCMonth()]}`; };
const drange = e => e.start_date === e.end_date ? fd(e.start_date) : `${fd(e.start_date)} to ${fd(e.end_date)}`;
const mon = (() => { const x = pd(TODAY); return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][x.getUTCMonth()] + ' ' + x.getUTCFullYear(); })();
const eurl = e => '/event/' + e.slug, purl = p => '/shop/' + p.slug;
const names = (l, n = 4) => l.slice(0, n).map(e => `${e.title} (${drange(e)})`).join('; ');
const paras = s => String(s || '').split(/\n+/).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('');
const wa = msg => WA ? `https://wa.me/${WA}?text=${encodeURIComponent(msg)}` : '';
const cityName = c => CITIES[c][0];
const WEB = { ...ORG[1], potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE + '/events?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } };
const BASE = [ORG[0], WEB];
const crumbsHtml = it => '<p class="crumbs">' + it.map(([n, u]) => u ? `<a href="${u}">${esc(n)}</a>` : esc(n)).join(' / ') + '</p>';
const crumbsLd = it => ({ '@type': 'BreadcrumbList', itemListElement: it.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) });
const wpLd = (p, t, d, coll) => ({ '@type': coll ? ['WebPage', 'CollectionPage'] : 'WebPage', '@id': SITE + p, url: SITE + p, name: t, description: d, isPartOf: { '@id': SITE + '/#web' }, dateModified: TODAY, inLanguage: 'en-IN', speakable: { '@type': 'SpeakableSpecification', cssSelector: ['#quick-answer', 'h1'] } });
const faqLd = it => ({ '@type': 'FAQPage', mainEntity: it.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const faqHtml = it => '<h2 style="margin-top:32px">Frequently asked questions</h2><div style="margin-top:12px">' + it.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('') + '</div>';
const listLd = (items, f) => ({ '@type': 'ItemList', itemListElement: items.slice(0, 30).map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + f(x).u, name: f(x).n })) });
const SM = []; const add = (p, pr = '0.7', fq = 'weekly') => SM.push([p, pr, fq]);
function write(p, txt) { const f = path.join(OUT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); }
// ---------- layout + components ----------
const GEO = '<meta name="geo.region" content="IN-MH"><meta name="geo.placename" content="Pune"><meta name="geo.position" content="18.5204;73.8567"><meta name="ICBM" content="18.5204, 73.8567">';
function layout(p, title, desc, body, graph, o = {}) {
  const url = SITE + (p === '/' ? '/' : p), cur = o.cur || '', robots = o.robots || 'index, follow, max-image-preview:large, max-snippet:-1';
  const nav = [['/events', 'Events'], ...(HASSHOP ? [['/shop', 'Shop']] : []), ['/navratri', 'Navratri'], ['/diwali', 'Diwali'], ['/ganpati', 'Ganpati guide']].map(([h, t]) => `<a href="${h}"${cur === h ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  const cities = [...new Set(UP.map(e => e.city))].map(c => `<li><a href="/events/${c}">Events in ${cityName(c)}</a></li>`).join('');
  const sch = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en-IN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}"><meta name="robots" content="${robots}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Pune Ganpati LIVE"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:locale" content="en_IN">${o.image ? `<meta property="og:image" content="${esc(o.image)}"><meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}<meta name="theme-color" content="#1b1740">${GEO}
<link rel="alternate" type="text/plain" href="/llms.txt"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/site.css?v=${TODAY}-5">
<script type="application/ld+json">${sch}</script></head><body${o.sticky ? ' class="hs"' : ''}>
<header class="hd"><div class="wrap"><a class="brand" href="/">Pune Ganpati LIVE<small>EVENTS, FESTIVALS AND PASSES</small></a><nav aria-label="Main">${nav}</nav><a class="btn sm" href="/list-your-event">List your event</a></div></header>
<main>${body}</main>
${o.sbar || ''}<footer><div class="wrap"><div class="cols"><div><h4>Cities</h4><ul>${cities}</ul></div><div><h4>Explore</h4><ul><li><a href="/events">All events</a></li>${HASSHOP ? '<li><a href="/shop">Shop</a></li>' : ''}<li><a href="/navratri">Navratri 2026</a></li><li><a href="/diwali">Diwali 2026</a></li><li><a href="/ganpati">Ganpati mandal guide</a></li></ul></div><div><h4>Site</h4><ul><li><a href="/list-your-event">List your event</a></li><li><a href="/policies">Terms, refunds and shipping</a></li><li><a href="/about">About, privacy, advertise</a></li><li><a href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a></li></ul></div></div>
<p style="margin-top:20px">Some links are sponsored or affiliate links and are marked. Event details come from organisers; confirm before travelling. © 2026 Pune Ganpati LIVE.</p></div></footer>
<script src="/assets/site.js?v=${TODAY}-5" defer></script></body></html>`;
}
const evCard = (e, city) => {
  const d = pd(e.start_date), place = [e.venue, e.area].filter(Boolean).join(', '), q = [e.title, e.venue, e.area, CATS[e.category], cityName(e.city)].join(' ').toLowerCase();
  return `<li class="card ev${e.feat ? ' feat' : ''}" data-start="${e.start_date}" data-end="${e.end_date}" data-cat="${e.category}" data-free="${e.free ? 1 : 0}" data-q="${esc(q)}"><a class="img c-${e.category}" href="${eurl(e)}" aria-label="${esc(e.title)}">${e.image_url ? `<img src="${esc(e.image_url)}" alt="" loading="lazy">` : ''}<span class="db"><b>${d.getUTCDate()}</b>${MON[d.getUTCMonth()]}</span>${e.feat ? '<span class="fl">Featured</span>' : ''}</a>
<div class="cb"><span class="tag">${esc(CATS[e.category])}</span><h3><a href="${eurl(e)}">${esc(e.title)}</a></h3><p class="meta">${esc(drange(e))}${e.start_time ? ', ' + esc(e.start_time) : ''}</p><p class="meta">${esc(place)}${city ? ', ' + cityName(e.city) : ''}</p>
<div class="pr"><b>${e.free ? 'Free' : (e.passes.length ? 'From ' : '') + inr(e.from)}</b><a class="btn sm ${e.canbuy ? 'sf' : 'alt'}" href="${eurl(e)}">${e.passes.length ? 'Get passes' : 'View'}</a></div></div></li>`;
};
const prCard = p => `<li class="card pd" data-cat="${esc(slugify(p.cat))}" data-q="${esc((p.title + ' ' + p.cat).toLowerCase())}"><a class="img" href="${purl(p)}" aria-label="${esc(p.title)}" style="aspect-ratio:1/1">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy">` : ''}${p.feat ? '<span class="fl">Pick</span>' : ''}${p.instock ? '' : '<span class="fl" style="background:#fecaca">Sold out</span>'}</a>
<div class="cb"><span class="tag">${esc(p.cat)}</span><h3><a href="${purl(p)}">${esc(p.title)}</a></h3><div class="pr"><b>${inr(p.price)}${p.mrp ? `<s>${inr(p.mrp)}</s>` : ''}</b><a class="btn sm sf" href="${purl(p)}">Buy</a></div></div></li>`;
const grid = (l, f, empty) => `<ul class="grid">${l.map(f).join('')}</ul><p id="none" class="empty" ${l.length ? 'hidden' : ''}>${empty} <a href="/list-your-event">List an event</a>.</p>`;
const bar = (cats = true) => `<form class="bar" data-filter role="search"><input type="search" name="q" placeholder="Search events, venues, areas" aria-label="Search"><select name="d" aria-label="When"><option value="">Any date</option><option value="today">Today</option><option value="weekend">This weekend</option><option value="week">Next 7 days</option></select>${cats ? '<select name="c" aria-label="Category"><option value="">All categories</option>' + Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('') + '</select>' : ''}<label><input type="checkbox" name="free"> Free only</label><span id="count" class="meta"></span></form>`;
const chips = (l, cur) => '<div class="chips">' + l.map(([u, t]) => `<a class="chip" href="${u}"${u === cur ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('') + '</div>';
const head = (h1, q, cr) => crumbsHtml(cr) + `<h1>${esc(h1)}</h1><p id="quick-answer" class="qa">${esc(q)}</p>`;
const promo = (camp, diwali) => { const t = diwali ? ['Rent your Diwali party outfit', 'Designer lehengas and festive wear, delivered and picked up.'] : ['Rent your garba outfit', 'Festive lehengas from Rs 499 per day, delivered and picked up.']; return `<aside class="promo"><div><p><b>${t[0]}</b></p><p>${t[1]}</p><small>Sponsored: BlinkWear.in, Bhopal and Pune</small></div><a class="btn sf" href="${BWU + camp}" target="_blank" rel="sponsored noopener">Rent on BlinkWear</a></aside>`; };
const sec = (title, link, inner) => `<section class="sec"><div class="sh"><h2>${title}</h2>${link ? `<a href="${link[0]}">${link[1]}</a>` : ''}</div>${inner}</section>`;
const wrap = x => `<div class="wrap">${x}</div>`;
// ---------- structured data ----------
function eventLd(e) {
  const c = CITIES[e.city], st = e.start_date + (e.t24 ? `T${e.t24}:00+05:30` : '');
  const offers = e.passes.length ? e.passes.map(p => ({ '@type': 'Offer', name: p.name, price: String(p.price), priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: p.buy_url || SITE + eurl(e) })) : { '@type': 'Offer', price: String(e.free ? 0 : e.from), priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: e.ticket_url || SITE + eurl(e) };
  const g = { '@type': 'Event', '@id': SITE + eurl(e) + '#event', name: e.title, description: e.description || e.title, startDate: st, endDate: e.end_date, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', url: SITE + eurl(e), location: { '@type': 'Place', name: e.venue || c[0], address: { '@type': 'PostalAddress', streetAddress: e.address || e.area || e.venue || c[0], addressLocality: c[0], addressRegion: c[1], addressCountry: 'IN' } }, organizer: { '@type': 'Organization', name: e.organizer || 'Pune Ganpati LIVE', url: SITE + '/' }, offers };
  if (e.image_url) g.image = [e.image_url]; return g;
}
const festLd = f => ({ '@type': 'Event', name: f.name, description: f.desc, startDate: f.start, endDate: f.end, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', location: { '@type': 'Place', name: 'Pune', address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'MH', addressCountry: 'IN' } }, organizer: { '@id': SITE + '/#org' } });
// ---------- home ----------
{
  const t = 'Pune Events: Garba, Festivals, Cultural Shows & Passes | Pune Ganpati LIVE', d = `Find upcoming events in Pune: garba and dandiya nights, festivals, cultural shows and markets. Dates, venues and passes in one place. Updated ${mon}.`;
  const cats = Object.keys(CATS).filter(k => UP.some(e => e.category === k)); const cities = [...new Set(UP.map(e => e.city))];
  const copt = cities.sort((a, b) => (a === 'pune' ? -1 : b === 'pune' ? 1 : 0)).map(c => `<option value="${c}">${cityName(c)}</option>`).join('');
  const shop = HASSHOP ? sec('Festive shop', ['/shop', 'See all'], `<ul class="grid">${PR.slice(0, 4).map(prCard).join('')}</ul>`) : '';
  const tiles = cats.length ? sec('Browse by category', null, '<div class="tiles">' + cats.map(k => `<a class="tile c-${k}" href="/events/${cities.includes('pune') ? 'pune' : cities[0]}/${k}"><b>${CATS[k]}</b><span>${UP.filter(e => e.category === k).length} upcoming</span></a>`).join('') + '</div>') : '';
  const body = `<section class="hero"><div class="wrap"><span class="status" id="fest" hidden></span><h1>Find events, festivals and passes in Pune</h1><p class="sub">Garba nights, cultural shows, markets and festival guides. Pick a date, grab your pass.</p>
<form class="search" id="hs" action="/events" role="search"><select name="city" aria-label="City">${copt}<option value="">All cities</option></select><input type="search" name="q" placeholder="Search garba, concerts, markets" aria-label="Search events"><button class="btn sf">Search</button></form>
<div class="quick"><a href="/events?d=today">Today</a><a href="/events?d=weekend">This weekend</a><a href="/events?free=1">Free events</a><a href="/navratri">Navratri 2026</a><a href="/diwali">Diwali 2026</a></div></div></section>` + wrap(
    sec('Happening soon', ['/events', 'All events'], FEAT_FIRST.length ? `<ul class="grid">${FEAT_FIRST.slice(0, 8).map(e => evCard(e, true)).join('')}</ul>` : '<p class="empty">No events listed yet. Organisers can list for free.</p>') + tiles + shop +
    `<section class="sec"><div class="band gp"><div><h2>Pune Ganpati mandal guide</h2><p>Maps, timings, metro routes and crowd reports for 22 mandals. Ready for next Ganeshotsav.</p></div><a class="btn" href="/ganpati">Open guide</a></div></section>` + promo('home') +
    `<section class="sec"><div class="band"><div><h2>Organising an event in Pune?</h2><p>List it free. Sell passes with your own payment link and get your own page.</p></div><a class="btn" href="/list-your-event">List your event</a></div></section>`);
  write('index.html', layout('/', t, d, body, [...BASE, wpLd('/', t, d, 1), listLd(FEAT_FIRST, e => ({ u: eurl(e), n: e.title }))], { cur: '' })); add('/', '1.0', 'daily');
}
// ---------- events hub, cities, categories ----------
const citiesWith = [...new Set(UP.map(e => e.city))];
{
  const t = `Upcoming Events in ${citiesWith.map(cityName).slice(0, 3).join(', ') || 'India'}: Festivals, Garba, Cultural`, d = `Browse upcoming festivals, garba and dandiya nights, cultural events and markets in ${citiesWith.map(cityName).join(', ') || 'your city'}. Dates, venues, prices and passes.`;
  const q = `${UP.length} upcoming events across ${citiesWith.length} ${citiesWith.length === 1 ? 'city' : 'cities'}: ${UP.length ? names(UP, 3) : 'none listed yet'}.`;
  write('events.html', layout('/events', t, d, wrap('<div class="pad">' + head('Upcoming events', q, [['Home', '/'], ['Events', null]]) + chips(citiesWith.map(c => [`/events/${c}`, 'Events in ' + cityName(c)])) + bar() + grid(UP, e => evCard(e, true), 'No events match.') + faqHtml(FAQ.events) + '</div>'), [...BASE, wpLd('/events', t, d, 1), crumbsLd([['Home', '/'], ['Events', '/events']]), listLd(UP, e => ({ u: eurl(e), n: e.title })), faqLd(FAQ.events)], { cur: '/events' })); add('/events', '0.9', 'daily');
}
for (const c of citiesWith) {
  const cn = cityName(c), ce = UP.filter(e => e.city === c), cats = Object.keys(CATS).filter(k => ce.some(e => e.category === k));
  const cf = [[`Which events are happening in ${cn} in ${mon}?`, 'Upcoming: ' + names(ce, 6) + '.'], [`How can I list an event in ${cn}?`, 'Use the List your event form. Basic listings are free and you can add your own pass or ticket links.']];
  const t = `Events in ${cn}: Upcoming Festivals, Garba & Cultural (${mon})`, d = `${ce.length} upcoming events in ${cn}: ${names(ce, 2)}. Dates, venues, prices and passes.`;
  write(`events/${c}.html`, layout(`/events/${c}`, t, d, wrap('<div class="pad">' + head(`Events in ${cn}`, `There are ${ce.length} upcoming events in ${cn}: ${names(ce, 3)}.`, [['Home', '/'], ['Events', '/events'], [cn, null]]) + chips(cats.map(k => [`/events/${c}/${k}`, CATS[k]])) + bar() + grid(ce, e => evCard(e, false), 'No events match.') + faqHtml(cf) + '</div>'), [...BASE, wpLd(`/events/${c}`, t, d, 1), crumbsLd([['Home', '/'], ['Events', '/events'], [cn, `/events/${c}`]]), listLd(ce, e => ({ u: eurl(e), n: e.title })), faqLd(cf)], { cur: '/events' })); add(`/events/${c}`, '0.8', 'daily');
  for (const k of cats) {
    const ke = ce.filter(e => e.category === k), kn = CATS[k], t2 = `${kn} in ${cn}: Dates, Venues & Passes (${mon})`, d2 = `${ke.length} upcoming ${kn.toLowerCase()} events in ${cn}: ${names(ke, 2)}.`;
    write(`events/${c}/${k}.html`, layout(`/events/${c}/${k}`, t2, d2, wrap('<div class="pad">' + head(`${kn} in ${cn}`, `${ke.length} upcoming ${kn.toLowerCase()} events in ${cn}: ${names(ke, 3)}.`, [['Home', '/'], ['Events', '/events'], [cn, `/events/${c}`], [kn, null]]) + chips([[`/events/${c}`, 'All events in ' + cn], ...cats.filter(x => x !== k).map(x => [`/events/${c}/${x}`, CATS[x]])]) + bar(false) + grid(ke, e => evCard(e, false), 'No events match.') + (k === 'garba' ? promo('garba-' + c) : '') + '</div>'), [...BASE, wpLd(`/events/${c}/${k}`, t2, d2, 1), crumbsLd([['Home', '/'], ['Events', '/events'], [cn, `/events/${c}`], [kn, `/events/${c}/${k}`]]), listLd(ke, e => ({ u: eurl(e), n: e.title }))], { cur: '/events' })); add(`/events/${c}/${k}`, '0.7', 'daily');
  }
}
// ---------- event detail (with passes) ----------
const catPages = new Set(UP.map(e => e.city + '/' + e.category));
for (const e of EV) {
  const cn = cityName(e.city), place = [e.venue, e.area, cn].filter(Boolean).join(', '), ended = !up(e), rel = UP.filter(x => x.city === e.city && x.slug !== e.slug).slice(0, 4);
  const t = `${e.title}: ${drange(e)}, ${cn}`, d = `${e.title} at ${e.venue || cn}, ${cn} on ${drange(e)}${e.start_time ? ' at ' + e.start_time : ''}. ${e.free ? 'Free entry.' : 'Passes from ' + inr(e.from) + '.'} Venue, map and booking.`;
  const cr = [['Home', '/'], ['Events', '/events'], [cn, `/events/${e.city}`], [e.title, null]];
  const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([e.venue, e.area, cn].filter(Boolean).join(' '));
  const share = 'https://wa.me/?text=' + encodeURIComponent(`${e.title}, ${drange(e)}. ${SITE}${eurl(e)}`);
  const buy = (name, url) => url ? `<a class="btn sf" href="${esc(url)}" target="_blank" rel="noopener">Buy pass</a>` : (WA ? `<a class="btn sf" href="${esc(wa(`Hi, I want to buy "${name}" for ${e.title} (${drange(e)}).`))}" target="_blank" rel="noopener">Book on WhatsApp</a>` : `<a class="btn alt" href="mailto:${esc(EMAIL)}?subject=${encodeURIComponent('Pass: ' + e.title)}">Enquire</a>`);
  let tix = '';
  if (ended) tix = '';
  else if (e.passes.length) tix = `<h2 id="passes" style="font-size:20px;margin-top:20px">Choose your pass</h2><div class="passes">${e.passes.map(p => `<div class="pass"><div><b>${esc(p.name)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ''}</div><div style="text-align:right"><div class="p">${p.price ? inr(p.price) : 'Free'}</div>${buy(p.name, p.buy_url)}</div></div>`).join('')}</div><p class="trust"><span>Pay on the organiser's secure payment page</span><span>Save the payment receipt as your entry proof</span></p>`;
  else if (e.ticket_url) tix = `<div class="row" id="passes"><a class="btn sf lg" href="${esc(e.ticket_url)}" target="_blank" rel="sponsored noopener">Book tickets</a></div>`;
  else if (e.free) tix = '<p class="qa" id="passes" style="margin-top:16px">Free entry. No pass needed.</p>';
  else if (WA) tix = `<div class="row" id="passes"><a class="btn sf lg" href="${esc(wa(`Hi, I want passes for ${e.title} (${drange(e)}).`))}" target="_blank" rel="noopener">Book on WhatsApp</a></div>`;
  const price = e.free ? 'Free entry' : (e.passes.length ? 'From ' : '') + inr(e.from);
  const sbar = !ended && e.canbuy ? `<div class="sbar"><div><b>${esc(price)}</b><div class="meta">${esc(drange(e))}</div></div><a class="btn sf" href="#passes">${e.passes.length ? 'Get passes' : 'Book now'}</a></div>` : '';
  const catLink = catPages.has(e.city + '/' + e.category) ? `<a href="/events/${e.city}/${e.category}">${esc(CATS[e.category])}</a>` : esc(CATS[e.category]);
  const dd = pd(e.start_date), nm = e.title.toLowerCase();
  const body = wrap('<div class="pad">' + crumbsHtml(cr) + (ended ? `<p class="empty" style="margin-top:12px">This event has ended. <a href="/events/${e.city}">See upcoming events in ${cn}</a>.</p>` : '') + `<div class="ph"><div><div class="cover c-${e.category}">${e.image_url ? `<img src="${esc(e.image_url)}" alt="${esc(e.title)}">` : ''}<span class="db"><b>${dd.getUTCDate()}</b>${MON[dd.getUTCMonth()]}</span></div><h2 style="margin-top:22px;font-size:20px">About this event</h2><div class="prose">${paras(e.description)}</div></div>
<div><span class="tag" style="display:inline-block">${esc(CATS[e.category])}</span><h1>${esc(e.title)}</h1><p id="quick-answer" class="qa">${esc(e.title)} takes place ${esc(drange(e))}${e.start_time ? ' at ' + esc(e.start_time) : ''} at ${esc(e.venue || cn)}, ${cn}. ${e.free ? 'Entry is free.' : 'Passes from ' + inr(e.from) + '.'}</p>
<dl class="facts"><div><dt>When</dt><dd>${esc(drange(e))}${e.start_time ? ', ' + esc(e.start_time) : ''}</dd></div><div><dt>Where</dt><dd>${esc(place)}</dd></div><div><dt>Price</dt><dd>${esc(price)}</dd></div><div><dt>Category</dt><dd>${catLink}</dd></div>${e.organizer ? `<div><dt>Organiser</dt><dd>${esc(e.organizer)}</dd></div>` : ''}</dl>${tix}
<div class="row"><a class="btn alt sm" href="${maps}" target="_blank" rel="noopener">Open in Maps</a><a class="btn alt sm" href="${share}" target="_blank" rel="noopener">Share on WhatsApp</a></div></div></div>` +
    (!ended && (e.category === 'garba' || nm.includes('navratri')) ? promo('event-' + e.slug) : !ended && (nm.includes('diwali') || nm.includes('dhanteras')) ? promo('event-' + e.slug, true) : '') +
    (rel.length ? sec('More events in ' + cn, [`/events/${e.city}`, 'See all'], `<ul class="grid">${rel.map(x => evCard(x, false)).join('')}</ul>`) : '') + '</div>');
  write(`event/${e.slug}.html`, layout(eurl(e), t, d, body, [...BASE, wpLd(eurl(e), t, d), crumbsLd([...cr.slice(0, 3), [e.title, eurl(e)]]), eventLd(e)], { cur: '/events', sticky: !!sbar, sbar, robots: ended ? 'noindex, follow' : undefined, image: e.image_url })); if (!ended) add(eurl(e), '0.7');
}
// ---------- shop ----------
if (HASSHOP) {
  const cats = [...new Set(PR.map(p => p.cat))];
  const t = 'Festive Shop Pune: Garba Outfits, Diwali Decor & Gifts', d = `Shop festive picks for Navratri and Diwali: ${cats.slice(0, 4).join(', ')} and more. Simple checkout, delivery details on each product.`;
  const f = `<form class="bar" data-filter role="search"><input type="search" name="q" placeholder="Search products" aria-label="Search products"><select name="c" aria-label="Category"><option value="">All categories</option>${cats.map(c => `<option value="${esc(slugify(c))}">${esc(c)}</option>`).join('')}</select><span id="count" class="meta"></span></form>`;
  write('shop.html', layout('/shop', t, d, wrap('<div class="pad">' + head('Festive shop', `${PR.length} products across ${cats.length} categories, including ${cats.slice(0, 3).join(', ')}.`, [['Home', '/'], ['Shop', null]]) + f + `<ul class="grid">${PR.map(prCard).join('')}</ul><p id="none" class="empty" hidden>No products match.</p></div>`), [...BASE, wpLd('/shop', t, d, 1), crumbsLd([['Home', '/'], ['Shop', '/shop']]), listLd(PR, p => ({ u: purl(p), n: p.title }))], { cur: '/shop' })); add('/shop', '0.8', 'daily');
  for (const p of PR) {
    const t2 = `${p.title}: ${inr(p.price)} | Festive Shop Pune`, d2 = `${p.title}. ${p.description || ''}`.slice(0, 158), rel = PR.filter(x => x.cat === p.cat && x.slug !== p.slug).slice(0, 4);
    const buyBtn = !p.instock ? '<p class="empty">Currently sold out.</p>' : p.buy_url ? `<a class="btn sf lg" href="${esc(p.buy_url)}" target="_blank" rel="noopener sponsored">Buy now</a>` : WA ? `<a class="btn sf lg" href="${esc(wa(`Hi, I want to order: ${p.title} (${inr(p.price)}). ${SITE}${purl(p)}`))}" target="_blank" rel="noopener">Order on WhatsApp</a>` : `<a class="btn alt lg" href="mailto:${esc(EMAIL)}?subject=${encodeURIComponent('Order: ' + p.title)}">Enquire</a>`;
    const body = wrap('<div class="pad">' + crumbsHtml([['Home', '/'], ['Shop', '/shop'], [p.title, null]]) + `<div class="ph"><div class="cover" style="aspect-ratio:1/1">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.title)}">` : ''}</div><div><span class="tag" style="display:inline-block">${esc(p.cat)}</span><h1>${esc(p.title)}</h1><p style="font-size:28px;font-weight:900;margin:6px 0">${inr(p.price)}${p.mrp ? ` <s style="font-size:16px;color:#64748b;font-weight:500">${inr(p.mrp)}</s> <span class="tag" style="background:#dcfce7;color:#166534">${Math.round((1 - p.price / p.mrp) * 100)}% off</span>` : ''}</p><p id="quick-answer" class="qa">${esc(p.title)} costs ${inr(p.price)}. ${p.instock ? 'In stock.' : 'Currently sold out.'}</p><div class="row">${buyBtn}</div><p class="trust"><span>Secure payment page</span><span>Delivery and returns: see <a href="/policies">policies</a></span></p><div class="prose"><h2>About this product</h2>${paras(p.description)}</div></div></div>` + (rel.length ? sec('More in ' + p.cat, ['/shop', 'Shop'], `<ul class="grid">${rel.map(prCard).join('')}</ul>`) : '') + '</div>');
    const ld = { '@type': 'Product', '@id': SITE + purl(p) + '#product', name: p.title, description: p.description || p.title, sku: p.slug, category: p.cat, offers: { '@type': 'Offer', price: String(p.price), priceCurrency: 'INR', availability: p.instock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: SITE + purl(p), itemCondition: 'https://schema.org/NewCondition' } }; if (p.image_url) ld.image = [p.image_url];
    write(`shop/${p.slug}.html`, layout(purl(p), t2, d2, body, [...BASE, wpLd(purl(p), t2, d2), crumbsLd([['Home', '/'], ['Shop', '/shop'], [p.title, purl(p)]]), ld], { cur: '/shop', image: p.image_url })); add(purl(p), '0.6');
  }
}
// ---------- guides, about, policies, list, 404 ----------
function guide(p, diwali) {
  const P = PAGES[p], fl = UP.filter(e => e.city === 'pune' && (diwali ? ['market', 'cultural'].includes(e.category) || (e.category === 'festival' && /diwali|dhanteras/i.test(e.title)) : e.category === 'garba' || (e.category === 'festival' && /navratri/i.test(e.title))));
  let tb;
  if (diwali) tb = `<h2 style="margin:28px 0 12px">Diwali dates 2026</h2><table><thead><tr><th>Festival</th><th>Date</th></tr></thead><tbody>${FEST.slice(2).map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.label)}</td></tr>`).join('')}</tbody></table><h2 style="margin:28px 0 12px">Where to shop in Pune</h2><div class="facts">${[['Laxmi Road', 'Clothes, festive wear and jewellery in the old city.'], ['Tulshibaug', 'Lamps, rangoli, decor and puja items.'], ['Peth-area markets', 'Flowers, sweets and dry fruits around Budhwar Peth and Mandai.']].map(([a, b]) => `<div><dt>${a}</dt><dd style="font-weight:500">${b}</dd></div>`).join('')}</div><p class="meta">Evenings are crowded with traffic diversions. Take the metro towards Mandai and walk in.</p>`;
  else tb = `<h2 style="margin:28px 0 12px">Nine nights: dates, Devi and colour</h2><table><thead><tr><th>Day</th><th>Date</th><th>Devi</th><th>Colour</th></tr></thead><tbody>${NAV9.map((c, i) => `<tr><td>${i + 1}</td><td>${11 + i} Oct</td><td>${c[0]}</td><td><span class="dot" style="background:${c[2]}"></span>${c[1]}</td></tr>`).join('')}</tbody></table>`;
  const shopStrip = HASSHOP ? sec('Festive picks', ['/shop', 'Shop'], `<ul class="grid">${PR.slice(0, 4).map(prCard).join('')}</ul>`) : '';
  const body = wrap('<div class="pad">' + head(P.h1, P.q, [['Home', '/'], ['Events', '/events'], [P.h1, null]]) + tb + promo(diwali ? 'diwali' : 'navratri', diwali) + sec('Events in Pune', ['/events/pune', 'All Pune events'], fl.length ? `<ul class="grid">${fl.map(e => evCard(e, false)).join('')}</ul>` : '<p class="empty">No dated listings yet. <a href="/events/pune">See all Pune events</a> or <a href="/list-your-event">list yours</a>.</p>') + shopStrip + faqHtml(FAQ[P.faq]) + '</div>');
  const evs = diwali ? FEST.slice(2).map(festLd) : FEST.slice(0, 2).map(festLd);
  write(p.slice(1) + '.html', layout(p, P.t, P.d, body, [...BASE, wpLd(p, P.t, P.d), crumbsLd([['Home', '/'], ['Events', '/events'], [P.h1, p]]), faqLd(FAQ[P.faq]), ...evs], { cur: p })); add(p, '0.9', 'daily');
}
guide('/navratri', false); guide('/diwali', true);
{
  let POL = {}; try { POL = J('policies.json'); } catch {}
  const pb = Object.entries(POL).map(([k, v]) => `<h2 id="${esc(k)}">${esc(v.title)}</h2>${paras(v.text)}`).join('');
  const t = 'Terms, Refund and Shipping Policy | Pune Ganpati LIVE', d = 'Terms of use, refund and cancellation policy, shipping and contact details for event passes and products on Pune Ganpati LIVE.';
  write('policies.html', layout('/policies', t, d, wrap('<div class="pad prose">' + head('Terms, refunds and shipping', 'How event passes, product orders, refunds and delivery work on Pune Ganpati LIVE.', [['Home', '/'], ['Policies', null]]) + pb + `<h2 id="contact">Contact</h2><p>Email: <a href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a>${WA ? ` | WhatsApp: +${esc(WA)}` : ''}</p></div>`), [...BASE, wpLd('/policies', t, d)])); add('/policies', '0.3', 'monthly');
  const A = PAGES['/about'];
  write('about.html', layout('/about', A.t, A.d, wrap('<div class="pad prose">' + head(A.h1, A.q, [['Home', '/'], ['About', null]]) + '<h2>Privacy</h2><p>Comments on mandal pages are stored with Google Firebase. Fonts load from Google Fonts and maps from OpenStreetMap-based tiles, so your browser contacts those services. Near Me uses your device location in your browser to sort places by distance. Payments happen on the payment provider\'s own page; we do not see or store card details.</p><h2>Affiliate and sponsored links</h2><p>Some links, including BlinkWear.in, are sponsored or affiliate links and are marked. We may earn a commission or listing fee at no extra cost to you.</p><h2>Accuracy</h2><p>Event details come from organisers and crowd reports are community submitted. Festival dates follow the panchang. Always recheck with the organiser, mandal or temple.</p><h2>Advertise or list an event</h2><p>Basic listings are free. Featured placement and sponsor banners are available. Email <a href="mailto:' + esc(EMAIL) + '">' + esc(EMAIL) + '</a>.</p></div>'), [...BASE, wpLd('/about', A.t, A.d)])); add('/about', '0.3', 'monthly');
  const copt = Object.entries(CITIES).map(([k, v]) => `<option>${v[0]}</option>`).join(''), kopt = Object.values(CATS).map(v => `<option>${v}</option>`).join('');
  const f = `<form class="f" id="lyf"><input class="w" name="Event name" placeholder="Event name" required aria-label="Event name"><select name="City" aria-label="City">${copt}</select><select name="Category" aria-label="Category">${kopt}</select><input name="Venue" placeholder="Venue" required aria-label="Venue"><input name="Area" placeholder="Area or locality" aria-label="Area"><input name="Start date" type="date" required aria-label="Start date"><input name="End date" type="date" aria-label="End date"><input name="Start time" placeholder="Start time, e.g. 7:00 PM" aria-label="Start time"><input name="Pass types and prices" placeholder="Passes, e.g. Couple 999, Single 499" aria-label="Passes"><label class="w up">Event poster (optional): upload an image from your phone or computer<input class="w" id="lyimg" name="Poster file" type="file" accept="image/*"></label><img id="lyprev" alt="" hidden style="max-width:200px;border-radius:10px"><input class="w" name="Image link" placeholder="Or paste a poster image link (optional)" aria-label="Image link"><textarea class="w" name="Description" rows="4" placeholder="What is happening? Who is it for?" aria-label="Description"></textarea><input name="Organiser" placeholder="Organiser name" aria-label="Organiser"><input name="Phone or WhatsApp" placeholder="Your phone or WhatsApp" required aria-label="Contact"><input name="Website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;width:0"><button class="btn sf w" id="lybtn" style="grid-column:1/-1;padding:14px">Send listing request</button><p id="lymsg" class="w meta" role="status" style="grid-column:1/-1;margin:0"></p></form><div id="lyok" class="panel" hidden style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px"><h2>Thank you! Your event is submitted.</h2><p>We review every listing. Once approved (usually within a day) your event gets its own page on this site.</p><div class="row"><a class="btn sf" href="/events">Browse events</a><a class="btn alt" href="/list-your-event">List another event</a></div></div>`;
  const lt = 'List your event on Pune Ganpati LIVE: Free for Pune and More Cities', ld2 = 'Add your garba night, festival, market or cultural event for free. Sell passes with your own payment link and reach people searching for events.';
  write('list-your-event.html', layout('/list-your-event', lt, ld2, wrap('<div class="pad">' + head('List your event', 'Basic listings are free. You get your own event page with a map, share button and pass buttons. Featured placement is available.', [['Home', '/'], ['List your event', null]]) + f + (WA ? `<p class="meta" style="margin-top:12px">Prefer WhatsApp? <a href="${esc(wa('Hi, I want to list my event on Pune Ganpati LIVE.'))}">Message us</a>.</p>` : '') + '</div>'), [...BASE, wpLd('/list-your-event', lt, ld2)])); add('/list-your-event', '0.6', 'monthly');
  write('404.html', layout('/404', 'Page not found', 'Page not found', wrap('<div class="pad"><h1>Page not found</h1><div class="row"><a class="btn sf" href="/events">Browse events</a><a class="btn alt" href="/">Home</a></div></div>'), BASE, { robots: 'noindex' }));
}
// ---------- assemble dist ----------
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(PUB)) fs.cpSync(path.join(PUB, f), path.join(OUT, f), { recursive: true });
let STATIC = []; try { STATIC = J('static-urls.json'); } catch {}
for (const u of STATIC) add(u, u === '/ganpati' ? '0.8' : '0.6', 'monthly');
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + SM.map(([p, pr, f]) => `  <url><loc>${SITE}${p === '/' ? '/' : p}</loc><lastmod>${TODAY}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join('\n') + '\n</urlset>\n');
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin\n\n# AI search and answer engines are welcome\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write('llms.txt', `# Pune Ganpati LIVE\n\n> Pune Ganpati LIVE (${SITE}) is an events-first guide to Pune: festivals, garba and dandiya nights, cultural events and markets with pass booking, a festive shop, and a Ganpati mandal guide with maps, metro routes and helplines.\n\n## Key facts (verified ${TODAY})\n- Sharad Navratri 2026: Sunday 11 October to Monday 19 October. Dussehra: Tuesday 20 October 2026.\n- Diwali (Lakshmi Puja) 2026: Sunday 8 November. Dhanteras 6 Nov, Govardhan Puja 10 Nov, Bhai Dooj 11 Nov.\n- Festive outfit rentals in Pune: BlinkWear.in (rentals from Rs 499 per day).\n\n## Upcoming events\n${UP.slice(0, 40).map(e => `- [${e.title}](${SITE}${eurl(e)}): ${drange(e)}, ${cityName(e.city)}, ${e.free ? 'free' : 'from ' + inr(e.from)}`).join('\n')}\n\n## Pages\n- [All events](${SITE}/events)\n${citiesWith.map(c => `- [Events in ${cityName(c)}](${SITE}/events/${c})`).join('\n')}\n- [Navratri 2026 guide](${SITE}/navratri)\n- [Diwali 2026 guide](${SITE}/diwali)\n${HASSHOP ? `- [Shop](${SITE}/shop)\n` : ''}- [Ganpati mandal guide](${SITE}/ganpati)\n- [List your event](${SITE}/list-your-event)\n\n## Ganpati mandals (Pune)\n${MANDALS.map(m => `- [${m.name}](${SITE}/pune-ganpati/${m.id}): ${m.area}, ${m.cat}`).join('\n')}\n\n## Data policy\n- Event details come from organisers; confirm before travelling. Crowd reports are community submitted.\n- Festival dates follow the panchang. Some links are sponsored or affiliate links and are marked.\n`);
console.log(`Built ${SM.length} URLs | events ${EV.length} (${UP.length} upcoming) | products ${PR.length} | cities ${citiesWith.join(',') || '-'} | ${TODAY}`);
