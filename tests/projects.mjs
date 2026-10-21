// Project routing + follow-up tests. Usage: node tests/projects.mjs [set]  (default: proj_tuned + proj_follow)
import fs from 'fs';import {route,planProject,projFollow,evalProject,PROJECTS} from '../projhub.js';
const set=process.argv[2]||'proj_tuned';const S=JSON.parse(fs.readFileSync(new URL(`./sets/${set}.json`,import.meta.url)));let ok=0,fail=[];
for(const [q,id,chk] of S){const r=route(q);let good=r&&r.id==id;if(good&&chk){const p=planProject(id,q).p;good=Function("p","return "+chk)(p);}if(good){const e=evalProject(id,planProject(id,q).p);good=e.kg>0&&e.parts.length>0&&e.steps.length>0&&e.safety.length>0;}good?ok++:fail.push(`${q} → ${r?r.id:"none"} (want ${id})`);}
console.log(`${set}: ${ok}/${S.length} = ${(ok/S.length*100).toFixed(1)}%`);fail.forEach(f=>console.log("  ✗",f));
const fset=set=='proj_tuned'?'proj_follow':set+'_follow';if(fs.existsSync(new URL(`./sets/${fset}.json`,import.meta.url))){const F=JSON.parse(fs.readFileSync(new URL(`./sets/${fset}.json`,import.meta.url)));let n=0,k=0,ff=[];
 for(const [q,steps] of F){const r=route(q);if(!r){n+=steps.length;ff.push("no route: "+q);continue;}let node={proj:r.id,p:planProject(r.id,q).p};for(const [s,chk] of steps){n++;const f=projFollow(s,node);const good=f&&Function("p","o","return "+chk)(f.p,node.p);if(good){k++;node={proj:node.proj,p:f.p};}else ff.push(`${q} :: ${s} → ${f?f.log.join("; "):"no change"}`);}}
 console.log(`${fset}: ${k}/${n} = ${(k/n*100).toFixed(1)}%`);ff.forEach(f=>console.log("  ✗",f));}
console.log("projects in library:",Object.keys(PROJECTS).length);
