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
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault(); var d = new FormData(f), L = [];
    d.forEach(function (v, k) { L.push(k + ': ' + v); });
    location.href = 'mailto:shubhamshri.1110@gmail.com?subject=' + encodeURIComponent('Event listing: ' + d.get('Event name')) + '&body=' + encodeURIComponent(L.join('\n'));
  });
})();
