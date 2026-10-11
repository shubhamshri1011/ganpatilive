// Organiser portal: Google sign-in, list new events, edit / take down / delete only your own listings.
// Security: every text is escaped before it goes into HTML; Firestore rules (firestore.rules.txt) decide who can read/write what.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
const readCfg = () => { try { const n = document.getElementById('cfg'); if (n) return JSON.parse(n.textContent); } catch { } return window.CFG || { CITIES: { pune: 'Pune' }, CATS: { festival: 'Festivals' } }; };
const CFG = readCfg(), CITIES = CFG.CITIES, CATS = CFG.CATS;
const app = initializeApp({ apiKey: 'AIzaSyAXbMPHQDSN-KKoS2OUEegwuapwzXwM-Ek', authDomain: 'puneganpatilive.firebaseapp.com', projectId: 'puneganpatilive', appId: '1:848829850195:web:c3b14375d19c5689cd9ca6' }, 'org');
const auth = getAuth(app), db = getFirestore(app), $ = s => document.querySelector(s), A = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const say = (m, bad) => { const n = $('#msg'); if (n) { n.textContent = m; n.className = 'meta' + (bad ? ' err' : ''); } };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let user = null;
function compress(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('bad')); };
    im.onload = () => {
      const k = Math.min(1, 1000 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      let q = 0.82, o = c.toDataURL('image/jpeg', q); while (o.length > 450000 && q > 0.35) { q -= 0.1; o = c.toDataURL('image/jpeg', q); }
      o.length > 450000 ? rej(new Error('big')) : res(o);
    };
    im.src = u;
  });
}
const signedOut = () => {
  A.innerHTML = `<div class="panel" style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px"><h2>List and manage your events</h2>
  <p>Sign in with Google to add your events, edit them later, take them down, and see whether they are approved. You can only see and change your own listings.</p>
  <p class="meta">New listings are reviewed before they appear on the site. Edits are reviewed too; the old version stays live until the edit is approved.</p>
  <div class="row"><button class="btn sf lg" id="in">Sign in with Google</button></div><p id="msg" class="meta" role="alert"></p></div>`;
  $('#in').onclick = async () => {
    say('Opening Google sign-in...');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) {
      if (e.code === 'auth/popup-blocked') { try { await signInWithRedirect(auth, new GoogleAuthProvider()); return; } catch (e2) { e = e2; } }
      const m = { 'auth/unauthorized-domain': 'This domain is not authorised in Firebase yet. Please tell the site owner.', 'auth/popup-closed-by-user': 'Sign-in window was closed. Please try again.', 'auth/cancelled-popup-request': 'Please try again.', 'auth/network-request-failed': 'No internet connection. Please try again.' }[e.code];
      say(m || 'Sign-in failed (' + (e.code || e.message) + '). Please try again.', 1);
    }
  };
};
const badge = r => {
  if (r.status === 'approved') return '<span style="color:#15803d;font-weight:800">Approved</span> <span class="meta">(live after the next site update)</span>';
  if (r.status === 'rejected') return `<span style="color:#b91c1c;font-weight:800">Not approved</span>${r.adminNote ? `<div class="meta">Reason: ${esc(r.adminNote)}</div>` : ''}<div class="meta">Edit and resubmit if you can fix it.</div>`;
  if (r.status === 'withdrawn') return '<span style="color:#6b7280;font-weight:800">Taken down</span>';
  return `<span style="color:#b45309;font-weight:800">Waiting for review</span>${r.eventId ? '<div class="meta">Your edit is being reviewed. The previous version stays live meanwhile.</div>' : ''}`;
};
async function home(flash) {
  A.innerHTML = '<p class="meta" role="status">Loading your events...</p>';
  try {
    const snap = await getDocs(query(collection(db, 'submissions'), where('ownerUid', '==', user.uid)));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    // live (or edit-in-review) events can be taken down; only requests not tied to a live event can be deleted (same as the Firestore rules)
    const canDown = r => !!r.eventId && (r.status === 'approved' || r.status === 'pending');
    const canDel = r => r.status === 'rejected' || r.status === 'withdrawn' || (r.status === 'pending' && !r.eventId);
    A.innerHTML = `<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><p class="meta" style="margin:0">Signed in as <b>${esc(user.email)}</b></p><div class="row"><button class="btn sf" id="new">+ List a new event</button><button class="btn alt sm" id="out">Sign out</button></div></div>
    <p id="msg" class="meta" role="status">${esc(flash || '')}</p>
    <h2 style="margin:18px 0 10px">Your listings (${rows.length})</h2>
    ${rows.length ? `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:12px">${rows.map(r => `<li style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;gap:14px;flex-wrap:wrap">
      ${r.image_data || r.image_url ? `<img src="${esc(r.image_data || r.image_url)}" alt="" width="96" height="96" style="width:96px;height:96px;object-fit:cover;border-radius:10px">` : ''}
      <div style="flex:1;min-width:200px"><b>${esc(r.title)}</b><div class="meta">${esc(CITIES[r.city] || r.city)} | ${esc(CATS[r.category] || r.category)} | ${esc(r.start_date)}${r.end_date && r.end_date !== r.start_date ? ' to ' + esc(r.end_date) : ''}</div><div class="meta">${esc(r.venue)}</div><div style="margin-top:6px">${badge(r)}</div>
      <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn sm alt" data-e="${esc(r.id)}">Edit</button>${r.status === 'approved' && r.eventId ? `<a class="btn sm alt" href="/event/${esc(r.eventId)}">View page</a>` : ''}${canDown(r) ? `<button class="btn sm alt" data-d="${esc(r.id)}" style="color:#b91c1c">Take down</button>` : ''}${canDel(r) ? `<button class="btn sm alt" data-x="${esc(r.id)}" style="color:#b91c1c">Delete</button>` : ''}</div></div></li>`).join('')}</ul>` : '<p class="meta">You have not listed any event yet. Click "List a new event".</p>'}`;
    $('#new').onclick = () => formView(null); $('#out').onclick = () => signOut(auth);
    document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => formView(rows.find(r => r.id === b.dataset.e)));
    document.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => { if (!confirm('Delete this listing permanently?')) return; b.disabled = true; try { await deleteDoc(doc(db, 'submissions', b.dataset.x)); home('Deleted.'); } catch (e) { b.disabled = false; say('Could not delete: ' + (e.code || e.message), 1); } });
    document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      const r = rows.find(x => x.id === b.dataset.d); if (!confirm('Take this event down from the website? You can edit and submit it again later.')) return; b.disabled = true;
      try { const w = writeBatch(db); w.update(doc(db, 'events', r.eventId), { published: false, updatedAt: serverTimestamp() }); w.update(doc(db, 'submissions', r.id), { status: 'withdrawn', updatedAt: serverTimestamp() }); await w.commit(); home('Taken down. It disappears from the website at the next site update.'); } catch (e) { b.disabled = false; say('Could not take down: ' + (e.code || e.message), 1); }
    });
  } catch (e) { A.innerHTML = `<div class="empty" role="alert">Could not load your events (${esc(e.code || e.message)}). <button class="btn sm alt" id="retry">Try again</button></div>`; $('#retry').onclick = () => home(); }
}
function formView(r) {
  const o = (m, v) => Object.entries(m).map(([k, n]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(n)}</option>`).join(''), v = k => esc(r?.[k] || '');
  let img = r?.image_data || '';
  A.innerHTML = `<h2 style="margin-bottom:10px">${r ? 'Edit your event' : 'List a new event'}</h2>${r?.eventId ? '<p class="meta">This event is live. Your changes will be reviewed first; the current version stays live until then.</p>' : ''}
  <form class="f" id="fm"><input class="w" name="title" placeholder="Event name *" aria-label="Event name" required minlength="3" maxlength="150" value="${v('title')}"><select name="city" aria-label="City">${o(CITIES, r?.city)}</select><select name="category" aria-label="Category">${o(CATS, r?.category)}</select>
  <input name="venue" placeholder="Venue *" aria-label="Venue" required maxlength="200" value="${v('venue')}"><input name="area" placeholder="Area or locality" aria-label="Area" maxlength="100" value="${v('area')}">
  <label class="meta">Start date *<input name="start_date" type="date" required value="${v('start_date')}"></label><label class="meta">End date<input name="end_date" type="date" value="${v('end_date')}"></label>
  <input name="start_time" placeholder="Start time, e.g. 7:00 PM" aria-label="Start time" maxlength="30" value="${v('start_time')}"><input name="passes_text" placeholder="Passes, e.g. Couple 999, Single 499 (blank = free)" aria-label="Passes" maxlength="300" value="${v('passes_text')}">
  <label class="w meta">Poster image: upload from your phone or computer<input class="w" type="file" id="fi" accept="image/*"></label><img id="ip" alt="Poster preview" ${img || r?.image_url ? `src="${esc(img || r.image_url)}"` : 'hidden'} style="max-width:200px;border-radius:10px">
  <input class="w" name="image_url" type="url" placeholder="Or paste a poster image link (optional)" aria-label="Poster link" maxlength="500" value="${v('image_url')}">
  <textarea class="w" name="description" rows="5" maxlength="3000" aria-label="Description" placeholder="What is happening? Who is it for?">${esc(r?.description || '')}</textarea>
  <input name="organizer" placeholder="Organiser name" aria-label="Organiser" maxlength="120" autocomplete="organization" value="${v('organizer')}"><input name="contact" type="tel" inputmode="tel" autocomplete="tel" placeholder="Phone or WhatsApp * (never shown publicly)" aria-label="Phone or WhatsApp" required maxlength="60" value="${v('contact')}">
  <div class="row w" style="grid-column:1/-1"><button class="btn sf lg" id="sv">${r ? 'Save changes' : 'Send for review'}</button><button type="button" class="btn alt lg" id="cx">Cancel</button></div><p id="msg" class="w meta" role="alert" style="grid-column:1/-1"></p></form>`;
  $('#cx').onclick = () => home();
  $('#fi').onchange = async e => { const f = e.target.files[0]; if (!f) return; say('Preparing image...'); try { img = await compress(f); $('#ip').src = img; $('#ip').hidden = false; say(''); } catch (er) { say(er.message === 'big' ? 'That image is too large even after shrinking. Please use a smaller one.' : 'Could not read that image.', 1); e.target.value = ''; } };
  $('#fm').onsubmit = async e => {
    e.preventDefault(); const d = new FormData(e.target), g = k => String(d.get(k) || '').trim(), st = g('start_date'), en = g('end_date') || st, digits = g('contact').replace(/\D/g, ''), link = g('image_url');
    if (g('title').length < 3) return say('Please write the event name (at least 3 letters).', 1);
    if (!g('venue')) return say('Please write the venue.', 1);
    if (!st) return say('Please choose the start date.', 1);
    if (en < st) return say('End date cannot be before the start date.', 1);
    if (en < today()) return say('This event has already ended. Please list upcoming events only.', 1);
    if (digits.length < 8 || digits.length > 15) return say('Please enter a valid phone or WhatsApp number (it is never shown publicly).', 1);
    if (link && !/^https?:\/\//i.test(link)) return say('The poster link must start with http:// or https://', 1);
    const rec = { title: g('title'), city: g('city'), category: g('category'), venue: g('venue'), area: g('area'), start_date: st, end_date: en, start_time: g('start_time'), passes_text: g('passes_text'), image_url: link, image_data: img, description: g('description'), organizer: g('organizer'), contact: g('contact'), status: 'pending' };
    $('#sv').disabled = true; say('Saving...');
    try {
      const save = r ? updateDoc(doc(db, 'submissions', r.id), { ...rec, updatedAt: serverTimestamp() }) : addDoc(collection(db, 'submissions'), { ...rec, ownerUid: user.uid, ownerEmail: user.email, createdAt: serverTimestamp() });
      await Promise.race([save, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 25000))]);
      home(r ? 'Saved. Your changes are waiting for review.' : 'Submitted. We will review it soon.');
    } catch (er) { $('#sv').disabled = false; say(er.message === 'timeout' ? 'Could not confirm saving. Please check your internet and try again.' : 'Could not save (' + (er.code || er.message) + '). Please try again.', 1); }
  };
}
onAuthStateChanged(auth, u => { user = u; u ? home() : signedOut(); });
