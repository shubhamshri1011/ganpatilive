(function () {
  var pad = function (n) { return ('0' + n).slice(-2); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var cards = [].slice.call(document.querySelectorAll('.ev,.pd'));
  var bar = document.querySelector('[data-filter]');
  var count = document.getElementById('count'), none = document.getElementById('none');
  function range(v) {
    var t = new Date(), a = iso(t), d;
    if (v === 'today') return [a, a];
    if (v === 'week') { d = new Date(); d.setDate(d.getDate() + 7); return [a, iso(d)]; }
    if (v === 'weekend') { var w = t.getDay(), sat = new Date(); sat.setDate(t.getDate() + (w === 0 ? -1 : (6 - w))); var sun = new Date(sat); sun.setDate(sat.getDate() + 1); return [iso(sat), iso(sun)]; }
    return null;
  }
  function apply() {
    var today = iso(new Date()), n = 0;
    var q = bar && bar.q ? bar.q.value.trim().toLowerCase() : '', c = bar && bar.c ? bar.c.value : '', r = bar && bar.d ? range(bar.d.value) : null, free = bar && bar.free && bar.free.checked;
    cards.forEach(function (el) {
      var ok = !el.dataset.end || el.dataset.end >= today;
      if (ok && q) ok = el.dataset.q.indexOf(q) > -1;
      if (ok && c) ok = el.dataset.cat === c;
      if (ok && free) ok = el.dataset.free === '1';
      if (ok && r) ok = el.dataset.start <= r[1] && el.dataset.end >= r[0];
      el.hidden = !ok; if (ok) n++;
    });
    if (count) count.textContent = n + (n === 1 ? ' result' : ' results');
    if (none) none.hidden = n > 0;
  }
  if (bar) {
    var p = new URLSearchParams(location.search);
    ['q', 'd', 'c'].forEach(function (k) { if (p.get(k) && bar[k]) bar[k].value = p.get(k); });
    if (p.get('free') && bar.free) bar.free.checked = true;
    bar.addEventListener('input', apply); bar.addEventListener('submit', function (e) { e.preventDefault(); });
  }
  apply();
  var hs = document.getElementById('hs');
  if (hs) hs.addEventListener('submit', function (e) {
    e.preventDefault(); var city = hs.city.value, q = hs.q.value.trim();
    location.href = (city ? '/events/' + city : '/events') + (q ? '?q=' + encodeURIComponent(q) : '');
  });
  var st = document.getElementById('fest');
  if (st) {
    var now = Date.now(), N = new Date('2026-10-11T00:00:00+05:30'), D = new Date('2026-11-08T00:00:00+05:30'), day = Math.floor((now - N) / 864e5) + 1, msg = '';
    var col = ['Orange', 'White', 'Red', 'Royal Blue', 'Yellow', 'Green', 'Grey', 'Purple', 'Peacock Green'];
    if (day < 1) { var n = Math.ceil((N - now) / 864e5); msg = n <= 1 ? 'Navratri begins tomorrow' : 'Navratri begins in ' + n + ' days'; }
    else if (day <= 9) msg = 'Navratri day ' + day + ': wear ' + col[day - 1].toLowerCase() + ' today';
    else if (day === 10) msg = 'Happy Vijayadashami';
    else { var m = Math.ceil((D - now) / 864e5); if (m > 0) msg = 'Diwali in ' + m + ' days'; }
    if (msg) { st.textContent = msg; st.hidden = false; }
  }
  var f = document.getElementById('lyf');
  if (f) {
    var imgData = '', msg = document.getElementById('lymsg'), btn = document.getElementById('lybtn'), fileIn = document.getElementById('lyimg'), prev = document.getElementById('lyprev');
    var say = function (t, bad) { msg.textContent = t; msg.style.color = bad ? '#b91c1c' : ''; };
    var compress = function (file) {
      return new Promise(function (res, rej) {
        var u = URL.createObjectURL(file), im = new Image();
        im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('bad image')); };
        im.onload = function () {
          var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, 1000 / Math.max(w, h)), c = document.createElement('canvas');
          c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          URL.revokeObjectURL(u);
          var q = 0.82, out = c.toDataURL('image/jpeg', q);
          while (out.length > 450000 && q > 0.35) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
          out.length > 450000 ? rej(new Error('too big')) : res(out);
        };
        im.src = u;
      });
    };
    fileIn.addEventListener('change', function () {
      imgData = ''; prev.hidden = true; var file = fileIn.files[0]; if (!file) return;
      if (file.type.indexOf('image/') !== 0) { say('Please choose an image file.', 1); fileIn.value = ''; return; }
      say('Preparing image...');
      compress(file).then(function (d) { imgData = d; prev.src = d; prev.hidden = false; say(''); }).catch(function () { say('Could not read that image. Try a different one or paste a link.', 1); fileIn.value = ''; });
    });
    var COOL = 60000, lastKey = 'pglLastSub';
    var getLast = function () { try { return +localStorage.getItem(lastKey) || 0; } catch (e) { return 0; } };
    var setLast = function () { try { localStorage.setItem(lastKey, String(Date.now())); } catch (e) { } };
    var withTimeout = function (p, ms) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]); };
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var d = new FormData(f);
      if (d.get('hp_site')) return; /* honeypot: real people never fill this hidden field */
      var title = String(d.get('Event name') || '').trim(), venue = String(d.get('Venue') || '').trim(), phone = String(d.get('Phone or WhatsApp') || '').trim();
      var st = d.get('Start date'), en = d.get('End date') || st, img = String(d.get('Image link') || '').trim();
      var today = iso(new Date()), digits = phone.replace(/\D/g, '');
      if (title.length < 3) { say('Please write the event name (at least 3 letters).', 1); return; }
      if (!venue) { say('Please write the venue.', 1); return; }
      if (!st) { say('Please choose the start date.', 1); return; }
      if (en < st) { say('End date cannot be before the start date.', 1); return; }
      if (en < today) { say('This event has already ended. Please list upcoming events only.', 1); return; }
      if (digits.length < 8 || digits.length > 15) { say('Please enter a valid phone or WhatsApp number (it is never shown publicly).', 1); return; }
      if (img && !/^https?:\/\//i.test(img)) { say('The poster link must start with http:// or https://', 1); return; }
      if (Date.now() - getLast() < COOL) { say('Please wait a minute before sending another request.', 1); return; }
      btn.disabled = true; say('Sending...');
      var cat = d.get('Category'), city = d.get('City');
      var rec = {
        title: title.slice(0, 150), city: city, category: cat, venue: venue.slice(0, 200),
        area: String(d.get('Area') || '').trim().slice(0, 100), start_date: st, end_date: en, start_time: String(d.get('Start time') || '').trim().slice(0, 30),
        passes_text: String(d.get('Pass types and prices') || '').trim().slice(0, 300), image_url: img.slice(0, 500),
        image_data: imgData, description: String(d.get('Description') || '').trim().slice(0, 3000), organizer: String(d.get('Organiser') || '').trim().slice(0, 120),
        contact: phone.slice(0, 60), status: 'pending'
      };
      var V = 'https://www.gstatic.com/firebasejs/11.6.1/';
      withTimeout(Promise.all([import(V + 'firebase-app.js'), import(V + 'firebase-firestore.js')]).then(function (m) {
        var app = m[0].initializeApp({ apiKey: 'AIzaSyAXbMPHQDSN-KKoS2OUEegwuapwzXwM-Ek', authDomain: 'puneganpatilive.firebaseapp.com', projectId: 'puneganpatilive', appId: '1:848829850195:web:c3b14375d19c5689cd9ca6' }, 'pub');
        var db = m[1].getFirestore(app); rec.createdAt = m[1].serverTimestamp();
        return m[1].addDoc(m[1].collection(db, 'submissions'), rec);
      }), 25000).then(function () {
        setLast(); f.hidden = true; document.getElementById('lyok').hidden = false; window.scrollTo(0, 0);
      }).catch(function () {
        btn.disabled = false; say('Could not send right now. Please check your internet and try again, or message us on WhatsApp.', 1);
      });
    });
  }
})();

(function () {
  function openMenu(url, title) {
    var enc = encodeURIComponent, text = title + ' ' + url;
    var m = document.createElement('div'); m.className = 'shm'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Share');
    m.innerHTML = '<div class="box"><p class="t">Share</p>' +
      '<a target="_blank" rel="noopener" href="https://wa.me/?text=' + enc(text) + '">WhatsApp</a>' +
      '<a target="_blank" rel="noopener" href="https://t.me/share/url?url=' + enc(url) + '&text=' + enc(title) + '">Telegram</a>' +
      '<a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + enc(url) + '">Facebook</a>' +
      '<a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=' + enc(url) + '&text=' + enc(title) + '">X (Twitter)</a>' +
      '<a href="mailto:?subject=' + enc(title) + '&body=' + enc(text) + '">Email</a>' +
      '<button type="button" data-copy>Copy link</button><button type="button" data-close>Close</button></div>';
    document.body.appendChild(m);
    var close = function () { if (m.parentNode) m.parentNode.removeChild(m); };
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.hasAttribute('data-close')) return close();
      if (e.target.hasAttribute('data-copy')) {
        var done = function () { e.target.textContent = 'Link copied'; setTimeout(close, 700); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link', url); });
        else window.prompt('Copy this link', url);
      }
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-share]') : null; if (!b) return;
    e.preventDefault();
    var url = b.getAttribute('data-url') || location.href, title = b.getAttribute('data-title') || document.title;
    if (navigator.share) navigator.share({ title: title, text: title, url: url }).catch(function (err) { if (err && err.name !== 'AbortError') openMenu(url, title); });
    else openMenu(url, title);
  });
})();
