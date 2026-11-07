// Palette e stato dell'interfaccia
var COL = [
  '#7F77DD',
  '#1D9E75',
  '#D85A30',
  '#D4537E',
  '#378ADD',
  '#639922',
  '#BA7517',
  '#888780',
  '#534AB7',
  '#0F6E56'
];
var rows = [{ n: 'LAN1', ip: '', px: '' }];

// Conversioni e validazione degli indirizzi
function ip2n(s) {
  var p = String(s).trim().split('.');
  if (p.length !== 4) return null;

  var v = 0;
  for (var i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(p[i]) || +p[i] > 255) return null;
    v = v * 256 + (+p[i]);
  }
  return v;
}

function classPrefix(s) {
  var first = String(s).trim().split('.')[0];
  if (!/^\d{1,3}$/.test(first)) return '';

  first = +first;
  if (first >= 1 && first <= 126) return 8;
  if (first >= 128 && first <= 191) return 16;
  if (first >= 192 && first <= 223) return 24;
  return '';
}

function prefix2n(s) {
  var p = String(s).trim();
  return /^\/?\d{1,2}$/.test(p) ? parseInt(p.replace('/', ''), 10) : NaN;
}

function n2ip(v) {
  return [v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255].join('.');
}

function base() {
  var b = ip2n(document.getElementById('bip').value);
  var p = prefix2n(document.getElementById('bpx').value);
  if (b === null || isNaN(p) || p < 8 || p > 30) return null;

  var sz = Math.pow(2, 32 - p);
  if (b % sz !== 0) return null;
  return { b: b, p: p, sz: sz };
}

function baseError() {
  var bip = document.getElementById('bip').value;
  var b = ip2n(bip);
  var p = prefix2n(document.getElementById('bpx').value);

  if (b === null) return 'Inserisci un indirizzo IPv4 valido';
  if (isNaN(p) || p < 8 || p > 30) return 'Inserisci un prefisso tra /8 e /30';

  var sz = Math.pow(2, 32 - p);
  if (b % sz !== 0) {
    return 'Indirizzo non allineato: usa ' +
      n2ip(Math.floor(b / sz) * sz) + '/' + p;
  }
  return 'Rete di partenza non valida';
}

// Calcolo dei blocchi liberi
function gap(f, s, e) {
  while (s < e) {
    var z = 1;
    while (s % (z * 2) === 0 && z * 2 <= e - s) z *= 2;
    f.push({ a: s, sz: z });
    s += z;
  }
}

function freeBlocks(out, B) {
  var u = [];
  out.forEach(function (o) {
    if (o.ok) u.push([o.a, o.a + o.sz]);
  });
  u.sort(function (x, y) {
    return x[0] - y[0];
  });

  var f = [];
  var s = B.b;
  var e = B.b + B.sz;
  u.forEach(function (v) {
    if (v[0] > s) gap(f, s, Math.min(v[0], e));
    if (v[1] > s) s = v[1];
  });
  if (s < e) gap(f, s, e);
  return f;
}

// Geometria della torta
function pt(cx, cy, r, a) {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arc(a0, a1) {
  var cx = 160;
  var cy = 160;
  var R = 150;
  var r = 78;
  var delta = a1 - a0;
  var full = Math.abs(delta) >= Math.PI * 2 - 0.001;
  if (full) a1 = a0 + (delta < 0 ? -1 : 1) * (Math.PI * 2 - 0.001);

  var l = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  var sweep = delta < 0 ? 0 : 1;
  var p0 = pt(cx, cy, R, a0);
  var p1 = pt(cx, cy, R, a1);
  var p2 = pt(cx, cy, r, a1);
  var p3 = pt(cx, cy, r, a0);
  return 'M' + p0 +
    ' A' + R + ' ' + R + ' 0 ' + l + ' ' + sweep + ' ' + p1 +
    ' L' + p2 +
    ' A' + r + ' ' + r + ' 0 ' + l + ' ' + (sweep ? 0 : 1) + ' ' + p3 +
    ' Z';
}

// Calcolo e validazione delle sottoreti
function calc() {
  var B = base();
  var out = [];

  rows.forEach(function (r, i) {
    var o = { i: i, ok: false, msg: '', err: false };
    var a = ip2n(r.ip);
    var p = prefix2n(r.px);

    if (r.ip === '' && r.px === '') {
      o.msg = '';
      out.push(o);
      return;
    }
    if (!B) {
      o.msg = 'Controlla la rete di partenza';
      o.err = true;
      out.push(o);
      return;
    }
    if (a === null) {
      o.msg = 'Indirizzo non valido';
      o.err = true;
      out.push(o);
      return;
    }
    if (isNaN(p) || p < B.p || p > 32) {
      o.msg = 'Prefisso tra ' + B.p + ' e 32';
      o.err = true;
      out.push(o);
      return;
    }

    var sz = Math.pow(2, 32 - p);
    if (a < B.b || a + sz > B.b + B.sz) {
      o.msg = 'Fuori dalla rete di partenza';
      o.err = true;
      out.push(o);
      return;
    }
    if (a % sz !== 0) {
      o.msg = 'Non allineato: deve essere multiplo di ' + sz;
      o.err = true;
      out.push(o);
      return;
    }

    o.ok = true;
    o.a = a;
    o.sz = sz;
    o.msg = 'Blocco da ' + sz + ' indirizzi';
    out.push(o);
  });

  for (var i = 0; i < out.length; i++) {
    for (var j = i + 1; j < out.length; j++) {
      var x = out[i];
      var y = out[j];
      if (x.ok && y.ok && x.a < y.a + y.sz && y.a < x.a + x.sz) {
        x.msg = 'Si sovrappone a ' + rows[j].n;
        x.err = true;
        y.msg = 'Si sovrappone a ' + rows[i].n;
        y.err = true;
      }
    }
  }
  return { B: B, out: out };
}

// Rendering della torta e dei controlli
function render(skipRows) {
  var c = calc();
  var B = c.B;
  var svg = document.getElementById('pie');
  var h = '';

  if (!skipRows) {
    var rh = '';
    rows.forEach(function (r, i) {
      rh += '<div class="row">' +
        '<span class="sw" style="background:' + COL[i % COL.length] + '"></span>' +
        '<input data-i="' + i + '" data-f="n" value="' + r.n + '" aria-label="Nome rete">' +
        '<input data-i="' + i + '" data-f="ip" value="' + r.ip +
        '" placeholder="0.0.0.0" inputmode="decimal" aria-label="Indirizzo di sottorete">' +
        '<input data-i="' + i + '" data-f="px" value="' + r.px +
        '" placeholder="/24" inputmode="numeric" aria-label="Prefisso">' +
        '<button class="x" type="button" data-del="' + i + '" aria-label="Rimuovi rete">×</button>' +
        '<div class="msg" id="m' + i + '"></div>' +
        '</div>';
    });
    document.getElementById('rows').innerHTML = rh;
  }

  var used = 0;
  document.getElementById('fl').innerHTML = '';
  if (B) {
    var startAngle = -Math.PI / 2;
    h += '<path d="' + arc(startAngle, startAngle - 2 * Math.PI) +
      '" fill="var(--free)"/>';
    c.out.forEach(function (o) {
      if (!o.ok) return;

      used += o.sz;
      var a0 = startAngle - (o.a - B.b) / B.sz * Math.PI * 2;
      var a1 = a0 - o.sz / B.sz * Math.PI * 2;
      h += '<path d="' + arc(a0, a1) +
        '" fill="' + COL[o.i % COL.length] +
        '" stroke="var(--bg)" stroke-width="2"' + (o.err ? ' opacity="0.55"' : '') +
        '><title>' + rows[o.i].n + ' ' + n2ip(o.a) + '/' +
        (32 - Math.log2(o.sz)) + '</title></path>';
    });

    var fb = freeBlocks(c.out, B);
    var mx = null;
    fb.forEach(function (x) {
      if (!mx || x.sz > mx.sz) mx = x;
    });

    if (used) {
      fb.forEach(function (x) {
        var a0 = startAngle - (x.a - B.b) / B.sz * Math.PI * 2;
        var a1 = a0 - x.sz / B.sz * Math.PI * 2;
        h += '<path d="' + arc(a0, a1) +
          '" fill="none" stroke="var(--mut)" stroke-width="1" stroke-dasharray="4 3">' +
          '<title>Libero ' + n2ip(x.a) + '/' + (32 - Math.log2(x.sz)) + '</title></path>';
      });
    }

    h += '<text x="160" y="152" text-anchor="middle" font-size="26" ' +
      'font-weight="600" fill="var(--fg)">' +
      used + '/' + B.sz +
      '</text><text x="160" y="176" text-anchor="middle" font-size="13" ' +
      'fill="var(--mut)">' +
      'indirizzi usati</text>';

    if (mx) {
      h += '<text x="160" y="202" text-anchor="middle" font-size="13" ' +
        'font-weight="600" fill="#378ADD">' +
        'Libero max: /' + (32 - Math.log2(mx.sz)) + '</text>';
    } else {
      h += '<text x="160" y="202" text-anchor="middle" font-size="13" ' +
        'fill="var(--mut)">' +
        'Nessun blocco libero</text>';
    }

    var li = fb.slice().sort(function (x, y) {
      return y.sz - x.sz || x.a - y.a;
    }).map(function (x) {
      return '<li>' + (x === mx ? '<b>' : '') +
        n2ip(x.a) + '/' + (32 - Math.log2(x.sz)) +
        ' (' + x.sz + ' indirizzi)' +
        (x === mx ? ' · il più grande</b>' : '') + '</li>';
    }).join('');

    document.getElementById('fl').innerHTML = fb.length
      ? '<div>Blocchi liberi allineati</div><ul>' + li + '</ul>'
      : 'Nessun blocco libero';
  } else {
    h += '<circle cx="160" cy="160" r="114" fill="none" ' +
      'stroke="var(--line)" stroke-width="72"/>' +
      '<text x="160" y="165" text-anchor="middle" font-size="13" fill="var(--mut)">' +
      baseError() + '</text>';
  }

  svg.innerHTML = h;
  c.out.forEach(function (o) {
    var m = document.getElementById('m' + o.i);
    if (m) {
      m.textContent = o.msg;
      m.className = 'msg ' + (o.msg ? (o.err ? 'err' : 'ok') : '');
    }
  });
  document.getElementById('tot').textContent = B
    ? 'Liberi: ' + (B.sz - used) + ' indirizzi'
    : '';
}

// Eventi dell'interfaccia
document.getElementById('rows').addEventListener('input', function (e) {
  var t = e.target;
  var i = t.getAttribute('data-i');
  if (i === null) return;

  var field = t.getAttribute('data-f');
  rows[+i][field] = t.value;
  rows.forEach(function (row, index) {
    if (!/link/i.test(row.n)) return;
    row.px = '30';
    document.querySelector('[data-i="' + index + '"][data-f="px"]').value = '30';
  });
  render(true);
});

document.getElementById('rows').addEventListener('click', function (e) {
  var d = e.target.getAttribute('data-del');
  if (d !== null) {
    rows.splice(+d, 1);
    render(false);
  }
});

document.getElementById('add').addEventListener('click', function () {
  var previousName = rows.length ? rows[rows.length - 1].n : '';
  var numberedName = previousName.match(/^(.*?)(\d+)$/);
  var nextName = !rows.length
    ? 'LAN1'
    : numberedName
      ? numberedName[1] + (parseInt(numberedName[2], 10) + 1)
      : 'LAN' + (rows.length + 1);
  rows.push({ n: nextName, ip: '', px: '' });
  render(false);
});

document.getElementById('clr').addEventListener('click', function () {
  rows.forEach(function (r) {
    r.ip = '';
    r.px = '';
  });
  render(false);
});

document.getElementById('reset').addEventListener('click', function () {
  rows = [{ n: 'LAN1', ip: '', px: '' }];
  render(false);
});

document.getElementById('bip').addEventListener('input', function () {
  var p = classPrefix(this.value);
  if (p) document.getElementById('bpx').value = p;
  render(true);
});

document.getElementById('bpx').addEventListener('input', function () {
  render(true);
});

render(false);
