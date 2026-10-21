import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {STLExporter} from 'three/addons/exporters/STLExporter.js';
import * as L from './parts.js';
import * as B from './builder.js';
import * as SEM from './semantic.js';
import * as PJ from './projhub.js';
const $=s=>document.querySelector(s);
const EX={object:["mounting_plate","l_bracket","project_box","spur_gear","compression_spring","bolt","flange","shelf_bracket","timing_pulley","bearing_housing","tslot_extrusion","pipe_elbow","pull_handle","knob","butt_hinge","pcb_enclosure","cable_clip","z_bracket","u_bracket","mending_plate","wall_hook","hook_rail","v_pulley","shaft_collar","flanged_bushing","pipe_tee","pipe_coupling","pipe_clip","pipe_saddle","rect_frame","extrusion_corner","heat_set_boss","standoff","spacer","shaft","nut","washer","drone_frame","robot_arm_link","wheel","motor_mount"],bridge:["truss_bridge","beam_bridge","building_frame"],roof:["gable_roof","shed_roof","truss_roof"],projects:["pirate_ship","v8_engine","work_trailer","vn_animatronic","shed","workbench","go_kart","rover","trebuchet","pergola","arcade_cabinet","filament_dryer","tiny_house","mars_rover"],invent:["drone_frame","robot_arm_link","phone_stand","bike_rack","planter_box","wall_hook","project_box"]};
let mode="object",cur=null,tree=[],curId=null,KB=[],mesh=null,asm=null,anim=false,spin=false,clock=new THREE.Clock();
// ---------- start screen ----------
document.querySelectorAll(".modes button").forEach(b=>b.onclick=()=>{if(b.classList.contains("soon")){say("Code mode is coming to the web version. Try a physical part for now.");}enter(b.dataset.mode=="code"?"object":b.dataset.mode);});
$("#home").onclick=()=>{$("#lab").hidden=true;$("#start").hidden=false;};
function enter(m){mode=m;$("#start").hidden=true;$("#lab").hidden=false;$("#modeName").textContent={object:"Physical part",bridge:"Bridges & buildings",roof:"Roofs",assembly:"Assemblies",invent:"Invent",projects:"Projects"}[m];
 const ch=$("#chips");ch.innerHTML="";if(m=="assembly"){for(const k in L.ASSEMBLIES){const b=document.createElement("button");b.textContent="🔗 "+L.ASSEMBLIES[k].name;b.onclick=()=>buildAsm(k);ch.append(b);}$("#q").placeholder="Pick an assembly above (hinge, gear pair, slider)";buildAsm("hinge");}
 else if(m=="projects"){for(const id of EX.projects){const D=PJ.PROJECTS[id],ex=D.ex||("build a "+D.name.toLowerCase().replace(/\s*\(.*\)/,""));const b=document.createElement("button");b.textContent="🧩 "+D.name;b.onclick=()=>{$("#q").value=ex;forge();};ch.append(b);}$("#q").placeholder="Describe a project… e.g. 7x14 work trailer with shelving, a pirate ship, think big: a von Neumann animatronic";$("#q").value="build a pirate ship";forge();}
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
function forge(text,quiet){text=text||$("#q").value.trim();if(!text)return;asm=null;$("#tAnim").hidden=true;
 const rt=PJ.route(text,LEARN);if(rt){const pp=PJ.planProject(rt.id,text);addNode({proj:rt.id,p:pp.p,label:"Original",log:[...pp.why,"Matched because "+rt.why+"."]},null);if(!quiet)explain("Project from your words:",cur.log);return{proj:rt.id,why:cur.log};}
 const pl=B.plan(text);if(!pl){say(`I don't have that in the built-in library yet. Try one of: ${Object.values(L.PARTS).map(p=>p.name.replace(/_/g," ")).join(", ")}.`+(aiKey()?" (Your AI key is set, but AI-made shapes are not in the web preview yet.)":""));return null;}
 addNode({name:pl.name,p:pl.p,mat:pl.mat,F:pl.F,label:"Original",log:pl.why},null);if(!quiet)explain("Built from your words:",pl.why);return pl;}
function explain(head,lines){const a=$("#answer");a.innerHTML=`<b>${head}</b><ul class="why">${lines.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>`;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
function evalNode(n){if(n.proj){const ev=PJ.evalProject(n.proj,n.p);n.ev=ev;n.issues=[];n.safety=3;n.mass=ev.kg;n.cost=ev.cost;n.name=ev.name;return n;}
const g=L.buildGeo(n.name,n.p),W=L.massOf(n.name,n.p,n.mat,g);n.issues=L.inspect(n.name,n.p,n.mat,n.F);n.safety=L.score(n.issues);n.geo=g;n.mass=W.kg;n.cost=W.cost;n.wnote=W.note;return n;}
function addNode(n,parent){n.id=tree.length;n.parent=parent;n.t=new Date();tree.push(n);select(n.id);}
function select(id){curId=id;cur=evalNode(tree[id]);asm=null;if(cur.proj){showGeos(cur.ev.items);renderProj();return;}showGeos([{geo:cur.geo}]);render();}
function fmtMass(kg){return kg>=1000?(kg/1000).toFixed(2)+" t":kg>=1?kg.toFixed(2)+" kg":(kg*1000).toFixed(1)+" g";}
function render(){const n=cur,P=L.PARTS[n.name],b=n.geo.boundingBox,sz=b.getSize(new THREE.Vector3());
 $("#title").textContent=P.icon+" "+n.name.replace(/_/g," ").toUpperCase()+" · "+n.label;
 const big=sz.x>5000;$("#stats").innerHTML=`${big?(sz.x/1000).toFixed(1)+" × "+(sz.y/1000).toFixed(1)+" × "+(sz.z/1000).toFixed(1)+" m":sz.x.toFixed(1)+" × "+sz.y.toFixed(1)+" × "+sz.z.toFixed(1)+" mm"}<br>${n.mat} · ${fmtMass(n.mass)} · ≈$${n.cost<10?n.cost.toFixed(2):Math.round(n.cost).toLocaleString()} material${n.F?` · load ${n.F.toFixed(0)} N`:""}${n.wnote?`<br><small>${n.wnote}</small>`:""}<br>Safety score ${n.safety.toFixed(1)} / 3`;
 const real=n.issues.filter(i=>i.sev!="info");$("#issues").innerHTML=(real.length?"":`<div class="ok">✔ No weak points found at this load.</div>`)+n.issues.map((i,k)=>`<div class="iss ${i.sev}">${i.sev=="info"?"ℹ":"<b>"+(k+1)+"</b>"} ${i.note}</div>`).join("");
 const o=$("#opts");o.innerHTML="";const opts=L.options(n.name,n.p,n.mat,n.F);const ic={Lighter:"🪶",Stronger:"💪",Cheaper:"💲"};
 for(const op of opts){const b=document.createElement("button");b.innerHTML=`${ic[op.name]} ${op.name}<small>safety ${op.safety} · ${op.issues} issue${op.issues==1?"":"s"}</small>`;b.title=op.log.join("\n")||"no change";b.onclick=()=>{addNode({name:n.name,p:op.p,mat:op.mat||n.mat,F:n.F,label:op.name,log:op.log},n.id);say(`${op.name}: `+(op.log.slice(0,4).join("; ")||"no change needed")+".",true);};o.append(b);}
 const pr=$("#params");pr.innerHTML="";for(const k in P.P){const[d,lo,hi,lab]=P.P[k];const st=hi-lo>50?1:hi-lo>5?0.5:0.1;const w=document.createElement("div");w.className="prm";
  w.innerHTML=`<span>${lab}</span><input type="number" step="${st}" value="${n.p[k]}"><input type="range" min="${lo}" max="${hi}" step="${st}" value="${n.p[k]}">`;const[num,rng]=w.querySelectorAll("input");
  const set=v=>{n.p[k]=+v;num.value=v;rng.value=v;evalNode(n);showGeos([{geo:n.geo}]);mesh.scale.z=1;mesh.userData.t0=0;render();};rng.oninput=e=>set(e.target.value);num.onchange=e=>set(e.target.value);pr.append(w);}
 drawTree();}
const fmtUSD=c=>"$"+(c<10?c.toFixed(2):Math.round(c).toLocaleString());
const fmtP=(v,u)=>u=="b"?(v?"yes":"no"):v+(u&&u!="n"?" "+u:"");
function renderProj(){const n=cur,ev=n.ev,D=PJ.PROJECTS[n.proj];const sz0=mesh.scale.z;mesh.scale.z=1;mesh.updateMatrixWorld(true);const sz=new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());mesh.scale.z=sz0;mesh.updateMatrixWorld(true);
 $("#title").textContent="🧩 "+ev.name.toUpperCase()+" · "+n.label;const lb=ev.kg*2.2046;
 $("#stats").innerHTML=`${(sz.x/1000).toFixed(2)} × ${(sz.y/1000).toFixed(2)} × ${(sz.z/1000).toFixed(2)} m · ${(PJ.MATP[n.p.mat]||{}).n||n.p.mat}<br>${fmtMass(ev.kg)} (${Math.round(lb).toLocaleString()} lb) · ≈${fmtUSD(ev.cost)} materials &amp; parts${ev.watts?` · ${Math.round(ev.watts).toLocaleString()} W peak`:""}<br>${ev.parts.length} line items · ${ev.parts.reduce((a,r)=>a+r.q,0)} pieces`;
 let h="";const ms=PJ.megaSummary(ev);
 if(ms){h+=`<div class="bs"><b>System breakdown</b>${ms.map(l=>`<div class="iss info">▣ ${esc(l)}</div>`).join("")}</div>`;
  const R=ev.rep;h+=`<div class="bs"><b>Self-replication estimate</b><div class="iss info">Makes in-house (print + fab): <b>${R.pctDesigns}%</b> of unique part designs · <b>${R.pctCount}%</b> of pieces · <b>${R.pctCost}%</b> of cost. Bought: ${R.count.source} pieces (${fmtUSD(R.cost.source)}) — motors, chips, bearings, batteries.</div></div>`;
  if(ev.roadmap)h+=`<details class="bs" open><summary><b>Staged roadmap</b></summary>${ev.roadmap.map(([a,b])=>`<div class="iss info"><b>${esc(a)}</b> — ${esc(b)}</div>`).join("")}</details>`;}
 if(ev.notes.length)h+=`<div class="bs"><b>Engineering notes</b>${ev.notes.map(l=>`<div class="iss info">${esc(l)}</div>`).join("")}</div>`;
 const bySub=ms?[...ev.subs.keys()]:[null];
 h+=`<details class="bs" open><summary><b>Cut / parts list</b> (${ev.parts.length})</summary><table class="kt cut"><tr><th>Part</th><th>Qty</th><th>Material</th><th>Size</th><th>kg</th><th>$</th>${ms?"<th>Make</th>":""}</tr>${bySub.map(sb=>(sb?`<tr><td colspan="7" class="sub">${esc(sb)}</td></tr>`:"")+ev.parts.filter(r=>!sb||r.sub==sb).map(r=>`<tr><td>${esc(r.n)}</td><td>${r.q}</td><td>${esc(r.m)}</td><td>${esc(r.dims)}</td><td>${r.kg.toFixed(r.kg<1?2:1)}</td><td>${Math.round(r.cost)}</td>${ms?`<td>${r.rep}</td>`:""}</tr>`).join("")).join("")}</table></details>`;
 h+=`<details class="bs"><summary><b>Build steps</b></summary><ol>${ev.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></details>`;
 h+=`<details class="bs" open><summary><b>Safety</b></summary>${ev.safety.map(s=>`<div class="iss med">⚠ ${esc(s)}</div>`).join("")}</details>`;
 $("#issues").innerHTML=h;
 const o=$("#opts");o.innerHTML="";const acts=[["⬆ Bigger","make it bigger"],["⬇ Smaller","make it smaller"],...D.mats.filter(m=>m!=n.p.mat).slice(0,3).map(m=>["◧ "+(PJ.MATP[m]||{n:m}).n,"use "+({pt:"pressure treated",alu:"aluminum",ply:"plywood",pla:"pla",petg:"petg",abs:"abs",wood:"wood",steel:"steel",cedar:"cedar",carbon:"carbon",acrylic:"acrylic",mdf:"plywood"}[m]||m)])];
 for(const[lbl,cmd]of acts){const b=document.createElement("button");b.innerHTML=lbl;b.onclick=()=>{const r=projEdit(cmd);if(r)say(r.text,true);};o.append(b);}
 const pr=$("#params");pr.innerHTML="";for(const k in D.P){const[d,lo,hi,lab,u]=D.P[k];const w=document.createElement("div");w.className="prm";
  if(u=="b"){w.innerHTML=`<span>${lab}</span><input type="checkbox" ${n.p[k]?"checked":""}>`;w.querySelector("input").onchange=e=>{const p={...n.p,[k]:e.target.checked?1:0};addNode({proj:n.proj,p,label:(e.target.checked?"+ ":"− ")+lab,log:[`${lab} ${e.target.checked?"added":"removed"}`]},n.id);};pr.append(w);continue;}
  const st=hi-lo>50?1:hi-lo>5?0.5:0.1;w.innerHTML=`<span>${lab}${u&&u!="n"?" ("+u+")":""}</span><input type="number" step="${st}" value="${n.p[k]}"><input type="range" min="${lo}" max="${hi}" step="${st}" value="${n.p[k]}">`;const[num,rng]=w.querySelectorAll("input");
  const set=v=>{n.p[k]=+v;num.value=v;rng.value=v;evalNode(n);showGeos(n.ev.items);mesh.scale.z=1;mesh.userData.t0=0;renderProj();};rng.onchange=e=>set(e.target.value);num.onchange=e=>set(e.target.value);pr.append(w);}
 drawTree();}
function projHints(n){const D=PJ.PROJECTS[n.proj],h=["“make it bigger”"];if(D.size)h.push("“"+D.size.slice(0,2).map(k=>Math.round(n.p[k]*1.25)).join("x")+"”");const b=Object.keys(D.P).filter(k=>D.P[k][4]=="b");for(const k of b.slice(0,2)){const w=D.P[k][5][0].replace(/[?\\()|]/g,"").replace(/s$/,"");h.push(n.p[k]?`“no ${w}”`:`“add ${w}”`);};const m=D.mats.find(m=>m!=n.p.mat);if(m)h.push(`“use ${(PJ.MATP[m]||{n:m}).n.toLowerCase()}”`);return h.join(", ");}
function projEdit(s){const f=PJ.projFollow(s,cur);if(!f)return null;const from=cur.id;addNode({proj:cur.proj,p:f.p,label:f.label,log:f.log},from);
 return{html:`<b>G${cur.id} · ${esc(f.label)}</b> (from G${from}) — ${esc(cur.ev.name)}<ul class="why">${f.log.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>${fmtMass(cur.mass)} · ≈${fmtUSD(cur.cost)}`,text:`${f.label}. ${f.log.slice(0,2).join(". ")}`};}
function drawTree(){const t=$("#tree");t.classList.remove("muted");const kids=id=>tree.filter(x=>x.parent===id);let h="";
 const walk=(n,d)=>{h+=`<div class="node ${n.id===curId?"cur":""}" data-id="${n.id}" style="margin-left:${d*14}px">${d?"└ ":""}<b>G${n.id}</b> ${n.label} · ${n.proj?esc(n.name||PJ.PROJECTS[n.proj].name):n.name.replace(/_/g," ")+" · safety "+(n.safety??L.score(L.inspect(n.name,n.p,n.mat,n.F))).toFixed(1)}</div>`;kids(n.id).forEach(k=>walk(k,d+1));};
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
fetch("kb/core.json").then(r=>r.json()).then(k=>KB=k);
let shardsP=null,TABLES=null;const loadShards=()=>shardsP||(shardsP=fetch("kb/index.json").then(r=>r.json()).then(ix=>Promise.all(Object.keys(ix.shards).filter(s=>s!="core").map(s=>fetch("kb/"+s+".json").then(r=>r.json()).then(k=>KB.push(...k))))));
setTimeout(()=>{loadShards();if(localStorage.hf_sem!="off")SEM.init(()=>{try{semLbl()}catch{}});},3000);
async function table(q){TABLES=TABLES||await (await fetch("kb/tables.json")).json();const w=q.toLowerCase().split(/\W+/).filter(x=>x.length>2&&x!="table"&&x!="show"&&x!="list");const t=TABLES.find(t=>w.some(x=>t.name.toLowerCase().includes(x.slice(0,5))));
 if(!t)return"Tables: "+TABLES.map(t=>t.name).join(", ")+". Say ‘show table bolts’.";const a=$("#answer");return{html:`<b>${t.name}</b> (${t.units})<table class="kt"><tr>${t.cols.map(c=>`<th>${c}</th>`).join("")}</tr>${t.rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</table>`,text:`Here is the ${t.name} table.`};}
import {search as kbS,calc,toks,answer as kbA,withLearned,emptyLearned,key as kkey} from './brain.js';
function logMiss(q){try{const L=JSON.parse(localStorage.hf_unanswered||"[]");L.push({q,t:new Date().toISOString()});localStorage.hf_unanswered=JSON.stringify(L.slice(-200));}catch{}}
async function aiAnswer(q){const k=aiKey();if(!k)return null;const prov=localStorage.hf_prov||"xai";const url=prov=="xai"?"https://api.x.ai/v1/chat/completions":"https://api.openai.com/v1/chat/completions";
 try{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+k},body:JSON.stringify({model:prov=="xai"?"grok-3-mini":"gpt-4o-mini",messages:[{role:"system",content:"You are the Lab Assistant in a CAD app. Answer in 1-3 short sentences."},{role:"user",content:q}]})});
  const j=await r.json();return j.choices?.[0]?.message?.content||("AI error: "+(j.error?.message||r.status));}catch(e){return"AI call failed from the browser ("+e.message+"). The built-in assistant still works.";}}
function say(text,quiet){const a=$("#answer");a.innerHTML="";a.append(document.createTextNode(text));if($("#speak").checked&&!quiet&&"speechSynthesis"in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g,""));u.rate=1.02;const v=speechSynthesis.getVoices().find(v=>/en(-|_)US/.test(v.lang)&&/male|david|guy|daniel/i.test(v.name));if(v)u.voice=v;speechSynthesis.speak(u);}}
async function ask(q){q=(q||$("#aq").value).trim();if(!q)return;$("#aq").value="";
 const steps=q.split(/\s*(?:,?\s*then\s+|;\s*|\band then\b)\s*/i).filter(Boolean);const out=[];
 for(const s of steps){const r=await one(s);if(r&&r.html){say(r.text);$("#answer").innerHTML=r.html;return;}if(r)out.push(r);}if(out.length)say(out.join("\n"));}
async function one(s){const t=s.toLowerCase();
 if(cur&&cur.proj&&!asm){const pr=PJ.route(s,LEARN);if(!pr||pr.id==cur.proj&&!/^(please\s+)?(make|build|design|create)\s+(me\s+)?(an?|the)\s/.test(t)){const r=projEdit(s);if(r)return r;}}
 const bq=/^(?:please\s+)?(?:make|build|design|forge|create|draw|plan|i need|i want|can you (?:make|build|design|plan)|give me|how (?:do|would|can) (?:i|you) (?:build|make))\b/.test(t)||/\bthink big\b/.test(t);
 if(bq){const pr=PJ.route(s,LEARN);if(pr){if(mode!="projects"&&$("#lab").hidden)enter("projects");$("#q").value=s;const r=forge(s,true);if(r&&r.proj)return{html:`<b>Built G${cur.id}: ${esc(cur.ev.name)}</b><ul class="why">${cur.log.map(l=>`<li>${esc(l)}</li>`).join("")}</ul><small>Try: ${esc(projHints(cur))}.</small>`,text:`Built the ${cur.ev.name}. ${fmtMass(cur.mass)}, about ${fmtUSD(cur.cost)}.`};}}
 const bm=t.match(/^(?:please\s+)?(?:make|build|design|forge|create|draw|print|i need|i want|can you (?:make|build|design)|give me|how about)\b\s*(?:me\s+)?/);
 if(bm&&!(cur&&B.isFollowup(t)&&!B.pickPart(t))){const txt=s.slice(bm[0].length).replace(/^(an?|the)\s+/i,"");const pl=B.plan(txt);if(!pl)return`I can't build “${txt}” from the library yet. Ask “what parts can it make” for the list.`;if(mode=="assembly")enter(L.PARTS[pl.name].mode||"object");$("#q").value=txt;forge(txt,true);
  return{html:`<b>Built G${cur.id}: ${pl.name.replace(/_/g," ")}</b><ul class="why">${pl.why.map(l=>`<li>${esc(l)}</li>`).join("")}</ul><small>Try: “make it stronger”, “now in aluminum”, “twice as long”, “thinner”.</small>`,text:`Built a ${pl.name.replace(/_/g," ")}. ${pl.why.at(-1)}`};}
 if(cur&&cur.proj&&!asm&&/^(now |also |and |then )?(make it|use|switch|change|add|remove|no |without|with|in |bigger|smaller|longer|shorter|wider|taller|double|half)/.test(t)){const D=PJ.PROJECTS[cur.proj];return`No change made to ${D.name}: it already has that, or I can't change that yet. I can edit: ${Object.values(D.P).map(P=>P[3].toLowerCase()).join(", ")}; materials: ${D.mats.map(m=>(PJ.MATP[m]||{n:m}).n).join(", ")}.`;}
 if(cur&&!cur.proj&&!asm&&B.isFollowup(t)){const f=B.followup(s,cur);if(f){const from=cur.id;addNode({name:cur.name,p:f.p,mat:f.mat,F:f.F,label:f.label,log:f.log},from);return{html:`<b>G${cur.id} · ${esc(f.label)}</b> (from G${from})<ul class="why">${f.log.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>Safety ${cur.safety.toFixed(1)}/3 · ${fmtMass(cur.mass)}`,text:`${f.label}. ${f.log.slice(0,2).join(". ")}`};}}
 if(/\b(what|which) (parts|things|shapes|designs)\b.*\b(make|build|design|do)\b|\bparts? (list|library)\b|\blist (of )?parts\b/.test(t))return"I can build: "+Object.keys(L.PARTS).map(n=>n.replace(/_/g," ")).join(", ")+". Describe one in plain words, like “a shelf bracket that holds 50 lb, 8 inches deep, aluminum”.";
 if(/\b(export|download)\b.*\bstl\b|^export\b/.test(t)){exportSTL();return"Exported STL.";}
 if(/^(inspect|check|what'?s wrong|weak)/.test(t)){if(!cur)return"Nothing to inspect yet.";const I=cur.issues.filter(i=>i.sev!="info");return I.length?I.map((i,k)=>`${k+1}. ${i.note}`).join(" "):"No weak points at this load.";}
 if(/^(go )?back\b|^undo\b/.test(t)){if(cur&&cur.parent!=null){select(cur.parent);return"Went back to G"+cur.id+".";}return"Nothing to go back to.";}
 if(/\b(help|how do i use|what can you do)\b/.test(t))return"Type a part and press Forge. Red pins are weak points. Lighter, Stronger and Cheaper make new versions you can branch. Ask me engineering questions, unit conversions, or chain commands with ‘then’.";
 if(/\b(table|tables)\b/.test(t))return await table(s);
 const c=calc(s);if(c)return c;
 await loadShards();
 const K=kb2();if(semOn()){SEM.init(semLbl);}const sm=SEM.status()=="on"?await SEM.sims(s):null;const A=kbA(K,s,{sims:sm,learned:LEARN});lastQ=s;
 if(A.e){const how={learned:"you taught me this",meaning:"matched by meaning","keyword+meaning":"keyword + meaning",keyword:"keyword match"}[A.how]||A.how;
  return{html:`${esc(A.e.a)}<div class="src">— ${esc(A.e.d)}: ${esc(A.e.t)}${A.e.s?" ("+esc(A.e.s)+")":""} · <i>${how}</i></div>${teachBar(s,true)}`,text:A.e.a};}
 const ai=await aiAnswer(s);if(ai)return"AI: "+ai;
 logMiss(s);const R=A.alts||[];return{html:(R.length?`Not sure I have exactly that. Closest topics: ${R.map(r=>`<button class="alt" data-k="${esc(kkey(r.e))}">${esc(r.e.t)}</button>`).join(" ")}`:"I couldn't find that.")+teachBar(s,false),text:R.length?"Not sure I have exactly that. Here are the closest topics, or teach me.":"I couldn't find that. You can teach me."};}
// ---------- Teach it: learned memory in this browser ----------
let LEARN=(()=>{try{return JSON.parse(localStorage.hf_learned)||emptyLearned();}catch{return emptyLearned();}})(),lastQ="",K2=null,K2n=-1;
const saveLearn=()=>{localStorage.hf_learned=JSON.stringify(LEARN);K2=null;SEM.addEntries(LEARN.entries,e=>e.t+". "+e.a);learnLbl();};
function kb2(){if(!K2||K2n!==KB.length){K2=withLearned(KB,LEARN);K2n=KB.length;}return K2;}
const teachBar=(q,ok)=>`<div class="teach">${ok?`<button class="tb" data-wrong="1">✗ Wrong answer</button>`:""}<button class="tb" data-teach="1">✎ Teach it</button></div>`;
$("#answer").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.teach||b.dataset.wrong)openTeach(lastQ);
 if(b.dataset.k){const E=kb2().find(x=>kkey(x)==b.dataset.k);if(E){$("#answer").innerHTML=`${esc(E.a)}<div class="src">— ${esc(E.d)}: ${esc(E.t)}</div><div class="teach"><button class="tb" data-remember="${esc(E.t)}">✓ Yes, that's what I meant (remember it)</button></div>`;$("#answer").dataset.k=b.dataset.k;}}
 if(b.dataset.remember){LEARN.aliases.push({q:lastQ,k:$("#answer").dataset.k});saveLearn();b.textContent="✓ Learned. I'll answer that next time.";b.disabled=true;}});
function openTeach(q){$("#tQ").value=q;$("#tTopic").value="";$("#tAns").value="";$("#tMsg").textContent="";const dl=$("#tList");if(!dl.children.length||dl.children.length!=kb2().length)dl.innerHTML=kb2().map(e=>`<option value="${esc(e.t)}">${esc(e.d)}</option>`).join("")+Object.values(PJ.PROJECTS).map(D=>`<option value="${esc(D.name)}">Project</option>`).join("");renderLearned();$("#teachDlg").showModal();}
$("#tSave").onclick=()=>{const q=$("#tQ").value.trim(),tp=$("#tTopic").value.trim(),an=$("#tAns").value.trim();if(!q)return;
 if(tp&&!an&&PJ.projectByName(tp)){const D=PJ.projectByName(tp);LEARN.aliases=LEARN.aliases.filter(a=>a.q!=q);LEARN.aliases.push({q,k:"proj|"+D.id});}
 else if(tp&&!an){const E=kb2().find(e=>e.t.toLowerCase()==tp.toLowerCase());if(!E){$("#tMsg").textContent="Pick a topic from the list, or write the answer below.";return;}LEARN.aliases=LEARN.aliases.filter(a=>a.q!=q);LEARN.aliases.push({q,k:kkey(E)});}
 else if(an){LEARN.entries=LEARN.entries.filter(e=>e.t!=q);LEARN.entries.push({t:q,g:q,a:an});}else{$("#tMsg").textContent="Choose the right topic or type the answer.";return;}
 saveLearn();$("#teachDlg").close();ask(q);};
function renderLearned(){const n=LEARN.aliases.length+LEARN.entries.length;$("#tCount").textContent=n?`${n} thing${n==1?"":"s"} learned in this browser`:"Nothing learned yet";
 $("#tLearned").innerHTML=[...LEARN.aliases.map((a,i)=>`<div>“${esc(a.q)}” → ${esc(a.k.split("|")[1])} <button data-del="a${i}">✕</button></div>`),...LEARN.entries.map((e,i)=>`<div>“${esc(e.t)}” → your answer <button data-del="e${i}">✕</button></div>`)].join("");}
$("#tLearned").onclick=e=>{const d=e.target.dataset.del;if(!d)return;(d[0]=="a"?LEARN.aliases:LEARN.entries).splice(+d.slice(1),1);saveLearn();renderLearned();};
$("#tExport").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(LEARN,null,1)],{type:"application/json"}));a.download="holoforge-learned.json";a.click();};
$("#tImport").onclick=()=>$("#tFile").click();$("#tFile").onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());LEARN.aliases.push(...(j.aliases||[]));LEARN.entries.push(...(j.entries||[]));saveLearn();renderLearned();$("#tMsg").textContent="Imported.";}catch{$("#tMsg").textContent="That file isn't a HOLO//FORGE learned file.";}};
$("#tClose").onclick=()=>$("#teachDlg").close();$("#learnBtn").onclick=()=>openTeach(lastQ);
const learnLbl=()=>{const n=LEARN.aliases.length+LEARN.entries.length;$("#learnBtn").textContent="✎ Learned "+n;};learnLbl();
// ---------- meaning model toggle ----------
const semOn=()=>localStorage.hf_sem!="off";
function semLbl(){const st=SEM.status();$("#semBtn").textContent="🧠 Meaning: "+(!semOn()?"off":{off:"ready",loading:"loading…",on:"on",failed:"unavailable (keywords only)"}[st]);}
$("#semBtn").onclick=()=>{if(semOn()&&SEM.status()=="on"){localStorage.hf_sem="off";}else{delete localStorage.hf_sem;SEM.init(semLbl);}semLbl();};semLbl();
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
if(location.hash.length>1){const m=location.hash.slice(1);if(["object","bridge","roof","assembly","invent","projects"].includes(m))enter(m);}
window.HF={PJ,ask,forge,tree:()=>tree,cur:()=>cur,sem:()=>SEM.status(),learned:()=>LEARN};
