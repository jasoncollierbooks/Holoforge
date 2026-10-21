// Lab Assistant engine test: keyword-only vs keyword+meaning blend, over every question set.
// Run: node tests/engine.mjs [set...]   (needs dev deps: @huggingface/transformers, see tools/)
import fs from 'fs';import {calc,answer,key,cos,withLearned,emptyLearned} from '../brain.js';import {loadKB,loadEmb} from '../tools/kbload.mjs';import {embed,entryText} from '../tools/embed.mjs';
const T=new URL('.',import.meta.url).pathname;
export function qset(name){const f=T+name+'.mjs';if(fs.existsSync(f)){const s=fs.readFileSync(f,'utf8');return eval(s.match(/const Q=(\[[^]*?\]\]);/)[1]);}return JSON.parse(fs.readFileSync(T+'sets/'+name+'.json'));}
const base=loadKB(),E=loadEmb(),d=E.dim,vec=new Map(E.keys.map((k,i)=>[k,Float32Array.from(E.b.subarray(i*d,(i+1)*d),x=>x/E.scale)]));
const learned=fs.existsSync(T+'../kb/learned_local.json')?JSON.parse(fs.readFileSync(T+'../kb/learned_local.json')):emptyLearned();
const KB=withLearned(base,learned);const orig=new Map(base.map(e=>[key(e),e]));
for(const e of KB)if(!vec.has(key(e)))vec.set(key(e),(await embed([entryText(e)]))[0]);
const rx=exp=>new RegExp(exp.toLowerCase().replace(/[.*+?^${}()[\]\\\/]/g,m=>"\\"+m));
export async function run(name,verbose=true){const Q=qset(name);const qv=await embed(Q.map(q=>q[0]));let hk=0,hb=0;const miss=[];
 Q.forEach(([q,exp],i)=>{if(exp=="CALC"){const ok=!!calc(q);hk+=ok;hb+=ok;if(!ok)miss.push(q+" -> no calc");return;}
  const sims=new Map();for(const[k,v]of vec)sims.set(k,cos(qv[i],v));
  const good=r=>{if(exp=="NONE")return !r.e;if(!r.e)return false;const o=orig.get(key(r.e))||r.e;return rx(exp).test((o.t+" "+o.g).toLowerCase());};
  const a=answer(KB,q,{}),b=answer(KB,q,{sims});if(!calc(q)&&good(a))hk++;if(good(b))hb++;else miss.push(`${q} -> ${b.e?b.e.t+" ("+b.conf.toFixed(2)+" "+b.how+")":"none: "+b.alts.map(x=>x.e.t+" "+x.conf.toFixed(2)).join(" | ")}`);});
 const pct=x=>(x/Q.length*100).toFixed(1)+"%";console.log(`${name.padEnd(8)} n=${Q.length}  keyword-only ${pct(hk)}  blended ${pct(hb)}`);if(verbose)miss.forEach(m=>console.log("   MISS",m));return{n:Q.length,hk,hb};}
if(process.argv[1].endsWith("engine.mjs")){const sets=process.argv.slice(2).length?process.argv.slice(2):['qa','holdout'];for(const s of sets)await run(s);}
