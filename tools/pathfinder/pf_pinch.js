
    /**************************************************************************
     * PROJECT AETHER // METRIC PINCH DETECTION + PER-PLAYER CALIBRATION
     * Taps are measured on MediaPipe world landmarks (real-world metres, the same
     * at any distance from the camera), with a separate engage and release distance
     * and two camera frames in a row before a tap counts.
     **************************************************************************/
    const PINCH_DEFAULTS = { engage: [0, 0.025, 0.028], release: [0, 0.040, 0.044] };
    const PINCH_CAL = (() => {
      const base = { engage: PINCH_DEFAULTS.engage.slice(), release: PINCH_DEFAULTS.release.slice(), open: [0, 0, 0], closed: [0, 0, 0], at: 0 };
      try {
        const saved = JSON.parse(localStorage.getItem('aether-pinch-cal') || 'null');
        if (saved && saved.engage && saved.release) Object.assign(base, saved);
      } catch (e) {}
      return base;
    })();
    const pfCal = { open: [[], [], []], min: [Infinity, Infinity, Infinity] };
    const pfMedian = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
    const pfClamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function pfRecomputePinch() {
      for (const s of [1, 2]) {
        const o = PINCH_CAL.open[s] || (s === 1 ? 0.095 : 0.11);
        const c = PINCH_CAL.closed[s] || 0.014;
        const engage = pfClamp(c + 0.25 * (o - c), 0.016, 0.035);
        PINCH_CAL.engage[s] = engage;
        PINCH_CAL.release[s] = Math.max(engage + 0.012, c + 0.50 * (o - c));
      }
    }
    // Called once per new camera frame for each tracked hand.
    function pfMetricPinch(hand, wl, tut) {
      if (!wl || wl.length < 13) { hand.hasMetric = false; return; }
      const d = (a, b) => Math.hypot(wl[a].x - wl[b].x, wl[a].y - wl[b].y, wl[a].z - wl[b].z);
      hand.pinchM = [0, d(4, 8), d(4, 12)];
      hand.hasMetric = true;
      if (!hand.pinchStreak) hand.pinchStreak = [0, 0, 0];
      for (const s of [1, 2]) hand.pinchStreak[s] = hand.pinchM[s] <= PINCH_CAL.engage[s] ? hand.pinchStreak[s] + 1 : 0;
      if (tut && tut.active) {
        if (tut.stepIndex === 1 && tut.fingersOpen) {
          for (const s of [1, 2]) { pfCal.open[s].push(hand.pinchM[s]); if (pfCal.open[s].length > 150) pfCal.open[s].shift(); }
        } else if (tut.stepIndex === 2) pfCal.min[1] = Math.min(pfCal.min[1], hand.pinchM[1]);
        else if (tut.stepIndex === 3) pfCal.min[2] = Math.min(pfCal.min[2], hand.pinchM[2]);
      }
    }
    // Same scale the rest of the rig expects: exactly FINGER_TAP_ENGAGE at the engage distance.
    function pfMetricRatio(hand, slot, tapEngage) { return (hand.pinchM[slot] / PINCH_CAL.engage[slot]) * tapEngage; }
    function pfCalStepStart(idx) {
      if (idx === 1) pfCal.open = [[], [], []];
      if (idx === 2) pfCal.min[1] = Infinity;
      if (idx === 3) pfCal.min[2] = Infinity;
    }
    function pfCalStepDone(idx, log) {
      if (idx === 1 && pfCal.open[1].length >= 10) {
        PINCH_CAL.open = [0, pfMedian(pfCal.open[1]), pfMedian(pfCal.open[2])];
        pfRecomputePinch();
      } else if ((idx === 2 || idx === 3) && isFinite(pfCal.min[idx - 1])) {
        const s = idx - 1;
        PINCH_CAL.closed[s] = pfClamp(pfCal.min[s], 0.004, 0.03);
        pfRecomputePinch();
        if (idx === 3) {
          PINCH_CAL.at = Date.now();
          try { localStorage.setItem('aether-pinch-cal', JSON.stringify(PINCH_CAL)); } catch (e) {}
          const cm = v => (v * 100).toFixed(1);
          if (log) {
            log(`[CAL] pointer tap ${cm(PINCH_CAL.engage[1])} cm // release ${cm(PINCH_CAL.release[1])} cm`);
            log(`[CAL] middle tap ${cm(PINCH_CAL.engage[2])} cm // release ${cm(PINCH_CAL.release[2])} cm`);
          }
        }
      }
    }
