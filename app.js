import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {STLExporter} from 'three/addons/exporters/STLExporter.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import * as L from './parts.js';
import * as B from './builder.js';
import * as SEM from './semantic.js';
import * as PJ from './projhub.js';
import * as IC from './icons.js';import * as SK from './sketch.js';import * as PR from './predict.js';
const CTX=new PR.Context(),PRED=new PR.Predictor();window.HF_CTX=CTX;
const $=s=>document.querySelector(s);
const EX={object:["mounting_plate","l_bracket","project_box","spur_gear","compression_spring","bolt","flange","shelf_bracket","timing_pulley","bearing_housing","tslot_extrusion","pipe_elbow","pull_handle","knob","butt_hinge","pcb_enclosure","cable_clip","z_bracket","u_bracket","mending_plate","wall_hook","hook_rail","v_pulley","shaft_collar","flanged_bushing","pipe_tee","pipe_coupling","pipe_clip","pipe_saddle","rect_frame","extrusion_corner","heat_set_boss","standoff","spacer","shaft","nut","washer","drone_frame","robot_arm_link","wheel","motor_mount"],bridge:["truss_bridge","beam_bridge","building_frame"],roof:["gable_roof","shed_roof","truss_roof"],projects:["pirate_ship","v8_engine","work_trailer","vn_animatronic","shed","workbench","go_kart","rover","trebuchet","pergola","arcade_cabinet","filament_dryer","tiny_house","mars_rover"],invent:["drone_frame","robot_arm_link","phone_stand","bike_rack","planter_box","wall_hook","project_box"]};
let mode="object",cur=null,tree=[],curId=null,KB=[],mesh=null,asm=null,anim=false,spin=false,clock=new THREE.Clock();
// ---------- start screen ----------
document.querySelectorAll(".modes button").forEach(b=>b.onclick=()=>{if(b.classList.contains("soon")){say("Code mode is coming to the web version. Try a physical part for now.");}if(b.dataset.mode=="sketch"){enter("object",{noDefault:true});setTimeout(()=>window.HF_openSketch&&window.HF_openSketch(),50);return;}enter(b.dataset.mode=="code"?"object":b.dataset.mode);});
$("#home").onclick=()=>{$("#lab").hidden=true;$("#start").hidden=false;};
function enter(m,o={}){mode=m;$("#start").hidden=true;$("#lab").hidden=false;$("#modeName").textContent={object:"Physical part",bridge:"Bridges & buildings",roof:"Roofs",assembly:"Assemblies",invent:"Invent",projects:"Projects",sketch:"Sketch → 3D"}[m]||m;
 const ch=$("#chips");ch.innerHTML="";if(m=="assembly"){for(const k in L.ASSEMBLIES){const b=document.createElement("button");b.innerHTML=IC.icon("assembly")+" "+L.ASSEMBLIES[k].name;b.onclick=()=>buildAsm(k);ch.append(b);}$("#q").placeholder="Pick an assembly above (hinge, gear pair, slider)";buildAsm("hinge");}
 else if(m=="projects"){for(const id of EX.projects){const D=PJ.PROJECTS[id],ex=D.ex||("build a "+D.name.toLowerCase().replace(/\s*\(.*\)/,""));const b=document.createElement("button");b.innerHTML=IC.icon(IC.catIcon(D.cat))+" "+D.name;b.onclick=()=>{$("#q").value=ex;forge();};ch.append(b);}$("#q").placeholder="Describe a project… e.g. 7x14 work trailer with shelving, a pirate ship, think big: a von Neumann animatronic";if(!o.noDefault){$("#q").value="build a pirate ship";forge();}}
 else{for(const n of EX[m]){const P=L.PARTS[n],b=document.createElement("button");b.innerHTML=IC.icon(m=="bridge"?"bridge":m=="roof"?"roof":m=="invent"?"invent":"part")+" "+P.ex;b.onclick=()=>{$("#q").value=P.ex;forge();};ch.append(b);}$("#q").placeholder="Describe it… e.g. "+L.PARTS[EX[m][0]].ex;if(!o.noDefault){$("#q").value=L.PARTS[EX[m][0]].ex;forge();}}
 resize();}
// ---------- 3D hologram lab ----------
const canvas=$("#view"),R=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});const MOBILE=matchMedia('(pointer:coarse)').matches||innerWidth<820;R.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;R.outputColorSpace=THREE.SRGBColorSpace;R.shadowMap.enabled=!MOBILE;R.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,0.1,1e7);cam.up.set(0,0,1);cam.position.set(150,-180,140);
const ctl=new OrbitControls(cam,canvas);ctl.enableDamping=true;ctl.dampingFactor=0.08;
{const pm=new THREE.PMREMGenerator(R);scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture;}
scene.add(new THREE.HemisphereLight(0xbfefff,0x081420,1.1));const dl=new THREE.DirectionalLight(0xffffff,1.6);dl.position.set(1,-1,2);dl.castShadow=!MOBILE;dl.shadow.mapSize.set(2048,2048);dl.shadow.bias=-0.0004;dl.shadow.normalBias=0.02;scene.add(dl);scene.add(dl.target);const rim=new THREE.DirectionalLight(0x37e0ff,1.2);rim.position.set(-2,2,1);scene.add(rim);
const lab=new THREE.Group();scene.add(lab);
// ---------- production render: AO + MSAA composer (desktop), studio backdrop, baked contact shadow ----------
let composer=null,gtao=null;const POST=!MOBILE&&R.capabilities.isWebGL2&&!/[?&]nopost/.test(location.search);
if(POST){try{const rt=new THREE.WebGLRenderTarget(4,4,{samples:4,type:THREE.HalfFloatType});composer=new EffectComposer(R,rt);composer.addPass(new RenderPass(scene,cam));gtao=new GTAOPass(scene,cam,4,4);gtao.output=GTAOPass.OUTPUT.Default;gtao.blendIntensity=0.9;composer.addPass(gtao);composer.addPass(new OutputPass());}catch(e){composer=null;}}
function backdrop(){const c=document.createElement("canvas");c.width=16;c.height=256;const x=c.getContext("2d"),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,"#0d2236");g.addColorStop(0.55,"#0a1a2b");g.addColorStop(1,"#050d18");x.fillStyle=g;x.fillRect(0,0,16,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const BACK=backdrop();
function radialTex(inner,outer,stops){const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d"),g=x.createRadialGradient(128,128,0,128,128,128);for(const[o,col]of stops)g.addColorStop(o,col);x.fillStyle=g;x.fillRect(0,0,256,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const SHADOW_T=radialTex(0,1,[[0,"rgba(0,0,0,0.62)"],[0.45,"rgba(0,0,0,0.38)"],[1,"rgba(0,0,0,0)"]]),FLOOR_T=radialTex(0,1,[[0,"rgba(255,255,255,1)"],[0.6,"rgba(255,255,255,.55)"],[1,"rgba(255,255,255,0)"]]);
let contact=null,floor=null;
function stageFX(S,fx,fy,real){for(const o of[contact,floor])if(o)scene.remove(o);
 contact=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:SHADOW_T,transparent:true,depthWrite:false,opacity:real?0.9:0.45}));contact.scale.set(fx*1.35+S*0.08,fy*1.35+S*0.08,1);contact.position.z=S*0.002;contact.renderOrder=1;scene.add(contact);
 floor=new THREE.Mesh(new THREE.CircleGeometry(S*2.2,64),new THREE.MeshStandardMaterial({color:0x0e2133,roughness:.88,metalness:.05,transparent:true,alphaMap:FLOOR_T,depthWrite:false}));floor.position.z=-S*0.001;floor.receiveShadow=true;floor.visible=real;scene.add(floor);
 scene.background=real?BACK:null;}
function renderFrame(){if(composer&&LOOK=="real"){composer.render();}else R.render(scene,cam);}
function buildCube(size){lab.clear();const s=size;const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s,s,s)),new THREE.LineBasicMaterial({color:0x37e0ff,transparent:true,opacity:.45}));e.position.z=s/2-s*0.02;lab.add(e);
 const g=new THREE.GridHelper(s,20,0x37e0ff,0x15506e);g.rotation.x=Math.PI/2;g.material.transparent=true;g.material.opacity=.35;lab.add(g);
 const ringG=new THREE.RingGeometry(s*0.32,s*0.335,96),rm=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0x37e0ff,transparent:true,opacity:.35,side:2}));rm.name="ring";lab.add(rm);
 const pts=new THREE.BufferGeometry(),a=[];for(let i=0;i<300;i++)a.push((Math.random()-.5)*s,(Math.random()-.5)*s,Math.random()*s);pts.setAttribute("position",new THREE.Float32BufferAttribute(a,3));
 const pm=new THREE.Points(pts,new THREE.PointsMaterial({color:0x7ff0ff,size:s/250,transparent:true,opacity:.6}));pm.name="dust";lab.add(pm);}
const holo=()=>new THREE.MeshPhysicalMaterial({color:0x6fdcff,metalness:.35,roughness:.25,clearcoat:1,transparent:true,opacity:.92,emissive:0x0a3550,side:2});
// ---------- realistic PBR look (per material) ----------
let LOOK=localStorage.hf_look||"real",explode=0,explodeGoal=0;const MC=new Map();
function woodTex(base){const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d"),col=new THREE.Color(base);x.fillStyle="#"+col.getHexString();x.fillRect(0,0,256,256);
 for(let i=0;i<70;i++){const y=Math.random()*256,a=Math.random()*0.18+0.04;x.strokeStyle=`rgba(60,30,10,${a})`;x.lineWidth=Math.random()*2.2+0.4;x.beginPath();x.moveTo(0,y);for(let k=0;k<=256;k+=16)x.lineTo(k,y+Math.sin(k/40+i)*3+Math.random()*1.5);x.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
const KIND=k=>{k=(k||"").toLowerCase();return /paint_/.test(k)?"paint":/steel|iron|hw|bought|stainless|chrom/.test(k)?"steel":/alu/.test(k)?"alu":/brass|gold|copper|bronze/.test(k)?"brass":/wood|cedar|pt|pine|ply|osb|mdf|oak|maple|pegboard|lumber/.test(k)?"wood":/rubber|tire|tpu/.test(k)?"rubber":/glass|acrylic|polycarb/.test(k)?"glass":/carbon/.test(k)?"carbon":/concrete|stone|block/.test(k)?"concrete":/fabric|canvas|cloth|shade/.test(k)?"fabric":/roof|metal sheet/.test(k)?"roof":/silicone|foam/.test(k)?"soft":"plastic";};
function pbr(key,color){const kind=KIND(key),id=kind+"|"+color;if(MC.has(id))return MC.get(id);const c=new THREE.Color(color??0xb0b8c0);let m;
 if(kind=="steel")m=new THREE.MeshStandardMaterial({color:color==null?0x9aa3ad:c,metalness:.85,roughness:.38});
 else if(kind=="alu")m=new THREE.MeshStandardMaterial({color:color==null?0xd5dde5:c,metalness:.9,roughness:.28});
 else if(kind=="brass")m=new THREE.MeshStandardMaterial({color:color==null?0xc9a23a:c,metalness:1,roughness:.24});
 else if(kind=="wood")m=new THREE.MeshStandardMaterial({color:0xffffff,map:woodTex(color==null?0xd9a35b:c),roughness:.72,metalness:0});
 else if(kind=="rubber")m=new THREE.MeshStandardMaterial({color:color==null?0x222428:c,roughness:.92});
 else if(kind=="glass")m=new THREE.MeshPhysicalMaterial({color:color==null?0xbfe9ff:c,roughness:.05,metalness:0,transparent:true,opacity:.45,clearcoat:1});
 else if(kind=="carbon")m=new THREE.MeshPhysicalMaterial({color:color==null?0x2a2e34:c,roughness:.35,clearcoat:1,clearcoatRoughness:.15});
 else if(kind=="concrete")m=new THREE.MeshStandardMaterial({color:color==null?0xa7a39b:c,roughness:.95});
 else if(kind=="fabric")m=new THREE.MeshStandardMaterial({color:color==null?0xeee6d0:c,roughness:1,side:2});
 else if(kind=="roof")m=new THREE.MeshStandardMaterial({color:color==null?0x5a6470:c,metalness:.6,roughness:.45,side:2});
 else if(kind=="soft")m=new THREE.MeshStandardMaterial({color:color==null?0xe8c3a8:c,roughness:.6});
 else if(kind=="paint")m=new THREE.MeshPhysicalMaterial({color:c,roughness:.35,clearcoat:.6});
 else m=new THREE.MeshPhysicalMaterial({color:color==null?0x4aa3df:c,roughness:.42,metalness:0,clearcoat:.25});
 m.polygonOffset=true;m.polygonOffsetFactor=1;m.polygonOffsetUnits=1;MC.set(id,m);return m;}
let ground=null,camGoal=null,tgtGoal=null;
function showGeos(items,opt={}){if(mesh)scene.remove(mesh);mesh=new THREE.Group();let bb=new THREE.Box3();const real=LOOK=="real",many=items.length>400;
 for(const it of items){const mat=real?pbr(it.paint||it.m||curMatKey(),it.color??null):holo();if(!real&&it.color)mat.color.set(it.color);const m=new THREE.Mesh(it.geo,mat);m.castShadow=m.receiveShadow=real&&!MOBILE;
  if(!many){const ed=new THREE.LineSegments(new THREE.EdgesGeometry(it.geo,28),new THREE.LineBasicMaterial({color:real?0x0d1a22:0xbff6ff,transparent:true,opacity:real?.28:.5}));m.add(ed);}
  m.userData.label=it.n||null;m.userData.mat=it.m||null;m.userData.sub=it.sub||null;
  const piv=new THREE.Group();piv.add(m);piv.position.set(it.x||0,0,0);piv.rotation.z=it.rz||0;piv.userData=it;mesh.add(piv);}
 scene.add(mesh);mesh.updateMatrixWorld(true);bb.setFromObject(mesh);const c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3()),S=Math.max(sz.x,sz.y,sz.z)||1;
 mesh.position.set(-c.x,-c.y,-bb.min.z);mesh.userData.center=c;buildCube(S*1.6);const d=S*2.1;cam.near=S/100;cam.far=S*100;cam.updateProjectionMatrix();
 const goal=new THREE.Vector3(d*0.8,-d,d*0.75),tg=new THREE.Vector3(0,0,sz.z/2);if(!opt.keepCam){camGoal=goal;tgtGoal=tg;}
 if(cam.position.length()<1||cam.position.length()>d*20)cam.position.copy(goal);
 if(ground)scene.remove(ground);ground=new THREE.Mesh(new THREE.PlaneGeometry(S*6,S*6),new THREE.ShadowMaterial({opacity:.28}));ground.receiveShadow=true;ground.visible=real&&!MOBILE;scene.add(ground);
 stageFX(S,sz.x,sz.y,real);lab.children.forEach(o=>{if(o.isLineSegments)o.visible=!real;if(o.isGridHelper){o.material.opacity=real?.12:.35;}});
 dl.position.set(S*0.9,-S*1.1,S*2);dl.target.position.set(0,0,0);const sc=dl.shadow.camera;sc.left=sc.bottom=-S*1.2;sc.right=sc.top=S*1.2;sc.near=S*0.1;sc.far=S*6;sc.updateProjectionMatrix();
 lab.visible=true;lab.traverse(o=>{if(o.name=="dust")o.visible=!real;});
 mesh.scale.set(1,1,0.001);mesh.userData.t0=performance.now();setWire($("#tWire").classList.contains("on"));applyExplode(true);}
function projItems(ev){return ev.comps3d.length<=400&&ev.comps3d.length>=ev.parts.length*0?ev.comps3d.map(c=>({geo:c.geo,m:c.m,paint:c.paint,n:c.n,sub:c.sub,color:(PJ.MATP[c.paint]||PJ.MATP[c.m]||{}).col})):ev.items;}
function curMatKey(){return cur&&!cur.proj?cur.mat:"plastic";}
function applyExplode(now){if(!mesh)return;const c=mesh.userData.center||new THREE.Vector3();if(now)explode=explodeGoal;mesh.children.forEach(p=>{const m=p.children[0];if(!m||!m.geometry)return;if(!m.userData.c){m.geometry.computeBoundingBox();m.userData.c=m.geometry.boundingBox.getCenter(new THREE.Vector3()).sub(c);}m.position.copy(m.userData.c).multiplyScalar(explode*0.9);});}
function setWire(w){mesh&&mesh.traverse(o=>{if(o.isMesh)o.material.wireframe=w;});}
function resize(){const r=$("#stage").getBoundingClientRect();if(!r.width)return;R.setSize(r.width,r.height,false);if(composer){const pr=R.getPixelRatio();composer.setPixelRatio(pr);composer.setSize(r.width,r.height);}cam.aspect=r.width/r.height;cam.updateProjectionMatrix();}
addEventListener("resize",resize);
function loop(){requestAnimationFrame(loop);const t=clock.getElapsedTime();if(camGoal){cam.position.lerp(camGoal,0.12);ctl.target.lerp(tgtGoal,0.12);if(cam.position.distanceTo(camGoal)<camGoal.length()*0.002)camGoal=null;}if(Math.abs(explode-explodeGoal)>0.002){explode+=(explodeGoal-explode)*0.15;applyExplode();}ctl.update();if(spin&&mesh)mesh.rotation.z+=0.005;
 if(mesh&&mesh.userData.t0){const k=Math.min(1,(performance.now()-mesh.userData.t0)/700);mesh.scale.z=0.001+(1-Math.pow(1-k,3));if(k>=1)mesh.userData.t0=0;}
 const rg=lab.getObjectByName("ring");if(rg){rg.rotation.z=t*0.3;}const du=lab.getObjectByName("dust");if(du)du.rotation.z=-t*0.03;
 if(asm&&anim)mesh.children.forEach(p=>p.userData.move&&p.userData.move(p.children[0],t*1.5));
 renderFrame();pins();}
loop();
function pins(){const box=$("#pins");if(!cur||!mesh||asm){box.innerHTML="";return;}const r=canvas.getBoundingClientRect();let h="";
 if($("#tInspect").classList.contains("on"))cur.issues.forEach((i,n)=>{const v=new THREE.Vector3(...i.pos).add(mesh.position).project(cam);if(v.z>1)return;h+=`<div class="pin ${i.sev}" style="left:${(v.x+1)/2*r.width}px;top:${(1-v.y)/2*r.height}px">${n+1}</div>`;});box.innerHTML=h;}
// ---------- forging ----------
const F_DEF=50;
function forge(text,quiet){text=text||$("#q").value.trim();if(!text)return;asm=null;$("#tAnim").hidden=true;
 const rt=PJ.route(text,LEARN,CTX.words());if(rt&&rt.clarify){const c=clarifyHTML(rt.clarify,text);$("#answer").innerHTML=c.html;return{clarify:true};}if(rt){const pp=PJ.planProject(rt.id,text);addNode({proj:rt.id,p:pp.p,label:"Original",log:[...pp.why,"Matched because "+rt.why+"."]},null);if(!quiet)explain("Project from your words:",cur.log);return{proj:rt.id,why:cur.log};}
 const pl=B.plan(text);if(!pl){say(`I don't have that in the built-in library yet. Try one of: ${Object.values(L.PARTS).map(p=>p.name.replace(/_/g," ")).join(", ")}.`+(aiKey()?" (Your AI key is set, but AI-made shapes are not in the web preview yet.)":""));return null;}
 addNode({name:pl.name,p:pl.p,mat:pl.mat,F:pl.F,label:"Original",log:pl.why},null);if(!quiet)explain("Built from your words:",pl.why);return pl;}
function explain(head,lines){const a=$("#answer");a.innerHTML=`<b>${head}</b><ul class="why">${lines.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>`;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
function evalNode(n){if(n.sketch){const g=SK.solid(n.sketch);const I=SK.inspect(n.sketch,g);n.geo=g;n.ins=I;n.issues=I.issues.map(i=>({sev:i.lvl,note:i.t,pos:[0,0,0]}));n.safety=I.issues.some(i=>i.lvl=='high')?1:3;n.mass=I.kg;n.cost=I.cost;n.name=n.name||'sketch_part';return n;}
 if(n.proj){const ev=PJ.evalProject(n.proj,n.p);n.ev=ev;n.issues=[];n.safety=3;n.mass=ev.kg;n.cost=ev.cost;n.name=ev.name;return n;}
const g=L.buildGeo(n.name,n.p),W=L.massOf(n.name,n.p,n.mat,g);n.issues=L.inspect(n.name,n.p,n.mat,n.F);n.safety=L.score(n.issues);n.geo=g;n.mass=W.kg;n.cost=W.cost;n.wnote=W.note;return n;}
function addNode(n,parent){n.id=tree.length;n.parent=parent;n.t=new Date();tree.push(n);select(n.id);}
function select(id){curId=id;cur=evalNode(tree[id]);asm=null;if(cur.proj){showGeos(projItems(cur.ev));renderProj();CTX.note('build',{id:cur.proj});uiState();return;}if(cur.sketch){showGeos([{geo:cur.geo}]);renderSketch();uiState();return;}showGeos([{geo:cur.geo}]);render();uiState();}
function fmtMass(kg){return kg>=1000?(kg/1000).toFixed(2)+" t":kg>=1?kg.toFixed(2)+" kg":(kg*1000).toFixed(1)+" g";}
function render(){const n=cur,P=L.PARTS[n.name],b=n.geo.boundingBox,sz=b.getSize(new THREE.Vector3());
 $("#title").innerHTML=IC.icon("part")+" "+esc(n.name.replace(/_/g," ").toUpperCase()+" · "+n.label);
 const big=sz.x>5000;$("#stats").innerHTML=`${big?(sz.x/1000).toFixed(1)+" × "+(sz.y/1000).toFixed(1)+" × "+(sz.z/1000).toFixed(1)+" m":sz.x.toFixed(1)+" × "+sz.y.toFixed(1)+" × "+sz.z.toFixed(1)+" mm"}<br>${n.mat} · ${fmtMass(n.mass)} · ≈$${n.cost<10?n.cost.toFixed(2):Math.round(n.cost).toLocaleString()} material${n.F?` · load ${n.F.toFixed(0)} N`:""}${n.wnote?`<br><small>${n.wnote}</small>`:""}<br>Safety score ${n.safety.toFixed(1)} / 3`;
 const real=n.issues.filter(i=>i.sev!="info");$("#issues").innerHTML=(real.length?"":`<div class="ok">${IC.icon("check")} No weak points found at this load.</div>`)+n.issues.map((i,k)=>`<div class="iss ${i.sev}">${i.sev=="info"?"ℹ":"<b>"+(k+1)+"</b>"} ${i.note}</div>`).join("");
 const o=$("#opts");o.innerHTML="";const opts=L.options(n.name,n.p,n.mat,n.F);const ic={Lighter:"",Stronger:"",Cheaper:""};
 for(const op of opts){const b=document.createElement("button");b.innerHTML=`${ic[op.name]} ${op.name}<small>safety ${op.safety} · ${op.issues} issue${op.issues==1?"":"s"}</small>`;b.title=op.log.join("\n")||"no change";b.onclick=()=>{addNode({name:n.name,p:op.p,mat:op.mat||n.mat,F:n.F,label:op.name,log:op.log},n.id);say(`${op.name}: `+(op.log.slice(0,4).join("; ")||"no change needed")+".",true);};o.append(b);}
 const pr=$("#params");pr.innerHTML="";for(const k in P.P){const[d,lo,hi,lab]=P.P[k];const st=hi-lo>50?1:hi-lo>5?0.5:0.1;const w=document.createElement("div");w.className="prm";
  w.innerHTML=`<span>${lab}</span><input type="number" step="${st}" value="${n.p[k]}"><input type="range" min="${lo}" max="${hi}" step="${st}" value="${n.p[k]}">`;const[num,rng]=w.querySelectorAll("input");
  const set=v=>{n.p[k]=+v;num.value=v;rng.value=v;evalNode(n);showGeos([{geo:n.geo}],{keepCam:true});mesh.scale.z=1;mesh.userData.t0=0;render();};rng.oninput=e=>set(e.target.value);num.onchange=e=>set(e.target.value);pr.append(w);}
 drawTree();}
const fmtUSD=c=>"$"+(c<10?c.toFixed(2):Math.round(c).toLocaleString());
const fmtP=(v,u)=>u=="b"?(v?"yes":"no"):v+(u&&u!="n"?" "+u:"");
function renderProj(){const n=cur,ev=n.ev,D=PJ.PROJECTS[n.proj];const sz0=mesh.scale.z;mesh.scale.z=1;mesh.updateMatrixWorld(true);const sz=new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());mesh.scale.z=sz0;mesh.updateMatrixWorld(true);
 $("#title").innerHTML=IC.icon(IC.catIcon(D.cat||""))+" "+esc(ev.name.toUpperCase())+" · "+esc(n.label);const lb=ev.kg*2.2046;
 $("#stats").innerHTML=`${(sz.x/1000).toFixed(2)} × ${(sz.y/1000).toFixed(2)} × ${(sz.z/1000).toFixed(2)} m · ${(PJ.MATP[n.p.mat]||{}).n||n.p.mat}<br>${fmtMass(ev.kg)} (${Math.round(lb).toLocaleString()} lb) · ≈${fmtUSD(ev.cost)} materials &amp; parts${ev.watts?` · ${Math.round(ev.watts).toLocaleString()} W peak`:""}<br>${ev.parts.length} line items · ${ev.parts.reduce((a,r)=>a+r.q,0)} pieces`;
 let h="";const ms=PJ.megaSummary(ev);
 if(ms){h+=`<div class="bs"><b>System breakdown</b>${ms.map(l=>`<div class="iss info">${IC.icon("chip")} ${esc(l)}</div>`).join("")}</div>`;
  const R=ev.rep;h+=`<div class="bs"><b>Self-replication estimate</b><div class="iss info">Makes in-house (print + fab): <b>${R.pctDesigns}%</b> of unique part designs · <b>${R.pctCount}%</b> of pieces · <b>${R.pctCost}%</b> of cost. Bought: ${R.count.source} pieces (${fmtUSD(R.cost.source)}) — motors, chips, bearings, batteries.</div></div>`;
  if(ev.roadmap)h+=`<details class="bs" open><summary><b>Staged roadmap</b></summary>${ev.roadmap.map(([a,b])=>`<div class="iss info"><b>${esc(a)}</b> — ${esc(b)}</div>`).join("")}</details>`;}
 if(ev.notes.length)h+=`<div class="bs"><b>Engineering notes</b>${ev.notes.map(l=>`<div class="iss info">${esc(l)}</div>`).join("")}</div>`;
 const bySub=ms?[...ev.subs.keys()]:[null];
 h+=`<details class="bs" open><summary><b>Cut / parts list</b> (${ev.parts.length})</summary><table class="kt cut"><tr><th>Part</th><th>Qty</th><th>Material</th><th>Size</th><th>kg</th><th>$</th>${ms?"<th>Make</th>":""}</tr>${bySub.map(sb=>(sb?`<tr><td colspan="7" class="sub">${esc(sb)}</td></tr>`:"")+ev.parts.filter(r=>!sb||r.sub==sb).map(r=>`<tr><td>${esc(r.n)}</td><td>${r.q}</td><td>${esc(r.m)}</td><td>${esc(r.dims)}</td><td>${r.kg.toFixed(r.kg<1?2:1)}</td><td>${Math.round(r.cost)}</td>${ms?`<td>${r.rep}</td>`:""}</tr>`).join("")).join("")}</table></details>`;
 h+=`<details class="bs"><summary><b>Build steps</b></summary><ol>${ev.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></details>`;
 h+=`<details class="bs" open><summary><b>Safety</b></summary>${ev.safety.map(s=>`<div class="iss med">${IC.icon("help")} ${esc(s)}</div>`).join("")}</details>`;
 $("#issues").innerHTML=h;
 const o=$("#opts");o.innerHTML="";const acts=[["Bigger","make it bigger"],["Smaller","make it smaller"],...D.mats.filter(m=>m!=n.p.mat).slice(0,3).map(m=>[""+(PJ.MATP[m]||{n:m}).n,"use "+({pt:"pressure treated",alu:"aluminum",ply:"plywood",pla:"pla",petg:"petg",abs:"abs",wood:"wood",steel:"steel",cedar:"cedar",carbon:"carbon",acrylic:"acrylic",mdf:"plywood"}[m]||m)])];
 for(const[lbl,cmd]of acts){const b=document.createElement("button");b.innerHTML=lbl;b.onclick=()=>{const r=projEdit(cmd);if(r)say(r.text,true);};o.append(b);}
 const pr=$("#params");pr.innerHTML="";for(const k in D.P){const[d,lo,hi,lab,u]=D.P[k];if(lab=="-"||(lo==hi&&u!="b"))continue;const w=document.createElement("div");w.className="prm";
  if(u=="b"){w.innerHTML=`<span>${lab}</span><input type="checkbox" ${n.p[k]?"checked":""}>`;w.querySelector("input").onchange=e=>{const p={...n.p,[k]:e.target.checked?1:0};addNode({proj:n.proj,p,label:(e.target.checked?"+ ":"− ")+lab,log:[`${lab} ${e.target.checked?"added":"removed"}`]},n.id);};pr.append(w);continue;}
  const st=hi-lo>50?1:hi-lo>5?0.5:0.1;w.innerHTML=`<span>${lab}${u&&u!="n"?" ("+u+")":""}</span><input type="number" step="${st}" value="${n.p[k]}"><input type="range" min="${lo}" max="${hi}" step="${st}" value="${n.p[k]}">`;const[num,rng]=w.querySelectorAll("input");
  const set=v=>{n.p[k]=+v;num.value=v;rng.value=v;evalNode(n);showGeos(projItems(n.ev),{keepCam:true});mesh.scale.z=1;mesh.userData.t0=0;renderProj();};rng.onchange=e=>set(e.target.value);num.onchange=e=>set(e.target.value);pr.append(w);}
 drawTree();}
function projHints(n){const D=PJ.PROJECTS[n.proj],h=["“make it bigger”"];if(D.size)h.push("“"+D.size.slice(0,2).map(k=>Math.round(n.p[k]*1.25)).join("x")+"”");const b=Object.keys(D.P).filter(k=>D.P[k][4]=="b"&&D.P[k][3]!="-");for(const k of b.slice(0,2)){const w=((D.P[k][5]||[])[0]||D.P[k][3]||k).toLowerCase().replace(/[?\\()|]/g,"").replace(/s$/,"");h.push(n.p[k]?`“no ${w}”`:`“add ${w}”`);};const m=D.mats.find(m=>m!=n.p.mat);if(m)h.push(`“use ${(PJ.MATP[m]||{n:m}).n.toLowerCase()}”`);return h.join(", ");}
function evSize(ev){const b=new THREE.Box3();for(const it of ev.items){it.geo.computeBoundingBox();b.union(it.geo.boundingBox);}return b.getSize(new THREE.Vector3());}
const sgn=(v,f)=>(v>0?"+":v<0?"−":"±")+f(Math.abs(v));
function diffHTML(a,b){const sa=evSize(a.ev),sb=evSize(b.ev),dk=b.ev.kg-a.ev.kg,dc=b.ev.cost-a.ev.cost,cls=v=>v>0?"up":v<0?"dn":"";const m=v=>(v/1000).toFixed(2)+" m";
 const ch=[];const D=PJ.PROJECTS[b.proj];for(const k in D.P)if(a.p[k]!==b.p[k])ch.push(`${D.P[k][3]}: ${fmtP(a.p[k],D.P[k][4])} → ${fmtP(b.p[k],D.P[k][4])}`);if(a.p.mat!==b.p.mat)ch.push(`Material: ${(PJ.MATP[a.p.mat]||{}).n} → ${(PJ.MATP[b.p.mat]||{}).n}`);
 if(JSON.stringify(a.p._part||{})!=JSON.stringify(b.p._part||{}))ch.push("Sub-part sizes: "+Object.entries(b.p._part||{}).map(([w,o])=>w+" "+Object.entries(o).map(([k,v])=>k[0]=="s"?"×"+v+" "+k.slice(1):k.slice(1)+"="+Math.round(v)+" mm").join(",")).join("; "));
 if(JSON.stringify(a.p._paint||{})!=JSON.stringify(b.p._paint||{}))ch.push("Paint: "+Object.entries(b.p._paint||{}).map(([w,c])=>w+" "+c).join(", "));
 return`<table class="kt cmp"><tr><th></th><th>G${a.id}</th><th>G${b.id}</th><th>Δ</th></tr><tr><td>Size</td><td>${m(sa.x)}×${m(sa.y)}×${m(sa.z)}</td><td>${m(sb.x)}×${m(sb.y)}×${m(sb.z)}</td><td>${[["L",sb.x-sa.x],["W",sb.y-sa.y],["H",sb.z-sa.z]].filter(([,v])=>Math.abs(v)>0.5).map(([k,v])=>k+" "+sgn(v,m)).join(", ")||"±0"}</td></tr><tr><td>Weight</td><td>${fmtMass(a.ev.kg)}</td><td>${fmtMass(b.ev.kg)}</td><td class="${cls(dk)}">${sgn(dk,fmtMass)}</td></tr><tr><td>Cost</td><td>${fmtUSD(a.ev.cost)}</td><td>${fmtUSD(b.ev.cost)}</td><td class="${cls(dc)}">${sgn(dc,fmtUSD)}</td></tr><tr><td>Line items</td><td>${a.ev.parts.length}</td><td>${b.ev.parts.length}</td><td>${sgn(b.ev.parts.length-a.ev.parts.length,String)}</td></tr></table>${ch.length?`<div class="diff">Changed: ${ch.map(esc).join(" · ")}</div>`:`<div class="diff">No parameter differences.</div>`}`;}
function projEdit(s){const f=PJ.projFollow(s,cur);if(!f)return null;CTX.note('edit',{text:s});const from=cur.id,prev=cur;addNode({proj:cur.proj,p:f.p,label:f.label,log:f.log},from);
 return{html:`<b>G${cur.id} · ${esc(f.label)}</b> (from G${from}) — ${esc(cur.ev.name)}<ul class="why">${f.log.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>${diffHTML(prev,cur)}<small>Say “undo” to go back or “compare to last version”.</small>`,text:`${f.label}. ${f.log.slice(0,2).join(". ")}. Weight ${fmtMass(cur.mass)}, cost about ${fmtUSD(cur.cost)}.`};}
function drawTree(){const t=$("#tree");t.classList.remove("muted");const kids=id=>tree.filter(x=>x.parent===id);let h="";
 const walk=(n,d)=>{h+=`<div class="node ${n.id===curId?"cur":""}" data-id="${n.id}" style="margin-left:${d*14}px">${d?"└ ":""}<b>G${n.id}</b> ${n.label} · ${n.proj?esc(n.name||PJ.PROJECTS[n.proj].name):n.name.replace(/_/g," ")+" · safety "+(n.safety??L.score(L.inspect(n.name,n.p,n.mat,n.F))).toFixed(1)}</div>`;kids(n.id).forEach(k=>walk(k,d+1));};
 tree.filter(x=>x.parent===null).forEach(r=>walk(r,0));t.innerHTML=h;t.querySelectorAll(".node").forEach(e=>e.onclick=()=>select(+e.dataset.id));}
function buildAsm(k){const A=L.ASSEMBLIES[k];asm=k;cur=null;const parts=A.build();showGeos(parts);mesh.scale.z=1;mesh.userData.t0=0;$("#tAnim").hidden=false;anim=true;$("#tAnim").classList.add("on");
 $("#title").innerHTML=IC.icon("assembly")+" "+esc(A.name.toUpperCase());$("#stats").innerHTML=`${parts.length} parts · joint: ${A.joint}<br>${parts.map(p=>p.name).join(" · ")}`;
 $("#issues").innerHTML=`<div class="muted">Assembly preview: press Move to run the ${A.joint} joint. Stress checks for assemblies are coming.</div>`;$("#opts").innerHTML="";$("#params").innerHTML="";}
// ---------- tools ----------
const tog=(id,f)=>$(id).onclick=()=>{$(id).classList.toggle("on");f($(id).classList.contains("on"));};
tog("#tInspect",()=>{});tog("#tExplode",v=>{explodeGoal=v?1:0;});
$("#tLook").innerHTML=IC.icon(LOOK=="real"?"look":"invent")+`<em>${LOOK=="real"?"Real":"Holo"}</em>`;$("#tLook").onclick=()=>{LOOK=LOOK=="real"?"holo":"real";localStorage.hf_look=LOOK;$("#tLook").innerHTML=IC.icon(LOOK=="real"?"look":"invent")+`<em>${LOOK=="real"?"Real":"Holo"}</em>`;if(cur)select(cur.id);};
// ---------- hover labels + click a part for edit chips ----------
const ray=new THREE.Raycaster(),mp=new THREE.Vector2();let hovT=0;
function pick(e){if(!mesh)return null;const r=canvas.getBoundingClientRect();mp.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mp,cam);const h=ray.intersectObject(mesh,true).find(x=>x.object.isMesh);return h?{o:h.object,r,e}:null;}
canvas.addEventListener("pointermove",e=>{const now=performance.now();if(now-hovT<60)return;hovT=now;const h=pick(e),tip=$("#tip");if(!h||!h.o.userData.label){tip.hidden=true;return;}tip.hidden=false;const u=h.o.userData;tip.innerHTML=`<b>${esc(u.label)}</b>${u.mat?" · "+esc((PJ.MATP[u.mat]||{n:u.mat}).n):""}${u.sub?"<br><small>"+esc(u.sub)+"</small>":""}`;tip.style.left=(e.clientX-h.r.left+14)+"px";tip.style.top=(e.clientY-h.r.top+10)+"px";});
canvas.addEventListener("pointerleave",()=>$("#tip").hidden=true);
let downAt=null;canvas.addEventListener("pointerdown",e=>downAt=[e.clientX,e.clientY]);
canvas.addEventListener("pointerup",e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5)return;const h=pick(e);if(!h||!cur||!cur.proj||!h.o.userData.label)return;partChips(h.o.userData.label);});
function partChips(label){const chips=PJ.partSuggestions(cur.proj,cur.p,label);const a=$("#answer");a.innerHTML=`<b>${esc(label)}</b> — suggested edits:<div class="pchips">${chips.map(c=>`<button class="alt" data-edit="${esc(c)}">${esc(c)}</button>`).join(" ")}</div>`;}
$("#answer").addEventListener("click",e=>{const b=e.target.closest("button[data-edit]");if(!b)return;if(b.dataset.pick&&b.dataset.head)PJ.U.PREF.log(b.dataset.head,b.dataset.pick);ask(b.dataset.edit);});tog("#tWire",setWire);tog("#tSpin",v=>spin=v);tog("#tAnim",v=>anim=v);
$("#tStl").onclick=exportSTL;
function exportSTL(){if(!mesh)return say("Build something first.");mesh.updateMatrixWorld(true);const ex=new STLExporter(),s=new THREE.Scene(),c=mesh.clone(true);c.scale.set(1,1,1);c.position.set(0,0,0);c.rotation.z=0;
 c.traverse(o=>{if(o.isLineSegments)o.visible=false;});s.add(c);const data=ex.parse(s,{binary:true});
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"model/stl"}));a.download=(cur?String(cur.name||"part").replace(/\W+/g,"_")+"_G"+cur.id:asm)+".stl";a.click();say("STL downloaded. Units are millimetres.");}
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
async function ask(q){if($("#lab").hidden)enter("projects",{noDefault:true});busy(true,"Thinking…");try{return await ask1(q);}finally{busy(false);}}
let LXI=null;async function ask1(q){q=(q||$("#aq").value).trim();if(!q)return;$("#aq").value="";try{await(LXI||(LXI=PJ.LX.init()));await PJ.LX.ensure(q);}catch(e){}
 const steps=q.split(/\s*(?:,?\s*then\s+|;\s*|\band then\b)\s*/i).filter(Boolean);const out=[];
 for(const s of steps){const r=await one(s);if(r&&r.html){say(r.text);$("#answer").innerHTML=r.html;return;}if(r)out.push(r);}if(out.length)say(out.join("\n"));}
function undHTML(s,node,o){try{const rows=PJ.U.grid(s,node&&node.proj?node:null,{o});return`<details class="und"><summary>How I understood this</summary><table class="ugrid"><tr><th>Slot</th><th>Candidates</th><th>Solved</th></tr>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</table></details>`;}catch(e){return"";}}
function clarifyHTML(c,s){CTX.note('clarify',{chips:c.chips,head:c.head});return{html:`<b>${esc(c.q)}</b><div class="pchips">${c.chips.map((x,i)=>`<button class="alt" data-edit="${esc(x.ask)}" data-pick="${esc(x.id||'')}" data-head="${esc(c.head||'')}"><span class="n">${i+1}</span>${esc(x.label)}</button>`).join("")}</div><small class="muted">Tap one, or say “the second one”.</small>${undHTML(s,null,PJ.LAST&&PJ.LAST.o)}`,text:c.q+" "+c.chips.map(x=>x.label).join(", ")};}
function defineHTML(w){const d=PJ.LX.define(w);if(!d)return{html:`I couldn't find “${esc(w)}” in the dictionary (WordNet 3.1 + shop jargon).`,text:`No dictionary entry for ${w}.`};
 const j=d.jargon?`<p><b>${esc(w.toUpperCase())}</b> — ${esc(d.jargon.def)} <small>(shop/engineering jargon → “${esc(d.jargon.expand)}”)</small></p>`:"";
 const ss=d.senses.slice(0,6).map(x=>`<li><i>${esc(x.pos)}</i> — ${esc(x.gloss)}${x.syn.length?`<br><small>same as: ${esc(x.syn.join(", "))}</small>`:""}${x.broader.length?`<br><small>a kind of: ${esc(x.broader.join(" → "))}</small>`:""}</li>`).join("");
 return{html:`<b>Define: ${esc(d.word)}</b>${j}${ss?`<ol class="defs">${ss}</ol>`:""}<small class="attr">Definitions from Princeton WordNet 3.1 (WordNet license, see LEXICON-LICENSE.txt).</small>`,text:`${d.word}: ${d.jargon?d.jargon.def:d.senses[0].gloss}`};}
async function one(s){const s0=s;let ctxNote=null;{const r=CTX.resolve(s,cur);if(r&&r.pick){if(r.pick.id&&CTX.turns.at(-1)?.head)PJ.U.PREF.log(CTX.turns.at(-1).head,r.pick.id);ctxNote=r.note;s=r.pick.ask;}else if(r&&r.text){ctxNote=r.note;s=r.text;if(cur&&cur.proj&&!asm){const e=projEdit(s);if(e){const pre=`<div class="ctx">${IC.icon("brain")}<span>${esc(ctxNote||"")}</span></div>`;PRED.remember(s0);return{...e,html:pre+e.html};}}}}
 PRED.remember(s);const res=await one0(s);
 if(ctxNote&&res){const pre=`<div class="ctx">${IC.icon("brain")}<span>${esc(ctxNote)}</span></div>`;return typeof res=="string"?{html:pre+esc(res),text:res}:{...res,html:pre+(res.html||esc(res.text||""))};}return res;}
async function one0(s){const t=s.toLowerCase();
 if(cur&&cur.sketch){const f=SK.follow(s,cur.sketch);if(f){const from=cur.id;addNode({sketch:f.sk,label:"Edit",log:f.log,name:cur.name},from);return{html:`<b>G${cur.id} · sketch edit</b> (from G${from})<ul class="why">${f.log.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>`,text:f.log.join(". ")};}}
 {const dw=PJ.U.defineTarget(s);if(dw){try{await PJ.LX.ensure(dw);}catch(e){}return defineHTML(dw);}}
 if(cur&&cur.proj&&/\b(compare|diff|what changed|versus|vs\.? (the )?(last|previous|original))\b/.test(t)){let other=null;const m=t.match(/\bg(\d+)\b/);if(m&&tree[+m[1]]&&tree[+m[1]].proj==cur.proj)other=evalNode(tree[+m[1]]);else if(/original|first/.test(t)){let n=cur;while(n.parent!=null)n=tree[n.parent];other=evalNode(n);}else if(cur.parent!=null)other=evalNode(tree[cur.parent]);if(!other||other===cur)return"Nothing to compare yet. Make an edit first.";if(other.proj!=cur.proj)return"The last version is a different design.";return{html:`<b>Compare G${other.id} → G${cur.id}</b>${diffHTML(other,cur)}`,text:`Compared G${other.id} with G${cur.id}.`};}
 if(cur&&/^(undo|go back|back|revert)\b/.test(t)){if(cur.parent!=null){const p=cur.parent;select(p);return"Undid that: back to G"+p+".";}return"Nothing to undo.";}
 if(cur&&cur.proj&&!asm){const pr=/^(now |also |and |then )?(make|turn) (it|them|this|that)\b/.test(t)?null:PJ.route(s,LEARN,CTX.words());if(!pr||pr.clarify&&!/^(please\s+)?(make|build|design|create)\s+(me\s+)?(an?|the)\s/.test(t)||pr.id==cur.proj&&(pr.csp||!/^(please\s+)?(make|build|design|create)\s+(me\s+)?(an?|the)\s/.test(t))){const before=cur;const r=projEdit(s);if(r){if(r.html)r.html+=undHTML(s,before);return r;}}}
 const bq=/^(?:please\s+)?(?:make|build|design|forge|create|draw|plan|i need|i want|can you (?:make|build|design|plan)|give me|how (?:do|would|can) (?:i|you) (?:build|make))\b/.test(t)||/\bthink big\b/.test(t);
 {const pr=(bq||mode=="projects")?PJ.route(s,LEARN,CTX.words()):null;const isQ=PJ.U.intentOf(s,!!cur).value=="ask";if(pr&&pr.clarify&&(bq||mode=="projects"&&!isQ))return clarifyHTML(pr.clarify,s);const o0=PJ.LAST&&PJ.LAST.o;if(pr&&!pr.clarify&&(bq||pr.len>0||pr.composed||pr.csp&&!isQ)){if(mode!="projects"&&$("#lab").hidden)enter("projects");$("#q").value=s;const r=forge(s,true);if(r&&r.proj)return{html:`<b>Built G${cur.id}: ${esc(cur.ev.name)}</b><ul class="why">${cur.log.map(l=>`<li>${esc(l)}</li>`).join("")}</ul><small>Try: ${esc(projHints(cur))}.</small>${undHTML(s,null,o0)}`,text:`Built the ${cur.ev.name}. ${fmtMass(cur.mass)}, about ${fmtUSD(cur.cost)}.`};}}
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
const teachBar=(q,ok)=>`<div class="teach">${ok?`<button class="tb" data-wrong="1">${IC.icon("close")} Wrong answer</button>`:""}<button class="tb" data-teach="1">${IC.icon("pen")} Teach it</button></div>`;
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
const learnLbl=()=>{const n=LEARN.aliases.length+LEARN.entries.length;$("#learnBtn").innerHTML=IC.icon("learned")+`<em>Learned ${n}</em>`;};learnLbl();
// ---------- meaning model toggle ----------
const semOn=()=>localStorage.hf_sem!="off";
function semLbl(){const st=SEM.status();$("#semBtn").innerHTML=IC.icon("brain")+"<em>Meaning: "+(!semOn()?"off":{off:"ready",loading:"loading…",on:"on",failed:"unavailable (keywords only)"}[st])+"</em>";}
$("#semBtn").onclick=()=>{if(semOn()&&SEM.status()=="on"){localStorage.hf_sem="off";}else{delete localStorage.hf_sem;SEM.init(semLbl);}semLbl();};semLbl();
$("#ask").onclick=()=>ask();$("#aq").onkeydown=e=>{if(e.key=="Enter")ask();};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
$("#mic").onclick=()=>{if(!SR)return say("Voice input needs Chrome, Edge or Safari. You can still type.");const r=new SR();r.lang="en-US";r.interimResults=false;$("#mic").classList.add("rec");
 r.onresult=e=>{const q=e.results[0][0].transcript;$("#aq").value=q;ask(q);};r.onend=()=>$("#mic").classList.remove("rec");r.onerror=()=>say("I didn't catch that.",true);r.start();};
// ---------- AI key (optional, browser only) ----------
const aiKey=()=>localStorage.hf_key||"";const aiLbl=()=>$("#aiBtn").innerHTML=IC.icon("ai")+"<em>AI: "+(aiKey()?"on ("+(localStorage.hf_prov||"xai")+")":"off")+"</em>";aiLbl();
$("#aiBtn").onclick=()=>{$("#aiProv").value=localStorage.hf_prov||"xai";$("#aiKey").value="";$("#aiDlg").showModal();};
$("#aiSave").onclick=()=>{const k=$("#aiKey").value.trim();if(k){localStorage.hf_key=k;localStorage.hf_prov=$("#aiProv").value;}aiLbl();$("#aiDlg").close();};
$("#aiClear").onclick=()=>{delete localStorage.hf_key;aiLbl();$("#aiDlg").close();};$("#aiClose").onclick=()=>$("#aiDlg").close();
$("#helpBtn").onclick=()=>$("#helpDlg").showModal();$("#helpClose").onclick=()=>$("#helpDlg").close();
if(location.hash.length>1){const m=location.hash.slice(1);if(["object","bridge","roof","assembly","invent","projects"].includes(m))enter(m);if(m=="sketch")setTimeout(()=>{enter("object",{noDefault:true});window.HF_openSketch();},50);}
window.HF={PJ,ask,forge,tree:()=>tree,cur:()=>cur,sem:()=>SEM.status(),learned:()=>LEARN};

// ---------- sketch pad → 3D ----------
function renderSketch(){const n=cur,I=n.ins,k=n.sketch;$("#title").innerHTML=IC.icon("sketch")+" SKETCH PART · "+esc(n.label);
 $("#stats").innerHTML=`${I.size.map(v=>v.toFixed(1)).join(" × ")} mm · ${esc(I.mat)}<br>${fmtMass(I.kg)} · ${I.cm3.toFixed(1)} cm³ · ≈${fmtUSD(I.cost)} · ${esc(k.op)}`;
 $("#issues").innerHTML=(I.issues.length?I.issues.map((i,j)=>`<div class="iss ${i.lvl}">${i.lvl=="info"?IC.icon("help"):"<b>"+(j+1)+"</b>"} ${esc(i.t)}</div>`).join(""):`<div class="ok">${IC.icon("check")} Printable / makeable as drawn.</div>`)+(n.log?`<ul class="why">${n.log.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>`:"");
 const o=$("#opts");o.innerHTML="";for(const[l,c]of[["Thicker","thicker"],["Bigger","bigger"],["Revolve","revolve it"],["Extrude","extrude it"],["Aluminum","in aluminum"],["Edit sketch",null]]){const b=document.createElement("button");b.textContent=l;b.onclick=()=>c?ask(c):window.HF_openSketch(k);o.append(b);}
 const pr=$("#params");pr.innerHTML="";const w=document.createElement("div");w.className="prm";w.innerHTML=`<span>${k.op=="loft"?"Height":"Depth"} (mm)</span><input type="number" value="${k.D}"><input type="range" min="1" max="300" value="${k.D}">`;const[num,rng]=w.querySelectorAll("input");
 const set=v=>{n.sketch={...n.sketch,D:+v};num.value=v;rng.value=v;evalNode(n);showGeos([{geo:n.geo}],{keepCam:true});mesh.scale.z=1;mesh.userData.t0=0;renderSketch();};rng.onchange=e=>set(e.target.value);num.onchange=e=>set(e.target.value);pr.append(w);drawTree();}
let PAD=null,PAD2=null,SKOP="extrude";
function skPreview(){const info=$("#skInfo");const c=PAD.cleaned();PAD.preview=c;PAD.draw();if(PAD2){PAD2.preview=PAD2.cleaned();PAD2.draw();}
 if(!c){info.textContent=SKOP=="revolve"?"Draw the right half of a profile (or turn on Mirror). It spins around the dashed centre line.":SKOP=="loft"?"Draw a footprint (plan view). It is lofted up to a rounded top.":SKOP=="views"?"Left: side view. Right: front view. Both are combined into one solid.":"Draw a closed outline. A pen's pressure shows as thicker ink.";return null;}
 const sk=skSpec();if(!sk){info.textContent="Keep drawing: the outline needs at least 3 corners.";return null;}try{const g=SK.solid(sk),I=SK.inspect(sk,g);info.innerHTML=`<b>${c.length} corners</b> · ${I.size.map(v=>Math.round(v)).join(" × ")} mm · ${I.cm3.toFixed(1)} cm³ · ${fmtMass(I.kg)} in ${esc(I.mat)}${I.issues.length?"<br>"+esc(I.issues[0].t):""}`;}catch(e){info.textContent="Can't make a solid from that outline yet: "+e.message;}return sk;}
function skSpec(){const W=+$("#skW").value||120,D=+$("#skD").value||20,sym=$("#skSym").checked||SKOP=="revolve",snap=$("#skSnap").checked;const pr=SK.profile(PAD.strokes,{snap,sym,cx:PAD.cv.width/2,widthMM:W});if(!pr)return null;
 const sk={op:SKOP,pts:pr.pts,D,mat:$("#skMat").value,axisX:SKOP=="revolve"?0:pr.axisX};if(SKOP=="views"&&PAD2&&PAD2.strokes.length){const p2=SK.profile(PAD2.strokes,{snap,sym:$("#skSym").checked,cx:PAD2.cv.width/2,widthMM:W*pr.scale/pr.scale*(PAD2.cv.width?1:1)});if(p2){const zs=pr.pts.map(p=>p[1]),hz=Math.max(...zs),z2=Math.max(...p2.pts.map(p=>p[1]))||1,k=hz/z2;sk.pts2=p2.pts.map(([x,y])=>[x*k,y*k]);}}return sk;}
window.HF_openSketch=(k)=>{const d=$("#sketchDlg");if(!PAD){PAD=new SK.Pad($("#skCanvas"),{onChange:skPreview});PAD2=new SK.Pad($("#skCanvas2"),{onChange:skPreview});
  $("#skOp").onclick=e=>{const b=e.target.closest("button[data-op]");if(!b)return;SKOP=b.dataset.op;$("#skOp").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x==b));$("#skPad2").hidden=SKOP!="views";$("#skLbl").textContent=SKOP=="loft"?"Footprint (top view)":SKOP=="views"?"Side view":"Profile (side view)";$("#skDL").firstChild.textContent=SKOP=="loft"?"Height ":SKOP=="views"?"Depth if no front view ":"Depth / thickness ";PAD.sym=$("#skSym").checked||SKOP=="revolve";PAD.draw();skPreview();};
  for(const id of["#skSnap","#skSym","#skW","#skD","#skMat"])$(id).oninput=()=>{PAD.snap=PAD2.snap=$("#skSnap").checked;PAD.sym=$("#skSym").checked||SKOP=="revolve";PAD2.sym=$("#skSym").checked;skPreview();};
  $("#skUndo").onclick=()=>{(SKOP=="views"&&PAD2.strokes.length&&PAD2.lastT>PAD.lastT?PAD2:PAD).undo();};$("#skClear").onclick=()=>{PAD.clear();PAD2.clear();};$("#skClose").onclick=()=>d.close();
  $("#skMake").onclick=()=>{const sk=skPreview();if(!sk){$("#skInfo").textContent="Draw a closed outline first.";return;}d.close();if($("#lab").hidden)enter("object",{noDefault:true});addNode({sketch:sk,label:"Sketch",name:"sketch_"+sk.op,log:[`Drawn outline: ${sk.pts.length} corners, ${sk.op}`,`Material ${SK.MATS[sk.mat].n}`]},null);say(`Made a ${sk.op} part from your sketch. Try “make it 40 mm thick”, “revolve it”, “in aluminum”, or Export STL.`,true);};}
 if(k&&k.op){$("#skOp").querySelector(`[data-op="${k.op}"]`)?.click();}d.showModal();PAD.draw();skPreview();};
$("#sketchBtn").onclick=()=>window.HF_openSketch();
// ---------- home: hero + chips, autocomplete, empty/loading states, onboarding ----------
IC.hydrate(document);
function heroGo(q){q=(q||"").trim();if(!q)return;enter("projects",{noDefault:true});setTimeout(()=>ask(q),30);}
$("#heroForm")?.addEventListener("submit",e=>{e.preventDefault();heroGo($("#heroQ").value);});
document.querySelectorAll("[data-try]").forEach(b=>b.addEventListener("click",()=>heroGo(b.dataset.try)));
document.querySelectorAll("[data-sketch]").forEach(b=>b.addEventListener("click",()=>{enter("object",{noDefault:true});window.HF_openSketch();}));
function uiState(){const e=$("#empty");if(e)e.hidden=!!(cur||asm);}
function busy(on,msg){const l=$("#loading");if(!l)return;l.hidden=!on;if(msg)l.querySelector("span")&&(l.querySelector("span").textContent=msg);}
const _ask=ask;
// autocomplete for the hero box, the forge box and the assistant box
fetch("kb/core.json").then(r=>r.json()).then(k=>PRED.build(k.slice(0,400).map(e=>e.t))).catch(()=>PRED.build());PRED.build();
function attachAC(inp,box,submit){if(!inp||!box)return;let items=[],ix=-1;
 const show=()=>{const r=PRED.suggest(inp.value,{cur:cur&&cur.proj?cur:null});items=r.items||[];ix=-1;if(!items.length&&!(r.next&&r.next.length)){box.hidden=true;return;}
  box.innerHTML=items.map((it,i)=>`<div class="aci" data-i="${i}">${IC.icon({project:"projects",history:"undo",edit:"pen",part:"part",question:"help"}[it.kind]||"send")}<span>${hl(it.text,inp.value)}</span><small>${it.kind}</small></div>`).join("")+(r.next&&r.next.length?`<div class="acn">next word: ${r.next.map(w=>`<button data-w="${esc(w)}">${esc(w)}</button>`).join("")}</div>`:"");box.hidden=false;};
 const hl=(t,q)=>{const w=q.toLowerCase().split(/\s+/).filter(Boolean);return esc(t).replace(new RegExp("\\b("+w.map(x=>x.replace(/[^a-z0-9]/g,"")).filter(Boolean).join("|")+")","gi"),"<b>$1</b>");};
 const choose=i=>{inp.value=items[i].text;box.hidden=true;if(items[i].id)PJ.U.PREF.log("build",items[i].id);submit(inp.value);};
 inp.addEventListener("input",show);inp.addEventListener("focus",()=>inp.value&&show());inp.addEventListener("blur",()=>setTimeout(()=>box.hidden=true,150));
 inp.addEventListener("keydown",e=>{if(box.hidden||!items.length){if(e.key=="Tab"&&items.length){e.preventDefault();}return;}if(e.key=="ArrowDown"||e.key=="ArrowUp"){e.preventDefault();ix=(ix+(e.key=="ArrowDown"?1:-1)+items.length)%items.length;box.querySelectorAll(".aci").forEach((x,i)=>x.classList.toggle("on",i==ix));}
  else if(e.key=="Tab"){e.preventDefault();inp.value=items[Math.max(0,ix)].text+" ";show();}else if(e.key=="Enter"&&ix>=0){e.preventDefault();e.stopImmediatePropagation();choose(ix);}else if(e.key=="Escape")box.hidden=true;},true);
 box.addEventListener("mousedown",e=>{e.preventDefault();const w=e.target.closest("[data-w]");if(w){inp.value=inp.value.replace(/\s*$/," ")+w.dataset.w+" ";show();return;}const d=e.target.closest(".aci");if(d)choose(+d.dataset.i);});}
attachAC($("#heroQ"),$("#heroAc"),heroGo);attachAC($("#q"),$("#qAc"),q=>forge(q));attachAC($("#aq"),$("#aAc"),q=>ask(q));
// onboarding hints (3 short steps, once)
const HINTS=[["Type what you want to build","e.g. “a stand for two monitors”. Tab completes, ↑↓ picks a suggestion."],["Drag to orbit, scroll to zoom","Click any part for edit chips. Tools on the left: inspect, explode, real look, STL."],["Talk to it","“bigger”, “what about steel”, “the second one” — it remembers what you're working on."]];
function hint(i){const h=$("#hint");if(!h)return;if(i>=HINTS.length||localStorage.hf_hints=="done"){h.hidden=true;localStorage.hf_hints="done";return;}h.innerHTML=`<b>${i+1}/${HINTS.length} · ${esc(HINTS[i][0])}</b><span>${esc(HINTS[i][1])}</span><div><button class="ghost" data-h="skip">Skip</button><button class="primary" data-h="next">${i+1<HINTS.length?"Next":"Got it"}</button></div>`;h.hidden=false;h.onclick=e=>{const b=e.target.closest("[data-h]");if(!b)return;if(b.dataset.h=="skip")hint(99);else hint(i+1);};}
const _enter=enter;window.HF_hint=hint;document.addEventListener("hf-enter",()=>{});
new MutationObserver(()=>{if(!$("#lab").hidden&&localStorage.hf_hints!="done"&&$("#hint")?.hidden!==false)hint(0);uiState();}).observe($("#lab"),{attributes:true,attributeFilter:["hidden"]});
uiState();
Object.assign(window.HF,{CTX,PRED,SK,sketch:(sk)=>{if($("#lab").hidden)enter("object",{noDefault:true});addNode({sketch:sk,label:"Sketch",name:"sketch_"+sk.op},null);return cur;}});
