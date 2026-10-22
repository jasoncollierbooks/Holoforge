// Never-tuned holdout. Written before the first run; the first-run score is the honest number.
// Run: node tests/fresh.mjs [fresh1]
import fs from 'fs';import {route,planProject,projFollow,PROJECTS,U,LX} from '../projhub.js';import {Context} from '../predict.js';
const set=process.argv[2]||'fresh1';const S=JSON.parse(fs.readFileSync(new URL(`./sets/${set}.json`,import.meta.url)));let ok=0;const by={},fail=[];
function converse(turns){const C=new Context();let cur=null,prev=null,log="";
 for(const s0 of turns){let s=s0;const r=C.resolve(s,cur);if(r&&r.pick)s=r.pick.ask;else if(r&&r.text)s=r.text;
  if(cur){const f=projFollow(s,cur);if(f){prev=cur;cur={proj:cur.proj,p:f.p};C.note("edit",{text:s});log=f.log.join("; ");continue;}}
  const rt=route(s,null,C.words());if(rt&&rt.clarify){C.note("clarify",{chips:rt.clarify.chips,head:rt.clarify.head});continue;}if(rt&&rt.id){prev=null;cur={proj:rt.id,p:planProject(rt.id,s).p};C.note("build",{id:rt.id});}}
 return{proj:cur&&cur.proj,p:cur?cur.p:{},o:prev?prev.p:{},log};}
for(const c of S){const[k,q]=c;let good=false,got="";U.PREF.reset();
 try{if(k=="route"){const r=route(q);got=r?(r.id||"clarify:"+r.clarify.chips.map(x=>x.id||x.label).join("|")):"none";good=!!(r&&r.id&&c[2].split("|").includes(r.id));}
 else if(k=="clarify"){const r=route(q);got=r?(r.id||"clarify:"+r.clarify.chips.length):"none";good=!!(r&&r.clarify&&r.clarify.chips.length>=2);}
 else if(k=="compose"){const r=route(q);got=r?(r.id+(r.composed?" n="+PROJECTS[r.id].obj.n:"")):"none";good=!!(r&&r.composed&&PROJECTS[r.id].obj.n==c[2]);}
 else if(k=="wsd"){const W=LX.wsd(q,c[2].split(" "));got=W[0]?W[0].s[1]:"none";good=!!W[0]&&new RegExp(c[3]).test(JSON.stringify(W[0].s));}
 else if(k=="convo"){const R=converse(q);got=(R.proj||"none")+" "+R.log;good=!!Function("p","o","proj","log","return "+c[2])(R.p,R.o,R.proj,R.log);}}catch(e){got="ERR "+e.message;}
 by[k]=by[k]||[0,0];by[k][1]++;if(good){ok++;by[k][0]++;}else fail.push(`  ✗ [${k}] ${Array.isArray(q)?q.join(" → "):q} → ${got}`);}
console.log(`${set}: ${ok}/${S.length} = ${(ok/S.length*100).toFixed(1)}%  `+Object.entries(by).map(([k,[a,b]])=>`${k} ${a}/${b}`).join("  "));console.log(fail.join("\n"));
