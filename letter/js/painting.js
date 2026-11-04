/* ============================================================
   The painted field behind the letter.

   Divisionist, in the sense Seurat and Signac meant it: nothing is
   drawn as a shape, everything is dabs of unmixed colour sitting next
   to each other, and the eye does the mixing. Blue sky, a low sun,
   two hazy ranges, a line of trees, a meadow.

   The cost of that is dot count, so the work is split in two:

     - Sky, hills, trunks and the meadow floor never move. They are
       painted once into an offscreen buffer and blitted each frame as
       a single image.
     - Only what the wind touches is redrawn per frame: the canopies,
       the grass, the clouds, the sun's bloom and the light motes.
       Those dabs are bucketed by colour so fillStyle is set a few
       dozen times a frame instead of a few thousand.

   Nothing is loaded from anywhere. The whole painting is generated
   from a seeded random, so it comes out the same every time.
   ============================================================ */

(function () {
  "use strict";

  var canvas = document.getElementById("field");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d", { alpha: false });
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 0, H = 0, M = 0, scale = 1;
  var base = null, bctx = null;      /* the baked, motionless layers */
  var cloudLayer = null;             /* the cloud bank, baked and scrolled */
  var sunSprite = null;              /* the bloom, baked once */
  var moteWarm = null, moteCool = null;
  var canopy = [], grass = [], motes = [];
  var sun = { x: 0, y: 0, r: 0 };
  var horizon = 0;
  var raf = 0, t0 = 0;
  var mx = 0, my = 0, px = 0, py = 0;   /* pointer parallax, target and eased */

  /* ---------- a seeded random, so the painting is repeatable ---------- */

  var seed = 20261104;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  function range(a, b) { return a + rnd() * (b - a); }
  function pick(arr) { return arr[(rnd() * arr.length) | 0]; }

  function hsl(h, s, l, a) {
    return "hsla(" + h.toFixed(0) + "," + s.toFixed(0) + "%," + l.toFixed(0) + "%," + a.toFixed(2) + ")";
  }

  /* Dabs are grouped by colour. A bucket is one fillStyle and a flat
     list of numbers: x, y, w, h, phase, sway — six per dab. Round ones
     go out as a single path per bucket and a single fill, which is what
     makes a few thousand of them affordable every frame. */
  function bucket(colour, shape) {
    return { colour: colour, shape: shape || "dot", d: [] };
  }
  function add(b, x, y, w, h, phase, sway) {
    b.d.push(x, y, w, h, phase, sway);
  }

  /* ---------- build ---------- */

  function build() {
    var doc = document.documentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = Math.max(320, doc.clientWidth);
    var ch = Math.max(320, doc.clientHeight);

    W = Math.round(cw * dpr);
    H = Math.round(ch * dpr);
    M = Math.round(26 * dpr);              /* buffer margin, for parallax */
    scale = Math.max(0.75, Math.min(2.4, (W + H) / 2600));

    /* the backing store is in device pixels; CSS stretches it to the
       viewport, so no explicit style size is set here */
    canvas.width = W;
    canvas.height = H;

    horizon = H * 0.605;
    sun.x = W * 0.745;
    sun.y = H * 0.19;
    sun.r = Math.min(W, H) * 0.05;

    /* a big canvas should not mean a slower one */
    var load = Math.min(1, 5.2e6 / (W * H));
    var density = 0.55 + 0.45 * load;

    seed = 20261104;
    canopy = [];
    grass = [];
    motes = [];

    base = document.createElement("canvas");
    base.width = W + M * 2;
    base.height = H + M * 2;
    bctx = base.getContext("2d", { alpha: false });
    bctx.translate(M, M);

    paintSky(density);
    paintRanges(density);
    paintMeadow(density);
    paintTrees(density);
    paintClouds(density);
    paintGrass(density);
    paintMotes();
    makeSprites();
  }

  /* ---------- sky ---------- */

  function paintSky(density) {
    /* a ground colour first, so the gaps between dabs are not black */
    var g = bctx.createLinearGradient(0, -M, 0, horizon);
    g.addColorStop(0, "#1d6b9c");
    g.addColorStop(0.44, "#4e9ac0");
    g.addColorStop(0.8, "#a0cfd8");
    g.addColorStop(1, "#dcead9");
    bctx.fillStyle = g;
    bctx.fillRect(-M, -M, W + M * 2, horizon + M);

    /* Dabs over the top of it, warming as they near the sun. One in
       six is thrown deliberately off-hue — a warm note in a cold sky,
       a cold one in a warm patch — because that disagreement between
       neighbouring dabs is what makes the surface shimmer. */
    /* Dab counts are areal, and the divisor carries scale squared: on a
       denser display the dabs are bigger in device pixels, so the same
       surface needs proportionally fewer of them. Without that the count
       explodes on a high-DPI screen for no visible gain. */
    var n = Math.round((W * (horizon + M)) / (46 * scale * scale) * density);
    var i, x, y, f, d, warm, h, s, l, r, odd;
    for (i = 0; i < n; i++) {
      x = range(-M, W + M);
      y = range(-M, horizon + 4);
      f = Math.max(0, Math.min(1, (y + M) / (horizon + M)));

      d = Math.hypot(x - sun.x, y - sun.y) / (Math.min(W, H) * 0.6);
      warm = Math.max(0, 1 - d);
      odd = rnd() < 0.17;

      h = 210 - 14 * f - 30 * warm + range(-16, 16);
      s = 56 - 20 * f + 10 * warm + range(-14, 16);
      l = 41 + 34 * f + 28 * warm + range(-13, 13);
      if (odd) {
        h = warm > 0.3 ? range(188, 216) : range(16, 44);
        s = range(30, 72);
        l = range(46, 84);
      }
      r = range(2.4, 6.4) * scale;

      bctx.globalAlpha = odd ? range(0.14, 0.4) : range(0.3, 0.8);
      bctx.fillStyle = hsl(h, Math.max(8, Math.min(92, s)), Math.max(14, Math.min(96, l)), 1);
      bctx.beginPath();
      bctx.arc(x, y, r, 0, 6.283);
      bctx.fill();
    }

    /* the sun's own dabs, tight and pale */
    n = Math.round(760 * density);
    for (i = 0; i < n; i++) {
      var a = rnd() * 6.283;
      var rr = sun.r * (0.15 + Math.pow(rnd(), 0.6) * 1.55);
      x = sun.x + Math.cos(a) * rr;
      y = sun.y + Math.sin(a) * rr * 0.94;
      bctx.globalAlpha = range(0.2, 0.72) * (1 - rr / (sun.r * 2));
      bctx.fillStyle = hsl(range(38, 56), range(66, 96), range(72, 92), 1);
      bctx.beginPath();
      bctx.arc(x, y, range(2.2, 5.4) * scale, 0, 6.283);
      bctx.fill();
    }
    bctx.globalAlpha = 1;
  }

  /* ---------- two ranges of hills ---------- */

  function ridge(x, y0, amp, freq, ph) {
    return y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph * 1.7) * amp * 0.34;
  }

  function paintRanges(density) {
    var ranges = [
      { y0: horizon - H * 0.105, amp: H * 0.03,  freq: 0.0013, ph: 1.1, h: 196, s: 26, l: 58, haze: 0.62, fill: "#8fb3bd" },
      { y0: horizon - H * 0.042, amp: H * 0.021, freq: 0.0027, ph: 3.4, h: 168, s: 32, l: 42, haze: 0.24, fill: "#5e8470" }
    ];

    for (var k = 0; k < ranges.length; k++) {
      var R = ranges[k];
      var bottom = horizon + H * 0.03;

      /* lay the silhouette down first so the range has a clear edge,
         then break that edge up with dabs */
      bctx.globalAlpha = 1;
      bctx.fillStyle = R.fill;
      bctx.beginPath();
      bctx.moveTo(-M, bottom);
      for (var x = -M; x <= W + M; x += 6) {
        bctx.lineTo(x, ridge(x, R.y0, R.amp, R.freq, R.ph));
      }
      bctx.lineTo(W + M, bottom);
      bctx.closePath();
      bctx.fill();

      var n = Math.round((W * H * 0.09) / (55 * scale * scale) * density);
      for (var i = 0; i < n; i++) {
        var px2 = range(-M, W + M);
        var top = ridge(px2, R.y0, R.amp, R.freq, R.ph);
        var y = range(top - H * 0.012, bottom);
        var f = Math.max(0, (y - top) / (bottom - top));
        bctx.globalAlpha = (y < top ? range(0.1, 0.4) : range(0.34, 0.82)) * (1 - R.haze * (1 - f) * 0.7);
        bctx.fillStyle = hsl(
          R.h + range(-20, 20) - f * 8,
          R.s + range(-12, 16) + f * 8,
          R.l + range(-13, 13) - f * 10,
          1
        );
        bctx.beginPath();
        bctx.arc(px2, y, range(2, 5) * scale, 0, 6.283);
        bctx.fill();
      }
    }
    bctx.globalAlpha = 1;
  }

  /* ---------- the meadow floor ---------- */

  function paintMeadow(density) {
    var g = bctx.createLinearGradient(0, horizon - H * 0.02, 0, H + M);
    g.addColorStop(0, "#9bb268");
    g.addColorStop(0.3, "#74a05a");
    g.addColorStop(0.72, "#4a7a4a");
    g.addColorStop(1, "#2e5639");
    bctx.fillStyle = g;
    bctx.fillRect(-M, horizon - H * 0.02, W + M * 2, H - horizon + H * 0.02 + M * 2);

    var n = Math.round((W * (H - horizon + M)) / (40 * scale * scale) * density);
    for (var i = 0; i < n; i++) {
      var x = range(-M, W + M);
      var y = range(horizon - H * 0.015, H + M);
      var f = (y - horizon) / (H - horizon);      /* 0 far, 1 near */
      var sunlit = Math.max(0, 1 - Math.abs(x - sun.x) / (W * 0.8)) * (1 - f) * 0.7;
      var odd = rnd() < 0.14;

      bctx.globalAlpha = odd ? range(0.2, 0.5) : range(0.38, 0.9);
      bctx.fillStyle = odd
        /* ochre and rust through the grass, the way a field actually is */
        ? hsl(range(26, 62), range(38, 76), range(44, 72), 1)
        : hsl(
            92 + 46 * f + range(-24, 24) - sunlit * 28,
            32 + 24 * f + range(-14, 20) + sunlit * 18,
            58 - 22 * f + range(-17, 18) + sunlit * 20,
            1
          );
      var r = (2.2 + f * 4.2) * scale;
      bctx.beginPath();
      bctx.arc(x, y, r * range(0.65, 1.35), 0, 6.283);
      bctx.fill();
    }
    bctx.globalAlpha = 1;
  }

  /* ---------- trees: static trunks, moving canopies ---------- */

  function paintTrees(density) {
    var greens = [];
    for (var c = 0; c < 20; c++) {
      greens.push(bucket(hsl(
        76 + c * 2.6 + range(-7, 7),
        30 + (c % 5) * 8,
        26 + (c % 7) * 6.2,
        1
      )));
    }

    /* spread them over slots rather than at random, or they clump at
       one end and leave the middle of the frame empty */
    var count = Math.min(9, Math.max(5, Math.round(W / 460)));
    var slot = (W + M * 2) / count;

    for (var i = 0; i < count; i++) {
      var tx = -M + slot * (i + range(0.15, 0.85));
      var depth = rnd();                         /* 0 far, 1 near */
      var ty = horizon - H * 0.025 + depth * H * 0.17;
      var th = (H * 0.14 + depth * H * 0.24) * range(0.82, 1.18);
      var tw = th * range(0.045, 0.07);
      var crown = th * range(0.56, 0.76);

      /* trunk, baked in */
      var seg = Math.max(22, Math.round(th / (3 * scale)));
      for (var s = 0; s < seg; s++) {
        var f = s / seg;
        var y = ty - th * f;
        var lean = Math.sin(f * 2.2) * tw * 0.7;
        var wide = tw * (1 - f * 0.6);
        for (var q = 0; q < 3; q++) {
          bctx.globalAlpha = range(0.42, 0.9);
          bctx.fillStyle = hsl(range(18, 36), range(22, 44), range(12, 28) + (1 - depth) * 9, 1);
          bctx.beginPath();
          bctx.arc(tx + lean + range(-wide, wide), y + range(-2, 2) * scale,
                   (1.8 + depth * 1.8) * scale * range(0.7, 1.2), 0, 6.283);
          bctx.fill();
        }
      }

      /* Canopy, in three passes. A soft mass of colour so the tree has
         weight, a dense layer of motionless dabs for the texture, and
         then a thinner layer of moving ones out towards the edge, which
         is where a tree shows the wind anyway. Doing it this way keeps
         the per-frame dab count to a few thousand instead of tens of
         thousands, with no loss in how dense the foliage looks. */
      var masses = 3 + ((rnd() * 3) | 0);
      var cy = ty - th;
      var dabSize = (3.6 + depth * 4) * scale;

      for (var m = 0; m < masses; m++) {
        var ox = range(-crown * 0.52, crown * 0.52);
        var oy = range(-crown * 0.4, crown * 0.28);
        var rr = crown * range(0.42, 0.72);
        var mx2 = tx + ox;
        var my2 = cy + oy;

        var grad = bctx.createRadialGradient(mx2, my2, rr * 0.1, mx2, my2, rr);
        grad.addColorStop(0, hsl(96 + range(-6, 14), 34, 26 + depth * 6, 0.92));
        grad.addColorStop(0.68, hsl(100 + range(-8, 12), 30, 22 + depth * 6, 0.72));
        grad.addColorStop(1, hsl(104, 28, 20, 0));
        bctx.fillStyle = grad;
        bctx.beginPath();
        bctx.ellipse(mx2, my2, rr, rr * 0.88, 0, 0, 6.283);
        bctx.fill();

        var statics = Math.round((rr * rr) / (17 * scale * scale) * density);
        var moving = Math.round((rr * rr) / (150 * scale * scale) * density);

        for (var d = 0; d < statics + moving; d++) {
          var live = d >= statics;
          var a = rnd() * 6.283;
          /* the moving ones sit further out, where the branch ends are */
          var rad = live
            ? rr * (0.45 + Math.pow(rnd(), 0.5) * 0.65)
            : rr * Math.pow(rnd(), 0.52);
          var x = mx2 + Math.cos(a) * rad;
          var y = my2 + Math.sin(a) * rad * 0.88;
          var lift = Math.max(0, (cy + crown * 0.4 - y) / crown);
          var litFromSun = Math.max(0, 1 - Math.hypot(x - sun.x, y - sun.y) / (W * 0.62));
          var tone = Math.min(19, ((litFromSun * 9 + lift * 7 + rnd() * 5) | 0));
          var size = dabSize * range(0.58, 1.3);

          if (live) {
            var sway = (0.5 + lift * 1.6 + depth * 0.9) * scale * 1.9;
            add(greens[tone], x, y, size, size, rnd() * 6.283, sway);
          } else {
            bctx.globalAlpha = range(0.42, 0.94);
            bctx.fillStyle = greens[tone].colour;
            bctx.beginPath();
            bctx.arc(x, y, size * 0.5, 0, 6.283);
            bctx.fill();
          }
        }
      }
      bctx.globalAlpha = 1;
    }

    for (var g = 0; g < greens.length; g++) {
      if (greens[g].d.length) canopy.push(greens[g]);
    }
    bctx.globalAlpha = 1;
  }

  /* ---------- clouds ---------- */

  /* A cloud bank has no business being rebuilt every frame: it only
     drifts. So it is painted once into its own transparent layer, the
     width of the canvas plus its margins, and that layer is drawn twice
     per frame at a sliding offset so it wraps seamlessly. Two drawImage
     calls in place of several thousand dabs. */
  function paintClouds(density) {
    var lw = W + M * 2;
    var lh = Math.max(2, Math.ceil(horizon * 0.78));
    cloudLayer = document.createElement("canvas");
    cloudLayer.width = lw;
    cloudLayer.height = lh;
    var cc = cloudLayer.getContext("2d");

    /* cloud light is warm on the sun's side and cool in the shade, so
       the bank is built from both rather than from one grey */
    var tones = [];
    for (var c = 0; c < 8; c++) {
      tones.push(hsl(
        c % 2 ? range(34, 48) : range(196, 216),
        c % 2 ? range(26, 52) : range(16, 36),
        80 + c * 2.1,
        1
      ));
    }

    var banks = 3 + ((rnd() * 3) | 0);
    for (var i = 0; i < banks; i++) {
      var cx = range(0, lw);
      var cy = range(lh * 0.1, lh * 0.8);
      var cw = range(W * 0.16, W * 0.36);
      var chh = cw * range(0.16, 0.3);

      /* a soft mass under the dabs, so the bank holds together */
      var cg = cc.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.5);
      cg.addColorStop(0, "rgba(246,248,250,.5)");
      cg.addColorStop(0.6, "rgba(232,240,246,.26)");
      cg.addColorStop(1, "rgba(226,236,244,0)");
      cc.fillStyle = cg;
      cc.beginPath();
      cc.ellipse(cx, cy, cw * 0.5, chh * 0.62, 0, 0, 6.283);
      cc.fill();

      var n = Math.round(cw * chh / (44 * scale * scale) * density);
      for (var d = 0; d < n; d++) {
        var a = rnd() * 6.283;
        var rad = Math.pow(rnd(), 0.7);
        var x = cx + Math.cos(a) * rad * cw * 0.5;
        var y = cy + Math.sin(a) * rad * chh * 0.5 + Math.sin(x * 0.01) * chh * 0.2;
        cc.globalAlpha = range(0.3, 0.9);
        cc.fillStyle = pick(tones);
        cc.beginPath();
        cc.arc(x, y, range(2, 4.5) * scale, 0, 6.283);
        cc.fill();
      }
    }
  }

  /* ---------- baked sprites ---------- */

  /* Both of these were radial gradients built fresh every frame, which
     is the single most expensive thing you can do in a canvas loop.
     Built once, drawn as images. */
  function makeSprites() {
    var r = Math.max(8, Math.ceil(sun.r * 3.8));
    sunSprite = document.createElement("canvas");
    sunSprite.width = sunSprite.height = r * 2;
    var sc = sunSprite.getContext("2d");
    var layers = [[1, 0.09], [0.55, 0.15], [0.3, 0.3], [0.15, 0.6]];
    sc.globalCompositeOperation = "lighter";
    for (var i = 0; i < layers.length; i++) {
      var rr = r * layers[i][0];
      var g = sc.createRadialGradient(r, r, 0, r, r, rr);
      g.addColorStop(0, "rgba(255,247,214," + layers[i][1] + ")");
      g.addColorStop(0.45, "rgba(255,216,150," + (layers[i][1] * 0.42).toFixed(3) + ")");
      g.addColorStop(1, "rgba(255,196,120,0)");
      sc.fillStyle = g;
      sc.beginPath();
      sc.arc(r, r, rr, 0, 6.283);
      sc.fill();
    }

    moteWarm = dotSprite("rgba(255,238,186,1)", "rgba(255,238,186,0)");
    moteCool = dotSprite("rgba(216,240,255,1)", "rgba(216,240,255,0)");
  }

  function dotSprite(from, to) {
    var s = document.createElement("canvas");
    s.width = s.height = 48;
    var c = s.getContext("2d");
    var g = c.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    c.fillStyle = g;
    c.fillRect(0, 0, 48, 48);
    return s;
  }

  /* ---------- foreground grass, leaning with the gusts ---------- */

  function paintGrass(density) {
    var tones = [];
    for (var c = 0; c < 16; c++) {
      tones.push(bucket(hsl(
        86 + c * 3.1 + range(-5, 5),
        28 + (c % 4) * 9,
        26 + (c % 6) * 7,
        1
      ), "blade"));
    }
    var n = Math.round((W * (H - horizon)) / (340 * scale * scale) * density);
    for (var i = 0; i < n; i++) {
      var x = range(-M, W + M);
      var y = range(horizon + H * 0.03, H + M);
      var f = (y - horizon) / (H - horizon);
      if (rnd() > 0.2 + f * 0.9) continue;
      /* a dab, not a blade: short strokes that lengthen as they near */
      var h = (4 + f * 14) * scale * range(0.6, 1.4);
      add(tones[Math.min(15, ((f * 9 + rnd() * 7) | 0))],
          x, y, Math.max(1.6, (2.2 + f * 1.8) * scale * range(0.7, 1.3)), h,
          rnd() * 6.283, (0.6 + f * 3.6) * scale);
    }
    for (var k = 0; k < tones.length; k++) {
      if (tones[k].d.length) grass.push(tones[k]);
    }
  }

  /* ---------- pollen and light, floating up through the frame ---------- */

  function paintMotes() {
    var n = Math.round(Math.min(130, (W * H) / 26000));
    for (var i = 0; i < n; i++) {
      motes.push({
        x: range(-M, W + M),
        y: range(H * 0.1, H + M),
        r: range(0.9, 3.2) * scale,
        rise: range(4, 17) * scale,
        drift: range(3, 13) * scale,
        ph: rnd() * 6.283,
        wob: range(0.18, 0.62),
        a: range(0.16, 0.6),
        warm: rnd() > 0.35
      });
    }
  }

  /* ---------- draw ---------- */

  /* two sines of different period: a breeze that gusts rather than hums */
  function gust(t) {
    return 0.52 + 0.3 * Math.sin(t * 0.26) + 0.18 * Math.sin(t * 0.073 + 1.3);
  }

  function dabs(list, t, g, ox, oy) {
    for (var b = 0; b < list.length; b++) {
      var set = list[b];
      var d = set.d;
      var round = set.shape !== "blade";
      ctx.fillStyle = set.colour;
      if (round) ctx.beginPath();

      for (var i = 0; i < d.length; i += 6) {
        var ph = d[i + 4];
        var sw = d[i + 5];
        /* the gust, plus a flutter of its own, plus a half-pixel
           shimmer so the dabs vibrate the way divisionist paint does */
        var dx = g * sw + Math.sin(t * 1.9 + ph) * sw * 0.42 + Math.sin(t * 7 + ph) * 0.5;
        var dy = Math.cos(t * 1.4 + ph) * sw * 0.2 + Math.cos(t * 6.3 + ph) * 0.4;
        var x = d[i] + dx + ox;
        var y = d[i + 1] + dy + oy;

        if (round) {
          var r = d[i + 2] * 0.5;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, 6.283);
        } else {
          ctx.fillRect(x, y, d[i + 2], d[i + 3]);
        }
      }
      if (round) ctx.fill();
    }
  }

  function sunBloom(t) {
    if (!sunSprite) return;
    var pulse = 1 + Math.sin(t * 0.42) * 0.05;
    var d = sunSprite.width * pulse;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(sunSprite, sun.x - d / 2, sun.y - d / 2, d, d);
    ctx.globalCompositeOperation = "source-over";
  }

  function drawClouds(t, ox, oy) {
    if (!cloudLayer) return;
    var lw = cloudLayer.width;
    var off = (t * 5.5) % lw;
    ctx.drawImage(cloudLayer, -M - off + ox, -M + oy);
    ctx.drawImage(cloudLayer, -M - off + lw + ox, -M + oy);
  }

  function drawMotes(t, ox, oy) {
    var span = H + M * 2;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var y = m.y - ((t * m.rise) % span);
      if (y < -M) y += span;
      var x = m.x + Math.sin(t * m.wob + m.ph) * m.drift + t * m.drift * 0.12;
      x = ((x + M) % (W + M * 2) + (W + M * 2)) % (W + M * 2) - M;
      var d = m.r * 6.4;
      ctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(t * 1.3 + m.ph));
      ctx.drawImage(m.warm ? moteWarm : moteCool,
                    x + ox - d / 2, y + oy - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function render(t) {
    /* the pointer shifts the near layers more than the far ones */
    px += (mx - px) * 0.045;
    py += (my - py) * 0.045;

    ctx.drawImage(base, -M + px * 0.34, -M + py * 0.34);

    drawClouds(t, px * 0.55, py * 0.55);
    sunBloom(t);

    var g = gust(t);
    dabs(canopy, t, g, px * 0.8, py * 0.8);
    dabs(grass, t, g * 1.25, px * 1.3, py * 1.3);
    drawMotes(t, px * 1.5, py * 1.5);
  }

  function frame(now) {
    if (!t0) t0 = now;
    render((now - t0) / 1000);
    raf = requestAnimationFrame(frame);
  }

  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function start() {
    stop();
    if (still) { render(0); return; }
    t0 = 0;
    raf = requestAnimationFrame(frame);
  }

  /* ---------- wiring ---------- */

  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var doc = document.documentElement;
      var w = doc.clientWidth, h = doc.clientHeight;
      /* a phone's toolbar sliding away is not a resize worth repainting
         forty thousand dabs for */
      if (w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w; lastH = h;
      build();
      start();
    }, 220);
  }
  var lastW = document.documentElement.clientWidth;
  var lastH = document.documentElement.clientHeight;

  if (!still) {
    window.addEventListener("pointermove", function (e) {
      var doc = document.documentElement;
      mx = (e.clientX / doc.clientWidth - 0.5) * -22;
      my = (e.clientY / doc.clientHeight - 0.5) * -14;
    }, { passive: true });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  window.addEventListener("resize", onResize);

  build();
  start();

  document.body.classList.add("is-lit");
})();
