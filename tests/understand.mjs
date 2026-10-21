// Dictionary + constraint-solver tests. Usage: node tests/understand.mjs [und_tuned|und_holdout]
import fs from 'fs';import {route,planProject,projFollow,U,LX} from '../projhub.js';
const set=process.argv[2]||'und_tuned';const S=JSON.parse(fs.readFileSync(new URL(`./sets/${set}.json`,import.meta.url)));let ok=0;const fail=[];const by={};
for(const c of S){const[kind,q]=c;let good=false,got="";
 try{if(kind=="route"){const r=route(q);got=r?(r.id||"clarify:"+r.clarify.chips.map(x=>x.label).join("|")):"none";good=r&&r.id==c[2];}
 else if(kind=="clarify"){const r=route(q);got=r?(r.id||"clarify:"+r.clarify.chips.length):"none";good=!!(r&&r.clarify&&r.clarify.chips.length>=2&&r.clarify.chips.length<=4);}
 else if(kind=="edit"){const r=route(c[2]);let n={proj:r.id,p:planProject(r.id,c[2]).p};const f=projFollow(q,n);got=f?f.log.join("; "):"no change";good=!!f&&Function("p","o","return "+c[3])(f.p,n.p);}
 else if(kind=="define"){const w=U.defineTarget(q);const d=w&&LX.define(w);got=d?(d.jargon?"jargon ":"")+d.senses.length+" senses: "+(d.senses[0]||{gloss:d.jargon&&d.jargon.def}).gloss.slice(0,60):"none";good=!!d&&new RegExp(c[2],"i").test(JSON.stringify(d));}
 else if(kind=="norm"){const N=LX.normalize(q,U.known);const e=LX.entry(q);got=N.text+" | "+(e?JSON.stringify(e[0].slice(2)):"");good=new RegExp("\\b"+c[2]+"\\b").test(got);}
 else if(kind=="intent"){got=U.intentOf(q,true).value;good=got==c[2];}
 }catch(e){got="ERR "+e.message;}
 (by[kind]=by[kind]||[0,0]);by[kind][1]++;if(good){ok++;by[kind][0]++;}else fail.push(`[${kind}] ${q} → ${got}`);}
console.log(`${set}: ${ok}/${S.length} = ${(ok/S.length*100).toFixed(1)}%  `+Object.entries(by).map(([k,[a,b]])=>`${k} ${a}/${b}`).join("  "));fail.forEach(f=>console.log("  ✗",f));
