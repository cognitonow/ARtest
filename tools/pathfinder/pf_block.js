    /**************************************************************************
     * PROJECT AETHER // PATHFINDER CONTENT LAYER
     * Each orb is one game node. Center Stage shows what only the Pathfinder
     * can see. The Conduits and the Echo Chamber are opened from here.
     **************************************************************************/
/*@@LOGIC@@*/
/*@@GLYPHS@@*/
    const store = {
      get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    const validRound = v => /^\d{4}$/.test(v);
    const fmtClock = ms => { const t = Math.ceil(ms / 1000); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
    const INTERACTIVE_NODES = ['conduits', 'echo'];
    const PF_SCREENS = false;   // the wall of screens is off: the puzzle stage and its title strip carry everything
    const NODE_HINTS = {
      conduits: 'READ CAPS & FLICKER  //  CUT WHEN TOLD',
      resonator: 'WATCH THE PULSE  //  CALL SHORT & LONG',
      glyph: 'DESCRIBE EACH GLYPH BY ITS SHAPE',
      descent: 'TRAPDOORS GLOW RED  //  GIVE RING & HOUR',
      echo: 'READ SHAPE & LABELS  //  PRESS WHEN TOLD',
      vent: 'INTERRUPT  //  GAUGES APPEAR ON ALARM'
    };
    const pf = {
      code: 0, round: null, engaged: null, cursor: 0,
      cut: new Set(), wrongCut: new Set(), echoStage: 1, echoHist: {}, echoAttempt: 0, echoStages: [],
      solved: new Set(), strikes: 0, epoch: null, lastDomSig: '', live: {}, gen: 0
    };
    const PF_SOON = { starmap: 'The Star Map', dice: 'The Dice Vault' };
    const pfNodeName = node => (NODE[node] ? NODE[node].name : PF_SOON[node]);
    function pfLoadRound(code) {
      pf.code = code; pf.round = makeRound(code); pf.epoch = null; pfResetProgress();
    }
    function pfResetProgress() {
      Object.assign(pf, { engaged: null, cursor: 0, cut: new Set(), wrongCut: new Set(), echoStage: 1, echoHist: {}, echoAttempt: 0, solved: new Set(), strikes: 0 });
      pf.echoStages = pf.round.echo.stages.map(s => ({ shape: s.shape, labels: s.labels.slice() }));
      pf.live = {}; pf.gen += 1;
      pfDirtyAll();
    }
    function pfEchoNewStages() {
      const rnd = mulberry32(((pf.code * 7919) + pf.echoAttempt * 104729) >>> 0);
      const int = n => Math.floor(rnd() * n);
      pf.echoStages = [1, 2, 3, 4].map(() => {
        const labels = [1, 2, 3, 4];
        for (let i = 3; i > 0; i--) { const j = int(i + 1); [labels[i], labels[j]] = [labels[j], labels[i]]; }
        return { shape: SHAPES[int(4)], labels };
      });
    }
    function pfDirtyAll() {
      if (typeof backScreenCards !== 'undefined') backScreenCards.forEach(sc => { sc.lastDrawSig = null; });
      if (typeof hudCards !== 'undefined') hudCards.forEach(c => { c.lastDrawSig = null; });
    }
    const pfLinked = () => Net.online && !!Net.state;
    const pfPhase = () => (pfLinked() ? Net.state.phase : 'offline');
    function pfNodeSolved(node) { return pf.solved.has(node) || (pfLinked() && Net.state.solved.includes(node)); }
    function pfRoomLine() {
      if (!Net.online) return Net.failed ? 'OFFLINE  //  LOCAL PRACTICE' : (Net.round !== null ? 'LINKING  //  ROOM ' + String(Net.round).padStart(4, '0') : 'NO ROOM  //  ENTER ROUND');
      const s = Net.state; if (!s) return 'LINKING';
      if (s.phase === 'lobby') return 'LOBBY  //  WAITING FOR FLIGHT DIRECTOR';
      if (s.phase === 'live') return `MISSION ${fmtClock(Net.remaining())}  //  STRIKES ${s.strikes}/3`;
      return s.phase === 'won' ? 'CORE BREACHED  //  ROUND WON' : `LINK LOST  //  ${String(s.outcome || '').toUpperCase()}`;
    }

    // ---- actions ----
    function pfTryEngage(card) {
      const node = card.node;
      if (!INTERACTIVE_NODES.includes(node)) return false;
      if (pfNodeSolved(node)) { showToast(`${NODE[node].name.toLowerCase()} is already open`); return true; }
      const ph = pfPhase();
      if (ph === 'lobby') { showToast('waiting for the flight director to start the round'); pushLog('[RUN] round not started // engage blocked'); return true; }
      if (ph === 'won' || ph === 'lost') { showToast('the round is over'); return true; }
      pf.engaged = node; pf.cursor = 0;
      redrawCockpitZoneHeaders(`ENGAGED // ${NODE[node].name.toUpperCase()}`, card.accent);
      pushLog(`[RUN] engaged ${NODE[node].name.toLowerCase()} // swipe to choose`);
      showToast(`engaged ${NODE[node].name.toLowerCase()} // swipe to choose, [1] to act, [2] to release`);
      return true;
    }
    function pfDisengage() {
      if (!pf.engaged) return;
      pushLog(`[RUN] released ${NODE[pf.engaged].name.toLowerCase()}`);
      pf.engaged = null;
      redrawCockpitZoneHeaders('PEDESTAL CAROUSEL & SCREEN BAYS ACTIVE', '#22c55e');
    }
    function pfToggleZoom() {
      coreState.targetExplode = coreState.targetExplode > 0.5 ? 0.0 : 1.0;
      pushLog(coreState.targetExplode > 0.5 ? '[VIEW] puzzle zoomed in' : '[VIEW] puzzle zoomed out');
    }
    function pfCount(node) { return node === 'conduits' ? pf.round.conduits.strands.length : 4; }
    function pfMoveCursor(d) {
      if (!pf.engaged) return;
      const n = pfCount(pf.engaged); pf.cursor = (pf.cursor + d + n) % n;
      if (typeof synth !== 'undefined') synth.playHoverChirp();
    }
    function pfStrike(reason) {
      synth.playExplodeChord(false);
      if (pfLinked()) {
        if (Net.state.phase === 'live') Net.send({ type: 'strike', node: pf.engaged, reason });
        else showToast('practice strike // round not live');
      } else { pf.strikes = Math.min(3, pf.strikes + 1); }
      pushLog(`[STRIKE] ${reason.toLowerCase()}`);
      showToast(`strike // ${reason.toLowerCase()}`);
      redrawCockpitZoneHeaders(`STRIKE // ${reason.toUpperCase()}`, '#e11d48');
    }
    function pfSolve(node, text) {
      pf.solved.add(node); pf.engaged = null;
      if (pfLinked() && Net.state.phase === 'live') Net.send({ type: 'solved', node });
      synth.playExplodeChord(true);
      pushLog(`[OPEN] ${text.toLowerCase()}`);
      showToast(text.toLowerCase());
      redrawCockpitZoneHeaders(`${NODE[node].name.toUpperCase()} // OPEN`, '#22c55e');
      pfDirtyAll();
    }
    function pfAct() {
      const node = pf.engaged; if (!node) return;
      if (node === 'conduits') {
        const i = pf.cursor + 1;
        if (pf.cut.has(i) || pf.wrongCut.has(i)) { showToast(`strand ${i} is already cut`); return; }
        if (pf.round.conduits.targets.includes(i)) {
          pf.cut.add(i); synth.playPinchLock(); pushLog(`[CUT] strand ${i} severed`);
          if (pf.round.conduits.targets.every(t => pf.cut.has(t))) pfSolve('conduits', 'The Conduits are open');
          else showToast(`strand ${i} severed`);
        } else { pf.wrongCut.add(i); pfStrike(`Strand ${i} should not have been cut`); }
      } else if (node === 'echo') {
        const st = pf.echoStage, S = pf.echoStages[st - 1];
        const want = echoPress(st, S.shape, S.labels, pf.echoHist, pf.round.cells);
        const pos = pf.cursor + 1;
        if (pos === want) {
          pf.echoHist[st] = [pos, S.labels[pos - 1]]; pf.echoStage += 1; synth.playPinchLock();
          pushLog(`[ECHO] stage ${st} // pressed position ${pos}`);
          if (pf.echoStage > 4) pfSolve('echo', 'The Echo Chamber is open');
          else showToast(`stage ${st} cleared // stage ${pf.echoStage} of 4`);
        } else {
          pf.echoAttempt += 1; pfEchoNewStages(); pf.echoHist = {}; pf.echoStage = 1;
          pfStrike(`Wrong pad at stage ${st}`);
        }
      }
    }

    // ---- drawing helpers (canvas 2D) ----
    function pfDrawSigil(ctx, name, cx, cy, s, color) {
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(3, s * 0.07); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      if (name === 'Spiral') {
        for (let t = 0; t <= Math.PI * 4.2; t += 0.08) { const r = s * 0.04 + (s * 0.46) * (t / (Math.PI * 4.2)); const x = cx + r * Math.cos(t), y = cy + r * Math.sin(t); t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
      } else if (name === 'Eye') {
        ctx.moveTo(cx - s * 0.5, cy); ctx.quadraticCurveTo(cx, cy - s * 0.5, cx + s * 0.5, cy); ctx.quadraticCurveTo(cx, cy + s * 0.5, cx - s * 0.5, cy); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.17, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.06, 0, Math.PI * 2); ctx.fill();
      } else if (name === 'Crown') {
        [[-0.45, 0.3], [-0.45, -0.18], [-0.22, 0.06], [0, -0.34], [0.22, 0.06], [0.45, -0.18], [0.45, 0.3]].forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * s, cy + y * s) : ctx.moveTo(cx + x * s, cy + y * s)));
        ctx.closePath(); ctx.stroke();
      } else {
        for (const off of [-0.14, 0.14]) { ctx.moveTo(cx - s * 0.5, cy + off * s); for (let x = -0.5; x <= 0.5001; x += 0.025) ctx.lineTo(cx + x * s, cy + off * s + Math.sin(x * Math.PI * 4) * s * 0.1); }
        ctx.stroke();
      }
      ctx.restore();
    }
    function pfDrawShape(ctx, shape, cx, cy, s, color) {
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.08; ctx.lineJoin = 'round';
      ctx.beginPath();
      if (shape === 'Triangle') { ctx.moveTo(cx, cy - s * 0.45); ctx.lineTo(cx + s * 0.45, cy + s * 0.38); ctx.lineTo(cx - s * 0.45, cy + s * 0.38); ctx.closePath(); ctx.stroke(); }
      else if (shape === 'Square') { ctx.strokeRect(cx - s * 0.38, cy - s * 0.38, s * 0.76, s * 0.76); }
      else if (shape === 'Circle') { ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.lineWidth = s * 0.16; ctx.lineCap = 'butt'; ctx.moveTo(cx, cy - s * 0.45); ctx.lineTo(cx, cy + s * 0.45); ctx.moveTo(cx - s * 0.45, cy); ctx.lineTo(cx + s * 0.45, cy); ctx.stroke(); }
      ctx.restore();
    }
    function pfDrawMaze(ctx, mz, cx, cy, R0, now) {
      const R = [0.95, 0.71, 0.47, 0.26].map(k => k / 0.95 * R0);
      const mid = [(R[0] + R[1]) / 2, (R[1] + R[2]) / 2, (R[2] + R[3]) / 2];
      const P = (r, deg) => [cx + r * Math.sin(deg * Math.PI / 180), cy - r * Math.cos(deg * Math.PI / 180)];
      ctx.save();
      ctx.fillStyle = '#2b3446'; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f3f5f7'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.stroke();
      for (let b = 0; b < 3; b++) for (let s = 0; s < 12; s++) {
        if (mz.gaps[b].includes(s)) continue;
        ctx.beginPath(); ctx.arc(cx, cy, R[b + 1], (s * 30 - 15 - 90) * Math.PI / 180, (s * 30 + 15 - 90) * Math.PI / 180); ctx.stroke();
      }
      for (let i = 0; i < 3; i++) for (const b of mz.walls[i]) {
        const a = b * 30 + 15; const [x1, y1] = P(R[i + 1], a), [x2, y2] = P(R[i], a);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.fillStyle = '#07090d'; ctx.beginPath(); ctx.arc(cx, cy, R[3] * 0.42, 0, Math.PI * 2); ctx.fill();
      const pulse = 0.6 + 0.4 * Math.sin(now / 260);
      mz.traps.forEach(([ring, s]) => {
        const [x, y] = P(mid[ring], s * 30);
        ctx.fillStyle = `rgba(225, 29, 72, ${0.35 * pulse})`; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
      });
      const [bx, by] = P(mid[0], mz.start * 30);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.font = '600 17px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let s = 0; s < 12; s++) { const [x, y] = P(R0 + 22, s * 30); ctx.fillText(String(s === 0 ? 12 : s), x, y); }
      ctx.restore();
    }
    const PF_PULSE = { S: 300, L: 900, gap: 350, rest: 2000 };
    function pfPulseOn(now) {
      const pat = pf.round.resonator.pattern.split('');
      const total = pat.reduce((a, c) => a + PF_PULSE[c] + PF_PULSE.gap, 0) + PF_PULSE.rest;
      let t = now % total;
      for (const c of pat) { if (t < PF_PULSE[c]) return true; t -= PF_PULSE[c]; if (t < PF_PULSE.gap) return false; t -= PF_PULSE.gap; }
      return false;
    }

    // ---- the Center Stage card for one node ----
    function pfDrawCard(sc) {
      if (!PF_SCREENS) return;
      const cfg = cardConfigs.find(c => c.id === sc.orbId) || cardConfigs[0];
      const node = cfg.node, r = pf.round, now = performance.now();
      const solved = pfNodeSolved(node);
      const isCenter = sc.bayIdx === 2;
      const engaged = pf.engaged === node && isCenter;
      const line = pfRoomLine();
      let dyn = '';
      if (node === 'conduits') dyn = `${[...pf.cut].join(',')}/${[...pf.wrongCut].join(',')}/${r.conduits.strands.some(s => s.flicker) ? Math.floor(now / 140) % 2 : 0}`;
      else if (node === 'resonator') dyn = pfPulseOn(now) ? 1 : 0;
      else if (node === 'echo') dyn = `${pf.echoStage}|${pf.echoAttempt}`;
      else if (node === 'descent') dyn = Math.floor(now / 130) % 12;
      else if (node === 'vent') { const v = pfVent(); dyn = v ? `${v.index}|${Math.ceil((v.endsAt - (Date.now() + Net.offset)) / 1000)}` : 'dormant'; }
      else if (node === 'glyph') dyn = pf.live.glyph ? pf.live.glyph.step : 0;
      const sig = `${sc.orbId}|${sc.bayIdx}|${sc.isHovered ? 1 : 0}|${sc.isGrabbed ? 1 : 0}|${solved ? 1 : 0}|${engaged ? 1 : 0}|${engaged ? pf.cursor : -1}|${dyn}|${line}|${pf.code}`;
      if (sc.lastDrawSig === sig) return;
      sc.lastDrawSig = sig;
      const ctx = sc.ctx, W = 1024, H = 680;
      const bay = screenBays[sc.bayIdx] || screenBays[2];
      const ink = '#0f172a', mute = '#64748b', accent = cfg.accent, ok = '#16a34a';
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = sc.isGrabbed ? 'rgba(255,255,255,0.97)' : 'rgba(248,250,252,0.94)';
      ctx.fillRect(16, 16, W - 32, H - 32);
      ctx.strokeStyle = engaged ? accent : (sc.isHovered ? accent : ink);
      ctx.lineWidth = engaged ? 8 : (sc.isHovered ? 6 : 3);
      ctx.strokeRect(16, 16, W - 32, H - 32);
      ctx.fillStyle = solved ? ok : (engaged ? accent : ink);
      ctx.fillRect(16, 16, W - 32, 14);
      // header
      ctx.textBaseline = 'alphabetic';
      ctx.font = '600 19px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = mute;
      ctx.fillText(`${bay.name}  //  ORB ${cfg.title}`, 48, 70);
      ctx.textAlign = 'right'; ctx.fillStyle = ink;
      ctx.fillText(PF_SOON[node] ? 'SEAL WORD  //  NONE' : `SEAL WORD  //  ${r.nodeSeal[node].toUpperCase()}`, W - 48, 70);
      ctx.strokeStyle = 'rgba(15,23,42,0.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(48, 90); ctx.lineTo(W - 48, 90); ctx.stroke();
      // title + status pill
      ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.font = '200 62px "Inter", sans-serif';
      ctx.fillText(pfNodeName(node), 46, 160);
      const pill = PF_SOON[node] ? 'NEXT BUILD' : solved ? 'OPEN' : (node === 'vent' ? (pfVent() ? 'ALARM' : 'INTERRUPT') : 'SEALED');
      ctx.font = '600 18px "JetBrains Mono", monospace';
      const pw = ctx.measureText(pill).width + 32;
      ctx.strokeStyle = solved ? ok : ink; ctx.lineWidth = 2; ctx.strokeRect(W - 48 - pw, 124, pw, 40);
      ctx.fillStyle = solved ? ok : ink; ctx.textAlign = 'center'; ctx.fillText(pill, W - 48 - pw / 2, 151);
      ctx.textAlign = 'left'; ctx.fillStyle = accent; ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillText(NODE_HINTS[node] || 'NOT INSTALLED  //  ARRIVES IN A LATER BUILD', 48, 198);
      // diagram frame
      const DX = 40, DY = 220, DW = 600, DH = 384;
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.strokeRect(DX, DY, DW, DH);
      pfDrawNode(ctx, node, DX, DY, DW, DH, engaged, now, solved);
      // hull telemetry block
      const HX = 664, HW = 320;
      ctx.fillStyle = ink; ctx.fillRect(HX, DY, HW, 250);
      ctx.fillStyle = '#ffffff'; ctx.font = '600 18px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText('HULL TELEMETRY', HX + 24, DY + 38);
      ctx.fillStyle = '#94a3b8'; ctx.font = '500 14px "JetBrains Mono", monospace';
      ctx.fillText('CASE NUMBER', HX + 24, DY + 76);
      ctx.fillStyle = '#ffffff'; ctx.font = '600 30px "JetBrains Mono", monospace';
      ctx.fillText(r.caseNumber.toUpperCase(), HX + 24, DY + 112);
      ctx.fillStyle = '#94a3b8'; ctx.font = '500 14px "JetBrains Mono", monospace';
      ctx.fillText('POWER CELLS', HX + 24, DY + 152);
      ctx.fillText('SIGIL', HX + 214, DY + 152);
      r.cellStates.forEach((on, i) => {
        const x = HX + 24 + i * 40, y = DY + 166;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, 26, 56, 8); else ctx.rect(x, y, 26, 56);
        if (on) { ctx.fillStyle = '#22c55e'; ctx.fill(); } else { ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.stroke(); }
      });
      pfDrawSigil(ctx, r.sigil, HX + 252, DY + 196, 66, '#ffffff');
      // room status strip
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(HX, DY + 266, HW, DH - 266);
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(HX, DY + 266, HW, DH - 266);
      const parts = line.split('  //  ');
      ctx.fillStyle = mute; ctx.font = '500 14px "JetBrains Mono", monospace'; ctx.fillText('ROOM LINK', HX + 24, DY + 296);
      ctx.fillStyle = ink; ctx.font = '600 24px "JetBrains Mono", monospace'; ctx.fillText(parts[0] || '', HX + 24, DY + 332);
      ctx.fillStyle = mute; ctx.font = '500 15px "JetBrains Mono", monospace'; ctx.fillText((parts[1] || '').slice(0, 30), HX + 24, DY + 360);
      // controls footer
      let foot;
      if (PF_SOON[node]) foot = 'NOTHING TO READ HERE YET';
      else if (!isCenter) foot = 'PINNED  //  [1] ON ITS ORB TO BRING IT TO CENTER STAGE';
      else if (engaged) foot = 'ENGAGED  //  SWIPE TO CHOOSE  ·  [1] ACT  ·  [2] RELEASE';
      else if (INTERACTIVE_NODES.includes(node) && !solved) foot = '[1] AGAIN TO ENGAGE THIS NODE';
      else foot = 'READ-ONLY  //  DESCRIBE IT TO THE FLIGHT DIRECTOR';
      ctx.fillStyle = engaged ? accent : mute; ctx.font = '600 17px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText(foot, 48, 644);
      sc.texture.needsUpdate = true;
    }
    function pfDrawNode(ctx, node, X, Y, W, H, engaged, now, solved) {
      const r = pf.round, ink = '#0f172a', mute = '#64748b', cx = X + W / 2, cy = Y + H / 2;
      ctx.save(); ctx.textBaseline = 'alphabetic';
      if (node === 'conduits') {
        const n = r.conduits.strands.length, phase = Math.floor(now / 140) % 2;
        r.conduits.strands.forEach((s, i) => {
          const x = X + W * (i + 0.5) / n, top = Y + 52, y1 = Y + 82, y2 = Y + H - 70, num = i + 1;
          const isCut = pf.cut.has(num), isWrong = pf.wrongCut.has(num);
          ctx.lineCap = 'round';
          if (isCut || isWrong) {
            ctx.strokeStyle = isWrong ? '#e11d48' : '#94a3b8'; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, (y1 + y2) / 2 - 18); ctx.moveTo(x, (y1 + y2) / 2 + 18); ctx.lineTo(x, y2); ctx.stroke();
          } else {
            ctx.strokeStyle = s.flicker && phase ? 'rgba(15,23,42,0.16)' : ink; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(x, top, 16, 0, Math.PI * 2);
          if (s.dot) { ctx.fillStyle = ink; ctx.fill(); } else { ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke(); }
          ctx.fillStyle = isWrong ? '#e11d48' : mute; ctx.font = '600 24px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
          ctx.fillText(isCut || isWrong ? 'CUT' : String(num), x, Y + H - 26);
          if (engaged && pf.cursor === i) { ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 5; ctx.strokeRect(x - 36, Y + 22, 72, H - 36); }
        });
      } else if (node === 'resonator') {
        const on = pfPulseOn(now);
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
        for (const rr of [150, 170]) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(cx, cy, 118, 0, Math.PI * 2);
        if (on) { ctx.fillStyle = ink; ctx.fill(); } else { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6; ctx.stroke(); }
        ctx.fillStyle = on ? '#ffffff' : mute; ctx.font = '600 18px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(on ? 'PULSE' : 'CORE', cx, cy + 6);
        ctx.fillStyle = mute; ctx.font = '500 15px "JetBrains Mono", monospace';
        ctx.fillText('WAIT FOR THE LONG DARK GAP, THEN WATCH ONE LOOP', cx, Y + H - 16);
      } else if (node === 'glyph') {
        r.glyph.glyphs.forEach((g, i) => {
          const bx = X + 20 + (i % 2) * 290, by = Y + 18 + Math.floor(i / 2) * 182;
          ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 270, 166);
          const k = r.glyph.answer.indexOf(g), step = solved ? 4 : (pf.live.glyph ? pf.live.glyph.step : 0), entered = k >= 0 && k < step;
          drawGlyph(ctx, g, bx + 70, by + 18, 130, entered ? '#16a34a' : ink);
          if (entered) { ctx.fillStyle = '#16a34a'; ctx.font = '600 22px "JetBrains Mono", monospace'; ctx.textAlign = 'right'; ctx.fillText('#' + (k + 1), bx + 256, by + 32); }
          ctx.fillStyle = mute; ctx.font = '600 22px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
          ctx.fillText(String(i + 1), bx + 14, by + 32);
        });
      } else if (node === 'descent') {
        pfDrawMaze(ctx, r.descent, cx - 40, cy + 6, 160, now);
        ctx.fillStyle = mute; ctx.font = '500 14px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
        ctx.fillText('RED  //  TRAPDOOR', X + W - 168, Y + 40);
        ctx.fillText('BALL //  START', X + W - 168, Y + 66);
        ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.arc(X + W - 184, Y + 35, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X + W - 184, Y + 61, 7, 0, Math.PI * 2); ctx.stroke();
      } else if (node === 'echo') {
        const st = Math.min(4, pf.echoStage), S = pf.echoStages[st - 1];
        for (let i = 0; i < 4; i++) {
          const x = X + 44 + i * 44, y = Y + 40;
          ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2);
          if (solved || i + 1 < pf.echoStage) { ctx.fillStyle = '#16a34a'; ctx.fill(); }
          else { ctx.strokeStyle = i + 1 === pf.echoStage ? ink : '#cbd5e1'; ctx.lineWidth = i + 1 === pf.echoStage ? 5 : 3; ctx.stroke(); }
        }
        ctx.fillStyle = ink; ctx.font = '600 20px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
        ctx.fillText(solved ? 'ALL STAGES CLEARED' : `STAGE ${st} OF 4`, X + 226, Y + 47);
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.strokeRect(X + 24, Y + 90, 200, 220);
        pfDrawShape(ctx, S.shape, X + 124, Y + 196, 130, solved ? '#16a34a' : ink);
        S.labels.forEach((lab, i) => {
          const px = X + 258 + i * 84, py = Y + 120;
          ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px, py, 70, 160, 10); else ctx.rect(px, py, 70, 160);
          ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = ink; ctx.font = '300 58px "Inter", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(lab), px + 35, py + 102);
          ctx.fillStyle = mute; ctx.font = '500 13px "JetBrains Mono", monospace'; ctx.fillText(`POS ${i + 1}`, px + 35, py + 196);
          if (engaged && pf.cursor === i) { ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 6; ctx.strokeRect(px - 8, py - 8, 86, 176); }
        });
      } else if (node === 'vent') {
        const v = pfVent(); const levels = v ? ventGaugesFor(pf.code, v.index) : [0, 0, 0];
        ['LEFT', 'CENTRE', 'RIGHT'].forEach((lab, i) => {
          const gx = X + 110 + i * 170, gy = Y + 50;
          ctx.strokeStyle = v ? '#b45309' : '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(gx, gy, 80, 250, 12); else ctx.rect(gx, gy, 80, 250); ctx.stroke();
          for (let k = 0; k < levels[i]; k++) { ctx.fillStyle = '#f59e0b'; ctx.fillRect(gx + 10, gy + 250 - 10 - (k + 1) * 46 + 6, 60, 40); }
          ctx.fillStyle = mute; ctx.font = '600 16px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(lab, gx + 40, gy + 284);
          if (v) { ctx.fillStyle = ink; ctx.font = '600 26px "JetBrains Mono", monospace'; ctx.fillText(String(levels[i]), gx + 40, gy - 12); }
        });
        ctx.fillStyle = v ? '#b45309' : ink; ctx.font = '600 18px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(v ? `ALARM ${v.index}  //  READ THE THREE LEVELS  //  0:${String(Math.max(0, Math.ceil((v.endsAt - (Date.now() + Net.offset)) / 1000))).padStart(2, '0')}` : 'DORMANT  //  NO ALARM', cx, Y + H - 14);
      } else {
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.strokeRect(X + 60, Y + 60, W - 120, H - 120); ctx.setLineDash([]);
        ctx.fillStyle = mute; ctx.font = '600 20px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText('THIS NODE IS NOT INSTALLED YET', cx, cy + 6);
      }
      ctx.restore();
    }

    // ---- room link (same protocol as the phones and the Flight Director) ----
    const Net = {
      ws: null, round: null, role: 'pathfinder', online: false, everOnline: false, failed: false, state: null, offset: 0, retry: 0, timer: null,
      deviceId: (() => { let v = store.get('aether-device'); if (!v) { v = Math.random().toString(36).slice(2, 12); store.set('aether-device', v); } return v; })(),
      connect(round) { this.close(); this.round = round; this.retry = 0; this.failed = false; this.everOnline = false; this.open(); },
      open() {
        this.timer = null;
        if (!/^https?:$/.test(location.protocol)) { this.failed = true; pfLinkUi(); return; }
        let ws;
        try { ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/room/${String(this.round).padStart(4, '0')}/ws?role=pathfinder&id=${this.deviceId}`); }
        catch (e) { this.failed = true; pfLinkUi(); return; }
        this.ws = ws;
        ws.onopen = () => { this.everOnline = true; this.failed = false; this.retry = 0; this.online = true; this.send({ type: 'hello' }); pushLog(`[LINK] joined room ${String(this.round).padStart(4, '0')}`); pfLinkUi(); };
        ws.onmessage = e => {
          let m; try { m = JSON.parse(e.data); } catch (err) { return; }
          if (m.type === 'state') { this.offset = m.state.serverNow - Date.now(); this.state = m.state; pfOnRoomState(m.state); }
          else if (m.type === 'live' && m.node) pf.live[m.node] = Object.assign({ at: performance.now() }, m.data || {});
        };
        ws.onclose = () => {
          if (this.ws !== ws) return;
          this.ws = null; this.online = false;
          if (!this.everOnline) { this.failed = true; pfLinkUi(); return; }
          pushLog('[LINK] connection dropped // retrying'); pfLinkUi();
          if (this.round !== null) this.timer = setTimeout(() => this.open(), Math.min(8000, 700 * 2 ** this.retry++));
        };
      },
      close() { clearTimeout(this.timer); this.timer = null; const ws = this.ws; this.ws = null; this.state = null; this.online = false; if (ws) { try { ws.close(); } catch (e) {} } },
      send(m) { if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(m)); return true; } return false; },
      remaining() { const s = this.state; if (!s) return 0; if (s.phase !== 'live') return s.remainingAtMark; return Math.max(0, s.remainingAtMark - (Date.now() + this.offset - s.markAt) * s.rate); }
    };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Net.round !== null && !Net.ws && Net.everOnline) { clearTimeout(Net.timer); Net.open(); } });
    function pfOnRoomState(st) {
      if (pf.epoch === null) pf.epoch = st.epoch;
      else if (st.epoch !== pf.epoch) { pf.epoch = st.epoch; pfResetProgress(); pushLog('[RUN] flight director reset the round'); showToast('round reset by the flight director'); }
      if (st.strikes > (pf.lastStrikes ?? st.strikes)) pushLog(`[STRIKE] crew strikes now ${st.strikes}/3`);
      if (pf.lastPhase && pf.lastPhase !== st.phase) {
        if (st.phase === 'live') { pushLog('[RUN] round started'); showToast('round started // mission clock running'); }
        if (st.phase === 'won') { pf.engaged = null; redrawCockpitZoneHeaders('CORE BREACHED // ROUND WON', '#22c55e'); showToast('core breached // the monolith is yours'); synth.playExplodeChord(true); }
        if (st.phase === 'lost') { pf.engaged = null; redrawCockpitZoneHeaders(`LINK LOST // ${String(st.outcome).toUpperCase()}`, '#e11d48'); showToast(`link lost // ${String(st.outcome).toLowerCase()}`); }
      }
      const ventOn = !!(st.vent && st.vent.active && st.phase === 'live');
      if (ventOn && !pf.ventOn) {
        pushLog(`[ALARM] pressure vent ${st.vent.index} // read the three gauges`);
        showToast('pressure vent alarm // open orb 06 and read the gauges');
        redrawCockpitZoneHeaders('PRESSURE VENT ALARM // ORB 06', '#f59e0b');
        synth.playExplodeChord(false);
      } else if (!ventOn && pf.ventOn) pushLog('[ALARM] pressure vent asleep');
      if (ventOn !== pf.ventOn) { pf.ventOn = ventOn; pfDirtyAll(); }
      pf.lastStrikes = st.strikes; pf.lastPhase = st.phase;
      pfLinkUi();
    }
    function pfLinkUi() {
      const stateEl = document.getElementById('pf-link-state');
      if (stateEl) {
        stateEl.textContent = Net.online ? 'LINKED' : (Net.failed ? 'OFFLINE' : (Net.round !== null ? 'LINKING' : 'NO ROOM'));
        stateEl.className = 'ml-auto font-semibold ' + (Net.online ? 'text-emerald-600' : (Net.failed ? 'text-rose-600' : 'text-slate-500'));
      }
    }
    function pfJoin(code) {
      if (!validRound(String(code))) { showToast('enter a 4-digit round number'); return; }
      store.set('aether-round', String(code));
      pfLoadRound(Number(code));
      document.getElementById('pf-round').value = String(code);
      Net.connect(Number(code));
      pfLinkUi();
    }
    function pfFrame(now) {
      const dt = Math.min(0.05, Math.max(0, (now - (pf.lastFrame || now)) / 1000)); pf.lastFrame = now;
      pfStageFrame(now, dt);
      pfMiniFrame(now, dt);
      if (PF_SCREENS) backScreenCards.forEach(sc => pfDrawCard(sc));
      else {
        screenWallGroup.visible = false;
        // the arch header only labels the calibration tutorial now
        archHeaderMesh.visible = tutorialState.active || transitionState.phase !== 'NONE';
      }
      // the swipe rail is a calibration aid: it steps aside once the puzzles are up
      swipeCorridorGroup.visible = tutorialState.active || transitionState.phase !== 'NONE';
      const clockEl = document.getElementById('pf-clock'), strikesEl = document.getElementById('pf-strikes');
      const st = Net.state;
      const clock = pfLinked() ? (st.phase === 'live' ? fmtClock(Net.remaining()) : st.phase.toUpperCase()) : '--:--';
      const strikes = pfLinked() ? st.strikes : pf.strikes;
      const sig = `${clock}|${strikes}`;
      if (sig !== pf.lastDomSig) { pf.lastDomSig = sig; if (clockEl) clockEl.textContent = clock; if (strikesEl) strikesEl.textContent = `STRIKES ${strikes}/3`; }
    }
