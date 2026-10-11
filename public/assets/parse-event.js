// Rule-based extractor: turns a pasted paragraph about an event into form fields. Runs in the browser (no server, no API).
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const M = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const AREAS = ['Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Shivajinagar', 'Sinhagad Road', 'Karve Nagar', 'Karve Road', 'Laxmi Road', 'Sadashiv Peth', 'Shaniwar Wada', 'FC Road', 'JM Road', 'Pune Station', 'Hinjewadi', 'Hinjawadi', 'Kothrud', 'Baner', 'Balewadi', 'Aundh', 'Pashan', 'Bavdhan', 'Warje', 'Wakad', 'Pimpri', 'Chinchwad', 'Nigdi', 'Akurdi', 'Ravet', 'Tathawade', 'Moshi', 'Hadapsar', 'Magarpatta', 'Kharadi', 'Wagholi', 'Mundhwa', 'Yerwada', 'Lohegaon', 'Camp', 'Deccan', 'Swargate', 'Katraj', 'Kondhwa', 'NIBM', 'Undri', 'Bibwewadi', 'Dhankawadi', 'Tulshibaug', 'Kasba Peth', 'Budhwar Peth', 'Narayan Peth', 'Erandwane', 'Model Colony', 'Senapati Bapat Road', 'SB Road', 'Bhosari', 'Talegaon', 'Lonavala', 'Sus', 'Dhayari', 'Wanowrie', 'Salunke Vihar'];
const CATRULES = [['garba', /garba|dandiya|raas\b|navratri (?:night|special|celebration)/i], ['workshop', /workshop|masterclass|training|bootcamp|course\b|class\b|seminar/i], ['market', /\b(?:market|mela|exhibition|expo|bazaar|bazar|flea|stalls?|pop-?up)\b/i], ['music', /concert|live music|\bdj\b|band\b|singer|unplugged|music (?:night|festival)|\bgig\b|karaoke|sufi night|qawwali|dj night/i], ['cultural', /cultural|drama|natak|dance|kathak|comedy|stand-?up|mushaira|poetry|theatre|theater|art show|film/i], ['festival', /festival|puja|pooja|utsav|jayanti|dussehra|diwali|ganesh|navratri|holi|celebration|aarti|mahotsav/i]];
const TICKET_HOSTS = /bookmyshow|insider\.in|paytm|townscript|allevents|razorpay|rzp\.io|instamojo|eventbrite|district\.in|explara|meraevents|ticket|pages\./i;
const pad = n => String(n).padStart(2, '0');
const mon = s => MON[String(s).slice(0, 3).toLowerCase()];

export function parseEventText(raw, { CITIES, CATS, today }) {
  const text0 = String(raw || '').replace(/\r/g, '').replace(/[\u200b\u00a0]/g, ' ');
  const notes = [], t = new Date(today + 'T00:00:00Z'), cy = t.getUTCFullYear();
  const lines = text0.split('\n').map(l => l.trim());
  const fixYear = (m, d, y) => { if (y) { y = +y; if (y < 100) y += 2000; return y; } let yy = cy; const c = new Date(Date.UTC(yy, m - 1, d)); if (c < new Date(t.getTime() - 45 * 864e5)) yy++; return yy; };
  const iso = (y, m, d) => { if (m < 1 || m > 12 || d < 1 || d > 31) return null; const dt = new Date(Date.UTC(y, m - 1, d)); if (dt.getUTCMonth() !== m - 1) return null; return `${y}-${pad(m)}-${pad(d)}`; };

  // ---- dates ----
  let w = text0, dates = [];
  const take = (re, fn) => { w = w.replace(re, (...a) => { const r = fn(a); if (r) dates.push(...r.filter(Boolean)); return ' '.repeat(a[0].length); }); };
  take(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|—|to|till|until)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+${M}[a-z]*\\.?,?\\s*(\\d{4})?`, 'gi'), a => { const m = mon(a[3]); return [iso(fixYear(m, +a[1], a[4]), m, +a[1]), iso(fixYear(m, +a[2], a[4]), m, +a[2])]; });
  take(new RegExp(`\\b${M}[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|—|to|till|until)\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`, 'gi'), a => { const m = mon(a[1]); return [iso(fixYear(m, +a[2], a[4]), m, +a[2]), iso(fixYear(m, +a[3], a[4]), m, +a[3])]; });
  take(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${M}[a-z]*\\.?,?\\s*(\\d{4})?`, 'gi'), a => { const m = mon(a[2]); return [iso(fixYear(m, +a[1], a[3]), m, +a[1])]; });
  take(new RegExp(`\\b${M}[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`, 'gi'), a => { const m = mon(a[1]); return [iso(fixYear(m, +a[2], a[3]), m, +a[2])]; });
  take(/\b(\d{4})-(\d{2})-(\d{2})\b/g, a => [iso(+a[1], +a[2], +a[3])]);
  take(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g, a => [iso(+a[3] < 100 ? 2000 + +a[3] : +a[3], +a[2], +a[1])]);
  dates = [...new Set(dates)].filter(d => Math.abs(new Date(d + 'T00:00:00Z') - t) < 800 * 864e5).sort();
  const start_date = dates[0] || '', end_date = dates.length > 1 ? dates[dates.length - 1] : '';
  if (!start_date) notes.push('Date not found: please fill it in.'); else if (dates.length > 2) notes.push('Several dates found (' + dates.join(', ') + '): start and end were set to the first and last. Please verify.');

  // ---- time ----
  let start_time = '';
  const fmt = (h, mi, ap) => { h = +h; ap = String(ap).toUpperCase().replace(/\./g, ''); return `${h}:${mi || '00'} ${ap}`; };
  let tm = w.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:-|–|—|to|till)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);
  if (tm) start_time = fmt(tm[1], tm[2], tm[3] || tm[6]); else { tm = w.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i); if (tm) start_time = fmt(tm[1], tm[2], tm[3]); }
  if (!start_time) { // Hinglish: "shaam 7 baje", "raat 8:30 baje", "subah 9 baje"
    const hb = w.match(/\b(subah|savere|dopahar|dophar|shaam|sham|raat)\s*(\d{1,2})(?:[:.](\d{2}))?\s*baje\b/i) || null;
    if (hb) { const pm = /dopahar|dophar|shaam|sham|raat/i.test(hb[1]); start_time = fmt(hb[2], hb[3], pm ? 'PM' : 'AM'); }
  }
  if (!start_time) { const m24 = w.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*(?:hrs|hours)?\b/i); if (m24) { let h = +m24[1], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; start_time = `${h}:${m24[2]} ${ap}`; } }
  if (!start_time) notes.push('Start time not found.');

  // ---- city / area / category ----
  const low = text0.toLowerCase();
  let city = Object.keys(CITIES).find(k => new RegExp('\\b' + String(CITIES[k]).toLowerCase() + '\\b').test(low)) || '';
  const area = AREAS.find(a => new RegExp('\\b' + a.replace(/ /g, '\\s+') + '\\b', 'i').test(text0)) || '';
  if (!city && area) city = 'pune'; if (!city) { city = 'pune'; notes.push('City not found: defaulted to Pune.'); }
  let category = (CATRULES.find(([, re]) => re.test(text0)) || [])[0] || ''; if (!category) { category = 'cultural'; notes.push('Category guessed as Cultural: please check.'); }
  if (!CATS[category]) category = Object.keys(CATS)[0];

  // ---- venue ----
  let venue = '', address = '';
  for (const l of lines) { const m = l.match(/^[^\w]*(?:venue|location|place|where|address|📍)\s*[:\-–]?\s*(.+)$/i) || l.match(/^[^\w]*📍\s*(.+)$/); if (m && m[1].trim().length > 2) { venue = m[1].trim(); break; } }
  if (!venue) { const m = text0.match(/(?:\bat|@)\s+((?:[A-Z][\w'&.-]*|of|the|and|&)(?:\s+(?:[A-Z][\w'&.-]*|of|the|and|&)){0,6})/); if (m) venue = m[1].trim().replace(/[.,]$/, ''); }
  if (venue.includes(',')) { const parts = venue.split(','); if (parts.length > 2 || venue.length > 60) { address = venue; venue = parts[0].trim(); } }
  venue = venue.slice(0, 120); if (!venue) { venue = area || ''; notes.push('Venue not found: please fill it in.'); }

  // ---- price / passes ----
  const num = s => Number(String(s).replace(/,/g, ''));
  const passes = [], seen = new Set();
  const KEY = '(couples?|singles?|stag|female|males?|ladies|girls?|boys?|family|group|vip|gold|silver|platinum|early\\s*bird|general|entry|regular|premium|season|students?|kids?|child(?:ren)?|adults?|normal|standard|combo|day\\s*pass)';
  const segRe = new RegExp(`${KEY}[a-z ]{0,18}?[\\s:\\-–=@]*(?:₹|rs\\.?|inr)?\\s*([\\d,]{2,6})\\b`, 'i');
  for (const seg of w.split(/[\n,;|•]+/)) { const m = seg.match(segRe); if (m && num(m[2]) >= 10) { let name = m[1].replace(/\s+/g, ' ').trim(); name = name.replace(/\b\w/g, c => c.toUpperCase()); const key = name.toLowerCase(); if (!seen.has(key)) { seen.add(key); passes.push({ name, price: String(num(m[2])), buy_url: '', note: '' }); } } }
  const prices = []; for (const m of w.matchAll(/(?:₹|rs\.?|inr)\s*([\d,]+)|([\d,]{2,7})\s*(?:\/-|rs\b|inr\b|rupees?\b|rupaye\b|rupay\b)/gi)) { const n = num(m[1] || m[2]); if (n >= 10) prices.push(n); }
  let price = '';
  if (!passes.length && prices.length) { const u = [...new Set(prices)].sort((a, b) => a - b); price = String(u[0]); if (u.length > 1) notes.push('Several prices found (' + u.join(', ') + '): set the lowest as price. Add passes if needed.'); }
  if (passes.length) notes.push('Passes found: ' + passes.map(p => p.name + ' Rs ' + p.price).join(', ') + '. Add a payment link for each, or leave blank to book via WhatsApp.');
  if (!passes.length && !prices.length && !/\bfree\b/i.test(text0)) notes.push('No price found: it will show as free. Check this.');

  // ---- links, organiser, phone ----
  let ticket_url = '', image_url = '';
  for (const m of text0.matchAll(/https?:\/\/[^\s)>\]]+/gi)) { const u = m[0].replace(/[.,;]+$/, ''); if (/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(u)) image_url = image_url || u; else if (!ticket_url && TICKET_HOSTS.test(u)) ticket_url = u; }
  let organizer = ''; const om = text0.match(/(?:organi[sz]ed by|presented by|hosted by|brought to you by|powered by)\s*[:\-–]?\s*([^\n,.|]{2,60})/i); if (om) organizer = om[1].trim();
  const ph = text0.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/); if (ph) notes.push('Phone found (' + ph[0].trim() + '): NOT added to the public page. Add it in the description only if the organiser wants it shown.');

  // ---- title ----
  const clean = s => s.replace(/https?:\/\/\S+/g, '').replace(/[#*_`>~]+/g, '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
  let title = '', titleIdx = -1;
  for (let i = 0; i < lines.length; i++) { const l = lines[i], m = l.match(/^[^\w]*(?:title|event(?: name)?)\s*[:\-–]\s*(.+)$/i); if (m) { title = clean(m[1]); titleIdx = i; break; } }
  if (!title) for (let i = 0; i < lines.length; i++) { const c = clean(lines[i]); if (c.length < 4 || /^(?:date|time|venue|price|ticket|entry|contact|phone|call|location|address|when|where)\b/i.test(c) || /^[\d\s:.,/\-–+₹]+$/.test(c)) continue; title = c; titleIdx = i; break; }
  if ((title.length > 70 || lines.filter(Boolean).length === 1) && /\s(?:at|on|from|@|in)\s|[.,]\s/.test(title)) title = title.split(/\s(?:at|on|from|@)\s|[.,]\s/)[0];
  if (title.length > 110) title = title.split(/(?<=[.!?|])\s|\s[-–|]\s/)[0].slice(0, 110);
  if (!title) { title = (CATS[category] || 'Event') + ' in ' + CITIES[city]; notes.push('Title not found: please write one.'); }
  title = title.replace(/[.:\-–|]+$/, '').trim();

  // ---- description ----
  let description = lines.filter((l, i) => i !== titleIdx).map(clean).filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n').slice(0, 1800);
  if (description.length < 40) description = title;
  notes.push('Rewrite the description in your own words (do not copy text from other websites; unique text also ranks better).');

  return { draft: { title, city, category, venue, area, address, start_date, end_date, start_time, price, ticket_url, image_url, organizer, description, passes, featured: false, published: true }, notes };
}

export function splitBlocks(raw) { return String(raw || '').split(/\n\s*(?:-{3,}|={3,}|\*{3,})\s*\n|\n\s*\n\s*\n+/).map(s => s.trim()).filter(s => s.length > 15); }
