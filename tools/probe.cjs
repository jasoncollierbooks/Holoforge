const {chromium}=require('/workspace/hf-emb/node_modules/playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});const pg=await b.newPage();const errs=[];
pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()=='error'||m.type()=='warning')errs.push(m.text().slice(0,300))});
await pg.goto('http://localhost:8090/#object');await pg.waitForTimeout(3000);
const r=await pg.evaluate(async()=>{const S=await import('./semantic.js');const t0=performance.now();const ok=await S.init();if(!ok)return 'fail';const out=[(performance.now()-t0|0)+'ms'];for(const q of['how long will my battery last','is it safe to change an outlet','how deep should footings be']){const m=await S.sims(q);const top=[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2);out.push(q+' => '+top.map(t=>t[0]+' '+t[1].toFixed(3)).join(' | '))}return out});
console.log(r);console.log('ERRS',errs.slice(0,6));await b.close();})();
