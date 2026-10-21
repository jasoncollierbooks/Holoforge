import fs from 'fs';const dir=new URL('../kb/',import.meta.url).pathname;
export function loadKB(){const ix=JSON.parse(fs.readFileSync(dir+'index.json'));return Object.keys(ix.shards).flatMap(s=>JSON.parse(fs.readFileSync(dir+s+'.json')));}
export function loadEmb(){const m=JSON.parse(fs.readFileSync(dir+'emb.json')),r=fs.readFileSync(dir+'emb.bin'),b=new Int8Array(r.buffer,r.byteOffset,r.length);return{...m,b};}
