"""Builds public/pathfinder.html: the original cockpit prototype plus the Project Aether layers
(content, metric pinch + calibration, puzzle stage). Run from anywhere: python3 tools/pathfinder/build.py
Never hand-edit public/pathfinder.html; change the prototype or the layer files and rebuild."""
import re
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
src = open(HERE / 'prototype.html').read()
app = open(ROOT / 'public' / 'index.html').read()
logic = app.split('/*LOGIC-START*/')[1].split('/*LOGIC-END*/')[0]
gs = app.index('const GLYPH_SVG = {'); ge = app.index('};', gs) + 2
glyph_svg = app[gs:ge]
ds = app.index('// Draws one lexicon glyph'); de = app.index('\n}\n', ds) + 3
draw_glyph = app[ds:de]
block = (open(HERE / 'pf_block.js').read() + open(HERE / 'pf_pinch.js').read() + open(HERE / 'pf_stage.js').read()).replace('/*@@LOGIC@@*/', '/*LOGIC-START*/' + logic + '/*LOGIC-END*/').replace('/*@@GLYPHS@@*/', glyph_svg + '\n' + draw_glyph)
s = src
def rep(a, b, count=1):
    global s
    n = s.count(a)
    assert n == count, (n, a[:90])
    s = s.replace(a, b)
rep('<title>AETHER // SPATIAL ARCHITECTURAL STUDIO</title>', '<title>Project Aether // Pathfinder</title>')
# room link panel at the top of the sensor box
rep('''    <!-- Collapsible Body Content -->
    <div id="cam-hud-body" class="flex flex-col gap-2.5">''', '''    <!-- Project Aether room link -->
    <div id="pf-link-panel" class="flex flex-col gap-1.5 pb-2 border-b border-slate-200/90 font-mono text-[10px]">
      <div class="flex items-center gap-2">
        <span class="text-slate-400">ROUND</span>
        <input id="pf-round" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="0000" class="w-[64px] px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-900 font-semibold tracking-widest" />
        <button id="pf-join" type="button" class="px-2 py-0.5 rounded bg-slate-900 text-white font-semibold text-[9px] cursor-pointer">JOIN</button>
        <span id="pf-link-state" class="ml-auto font-semibold text-slate-500">NO ROOM</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-slate-400">PATHFINDER // MISSION</span>
        <span><span id="pf-clock" class="text-slate-900 font-semibold text-[13px] tracking-wider">--:--</span>
        <span id="pf-strikes" class="ml-2 text-slate-500">STRIKES 0/3</span></span>
      </div>
    </div>

    <!-- Collapsible Body Content -->
    <div id="cam-hud-body" class="flex flex-col gap-2.5">''')
# content layer goes right after the logging helpers
rep('    class SpatialHapticSynth {', block + '\n    class SpatialHapticSynth {')
# the six orbs become the six nodes (internal ids kept so the core shapes still map)
a = s.index('    const cardConfigs = ['); b = s.index('];', a) + 2
s = s[:a] + '''    const cardConfigs = [
      { id: 'books',   node: 'conduits',  title: '01', subtitle: 'THE CONDUITS',      metric: 'ASTROPHYSICIST NODE', icon: 'books',  baseAngle: 0 * ORB_STEP_ANGLE, accent: '#22c55e' },
      { id: 'photos',  node: 'resonator', title: '02', subtitle: 'THE RESONATOR',     metric: 'ASTROPHYSICIST NODE', icon: 'photos', baseAngle: 1 * ORB_STEP_ANGLE, accent: '#0ea5e9' },
      { id: 'music',   node: 'glyph',     title: '03', subtitle: 'THE GLYPH LOCK',    metric: 'XENOLINGUIST NODE',   icon: 'music',  baseAngle: 2 * ORB_STEP_ANGLE, accent: '#f59e0b' },
      { id: 'home',    node: 'descent',   title: '04', subtitle: 'THE DESCENT',       metric: 'XENOLINGUIST NODE',   icon: 'home',   baseAngle: 3 * ORB_STEP_ANGLE, accent: '#ec4899' },
      { id: 'core',    node: 'echo',      title: '05', subtitle: 'THE ECHO CHAMBER',  metric: 'XENOLINGUIST NODE',   icon: 'core',   baseAngle: 4 * ORB_STEP_ANGLE, accent: '#8b5cf6' },
      { id: 'archive', node: 'vent',      title: '06', subtitle: 'THE PRESSURE VENT', metric: 'INTERRUPT NODE',      icon: 'books',  baseAngle: 5 * ORB_STEP_ANGLE, accent: '#10b981' },
      { id: 'starmap', node: 'starmap',   title: '07', subtitle: 'THE STAR MAP',      metric: 'NEXT BUILD',          icon: 'core',   baseAngle: 6 * ORB_STEP_ANGLE, accent: '#64748b' },
      { id: 'dice',    node: 'dice',      title: '08', subtitle: 'THE DICE VAULT',    metric: 'NEXT BUILD',          icon: 'core',   baseAngle: 7 * ORB_STEP_ANGLE, accent: '#64748b' }
    ];''' + s[b:]
rep('    const ORB_STEP_ANGLE = (Math.PI * 2) / 6;', '    const ORB_STEP_ANGLE = (Math.PI * 2) / 8;')
rep('          if (frontCard && minAngleDist < 0.48) {', '          if (frontCard && minAngleDist < 0.36) {')
rep('''      const cardObj = {
        id: cfg.id,''', '''      const cardObj = {
        id: cfg.id,
        node: cfg.node,''')
# orb discs show when a node is open
rep("      const cardSig = `${stateMode}|${hasPinnedScreen ? 1 : 0}`;", "      const nodeOpen = pfNodeSolved(card.node);\n      const nodeAlarm = card.node === 'vent' && !!pfVent();\n      const cardSig = `${stateMode}|${hasPinnedScreen ? 1 : 0}|${nodeOpen ? 1 : 0}|${nodeAlarm ? 1 : 0}`;")
rep('''      ctx.textBaseline = 'alphabetic';
      card.texture.needsUpdate = true;
    }''', '''      if (nodeAlarm) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 16;
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(cx - 62, cy + radius - 30, 124, 34);
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ALARM', cx, cy + radius - 13);
      }
      if (nodeOpen) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(cx - 52, cy + radius - 30, 104, 34);
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OPEN', cx, cy + radius - 13);
      }
      ctx.textBaseline = 'alphabetic';
      card.texture.needsUpdate = true;
    }''')
# Center Stage cards draw node content (fills the full 1024 x 680 design space)
a = s.index('    function drawBackScreenCardCanvas(screenCard) {'); b = s.index('    function createBackScreenCard(', a)
s = s[:a] + '''    function drawBackScreenCardCanvas(screenCard) {
      pfDrawCard(screenCard);
    }

''' + s[b:]
# one physical tap = one action (the [1]/[2] keys also drive the simulated hand, which used to fire a second time)
rep('''    function triggerFingerChordAction(slot, hoveredCard = null) {
      synth.init();''', '''    function triggerFingerChordAction(slot, hoveredCard = null) {
      const tapNow = performance.now();
      if (pf.lastTap && pf.lastTap.slot === slot && tapNow - pf.lastTap.t < 250) return;
      pf.lastTap = { slot, t: tapNow };
      synth.init();''')
# bay frames fade out behind a docked card so they never draw across its content
rep("""        b.frameMat.opacity = b.isCenter ? 0.42 : 0.24;
      });""", """        b.frameMat.opacity = backScreenCards.some(sc => sc.bayIdx === b.bayIdx) ? 0.05 : (b.isCenter ? 0.42 : 0.24);
      });""")
# sharper Center Stage cards (same 1024 x 680 design space, drawn at 1.25x)
rep("""      canvas.width = 768;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.scale(768 / 1024, 512 / 680);""", """      canvas.width = 1280;
      canvas.height = 850;
      const ctx = canvas.getContext('2d');
      ctx.scale(1280 / 1024, 850 / 680);""")
# ---- tracking accuracy: one hand, firmer confidence, metric taps with calibration ----
rep("              numHands: 2,", "              numHands: 1,", 2)
rep("              minHandDetectionConfidence: 0.35,", "              minHandDetectionConfidence: 0.6,", 2)
rep("              minHandPresenceConfidence: 0.35,", "              minHandPresenceConfidence: 0.6,", 2)
rep("              minTrackingConfidence: 0.35", "              minTrackingConfidence: 0.5", 2)
rep("""            if (useOneEuroFilter) {
              hand.filters[j].filterTo(rawX, rawY, rawZ, timestampMs, hand.joints[j]);
            } else {
              hand.joints[j].set(rawX, rawY, rawZ);
            }
          }""", """            if (useOneEuroFilter) {
              hand.filters[j].filterTo(rawX, rawY, rawZ, timestampMs, hand.joints[j]);
            } else {
              hand.joints[j].set(rawX, rawY, rawZ);
            }
          }
          // Taps are judged on real-world distances, once per new camera frame
          pfMetricPinch(hand, results.worldLandmarks && results.worldLandmarks[hIdx], {
            active: tutorialState.active,
            stepIndex: tutorialState.stepIndex,
            fingersOpen: hand.tipNodes.every(n => n.isFingerActive)
          });""")
rep("            ratio = Math.min(dist3D, dist2D * 1.15) * reachMult;",
    "            ratio = (webcamActive && hand.hasMetric) ? pfMetricRatio(hand, idx, TOLERANCE.FINGER_TAP_ENGAGE) : Math.min(dist3D, dist2D * 1.15) * reachMult;")
rep("""            const pReady = ratioPointer <= TOLERANCE.FINGER_TAP_ENGAGE && hand.fingerCooldowns[1] <= 0;
            const mReady = ratioMiddle <= TOLERANCE.FINGER_TAP_ENGAGE && hand.fingerCooldowns[2] <= 0;""",
"""            // With the camera on, a tap needs two camera frames in a row inside the engage distance
            const metricTaps = webcamActive && hand.hasMetric;
            const pReady = (metricTaps ? hand.pinchStreak[1] >= 2 : ratioPointer <= TOLERANCE.FINGER_TAP_ENGAGE) && hand.fingerCooldowns[1] <= 0;
            const mReady = (metricTaps ? hand.pinchStreak[2] >= 2 : ratioMiddle <= TOLERANCE.FINGER_TAP_ENGAGE) && hand.fingerCooldowns[2] <= 0;""")
rep("""          const activeRatio = hand.activePinchSlot === 1 ? ratioPointer : ratioMiddle;
          if (activeRatio > TOLERANCE.FINGER_TAP_RELEASE) {""", """          const activeRatio = hand.activePinchSlot === 1 ? ratioPointer : ratioMiddle;
          // Release needs a clearly wider gap than engage (hysteresis), so a held pinch never flickers
          const releasedNow = (webcamActive && hand.hasMetric)
            ? hand.pinchM[hand.activePinchSlot] > PINCH_CAL.release[hand.activePinchSlot]
            : activeRatio > TOLERANCE.FINGER_TAP_RELEASE;
          if (releasedNow) {""")
# calibration rides along with the existing tutorial steps
rep("""    function setTutorialStep(idx) {
      tutorialState.stepIndex = idx;""", """    function setTutorialStep(idx) {
      pfCalStepStart(idx);
      tutorialState.stepIndex = idx;""")
rep("""    function advanceTutorialStep() {
      if (transitionState.phase !== 'NONE') return;""", """    function advanceTutorialStep() {
      if (transitionState.phase !== 'NONE') return;
      if (webcamActive) pfCalStepDone(tutorialState.stepIndex, pushLog);""")
# ---- cockpit clean-up: no screens, fewer grid lines ----
rep("          screenWallGroup.visible = true;", "          screenWallGroup.visible = PF_SCREENS;")
rep("""    const floorPolarGrid = new THREE.PolarGridHelper(
      POLAR_OUTER_R,
      POLAR_SPOKES,
      POLAR_RINGS,
      64,
      0xcbd5e1,
      0xe2e8f0
    );""", """    const floorPolarGrid = new THREE.PolarGridHelper(
      POLAR_OUTER_R,
      8,
      4,
      64,
      0xe2e8f0,
      0xe8edf2
    );""")
rep("      new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.25 })\n    );\n    chamberWallWire.position.y = 8.5;",
    "      new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.05 })\n    );\n    chamberWallWire.position.y = 8.5;")
rep("          new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.22, side: THREE.DoubleSide })\n        );\n        louver.position.set(xOff, 14.5, 0);",
    "          new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.08, side: THREE.DoubleSide })\n        );\n        louver.position.set(xOff, 14.5, 0);")
rep("    const deckMidRing   = buildHorizontalCircleLine(DECK_MID_R, 96, 0x64748b, 0.42);", "    const deckMidRing   = buildHorizontalCircleLine(DECK_MID_R, 96, 0x64748b, 0.0);")
rep("    const deckOuterRing = buildHorizontalCircleLine(DECK_OUTER_R, 112, 0x94a3b8, 0.35);", "    const deckOuterRing = buildHorizontalCircleLine(DECK_OUTER_R, 112, 0x94a3b8, 0.18);")
rep("""      } else if (k === 'p') {
        pinActiveScreenToNextOpenBay();
      }""", """      }""")
# clicks: inside an engaged node [1] acts and [2] releases; [1] on the open node engages it
rep('''      if (slot === 1) {
        // ===================================================================
        // THUMB + POINTER TAP [1] = LEFT CLICK''', '''      if (pf.engaged) {
        if (slot === 1) pfAct(); else if (slot === 2) pfDisengage();
        return;
      }
      if (slot === 2 && !PF_SCREENS) { pfToggleZoom(); return; }

      if (slot === 1) {
        // ===================================================================
        // THUMB + POINTER TAP [1] = LEFT CLICK''')
rep('''        if (alreadyOnCenterStage) {
          // Left-clicking an already active Center Stage orb toggles 3D Core Inspect / Explode''', '''        if (alreadyOnCenterStage && pfTryEngage(targetCard)) {
          // Project Aether: interactive nodes engage instead of toggling the core
        } else if (alreadyOnCenterStage) {
          // Left-clicking an already active Center Stage orb toggles 3D Core Inspect / Explode''')
# swipe: moves the node cursor while engaged, otherwise turns the carousel
rep('''                const curIdx = Math.max(0, hudCards.findIndex(c => c.id === selectedCardId));
                const stepCount = isMultiSpin ? 2 : 1;
                const nextIdx = (curIdx - dir * stepCount + hudCards.length * 4) % hudCards.length;
                snapWheelToOrbIndex(nextIdx);
                synth.playReleaseThrow(isMultiSpin ? 2.4 : 1.5);

                const pctStr = Math.round(absWindowDx * 100);
                redrawCockpitZoneHeaders(
                  `SWIPE ${dir > 0 ? 'RIGHT' : 'LEFT'} (${pctStr}% ARC) // ORB 0${nextIdx + 1}`,
                  "#22c55e"
                );
                showToast(`swipe ${dir > 0 ? 'right' : 'left'} -> Orb 0${nextIdx + 1}`);''', '''                if (pf.engaged) {
                  pfMoveCursor(dir > 0 ? 1 : -1);
                  synth.playReleaseThrow(1.2);
                } else {
                  const curIdx = Math.max(0, hudCards.findIndex(c => c.id === selectedCardId));
                  const stepCount = isMultiSpin ? 2 : 1;
                  const nextIdx = (curIdx - dir * stepCount + hudCards.length * 4) % hudCards.length;
                  snapWheelToOrbIndex(nextIdx);
                  synth.playReleaseThrow(isMultiSpin ? 2.4 : 1.5);

                  const pctStr = Math.round(absWindowDx * 100);
                  redrawCockpitZoneHeaders(
                    `SWIPE ${dir > 0 ? 'RIGHT' : 'LEFT'} (${pctStr}% ARC) // ORB 0${nextIdx + 1}`,
                    "#22c55e"
                  );
                  showToast(`swipe ${dir > 0 ? 'right' : 'left'} -> Orb 0${nextIdx + 1}`);
                }''')
# wheel: steps the cursor while engaged
rep('''    window.addEventListener('wheel', (e) => {
      if (tutorialState.active) return;
      synth.init();''', '''    let pfWheelAcc = 0;
    window.addEventListener('wheel', (e) => {
      if (tutorialState.active) return;
      synth.init();
      if (pf.engaged) {
        pfWheelAcc += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
        if (Math.abs(pfWheelAcc) > 60) { pfMoveCursor(pfWheelAcc > 0 ? 1 : -1); pfWheelAcc = 0; }
        return;
      }''')
# the room panel must not trigger simulated pinches or the camera prompt
rep('''    window.addEventListener('pointerdown', () => {
      synth.init();
      mouseSim.isDown = true;
    });''', '''    window.addEventListener('pointerdown', (e) => {
      synth.init();
      if (e.target && e.target.closest && e.target.closest('#cam-hud-preview')) return;
      mouseSim.isDown = true;
    });''')
rep('''    window.addEventListener('click', () => {
      synth.init();''', '''    window.addEventListener('click', (e) => {
      synth.init();
      if (e.target && e.target.closest && e.target.closest('#cam-hud-preview')) return;''')
# keyboard: arrows move the cursor (or the carousel), Esc releases, S skips calibration
rep('''    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'c') {''', '''    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Enter') pfJoin(e.target.value.trim()); return; }
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'arrowright') {
        const d = k === 'arrowright' ? 1 : -1;
        if (pf.engaged) pfMoveCursor(d);
        else if (!tutorialState.active) {
          const curIdx = Math.max(0, hudCards.findIndex(c => c.id === selectedCardId));
          snapWheelToOrbIndex((curIdx + d + hudCards.length) % hudCards.length);
        }
        return;
      }
      if (k === 'escape') { pfDisengage(); return; }
      if (k === 's' && tutorialState.active) { tutorialState.stepIndex = Math.max(tutorialState.stepIndex, 3); startTutorialEndAndContentIntro(); return; }
      if (k === 'c') {''')
# per-frame content refresh
rep('''      processWebcamFrame(now);
      updateSpatialPhysics(dt, timeSec);''', '''      processWebcamFrame(now);
      updateSpatialPhysics(dt, timeSec);
      pfFrame(now);''')
# start: load the round from the link or the last one used on this device, and join its room
rep('''    // Initialize Tutorial Step 01 on startup with zero orbs visible
    setTutorialStep(0);''', '''    // Initialize Tutorial Step 01 on startup with zero orbs visible
    setTutorialStep(0);

    // Project Aether: round from ?round=, else the last round used on this device
    (function pfInit() {
      const fromLink = new URLSearchParams(location.search).get('round');
      const code = validRound(fromLink || '') ? fromLink : (validRound(store.get('aether-round') || '') ? store.get('aether-round') : null);
      document.getElementById('pf-join').addEventListener('click', () => pfJoin(document.getElementById('pf-round').value.trim()));
      document.getElementById('pf-round').addEventListener('input', (ev) => { ev.target.value = ev.target.value.replace(/\\D/g, '').slice(0, 4); });
      if (code) pfJoin(code); else { pfLoadRound(0); pfLinkUi(); }
      if (PINCH_CAL.at) pushLog('[CAL] saved pinch calibration loaded // [T] recalibrates');
      // read-only handle for debugging and automated tests
      window.__aether = { pf, Net, echoPress, get selectedOrb() { return selectedCardId; }, get carousel() { return carouselState; }, get phase() { return transitionState.phase; }, get orbCount() { return hudCards.length; } };
    })();''')
open(ROOT / 'public' / 'pathfinder.html', 'w').write(s)
print('built', len(s))
