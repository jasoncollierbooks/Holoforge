// Type-it-builds-it + follow-up test. Run: node tests/build.mjs [set]
import fs from 'fs';import {plan,followup} from '../builder.js';
const set=process.argv[2]||'build1';const S=JSON.parse(fs.readFileSync(new URL('sets/'+set+'.json',import.meta.url)));let ok=0,tot=0,fok=0,ft=0;
for(const c of S){tot++;const r=plan(c.req);let good=false;try{good=r&&new RegExp("^("+c.part+")$").test(r.name)&&new Function("p","mat","F","return "+c.chk)(r.p,r.mat,r.F);}catch(e){}
 if(good)ok++;else console.log("BUILD MISS",c.req,"->",r?r.name+" "+JSON.stringify(r.p)+" "+r.mat+" F="+(r.F|0):"none");
 let n=r&&{...r};for(const[f,chk]of c.fu){ft++;if(!n){console.log("  FU skip",f);continue;}const o=n.p,res=followup(f,n);let g=false;try{g=res&&new Function("p","o","mat","F","return "+chk)(res.p,o,res.mat,res.F);}catch(e){}
  if(g){fok++;n={...n,...res};}else console.log("  FU MISS",c.req,"/",f,"->",res?res.label+" "+JSON.stringify(res.p)+" "+res.mat:"null");}}
console.log(`${set}: builds ${ok}/${tot} (${(ok/tot*100).toFixed(0)}%)  follow-ups ${fok}/${ft} (${(fok/ft*100).toFixed(0)}%)`);
