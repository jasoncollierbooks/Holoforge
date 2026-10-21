const {chromium}=require('/workspace/hf-emb/node_modules/playwright-core');const D='/workspace/holoforge-shots/';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const pg=await b.newPage({viewport:{width:1400,height:1000}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()=='error')errs.push(m.text().slice(0,200))});
await pg.goto('http://localhost:8090/');await pg.evaluate(()=>localStorage.clear());await pg.goto('http://localhost:8090/#projects');await pg.reload();await pg.waitForTimeout(3500);
let n=66;const shot=async(name)=>{await pg.waitForTimeout(1200);const f=D+(n++)+'-'+name+'.png';await pg.screenshot({path:f});console.log('SHOT',f);};
const ask=async q=>{await pg.fill('#aq',q);await pg.click('#ask');await pg.waitForTimeout(2000);const t=await pg.innerText('#answer');console.log('Q:',q,'\n  A:',t.slice(0,240).replace(/\n/g,' / '));return t;};
const look=async want=>{for(let i=0;i<2;i++){const s=await pg.innerText('#tLook');if(s.toLowerCase().includes(want))return;await pg.click('#tLook');await pg.waitForTimeout(800);}};
const hover=async()=>{const bx=await pg.locator('#view').boundingBox();for(let fy=0.35;fy<=0.75;fy+=0.05)for(let fx=0.3;fx<=0.7;fx+=0.05){await pg.mouse.move(bx.x+bx.width*fx,bx.y+bx.height*fy);await pg.waitForTimeout(120);if(await pg.isVisible('#tip'))return [bx.x+bx.width*fx,bx.y+bx.height*fy];}return null;};
// before/after graphics
await ask('build a v8 engine display model');console.log('look label',await pg.innerText('#tLook'));
await pg.click('#tLook');await pg.waitForTimeout(1000);await shot('before-holo-v8-engine');await pg.click('#tLook');await shot('after-real-v8-engine');
await ask('build a pirate ship');await pg.click('#tLook');await pg.waitForTimeout(1000);await shot('before-holo-pirate-ship');await pg.click('#tLook');await shot('after-real-pirate-ship');
await ask('build a 7x14 work trailer');await shot('after-real-work-trailer-7x14');
await pg.click('#tExplode');await shot('exploded-work-trailer');await pg.click('#tExplode');
await ask('build a v8 engine display model');await pg.click('#tExplode');await shot('exploded-v8-engine');await pg.click('#tExplode');
await ask('build a pirate ship');const p=await hover();console.log('hover at',p,p&&await pg.innerText('#tip'));await shot('hover-part-label');
if(p){await pg.mouse.click(p[0],p[1]);await pg.waitForTimeout(800);await shot('part-click-edit-chips');}
await ask('make the mast taller');await shot('subedit-mast-taller-diff');
await ask('add 2 cannons');await ask('paint hull red');await shot('subedit-paint-hull-red');
await ask('compare to last version');await shot('compare-last-version');
await ask('undo');await shot('undo');
await ask('build a 7x14 work trailer');await ask('swap the bench for drawers');await shot('subedit-swap-bench-for-drawers');
await ask('remove the ladder rack');await ask('shelves 18 inches deep');await shot('subedit-shelves-18in-deep');
await ask('compare to original');await shot('compare-original');
for(const q of['build a dining table','build a cedar greenhouse','build a crosscut sled','build a kayak','build a rc plane','build a robot dog','build a kids wagon','build a murphy bed','build a teardrop camper','build an airship','build a space station module','build an a-frame cabin','build a container farm','build a bicycle cargo trailer','insulated doghouse'])await (async()=>{await ask(q);await shot(q.replace(/^(build|make) (a|an) /,'').replace(/[^a-z0-9]+/g,'-'));})();
const m=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await m.goto('http://localhost:8090/#projects');await m.waitForTimeout(4000);await m.screenshot({path:D+(n++)+'-mobile-real-graphics.png'});console.log('SHOT mobile');
console.log('ERRS',errs);await b.close();})();
