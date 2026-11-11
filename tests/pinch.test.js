// Pathfinder metric pinch detection and calibration, with synthetic hands.
// Run: node tests/pinch.test.js
// Unit test for the metric pinch + calibration logic, with synthetic hands.
const fs=require('fs'); global.localStorage={_s:{},getItem(k){return this._s[k]||null},setItem(k,v){this._s[k]=v}};
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','tools','pathfinder','pf_pinch.js'),'utf8');
const L=new Function(src+';return {PINCH_CAL,pfCal,pfMetricPinch,pfMetricRatio,pfCalStepStart,pfCalStepDone,pfRecomputePinch};')();
const hand={}; let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} };
// world landmarks with thumb tip (4) at origin and index tip (8), middle tip (12) at given distances
const wl=(d8,d12,noise=0)=>{const a=Array.from({length:21},()=>({x:0.05,y:0.05,z:0}));a[4]={x:0,y:0,z:0};a[8]={x:d8+(Math.random()-.5)*noise,y:0,z:0};a[12]={x:0,y:d12+(Math.random()-.5)*noise,z:0};return a;};
// 1. defaults: a relaxed half-open hand (6 cm) never taps; a real pinch (1.2 cm) taps only after 2 frames
for(let i=0;i<50;i++) L.pfMetricPinch(hand, wl(0.06,0.07,0.01), null);
ok(hand.pinchStreak[1]===0,'relaxed hand should not build a streak');
L.pfMetricPinch(hand, wl(0.012,0.07), null); ok(hand.pinchStreak[1]===1,'first pinched frame -> streak 1 (not yet a tap)');
L.pfMetricPinch(hand, wl(0.012,0.07), null); ok(hand.pinchStreak[1]===2,'second pinched frame -> tap');
// 2. hysteresis: hovering between engage and release does not count as a release
ok(0.032 > L.PINCH_CAL.engage[1] && 0.032 < L.PINCH_CAL.release[1], '3.2 cm sits inside the hysteresis band');
// 3. ratio scale matches the rig: exactly 0.92 at the engage distance
L.pfMetricPinch(hand, wl(L.PINCH_CAL.engage[1],0.07), null); ok(Math.abs(L.pfMetricRatio(hand,1,0.92)-0.92)<1e-9,'ratio is 0.92 at engage distance');
// 4. calibration from a player with an open hand of 10 cm (index) / 12 cm (middle), pinching to 1.0 / 1.6 cm
L.pfCalStepStart(1); for(let i=0;i<60;i++) L.pfMetricPinch(hand, wl(0.10,0.12,0.004), {active:true,stepIndex:1,fingersOpen:true}); L.pfCalStepDone(1);
L.pfCalStepStart(2); [0.08,0.05,0.02,0.010,0.011,0.03].forEach(v=>L.pfMetricPinch(hand, wl(v,0.12), {active:true,stepIndex:2})); L.pfCalStepDone(2);
L.pfCalStepStart(3); [0.10,0.06,0.016,0.018,0.05].forEach(v=>L.pfMetricPinch(hand, wl(0.10,v), {active:true,stepIndex:3})); const logs=[]; L.pfCalStepDone(3, m=>logs.push(m));
const c=L.PINCH_CAL; const cm=v=>+(v*100).toFixed(2);
console.log('open', cm(c.open[1]), cm(c.open[2]), '| closed', cm(c.closed[1]), cm(c.closed[2]), '| engage', cm(c.engage[1]), cm(c.engage[2]), '| release', cm(c.release[1]), cm(c.release[2]));
ok(Math.abs(c.engage[1]-(0.010+0.25*(c.open[1]-0.010)))<1e-9,'engage formula (index)');
ok(c.release[1]>=c.engage[1]+0.012,'release at least 1.2 cm above engage');
ok(localStorage.getItem('aether-pinch-cal')!==null,'calibration saved');
ok(logs.length===2,'calibration logged');
// 5. extreme readings are clamped
L.PINCH_CAL.open=[0,0.30,0.30]; L.PINCH_CAL.closed=[0,0.001,0.001]; L.pfRecomputePinch(); ok(L.PINCH_CAL.engage[1]===0.035,'engage capped at 3.5 cm');
L.PINCH_CAL.open=[0,0.02,0.02]; L.PINCH_CAL.closed=[0,0.004,0.004]; L.pfRecomputePinch(); ok(L.PINCH_CAL.engage[1]===0.016,'engage floored at 1.6 cm');
console.log(logs.join('\n')); console.log('failures:',fails);
