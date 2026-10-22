// lex/projsense.json: for each project, words its name means according to WordNet (synonyms, broader terms,
// content words of the definition). Lets "seat that rocks" reach "rocking chair" (chair is a kind of seat).
import fs from 'fs';import '../projhub.js';import {PROJECTS} from '../projects.js';import * as LX from '../lex.js';import {lite} from '../understand.js';
const STOP=new Set("a an the of or and to for with in on by from that which used is are be as at its it into one two any some such small large something anything usually often especially made make makes place things thing having when where very more most other others other part kind type form".split(" "));
const out={};
for(const D of Object.values(PROJECTS)){const nm=D.name.replace(/\(.*?\)/g," ").toLowerCase().replace(/[^a-z\- ]/g," ");const ws=nm.split(/[\s\-/]+/).filter(w=>w.length>2&&!STOP.has(w));const bag=new Set();
 const phr=[];for(let i=0;i<ws.length-1;i++)phr.push(ws[i]+"_"+ws[i+1]);
 const covered=new Set();const items=[];for(const p of phr)if(LX.entry(p)){items.push([p,true]);p.split('_').forEach(x=>covered.add(x));}const head=ws[ws.length-1];for(const w of ws)if(!covered.has(w))items.push([w,w==head||D.id.split("_").includes(w)]);
 for(const[w,full]of items){const e=LX.entry(w)||LX.entry(LX.lemma(w));if(!e)continue;const n=e.find(s=>s[0]=="n");if(!n)continue;const[,gl,syn,hyp]=n;
  for(const s of syn)for(const t of s.split("_"))bag.add(lite(t));for(const h of hyp.slice(0,3))bag.add(lite(h.split("_").pop()));
  if(full)for(const t of gl.toLowerCase().split(/[^a-z]+/))if(t.length>3&&!STOP.has(t))bag.add(lite(t));}
 out[D.id]=[...bag].filter(Boolean).slice(0,40);}
fs.writeFileSync(new URL('../lex/projsense.json',import.meta.url),JSON.stringify(out));console.log('projsense',Object.keys(out).length,(fs.statSync(new URL('../lex/projsense.json',import.meta.url)).size/1024|0)+'KB');
for(const id of['rocking_chair','trellis','rowboat','carport','bar_stool'])console.log(id,out[id]?.join(' '));
