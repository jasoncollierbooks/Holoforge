import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {STLExporter} from 'three/addons/exporters/STLExporter.js';
import * as L from './parts.js';
const $=s=>document.querySelector(s);
const EX={object:["mounting_plate","l_bracket","project_box","spur_gear","flange","shelf_bracket","wall_hook","v_pulley","spacer","shaft","nut","washer"],bridge:["truss_bridge"],roof:["gable_roof"],invent:["phone_stand","wall_hook","project_box"]};
let mode="object",cur=null,tree=[],curId=null,KB=[],mesh=null,asm=null,anim=false,spin=false,clock=new THREE.Clock();
// ---------- start screen ----------
document.querySelectorAll(".modes button").forEach(b=>b.onclick=()=>{if(b.classList.contains("soon")){say("Code mode is coming to the web version. Try a physical part for now.");}enter(b.dataset.mode=="code"?"object":b.dataset.mode);});
$("#home").onclick=()=>{$("#lab").hidden=true;$("#start").hidden=false;};
function enter(m){mode=m;$("#start").hidden=true;$("#lab").hidden=false;$("#modeName").textContent={object:"Physical part",bridge:"Bridges & buildings",roof:"Roofs",assembly:"Assemblies",invent:"Invent"}[m];
 const ch=$("#chips");ch.innerHTML="";if(m=="assembly"){for(const k in L.ASSEMBLIES){const b=document.createElement("button");b.textContent="🔗 "+L.ASSEMBLIES[k].name;b.onclick=()=>buildAsm(k);ch.append(b);}$("#q").placeholder="Pick an assembly above (hinge, gear pair, slider)";buildAsm("hinge");}
 else{for(const n of EX[m]){const P=L.PARTS[n],b=document.createElement("button");b.textContent=P.icon+" "+P.ex;b.onclick=()=>{$("#q").value=P.ex;forge();};ch.append(b);}$("#q").placeholder="Describe it… e.g. "+L.PARTS[EX[m][0]].ex;$("#q").value=L.PARTS[EX[m][0]].ex;forge();}
 resize();}
// ---------- 3D hologram lab ----------
const canvas=$("#view"),R=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,0.1,1e7);cam.up.set(0,0,1);cam.position.set(150,-180,140);
const ctl=new OrbitControls(cam,canvas);ctl.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xbfefff,0x081420,1.1));const dl=new THREE.DirectionalLight(0xffffff,1.6);dl.position.set(1,-1,2);scene.add(dl);const rim=new THREE.DirectionalLight(0x37e0ff,1.2);rim.position.set(-2,2,1);scene.add(rim);
const lab=new THREE.Group();scene.add(lab);
function buildCube(size){lab.clear();const s=size;const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s,s,s)),new THREE.LineBasicMaterial({color:0x37e0ff,transparent:true,opacity:.45}));e.position.z=s/2-s*0.02;lab.add(e);
 const g=new THREE.GridHelper(s,20,0x37e0ff,0x15506e);g.rotation.x=Math.PI/2;g.material.transparent=true;g.material.opacity=.35;lab.add(g);
 const ringG=new THREE.RingGeometry(s*0.32,s*0.335,96),rm=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0x37e0ff,transparent:true,opacity:.35,side:2}));rm.name="ring";lab.add(rm);
 const pts=new THREE.BufferGeometry(),a=[];for(let i=0;i<300;i++)a.push((Math.random()-.5)*s,(Math.random()-.5)*s,Math.random()*s);pts.setAttribute("position",new THREE.Float32BufferAttribute(a,3));
 const pm=new THREE.Points(pts,new THREE.PointsMaterial({color:0x7ff0ff,size:s/250,transparent:true,opacity:.6}));pm.name="dust";lab.add(pm);}
const holo=()=>new THREE.MeshPhysicalMaterial({color:0x6fdcff,metalness:.35,roughness:.25,clearcoat:1,transparent:true,opacity:.92,emissive:0x0a3550,side:2});
function showGeos(items){if(mesh)scene.remove(mesh);mesh=new THREE.Group();let bb=new THREE.Box3();
 for(const it of items){const m=new THREE.Mesh(it.geo,holo());if(it.color){m.material.color.set(it.color);}const ed=new THREE.LineSegments(new THREE.EdgesGeometry(it.geo,25),new THREE.LineBasicMaterial({color:0xbff6ff,transparent:true,opacity:.5}));m.add(ed);
  const piv=new THREE.Group();piv.add(m);piv.position.set(it.x||0,0,0);piv.rotation.z=it.rz||0;piv.userData=it;mesh.add(piv);}
 scene.add(mesh);mesh.updateMatrixWorld(true);bb.setFromObject(mesh);const c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3()),S=Math.max(sz.x,sz.y,sz.z)||1;
 mesh.position.set(-c.x,-c.y,-bb.min.z);buildCube(S*1.6);const d=S*2.1;cam.near=S/100;cam.far=S*100;cam.updateProjectionMatrix();cam.position.set(d*0.8,-d,d*0.75);ctl.target.set(0,0,sz.z/2);
 mesh.scale.set(1,1,0.001);mesh.userData.t0=performance.now();setWire($("#tWire").classList.contains("on"));}
function setWire(w){mesh&&mesh.traverse(o=>{if(o.isMesh)o.material.wireframe=w;});}
function resize(){const r=$("#stage").getBoundingClientRect();if(!r.width)return;R.setSize(r.width,r.height,false);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();}
addEventListener("resize",resize);
function loop(){requestAnimationFrame(loop);const t=clock.getElapsedTime();ctl.update();if(spin&&mesh)mesh.rotation.z+=0.005;
 if(mesh&&mesh.userData.t0){const k=Math.min(1,(performance.now()-mesh.userData.t0)/700);mesh.scale.z=0.001+(1-Math.pow(1-k,3));if(k>=1)mesh.userData.t0=0;}
 const rg=lab.getObjectByName("ring");if(rg){rg.rotation.z=t*0.3;}const du=lab.getObjectByName("dust");if(du)du.rotation.z=-t*0.03;
 if(asm&&anim)mesh.children.forEach(p=>p.userData.move&&p.userData.move(p.children[0],t*1.5));
 R.render(scene,cam);pins();}
loop();
function pins(){const box=$("#pins");if(!cur||!mesh||asm){box.innerHTML="";return;}const r=canvas.getBoundingClientRect();let h="";
 if($("#tInspect").classList.contains("on"))cur.issues.forEach((i,n)=>{const v=new THREE.Vector3(...i.pos).add(mesh.position).project(cam);if(v.z>1)return;h+=`<div class="pin ${i.sev}" style="left:${(v.x+1)/2*r.width}px;top:${(1-v.y)/2*r.height}px">${n+1}</div>`;});box.innerHTML=h;}
// ---------- forging ----------
const F_DEF=50;
function forge(text){text=text||$("#q").value.trim();if(!text)return;asm=null;$("#tAnim").hidden=true;
 let name=L.detect(text);if(!name){say(`I don't have that in the built-in library yet. Try one of: ${Object.values(L.PARTS).map(p=>p.name.replace(/_/g," ")).join(", ")}.`+(aiKey()?" (Your AI key is set, but AI-made shapes are not in the web preview yet.)":""));return;}
 const r=L.parse(name,text),F=r.load||(L.PARTS[name].mode?0:F_DEF);addNode({name,p:r.p,mat:r.mat,F,label:"Original",log:r.notes},null);}
function evalNode(n){const g=L.buildGeo(n.name,n.p),m=L.MATS[n.mat],vol=L.volume(g),mass=vol*1e-9*m.rho;n.issues=L.inspect(n.name,n.p,n.mat,n.F);n.safety=L.score(n.issues);n.geo=g;n.mass=mass;n.cost=mass*m.cost;return n;}
function addNode(n,parent){n.id=tree.length;n.parent=parent;n.t=new Date();tree.push(n);select(n.id);}
function select(id){curId=id;cur=evalNode(tree[id]);asm=null;showGeos([{geo:cur.geo}]);render();}
function fmtMass(kg){return kg>=1000?(kg/1000).toFixed(2)+" t":kg>=1?kg.toFixed(2)+" kg":(kg*1000).toFixed(1)+" g";}
function render(){const n=cur,P=L.PARTS[n.name],b=n.geo.boundingBox,sz=b.getSize(new THREE.Vector3());
 $("#title").textContent=P.icon+" "+n.name.replace(/_/g," ").toUpperCase()+" · "+n.label;
 const big=sz.x>5000;$("#stats").innerHTML=`${big?(sz.x/1000).toFixed(1)+" × "+(sz.y/1000).toFixed(1)+" × "+(sz.z/1000).toFixed(1)+" m":sz.x.toFixed(1)+" × "+sz.y.toFixed(1)+" × "+sz.z.toFixed(1)+" mm"}<br>${n.mat} · ${fmtMass(n.mass)} · ≈$${n.cost<10?n.cost.toFixed(2):Math.round(n.cost).toLocaleString()} material${n.F?` · load ${n.F.toFixed(0)} N`:""}<br>Safety score ${n.safety.toFixed(1)} / 3`;
 const real=n.issues.filter(i=>i.sev!="info");$("#issues").innerHTML=(real.length?"":`<div class="ok">✔ No weak points found at this load.</div>`)+n.issues.map((i,k)=>`<div class="iss ${i.sev}">${i.sev=="info"?"ℹ":"<b>"+(k+1)+"</b>"} ${i.note}</div>`).join("");
 const o=$("#opts");o.innerHTML="";const opts=L.options(n.name,n.p,n.mat,n.F);const ic={Lighter:"🪶",Stronger:"💪",Cheaper:"💲"};
 for(const op of opts){const b=document.createElement("button");b.innerHTML=`${ic[op.name]} ${op.name}<small>safety ${op.safety} · ${op.issues} issue${op.issues==1?"":"s"}</small>`;b.title=op.log.join("\n")||"no change";b.onclick=()=>{addNode({name:n.name,p:op.p,mat:op.mat||n.mat,F:n.F,label:op.name,log:op.log},n.id);say(`${op.name}: `+(op.log.slice(0,4).join("; ")||"no change needed")+".",true);};o.append(b);}
 const pr=$("#params");pr.innerHTML="";for(const k in P.P){const[d,lo,hi,lab]=P.P[k];const st=hi-lo>50?1:hi-lo>5?0.5:0.1;const w=document.createElement("div");w.className="prm";
  w.innerHTML=`<span>${lab}</span><input type="number" step="${st}" value="${n.p[k]}"><input type="range" min="${lo}" max="${hi}" step="${st}" value="${n.p[k]}">`;const[num,rng]=w.querySelectorAll("input");
  const set=v=>{n.p[k]=+v;num.value=v;rng.value=v;evalNode(n);showGeos([{geo:n.geo}]);mesh.scale.z=1;mesh.userData.t0=0;render();};rng.oninput=e=>set(e.target.value);num.onchange=e=>set(e.target.value);pr.append(w);}
 drawTree();}
function drawTree(){const t=$("#tree");t.classList.remove("muted");const kids=id=>tree.filter(x=>x.parent===id);let h="";
 const walk=(n,d)=>{h+=`<div class="node ${n.id===curId?"cur":""}" data-id="${n.id}" style="margin-left:${d*14}px">${d?"└ ":""}<b>G${n.id}</b> ${n.label} · ${n.name.replace(/_/g," ")} · safety ${(n.safety??L.score(L.inspect(n.name,n.p,n.mat,n.F))).toFixed(1)}</div>`;kids(n.id).forEach(k=>walk(k,d+1));};
 tree.filter(x=>x.parent===null).forEach(r=>walk(r,0));t.innerHTML=h;t.querySelectorAll(".node").forEach(e=>e.onclick=()=>select(+e.dataset.id));}
function buildAsm(k){const A=L.ASSEMBLIES[k];asm=k;cur=null;const parts=A.build();showGeos(parts);mesh.scale.z=1;mesh.userData.t0=0;$("#tAnim").hidden=false;anim=true;$("#tAnim").classList.add("on");
 $("#title").textContent="🔗 "+A.name.toUpperCase();$("#stats").innerHTML=`${parts.length} parts · joint: ${A.joint}<br>${parts.map(p=>p.name).join(" · ")}`;
 $("#issues").innerHTML=`<div class="muted">Assembly preview: press ▶ Move to run the ${A.joint} joint. Stress checks for assemblies are coming.</div>`;$("#opts").innerHTML="";$("#params").innerHTML="";}
// ---------- tools ----------
const tog=(id,f)=>$(id).onclick=()=>{$(id).classList.toggle("on");f($(id).classList.contains("on"));};
tog("#tInspect",()=>{});tog("#tWire",setWire);tog("#tSpin",v=>spin=v);tog("#tAnim",v=>anim=v);
$("#tStl").onclick=exportSTL;
function exportSTL(){if(!mesh)return say("Build something first.");mesh.updateMatrixWorld(true);const ex=new STLExporter(),s=new THREE.Scene(),c=mesh.clone(true);c.scale.set(1,1,1);c.position.set(0,0,0);c.rotation.z=0;
 c.traverse(o=>{if(o.isLineSegments)o.visible=false;});s.add(c);const data=ex.parse(s,{binary:true});
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"model/stl"}));a.download=(cur?cur.name+"_G"+cur.id:asm)+".stl";a.click();say("STL downloaded. Units are millimetres.");}
$("#go").onclick=()=>forge();$("#q").onkeydown=e=>{if(e.key=="Enter")forge();};
// ---------- Lab Assistant ----------
fetch("knowledge.json").then(r=>r.json()).then(k=>KB=k);
const STOP=new Set("a an the is are what whats what's how do does i to of for in on and or my me it should can you be with which why when".split(" "));
const toks=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w&&!STOP.has(w));
function kbSearch(q){const qt=toks(q);let best=null;for(const e of KB){const hay=toks(e.t+" "+e.g+" "+e.t),body=new Set(toks(e.a));let s=0;for(const w of qt){if(hay.includes(w))s+=3;else if(hay.some(h=>h.startsWith(w.slice(0,5))&&w.length>4))s+=2;else if(body.has(w))s+=1;}if(!best||s>best.s)best={s,e};}return best&&best.s>=3?best.e:null;}
const UNITS={mm:1,cm:10,m:1000,in:25.4,inch:25.4,inches:25.4,ft:304.8,feet:304.8,foot:304.8,kg:1,lb:0.45359,lbs:0.45359,pound:0.45359,pounds:0.45359,g:0.001,n:1,kn:1000,lbf:4.448,mpa:1,psi:0.006895,ksi:6.895,nm:1,"ft-lb":1.3558};
const DIM={mm:"L",cm:"L",m:"L",in:"L",inch:"L",inches:"L",ft:"L",feet:"L",foot:"L",kg:"M",lb:"M",lbs:"M",pound:"M",pounds:"M",g:"M",n:"F",kn:"F",lbf:"F",mpa:"P",psi:"P",ksi:"P",nm:"T","ft-lb":"T"};
function calc(q){const t=q.toLowerCase();
 let m=t.match(/(\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?)\s*(mm|cm|m|in|inch|inches|ft|feet|foot|kg|lbs?|pounds?|g|kn|n|lbf|mpa|psi|ksi|nm|ft-lb)\s*(?:to|in|into|=)\s*(mm|cm|m|in|inch|inches|ft|feet|kg|lbs?|pounds?|g|kn|n|lbf|mpa|psi|ksi|nm|ft-lb)\b/);
 if(m&&DIM[m[2]]==DIM[m[3]]){const v=m[1].split(/\s+/).reduce((s,x)=>s+(x.includes("/")?x.split("/")[0]/x.split("/")[1]:+x),0);const r=v*UNITS[m[2]]/UNITS[m[3]];if(m[2]=="in"&&m[3]=="in")return null;return`${m[1]} ${m[2]} = ${+r.toPrecision(5)} ${m[3]}`;}
 if(/^(?:what is |calc |calculate |=)?\s*[\d\s+\-*/().^%]+$/.test(t)&&/\d\s*[+\-*/^]/.test(t)){try{const e=t.replace(/[^\d+\-*/().^%\s]/g,"").replace(/\^/g,"**");return`${e.trim()} = ${+Function('"use strict";return('+e+')')().toPrecision(8)}`;}catch{}}
 m=t.match(/(\d+(?:\.\d+)?)\s*kg.*?(?:force|newtons?|in n)/);if(m)return`${m[1]} kg weighs ${(m[1]*9.81).toFixed(1)} N (×9.81).`;
 m=t.match(/tap drill.*?m(\d+)|m(\d+).*?tap drill/);if(m){const d=+(m[1]||m[2]),pitch={2:.4,2.5:.45,3:.5,4:.7,5:.8,6:1,8:1.25,10:1.5,12:1.75,16:2,20:2.5,24:3}[d];if(pitch)return`M${d} coarse: pitch ${pitch} mm, tap drill ${(d-pitch).toFixed(1)} mm, clearance hole ${(d*1.1).toFixed(1)} mm.`;}
 m=t.match(/beam|cantilever/)&&t.match(/(\d+(?:\.\d+)?)\s*(?:n|kg).*?(\d+(?:\.\d+)?)\s*mm\s*long.*?(\d+(?:\.\d+)?)\s*(?:mm)?\s*x\s*(\d+(?:\.\d+)?)/);
 if(m){let F=+m[1];if(/kg/.test(t))F*=9.81;const s=6*F*m[2]/(m[3]*m[4]*m[4]);return`Cantilever bending stress ≈ 6FL/(bh²) = ${s.toFixed(1)} MPa (F ${F.toFixed(0)} N, L ${m[2]} mm, b ${m[3]}, h ${m[4]}).`;}
 m=t.match(/gear.*?(\d+)\s*teeth.*?module\s*(\d+(?:\.\d+)?)/);if(m)return`Pitch Ø = teeth × module = ${m[1]*m[2]} mm; outside Ø ${(+m[1]+2)*m[2]} mm.`;
 return null;}
async function aiAnswer(q){const k=aiKey();if(!k)return null;const prov=localStorage.hf_prov||"xai";const url=prov=="xai"?"https://api.x.ai/v1/chat/completions":"https://api.openai.com/v1/chat/completions";
 try{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+k},body:JSON.stringify({model:prov=="xai"?"grok-3-mini":"gpt-4o-mini",messages:[{role:"system",content:"You are the Lab Assistant in a CAD app. Answer in 1-3 short sentences."},{role:"user",content:q}]})});
  const j=await r.json();return j.choices?.[0]?.message?.content||("AI error: "+(j.error?.message||r.status));}catch(e){return"AI call failed from the browser ("+e.message+"). The built-in assistant still works.";}}
function say(text,quiet){const a=$("#answer");a.innerHTML="";a.append(document.createTextNode(text));if($("#speak").checked&&!quiet&&"speechSynthesis"in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g,""));u.rate=1.02;const v=speechSynthesis.getVoices().find(v=>/en(-|_)US/.test(v.lang)&&/male|david|guy|daniel/i.test(v.name));if(v)u.voice=v;speechSynthesis.speak(u);}}
async function ask(q){q=(q||$("#aq").value).trim();if(!q)return;$("#aq").value="";
 const steps=q.split(/\s*(?:,?\s*then\s+|;\s*|\band then\b)\s*/i).filter(Boolean);const out=[];
 for(const s of steps){const r=await one(s);if(r)out.push(r);}if(out.length)say(out.join("\n"));}
async function one(s){const t=s.toLowerCase();
 if(/^(make|build|design|forge|create|draw)\b/.test(t)){const txt=s.replace(/^\w+\s+(me\s+)?(an?\s+)?/i,"");const n=L.detect(txt);if(!n)return`I can't build “${txt}” from the library yet.`;if(mode=="assembly")enter(L.PARTS[n].mode||"object");$("#q").value=txt;forge(txt);return`Built a ${n.replace(/_/g," ")}. Safety ${cur.safety.toFixed(1)} of 3, ${cur.issues.filter(i=>i.sev!="info").length} issue(s).`;}
 const og=t.match(/^(?:make it |go |do )?(lighter|stronger|cheaper)\b/);if(og){if(!cur)return"Build something first.";const op=L.options(cur.name,cur.p,cur.mat,cur.F).find(o=>o.name.toLowerCase()==og[1]);addNode({name:cur.name,p:op.p,mat:op.mat||cur.mat,F:cur.F,label:op.name,log:op.log},cur.id);return`${op.name} version G${cur.id}: safety ${cur.safety.toFixed(1)}.`;}
 if(/\b(export|download)\b.*\bstl\b|^export\b/.test(t)){exportSTL();return"Exported STL.";}
 if(/^(inspect|check|what'?s wrong|weak)/.test(t)){if(!cur)return"Nothing to inspect yet.";const I=cur.issues.filter(i=>i.sev!="info");return I.length?I.map((i,k)=>`${k+1}. ${i.note}`).join(" "):"No weak points at this load.";}
 if(/^(go )?back\b|^undo\b/.test(t)){if(cur&&cur.parent!=null){select(cur.parent);return"Went back to G"+cur.id+".";}return"Nothing to go back to.";}
 if(/\b(help|how do i use|what can you do)\b/.test(t))return"Type a part and press Forge. Red pins are weak points. Lighter, Stronger and Cheaper make new versions you can branch. Ask me engineering questions, unit conversions, or chain commands with ‘then’.";
 const c=calc(s);if(c)return c;
 const e=kbSearch(s);if(e)return`${e.a}\n— ${e.d}: ${e.t}${e.s?" ("+e.s+")":""}`;
 const ai=await aiAnswer(s);if(ai)return"AI: "+ai;
 return"I don't know that one yet. Try asking about materials, wall thickness, bolts, gears, roofs, bridges, printing, or say ‘convert 2 in to mm’.";}
$("#ask").onclick=()=>ask();$("#aq").onkeydown=e=>{if(e.key=="Enter")ask();};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
$("#mic").onclick=()=>{if(!SR)return say("Voice input needs Chrome, Edge or Safari. You can still type.");const r=new SR();r.lang="en-US";r.interimResults=false;$("#mic").classList.add("rec");
 r.onresult=e=>{const q=e.results[0][0].transcript;$("#aq").value=q;ask(q);};r.onend=()=>$("#mic").classList.remove("rec");r.onerror=()=>say("I didn't catch that.",true);r.start();};
// ---------- AI key (optional, browser only) ----------
const aiKey=()=>localStorage.hf_key||"";const aiLbl=()=>$("#aiBtn").textContent="AI: "+(aiKey()?"on ("+(localStorage.hf_prov||"xai")+")":"off");aiLbl();
$("#aiBtn").onclick=()=>{$("#aiProv").value=localStorage.hf_prov||"xai";$("#aiKey").value="";$("#aiDlg").showModal();};
$("#aiSave").onclick=()=>{const k=$("#aiKey").value.trim();if(k){localStorage.hf_key=k;localStorage.hf_prov=$("#aiProv").value;}aiLbl();$("#aiDlg").close();};
$("#aiClear").onclick=()=>{delete localStorage.hf_key;aiLbl();$("#aiDlg").close();};$("#aiClose").onclick=()=>$("#aiDlg").close();
$("#helpBtn").onclick=()=>$("#helpDlg").showModal();$("#helpClose").onclick=()=>$("#helpDlg").close();
if(location.hash.length>1){const m=location.hash.slice(1);if(["object","bridge","roof","assembly","invent"].includes(m))enter(m);}
window.HF={ask,forge,tree:()=>tree,cur:()=>cur};
