
    /**************************************************************************
     * PROJECT AETHER // PUZZLE STAGE
     * The node on Center Stage rises out of the central well as a 3D puzzle:
     * the Pathfinder's version of the relic the phones see. The planetary core
     * steps aside while a puzzle is up.
     **************************************************************************/
    const ST = { ink: 0x0f172a, slate: 0x1e293b, mute: 0x94a3b8, paper: 0xf8fafc, ok: 0x16a34a, alert: 0xe11d48, amber: 0xf59e0b, pick: 0x22c55e, navy: 0x2b3446 };
    const stMat = (color, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.72, metalness: 0.04 }, extra));
    const stLine = (color = ST.ink, opacity = 0.6) => new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    function stSolid(geo, mat, parent, x = 0, y = 0, z = 0) {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), stLine(ST.ink, 0.5)));
      return m;
    }
    function stLabel(text, height = 0.3, opts = {}) {
      const c = document.createElement('canvas'); const g = c.getContext('2d');
      const font = `${opts.weight || 600} 64px "JetBrains Mono", monospace`;
      g.font = font; const tw = Math.ceil(g.measureText(String(text)).width);
      c.width = tw + 56; c.height = 104;
      const g2 = c.getContext('2d');
      if (!opts.bare) { g2.fillStyle = opts.bg || 'rgba(248,250,252,0.94)'; g2.fillRect(0, 0, c.width, c.height); g2.strokeStyle = opts.border || 'rgba(15,23,42,0.5)'; g2.lineWidth = 4; g2.strokeRect(2, 2, c.width - 4, c.height - 4); }
      g2.font = font; g2.fillStyle = opts.color || '#0f172a'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.fillText(String(text), c.width / 2, c.height / 2 + 4);
      const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      s.scale.set(height * c.width / c.height, height, 1);
      if (stMiniMode) s.visible = false;   // the small models on the ring carry no text
      return s;
    }
    let stMiniMode = false;
    function stCircle(r, y, mat, n = 64) {
      const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push(new THREE.Vector3(r * Math.sin(a), y, r * Math.cos(a))); }
      return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
    }
    function stDispose(obj) {
      obj.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    }
    function stPickFrame(w, h, d) {
      const f = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: ST.pick }));
      f.visible = false; return f;
    }

    // ---- The Conduits: a loom of strands. Caps and flicker are the Pathfinder's to read; cutting happens here. ----
    function stageConduits() {
      const g = new THREE.Group(); const strands = pf.round.conduits.strands, n = strands.length;
      const W = 3.5, H = 1.7, y0 = 0.42, x = i => -W / 2 + W * (i + 0.5) / n;
      const white = stMat(ST.paper);
      stSolid(new THREE.BoxGeometry(W + 0.5, 0.09, 0.2), white, g, 0, y0, 0);
      stSolid(new THREE.BoxGeometry(W + 0.5, 0.09, 0.2), white, g, 0, y0 + H, 0);
      for (const sx of [-1, 1]) stSolid(new THREE.BoxGeometry(0.09, H, 0.09), white, g, sx * (W / 2 + 0.2), y0 + H / 2, 0);
      const parts = strands.map((s, i) => {
        const mat = stMat(ST.slate, { transparent: true });
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H / 2, 12), mat); top.position.set(x(i), y0 + H * 0.75, 0); g.add(top);
        const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H / 2, 12), mat); bot.position.set(x(i), y0 + H * 0.25, 0); g.add(bot);
        const cap = new THREE.Mesh(s.dot ? new THREE.SphereGeometry(0.11, 16, 12) : new THREE.TorusGeometry(0.1, 0.03, 10, 28), stMat(ST.ink));
        cap.position.set(x(i), y0 + H + 0.22, 0); g.add(cap);
        const num = stLabel(String(i + 1), 0.26); num.position.set(x(i), y0 - 0.26, 0.12); g.add(num);
        return { mat, top, bot, cut: 0, botY: y0 + H * 0.25, flicker: s.flicker };
      });
      const pick = stPickFrame(0.5, H + 0.95, 0.5); g.add(pick);
      return { group: g, update(now, dt, ctx) {
        const phase = Math.floor(now / 140) % 2;
        parts.forEach((p, i) => {
          const isCut = pf.cut.has(i + 1), isWrong = pf.wrongCut.has(i + 1);
          p.cut = THREE.MathUtils.lerp(p.cut, isCut || isWrong ? 1 : 0, Math.min(1, dt * 7));
          p.bot.position.y = p.botY - p.cut * 0.16; p.bot.rotation.z = p.cut * 0.34;
          p.top.position.y = y0 + H * 0.75 + p.cut * 0.05;
          p.mat.color.setHex(isWrong ? ST.alert : (isCut ? ST.mute : ST.slate));
          p.mat.opacity = (!isCut && !isWrong && p.flicker && phase) ? 0.16 : 1;
        });
        pick.visible = ctx.engaged;
        if (ctx.engaged) pick.position.set(x(pf.cursor), y0 + H / 2 + 0.02, 0);
      } };
    }

    // ---- The Resonator: the crystal flashes the pulse pattern; its ring follows the Astrophysicist's tuner. ----
    function stageResonator() {
      const g = new THREE.Group(); const cy = 1.3;
      stSolid(new THREE.CylinderGeometry(0.34, 0.5, 0.24, 6), stMat(ST.paper), g, 0, 0.12, 0);
      const crystal = new THREE.Group(); crystal.position.y = cy; crystal.scale.set(1, 1.7, 1); g.add(crystal);
      const coreMat = new THREE.MeshBasicMaterial({ color: ST.slate });
      crystal.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.52), coreMat));
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.56)), stLine(ST.ink, 0.9)); crystal.add(wire);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const halo = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.08, 64), haloMat); halo.position.y = cy; g.add(halo);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.05, 12, 96), stMat(0x80858f)); ring.position.y = cy; ring.rotation.x = Math.PI / 2; g.add(ring);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), stMat(ST.ink)); dot.position.x = 1.25; ring.add(dot);
      const tag = stLabel('PULSE CORE', 0.2); tag.position.set(0, 2.42, 0); g.add(tag);
      let glow = 0, spin = 0;
      return { group: g, update(now, dt, ctx) {
        const on = !ctx.solved && pfPulseOn(now);
        glow = THREE.MathUtils.lerp(glow, on ? 1 : 0, Math.min(1, dt * 26));
        coreMat.color.setHex(ctx.solved ? ST.ok : ST.slate).lerp(new THREE.Color(0x67e8f9), ctx.solved ? 0 : glow);
        haloMat.opacity = glow * 0.85; halo.scale.setScalar(1 + glow * 0.12); halo.lookAt(camera.position);
        const live = pf.live.resonator; const f = live ? live.f : 500;
        spin += dt * (ctx.solved ? 0.2 : 0.5 + (f - 400) / 200 * 3.2); ring.rotation.z = spin;
        crystal.rotation.y += dt * 0.35;
      } };
    }

    // ---- The Jaw: the four glyphs on plates, above a jaw that mirrors the teeth the Xenolinguist presses. ----
    function stageGlyph() {
      const g = new THREE.Group(); const glyphs = pf.round.glyph.glyphs;
      const plates = glyphs.map((name, i) => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 256;
        const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.82), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
        const x = -1.44 + i * 0.96; m.position.set(x, 2.0 + (i % 2 ? 0 : 0.1), Math.abs(x) * -0.2 - 0.3); m.rotation.y = -x * 0.16; g.add(m);
        return { name, c, tex, drawn: '' };
      });
      const paint = (p, i, order) => {
        const ctx = p.c.getContext('2d'); const lit = order > 0;
        ctx.clearRect(0, 0, 256, 256);
        ctx.fillStyle = 'rgba(248,250,252,0.96)'; ctx.fillRect(4, 4, 248, 248);
        ctx.strokeStyle = lit ? '#16a34a' : '#0f172a'; ctx.lineWidth = lit ? 10 : 5; ctx.strokeRect(6, 6, 244, 244);
        drawGlyph(ctx, p.name, 58, 62, 140, lit ? '#16a34a' : '#0f172a');
        ctx.fillStyle = '#64748b'; ctx.font = '600 30px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1), 20, 42);
        if (lit) { ctx.fillStyle = '#16a34a'; ctx.textAlign = 'right'; ctx.fillText('#' + order, 238, 42); }
        p.tex.needsUpdate = true;
      };
      // the jaw itself: blank teeth (which glyph sits on which tooth is the Xenolinguist's to see)
      const jaw = new THREE.Group(); jaw.position.set(0, 0.06, 0.45); jaw.scale.setScalar(1.12); g.add(jaw);
      const Rj = 1.5, CZ = -1.2, span = 32 * Math.PI / 180, N = pf.round.glyph.teeth.length, ang = i => -span + 2 * span * i / (N - 1);
      const band = (ri, ro, a1, a2, h) => { const s = new THREE.Shape(); s.absarc(0, 0, ro, a1 - Math.PI / 2, a2 - Math.PI / 2, false); s.absarc(0, 0, ri, a2 - Math.PI / 2, a1 - Math.PI / 2, true); const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 24 }); geo.rotateX(-Math.PI / 2); return geo; };
      const white = stMat(ST.paper);
      stSolid(band(Rj - 0.2, Rj + 0.2, -span - 0.16, span + 0.16, 0.16), white, jaw, 0, 0.06, CZ);
      stSolid(new THREE.BoxGeometry(1.5, 0.1, 0.78), white, jaw, 0, 0.11, -0.22);
      const teeth = Array.from({ length: N }, (_, i) => {
        const a = ang(i); const mat = stMat(ST.paper);
        const m = stSolid(new THREE.BoxGeometry(0.19, 0.26, 0.17), mat, jaw, Rj * Math.sin(a), 0.4, CZ + Rj * Math.cos(a)); m.rotation.y = a;
        return { m, mat, y: 0.4 };
      });
      const hinge = new THREE.Group(); hinge.position.set(0, 0.74, -0.58); jaw.add(hinge);
      const upperMat = stMat(ST.paper);
      stSolid(new THREE.BoxGeometry(1.5, 0.1, 0.8), upperMat, hinge, 0, 0, 0.4);
      stSolid(band(Rj - 0.2, Rj + 0.2, -span - 0.16, span + 0.16, 0.14), upperMat, hinge, 0, -0.07, CZ + 0.58);
      for (let i = 0; i < 7; i++) { const a = -span + 2 * span * (i + 0.5) / 7; const fang = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 10), upperMat); fang.rotation.x = Math.PI; fang.position.set(Rj * Math.sin(a), -0.15, CZ + 0.58 + Rj * Math.cos(a)); hinge.add(fang); }
      let jawAng = 0.9;
      return { group: g, update(now, dt, ctx) {
        const answer = pf.round.glyph.answer; const live = pf.live.glyph; const fresh = live && now - live.at < 3000;
        const step = ctx.solved ? 4 : (live ? live.step || 0 : 0);
        plates.forEach((p, i) => { const k = answer.indexOf(p.name); const order = k >= 0 && k < step ? k + 1 : 0; const key = String(order); if (key !== p.drawn) { p.drawn = key; paint(p, i, order); } });
        const down = live && Array.isArray(live.down) ? live.down : [];
        const snapping = fresh && live.snap;
        teeth.forEach((t, i) => {
          t.y = THREE.MathUtils.lerp(t.y, down.includes(i) ? 0.27 : 0.4, Math.min(1, dt * 16)); t.m.position.y = t.y;
          t.mat.color.setHex(down.includes(i) ? (snapping ? ST.alert : ST.ok) : ST.paper);
        });
        const target = ctx.solved ? 1.12 : (live && typeof live.ang === 'number' ? live.ang : 0.9);
        jawAng = THREE.MathUtils.lerp(jawAng, target, Math.min(1, dt * (snapping ? 26 : 8))); hinge.rotation.x = -jawAng;
        upperMat.color.setHex(snapping ? ST.alert : ST.paper);
      } };
    }

    // ---- The Descent: the maze tilted toward you, trapdoors glowing red, and the ball as it rolls on the phone. ----
    function stageDescent() {
      const g = new THREE.Group(); const mz = pf.round.descent; const R0 = 1.25, K = R0 / 0.95;
      const board = new THREE.Group(); board.position.set(0, 1.32, 0); board.rotation.x = 1.02; g.add(board);
      const R = [0.95, 0.71, 0.47, 0.26].map(r => r * K), mid = [(R[0] + R[1]) / 2, (R[1] + R[2]) / 2, (R[2] + R[3]) / 2];
      const clock = (r, a) => [r * Math.sin(a), -r * Math.cos(a)], rad = d => d * Math.PI / 180, t = 0.045, h = 0.08;
      const floor = new THREE.Mesh(new THREE.CircleGeometry(R0, 72), new THREE.MeshBasicMaterial({ color: ST.navy })); floor.rotation.x = -Math.PI / 2; board.add(floor);
      const white = stMat(ST.paper);
      const ringShape = new THREE.Shape(); ringShape.absarc(0, 0, R0 + 0.07, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0, 0, R0, 0, Math.PI * 2, true); ringShape.holes.push(hole);
      const rimGeo = new THREE.ExtrudeGeometry(ringShape, { depth: h * 1.4, bevelEnabled: false, curveSegments: 64 }); rimGeo.rotateX(-Math.PI / 2); board.add(new THREE.Mesh(rimGeo, white));
      const arc = (r, a1, a2) => { const s = new THREE.Shape(); const ta = Math.PI / 2 - a2, tb = Math.PI / 2 - a1; s.absarc(0, 0, r + t / 2, ta, tb, false); s.absarc(0, 0, r - t / 2, tb, ta, true); const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 10 }); geo.rotateX(-Math.PI / 2); board.add(new THREE.Mesh(geo, white)); };
      for (let b = 0; b < 3; b++) for (let s = 0; s < 12; s++) if (!mz.gaps[b].includes(s)) arc(R[b + 1], rad(s * 30 - 15), rad(s * 30 + 15));
      for (let i = 0; i < 3; i++) for (const b of mz.walls[i]) { const a = rad(b * 30 + 15), len = R[i] - R[i + 1], m = (R[i] + R[i + 1]) / 2; const box = new THREE.Mesh(new THREE.BoxGeometry(t, h, len), white); box.position.set(m * Math.sin(a), h / 2, -m * Math.cos(a)); box.rotation.y = Math.PI - a; board.add(box); }
      const holeMesh = new THREE.Mesh(new THREE.CircleGeometry(0.11 * K, 32), new THREE.MeshBasicMaterial({ color: 0x05070a })); holeMesh.rotation.x = -Math.PI / 2; holeMesh.position.y = 0.004; board.add(holeMesh);
      const traps = mz.traps.map(([ring, s]) => { const [x, z] = clock(mid[ring], rad(s * 30)); const m = new THREE.Mesh(new THREE.CircleGeometry(0.1 * K, 24), new THREE.MeshBasicMaterial({ color: ST.alert, transparent: true })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); board.add(m); return m; });
      const [sx, sz] = clock(mid[0], rad(mz.start * 30));
      const startMark = new THREE.Mesh(new THREE.RingGeometry(0.06 * K, 0.075 * K, 24), new THREE.MeshBasicMaterial({ color: 0xec4899, side: THREE.DoubleSide })); startMark.rotation.x = -Math.PI / 2; startMark.position.set(sx, 0.008, sz); board.add(startMark);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045 * K, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 })); ball.position.set(sx, 0.045 * K, sz); board.add(ball);
      for (let s = 0; s < 12; s += 1) { const [x, z] = clock(R0 + 0.24, rad(s * 30)); const l = stLabel(String(s === 0 ? 12 : s), s % 3 === 0 ? 0.2 : 0.15, { bare: true, color: '#475569' }); l.position.set(x, 0.05, z); board.add(l); }
      const target = new THREE.Vector3(sx, 0.045 * K, sz);
      return { group: g, update(now, dt, ctx) {
        const pulse = 0.55 + 0.45 * Math.sin(now / 240);
        traps.forEach(m => { m.material.opacity = pulse; });
        const live = pf.live.descent;
        if (ctx.solved) target.set(0, -0.02, 0);
        else if (live && Array.isArray(live.p) && now - live.at < 4000) target.set(live.p[0] * K, (live.m === 'fall' || live.m === 'won') ? -0.05 : 0.045 * K, live.p[1] * K);
        ball.position.lerp(target, Math.min(1, dt * 14));
      } };
    }

    // ---- The Echo Chamber: the stage's shape and four labelled pads. Pressed from here. ----
    function stageEcho() {
      const g = new THREE.Group(); const xs = [-1.65, -0.55, 0.55, 1.65];
      const white = stMat(ST.paper);
      const pads = xs.map((x, i) => {
        const pad = stSolid(new THREE.CylinderGeometry(0.36, 0.42, 0.24, 28), white, g, x, 0.3, 0);
        const pos = stLabel(`POS ${i + 1}`, 0.15, { bare: true, color: '#64748b' }); pos.position.set(x, 0.02, 0.5); g.add(pos);
        return { pad, x, label: null };
      });
      const shapeHolder = new THREE.Group(); shapeHolder.position.set(0, 1.92, 0); g.add(shapeHolder);
      const lights = [0, 1, 2, 3].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({ color: ST.mute })); m.position.set(-0.36 + i * 0.24, 2.52, 0); g.add(m); return m; });
      const pick = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 8, 48), new THREE.MeshBasicMaterial({ color: ST.pick })); pick.rotation.x = Math.PI / 2; pick.visible = false; g.add(pick);
      const shapeGeo = (shape) => {
        const pts = { Triangle: [[0, 0.42], [0.4, -0.3], [-0.4, -0.3]], Square: [[-0.34, -0.34], [0.34, -0.34], [0.34, 0.34], [-0.34, 0.34]] }[shape];
        const s = new THREE.Shape();
        if (shape === 'Circle') s.absarc(0, 0, 0.38, 0, Math.PI * 2, false);
        else if (shape === 'Cross') { const a = 0.12, b = 0.4; [[-a, b], [a, b], [a, a], [b, a], [b, -a], [a, -a], [a, -b], [-a, -b], [-a, -a], [-b, -a], [-b, a], [-a, a]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); }
        else { pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); }
        const geo = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 32 }); geo.center(); return geo;
      };
      let drawn = '';
      return { group: g, update(now, dt, ctx) {
        const st = Math.min(4, pf.echoStage), S = pf.echoStages[st - 1];
        const key = `${st}|${pf.echoAttempt}|${ctx.solved ? 1 : 0}`;
        if (key !== drawn) {
          drawn = key;
          while (shapeHolder.children.length) { const o = shapeHolder.children[0]; shapeHolder.remove(o); stDispose(o); }
          stSolid(shapeGeo(S.shape), stMat(ctx.solved ? ST.ok : ST.paper), shapeHolder);
          pads.forEach((p, i) => {
            if (p.label) { g.remove(p.label); stDispose(p.label); }
            p.label = stLabel(String(S.labels[i]), 0.5, { color: ctx.solved ? '#16a34a' : '#0f172a' }); p.label.position.set(p.x, 0.92, 0); g.add(p.label);
            p.pad.scale.y = 0.4;
          });
        }
        pads.forEach(p => { p.pad.scale.y = THREE.MathUtils.lerp(p.pad.scale.y, 1, Math.min(1, dt * 8)); });
        shapeHolder.rotation.y = Math.sin(now / 1400) * 0.5;
        lights.forEach((l, i) => l.material.color.setHex(ctx.solved || i + 1 < pf.echoStage ? ST.ok : (i + 1 === pf.echoStage ? ST.ink : ST.mute)));
        pick.visible = ctx.engaged;
        if (ctx.engaged) pick.position.set(xs[pf.cursor], 0.46, 0);
      } };
    }

    // ---- The Pressure Vent: three gauges. Levels only show while the alarm is live. ----
    function stageVent() {
      const g = new THREE.Group(); const xs = [-1.3, 0, 1.3], names = ['LEFT', 'CENTRE', 'RIGHT'], HG = 1.7, y0 = 0.36;
      const cols = xs.map((x, i) => {
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, HG, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
        glass.position.set(x, y0 + HG / 2, 0); g.add(glass);
        glass.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.3, 0.3, HG, 28, 1, true), 25), stLine(ST.ink, 0.6)));
        stSolid(new THREE.CylinderGeometry(0.36, 0.4, 0.1, 28), stMat(ST.paper), g, x, y0 - 0.05, 0);
        const bars = [0, 1, 2, 3, 4].map(k => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, HG / 5 - 0.07, 20), new THREE.MeshBasicMaterial({ color: ST.amber })); b.position.set(x, y0 + (k + 0.5) * HG / 5, 0); b.visible = false; g.add(b); return b; });
        const name = stLabel(names[i], 0.2); name.position.set(x, y0 - 0.34, 0.2); g.add(name);
        return { bars };
      });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: ST.amber, transparent: true, opacity: 0 })); halo.rotation.x = Math.PI / 2; halo.position.y = 0.12; g.add(halo);
      let tag = null, drawn = '';
      return { group: g, update(now, dt, ctx) {
        const v = pfVent(); const on = !!v;
        const left = on ? Math.max(0, Math.ceil((v.endsAt - (Date.now() + Net.offset)) / 1000)) : 0;
        const key = on ? `a${v.index}|${left}` : 'dormant';
        if (key !== drawn) {
          drawn = key;
          if (tag) { g.remove(tag); stDispose(tag); }
          tag = on ? stLabel(`VENT NOW  0:${String(left).padStart(2, '0')}`, 0.3, { color: '#b45309', border: '#b45309' }) : stLabel('DORMANT', 0.22, { color: '#64748b' });
          tag.position.set(0, y0 + HG + 0.42, 0); g.add(tag);
          const levels = on ? ventGaugesFor(pf.code, v.index) : [0, 0, 0];
          cols.forEach((c, i) => c.bars.forEach((b, k) => { b.visible = k < levels[i]; }));
        }
        halo.material.opacity = on ? 0.35 + 0.45 * Math.abs(Math.sin(now / 260)) : 0;
      } };
    }

    // ---- nodes that arrive in a later build ----
    function stageSoon() {
      const g = new THREE.Group();
      const w = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.8)), stLine(ST.mute, 0.8)); w.position.y = 1.3; g.add(w);
      const tag = stLabel('NOT INSTALLED', 0.24, { color: '#64748b' }); tag.position.set(0, 0.3, 0); g.add(tag);
      return { group: g, update(now, dt) { w.rotation.y += dt * 0.4; } };
    }
    const PF_STAGE = { conduits: stageConduits, resonator: stageResonator, glyph: stageGlyph, descent: stageDescent, echo: stageEcho, vent: stageVent, starmap: stageSoon, dice: stageSoon };
    const pfStage = { group: null, key: null, obj: null, shownAt: 0, zoom: 1.1 };
    function pfVent() { const s = Net.state; return pfLinked() && s.phase === 'live' && s.vent && s.vent.active ? s.vent : null; }
    function pfStageFrame(now, dt) {
      if (!pfStage.group) {
        pfStage.group = new THREE.Group();
        pfStage.group.position.set(POLAR_ORIGIN.x, POLAR_ORIGIN.y + 1.15, POLAR_ORIGIN.z);
        scene.add(pfStage.group);
      }
      const ready = !tutorialState.active && transitionState.phase === 'NONE' && hudCards[0].mesh.visible && pf.round;
      const center = ready ? backScreenCards.find(sc => sc.bayIdx === 2) : null;
      const cfg = center ? cardConfigs.find(c => c.id === center.orbId) : null;
      const node = cfg ? cfg.node : null;
      const key = node ? `${node}|${pf.code}|${pf.gen}` : null;
      if (key !== pfStage.key) {
        if (pfStage.obj) { pfStage.group.remove(pfStage.obj.group); stDispose(pfStage.obj.group); }
        pfStage.key = key; pfStage.obj = node ? PF_STAGE[node]() : null; pfStage.shownAt = now;
        if (pfStage.obj) pfStage.group.add(pfStage.obj.group);
      }
      // The planetary core steps aside while a puzzle is on the stage
      if (transitionState.phase === 'NONE' && !tutorialState.active) coreGroup.visible = !pfStage.obj;
      if (!pfStage.obj) return;
      const p = Math.min(1, (now - pfStage.shownAt) / 520), e = 1 - Math.pow(1 - p, 3);
      pfStage.zoom = THREE.MathUtils.lerp(pfStage.zoom, coreState.targetExplode > 0.5 ? 1.32 : 1.1, Math.min(1, dt * 6));
      pfStage.group.scale.set(pfStage.zoom, Math.max(0.02, e) * pfStage.zoom, pfStage.zoom);
      pfStage.obj.update(now, dt, { engaged: pf.engaged === node, solved: pfNodeSolved(node) });
      pfHeaderFrame(node);
    }

    // ---- One slim title strip above the puzzle replaces the wall of screens ----
    const pfHeader = { sprite: null, canvas: null, tex: null, sig: '' };
    function pfHeaderFrame(node) {
      if (!pfHeader.sprite) {
        const c = document.createElement('canvas'); c.width = 1440; c.height = 372;
        const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
        sp.scale.set(7.2, 7.2 * 372 / 1440, 1); sp.position.set(0, 3.72, 0); sp.renderOrder = 20;
        pfStage.group.add(sp);
        Object.assign(pfHeader, { sprite: sp, canvas: c, tex });
      }
      const r = pf.round, soon = !!PF_SOON[node], solved = pfNodeSolved(node), engaged = pf.engaged === node, alarm = node === 'vent' && !!pfVent();
      const line = pfRoomLine();
      const sig = `${node}|${solved}|${engaged}|${alarm}|${line}|${pf.code}|${pf.gen}`;
      if (sig === pfHeader.sig) return;
      pfHeader.sig = sig;
      const ctx = pfHeader.canvas.getContext('2d'), W = 1440, ink = '#0f172a', mute = '#64748b';
      ctx.clearRect(0, 0, W, 372); ctx.textBaseline = 'alphabetic';
      // row 1: node name and its state
      ctx.fillStyle = ink; ctx.font = '200 92px "Inter", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(pfNodeName(node), 24, 96);
      const state = soon ? 'NOT INSTALLED' : engaged ? 'ENGAGED' : alarm ? 'ALARM' : solved ? 'OPEN' : (node === 'vent' ? 'DORMANT' : 'SEALED');
      const stateCol = engaged ? '#16a34a' : alarm ? '#b45309' : solved ? '#16a34a' : mute;
      ctx.font = '600 44px "JetBrains Mono", monospace'; ctx.textAlign = 'right'; ctx.fillStyle = stateCol; ctx.fillText(state, W - 24, 90);
      ctx.strokeStyle = 'rgba(15,23,42,0.28)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(24, 128); ctx.lineTo(W - 24, 128); ctx.stroke();
      // row 2: seal word, and the room's clock and strikes
      ctx.font = '500 40px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillStyle = mute; ctx.fillText('SEAL WORD', 24, 196);
      ctx.fillStyle = ink; ctx.font = '600 40px "JetBrains Mono", monospace'; ctx.fillText(soon ? 'NONE' : r.nodeSeal[node].toUpperCase(), 280, 196);
      ctx.textAlign = 'right'; ctx.fillStyle = ink; ctx.fillText(line.replace('  //  ', '   '), W - 24, 196);
      // row 3: hull telemetry (read once at the start), or the controls while engaged
      ctx.textAlign = 'left'; ctx.font = '500 40px "JetBrains Mono", monospace';
      ctx.fillStyle = mute; ctx.fillText('CASE', 24, 268); ctx.fillStyle = ink; ctx.font = '600 40px "JetBrains Mono", monospace'; ctx.fillText(r.caseNumber.toUpperCase(), 150, 268);
      ctx.fillStyle = mute; ctx.font = '500 40px "JetBrains Mono", monospace'; ctx.fillText('CELLS', 520, 268);
      r.cellStates.forEach((on, i) => { const x = 676 + i * 40; if (on) { ctx.fillStyle = '#16a34a'; ctx.fillRect(x, 232, 24, 42); } else { ctx.strokeStyle = mute; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, 233.5, 21, 39); } });
      ctx.fillStyle = mute; ctx.fillText('SIGIL', 866, 268);
      pfDrawSigil(ctx, r.sigil, 1040, 254, 56, ink);
      // row 4: what to do here, or the controls while engaged
      ctx.font = '500 34px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      if (engaged) { ctx.fillStyle = '#16a34a'; ctx.fillText('SWIPE TO CHOOSE  ·  [1] ACT  ·  [2] RELEASE', 24, 340); }
      else {
        ctx.fillStyle = mute; ctx.fillText(soon ? 'ARRIVES IN A LATER BUILD' : (NODE_HINTS[node] || ''), 24, 340);
        if (INTERACTIVE_NODES.includes(node) && !solved) { ctx.textAlign = 'right'; ctx.fillText('[1] TO ENGAGE', W - 24, 340); }
      }
      pfHeader.tex.needsUpdate = true;
    }

    // ---- The ring carries a small live model of each puzzle instead of a numbered disc ----
    const pfMini = { key: null, items: [] };
    function pfMiniFrame(now, dt) {
      const ready = !tutorialState.active && pf.round && hudCards.length && hudCards[0].mesh.visible;
      const key = ready ? `${pf.code}|${pf.gen}` : null;
      if (key !== pfMini.key) {
        pfMini.items.forEach(it => { scene.remove(it.group); stDispose(it.group); });
        pfMini.items = []; pfMini.key = key;
        if (key) hudCards.forEach(card => {
          card.mesh.children.forEach(ch => { ch.visible = false; });
          const group = new THREE.Group();
          const plinthMat = stMat(ST.paper);
          const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.45, 0.16, 48), plinthMat); plinth.position.y = -0.08; group.add(plinth);
          const edgeMat = new THREE.LineBasicMaterial({ color: ST.mute });
          group.add(stCircle(2.31, 0.012, edgeMat));
          stMiniMode = true; const obj = PF_STAGE[card.node](); stMiniMode = false;
          obj.group.traverse(o => { if (o.isSprite) o.visible = false; });
          group.add(obj.group); group.scale.setScalar(0.001); scene.add(group);
          pfMini.items.push({ card, group, obj, edgeMat, plinthMat, s: 0.001 });
        });
      }
      pfMini.items.forEach(it => {
        const c = it.card, front = c.visualState === 'VIEWING';
        const t = Math.max(0, Math.min(1, (c.scale - 0.42) / 0.74));
        it.s = THREE.MathUtils.lerp(it.s, 0.21 + 0.09 * t, Math.min(1, dt * 6));
        it.group.position.set(c.mesh.position.x, c.mesh.position.y - 0.62, c.mesh.position.z);
        it.group.scale.setScalar(it.s);
        const solved = pfNodeSolved(c.node), alarm = c.node === 'vent' && !!pfVent();
        it.edgeMat.color.setHex(alarm ? ST.amber : solved ? ST.ok : front ? ST.pick : (c.isHovered ? ST.ink : ST.mute));
        it.plinthMat.color.setHex(alarm && Math.floor(now / 320) % 2 ? 0xfde68a : (solved ? 0xdcfce7 : ST.paper));
        stMiniMode = true; it.obj.update(now, dt, { engaged: false, solved }); stMiniMode = false;
      });
    }
