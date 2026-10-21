// Runs every question set inside real Chrome with the real on-device model (q8 WASM), like a user's browser.
const {chromium}=require('/workspace/hf-emb/node_modules/playwright-core');const fs=require('fs');
const sets=process.argv.slice(2);const data={};for(const s of sets){const f='tests/sets/'+s+'.json';data[s]=fs.existsSync(f)?JSON.parse(fs.readFileSync(f)):eval(fs.readFileSync('tests/'+s+'.mjs','utf8').match(/const Q=(\[[^]*?\]\]);/)[1]);}
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const pg=await b.newPage();await pg.goto('http://localhost:8090/README.md');
const r=await pg.evaluate(async data=>{const B=await import('/brain.js'),S=await import('/semantic.js');await S.init();const ix=await (await fetch('/kb/index.json')).json();const KB=(await Promise.all(Object.keys(ix.shards).map(s=>fetch('/kb/'+s+'.json').then(r=>r.json())))).flat();
 const out={};for(const s in data){let hk=0,hb=0;const miss=[];for(const[q,exp]of data[s]){if(exp=="CALC"){const ok=!!B.calc(q);hk+=ok;hb+=ok;continue;}const rx=new RegExp(exp.toLowerCase().replace(/[.*+?^${}()[\]\\\/]/g,m=>"\\"+m));
  const good=a=>exp=="NONE"?!a.e:!!a.e&&rx.test((a.e.t+" "+a.e.g).toLowerCase());const a=B.answer(KB,q,{}),c=B.answer(KB,q,{sims:await S.sims(q)});if(!B.calc(q)&&good(a))hk++;if(good(c))hb++;else miss.push(q+' -> '+(c.e?c.e.t:'none'));}
  out[s]={n:data[s].length,kw:(hk/data[s].length*100).toFixed(1),blend:(hb/data[s].length*100).toFixed(1),miss};}return out;},data);
for(const s in r)console.log(s.padEnd(8),'n='+r[s].n,'keyword',r[s].kw+'%','blended',r[s].blend+'%',r[s].miss.length?'\n   MISS '+r[s].miss.join('\n   MISS '):'');await b.close();})();
