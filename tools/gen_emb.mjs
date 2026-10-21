// Builds kb/emb.bin (int8 vectors) + kb/emb.json (keys) for every KB entry. Run after gen_kb.py: node tools/gen_emb.mjs
import fs from 'fs';import {embed,entryText,MODEL} from './embed.mjs';import {loadKB} from './kbload.mjs';import {key} from '../brain.js';
const KB=loadKB();const V=await embed(KB.map(entryText));const d=V[0].length,buf=new Int8Array(V.length*d);
V.forEach((v,i)=>{for(let j=0;j<d;j++)buf[i*d+j]=Math.max(-127,Math.min(127,Math.round(v[j]*127)));});
fs.writeFileSync('kb/emb.bin',Buffer.from(buf.buffer));fs.writeFileSync('kb/emb.json',JSON.stringify({model:MODEL,dim:d,scale:127,keys:KB.map(key)}));
console.log('embedded',V.length,'x',d,(buf.length/1024).toFixed(0)+' KB');
