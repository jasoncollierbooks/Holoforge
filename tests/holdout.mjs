// Held-out questions written after tuning; never used to adjust tags. Run: node tests/holdout.mjs
import fs from 'fs';import {search,calc,answer} from '../brain.js';
const dir=new URL('../kb/',import.meta.url).pathname;const ix=JSON.parse(fs.readFileSync(dir+'index.json'));const KB=Object.keys(ix.shards).flatMap(s=>JSON.parse(fs.readFileSync(dir+s+'.json')));
const Q=[["m5 tapdrill","m5"],["whats a 1/4-20 tap drill","1/4-20"],["how wide is a 4x4 really","4x4"],["14 awg wire thickness","awg 14"],["copper wire resistance per foot 18 gauge","awg 18"],["how thick is 20ga sheet","20 gauge"],
["modulus of elasticity steel","steel"],["brass density","brass"],["is nylon strong","nylon"],["concrete compressive strength","concrete"],["glulam beam properties","glulam"],["what is grade 12.9","12.9"],
["formula for moment of inertia of a rectangle","second moment"],["how do i find column buckling load","buckling"],["drag force formula","drag"],["water pressure per foot of depth","hydrostatic"],["heat loss through a wall","r-value|conduction"],
["ohm law power","ohm"],["voltage divider formula","divider"],["how long will my battery last","battery"],["rc time constant","rc"],["what is a good seer rating","seer"],["refrigerant r410a phase out","refrigerant"],
["how many bundles of shingles per square","roofing square"],["what is drip edge","flashing"],["how do i vent my attic","attic"],["whats semantic versioning","version"],["rest api methods","rest"],
["how to write good tests","test"],["what is a design patent","design patent"],["patent pending meaning","provisional"],["show it at a trade show before patent","disclosure"],["how does the cheaper button work","lighter, stronger"],
["change the material","material"],["how do i set the load","load"],["uv resistant print material","uv"],["best glue for wood","glue"],["drywall fire rated","drywall"],["is it safe to change an outlet","electrical safety"],
["torque m12 bolt","CALC"],["wire gauge for 40 amps 10 ft 24v","CALC"],["weight of a steel bar 1 x 2 x 36 inch","CALC"],["what's 2.5 inches in mm","CALC"],["board feet in a 2x12x16","CALC"],["gear ratio 20 tooth driving 60 tooth at 1800 rpm","CALC"]];
let hit=0;for(const[q,exp]of Q){let ok;if(exp=="CALC")ok=!!calc(q);else{const r=(a=>a.e?{e:a.e,conf:Math.max(0.3,a.conf)}:null)(answer(KB,q,{}));ok=r&&r.conf>=0.3&&new RegExp(exp.replace(/[.*+?^${}()[\]\\\/]/g,m=>m=="|"?m:"\\"+m)).test((r.e.t+" "+r.e.g).toLowerCase());if(!ok)console.log("MISS",q,"->",r?r.e.t+" "+r.conf.toFixed(2):"none");}
 if(exp=="CALC"&&!ok)console.log("MISS",q,"-> no calc");if(ok)hit++;}
console.log(`holdout ${Q.length} hits ${hit} rate ${(hit/Q.length*100).toFixed(1)}%`);
