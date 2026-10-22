// Part requests from the old build sets must stay part builds (the project router must not take them over).
import fs from 'fs';import {route} from '../projhub.js';let tot=0,bad=0;
for(const set of ['build1','build2','robo_build1','robo_build2']){const S=JSON.parse(fs.readFileSync(new URL(`./sets/${set}.json`,import.meta.url)));const taken=[];
 for(const c of S){const q=Array.isArray(c)?c[0]:c.req||c.q||c.text;tot++;const r=route(q);if(r){bad++;taken.push(`${q} → ${r.id||"clarify"}`);}}
 console.log(`${set}: ${S.length} part requests, ${taken.length} taken over`,taken.length?taken:"");}
console.log(`overlap: ${tot-bad}/${tot} part requests stay parts`);
