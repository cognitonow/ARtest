// Shared game logic: 10,000 generated rounds must all be solvable and consistent.
// Run: node tests/logic.test.js
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
const src=html.split('/*LOGIC-START*/')[1].split('/*LOGIC-END*/')[0];
const L=new Function(src+';return {charge,glyphAnswer,echoPress,ventAnswer,makeRound,ballRoute,solveHomography,poseFromHomography,MARKER_SRC,PATTERNS};')();
let fails=0; const assert=(c,m)=>{if(!c){fails++;console.error('FAIL',m);}};
assert(L.charge('Violet',true,true)===6,'charge');
assert(L.glyphAnswer(['Hook','Comet','Ripple','Knot'],'Eye').join()==='Comet,Knot,Ripple,Hook','glyph');
for(let code=0;code<10000;code++){
  const r=L.makeRound(code); const d=r.descent;
  if(!d){fails++;continue;}
  const safe=L.ballRoute(d,d.start,d.traps); if(!safe) fails++;
  if(!L.ballRoute(d,d.start,[]).some(c=>c.join()===d.traps[0].join())) fails++;
  if(r.conduits.targets.length<1||r.conduits.targets.length>3) fails++;
}
console.log('10000 rounds, failures:',fails, '| round 4821 descent:', JSON.stringify(L.makeRound(4821).descent).slice(0,200));
