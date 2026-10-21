// lex/bridge.json: dictionary word → project-vocabulary word (synonym, "a kind of", or the reverse "X is a kind of Y").
import fs from 'fs';import '../projhub.js';import {vocab,lite} from '../understand.js';
const v=vocab(),voc=v.all,dir=new URL('../lex/',import.meta.url);const B={};const isV=w=>voc.has(lite(w));
const ALL={};for(const d of fs.readdirSync(dir,{withFileTypes:true}))if(d.isDirectory())for(const f of fs.readdirSync(new URL(d.name+'/',dir)))Object.assign(ALL,JSON.parse(fs.readFileSync(new URL(d.name+'/'+f,dir))));
const single=w=>!w.includes("_");
for(const[w,ss]of Object.entries(ALL)){if(!single(w)||isV(w)||w.length<3)continue;
 for(const[p,,syn,hyp]of ss.slice(0,2)){if(p!="n")continue;const s=syn.find(x=>single(x)&&isV(x));if(s){B[w]=[s,`synonym of ${s}`];break;}
  const h=hyp.slice(0,2).map(x=>x.split("_").pop()).find(x=>isV(x)&&x.length>2);if(h){B[w]=[h,`a kind of ${h}`];break;}}}
let rev=0;for(const t of voc){const e=ALL[t]||ALL[t+"e"]||ALL[t+"s"];if(!e)continue;const n=e.find(s=>s[0]=="n");if(!n)continue;const h=n[3][0];if(h&&single(h)&&!isV(h)&&!B[h]&&h.length>3){B[h]=[t,`${t} is a kind of ${h}`];rev++;}}
fs.writeFileSync(new URL('bridge.json',dir),JSON.stringify(B));console.log('bridge',Object.keys(B).length,'reverse',rev,'vocab',voc.size,(fs.statSync(new URL('bridge.json',dir)).size/1024|0)+'KB');
for(const w of['buccaneer','rowboat','canine','dinghy','quadruped','hound','vessel','beehive','apiary'])console.log(w,B[w]);
