import {BLEND} from '../brain.js';import {run} from '../tests/engine.mjs';
let best=null;for(const wl of[0.5,0.7,0.9,1.1])for(const s0 of[0.15,0.25,0.35])for(const th of[0.25,0.3,0.36,0.42])for(const ws of[0.8,1.2]){Object.assign(BLEND,{wl,s0,th,ws});let t=0;for(const s of process.argv.slice(2))t+=(await run(s,false)).hb;if(!best||t>best[0])best=[t,{wl,s0,th,ws}];}
console.log(best);
