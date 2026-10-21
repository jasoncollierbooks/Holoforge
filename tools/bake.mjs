// Bake "Teach it" exports into the shipped knowledge base: node tools/bake.mjs holoforge-learned.json [...]
// Merges into kb_learned.json, regenerates kb/ (gen_kb.py) and the meaning vectors (gen_emb.mjs).
import fs from 'fs';import {execSync} from 'child_process';
const f='kb_learned.json',B=fs.existsSync(f)?JSON.parse(fs.readFileSync(f)):{v:1,entries:[],aliases:[]};
for(const x of process.argv.slice(2)){const j=JSON.parse(fs.readFileSync(x));for(const a of j.aliases||[])if(!B.aliases.some(b=>b.q==a.q))B.aliases.push(a);for(const e of j.entries||[]){B.entries=B.entries.filter(b=>b.t!=e.t);B.entries.push(e);}}
fs.writeFileSync(f,JSON.stringify(B,null,1));execSync('python3 gen_kb.py',{stdio:'inherit'});execSync('node tools/gen_emb.mjs',{stdio:'inherit'});
console.log('baked',B.aliases.length,'aliases',B.entries.length,'entries');
