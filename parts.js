// HOLO//FORGE built-in parametric library (browser port, no AI). Units: mm.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const T=THREE, PI=Math.PI;
export const MATS={"PLA":{E:3500,y:50,rho:1240,cost:25,proc:"FDM 3D print"},"PETG":{E:2100,y:45,rho:1270,cost:25,proc:"FDM 3D print"},"ABS":{E:2200,y:40,rho:1050,cost:22,proc:"FDM 3D print"},
"Nylon PA12":{E:1700,y:48,rho:1010,cost:60,proc:"SLS print"},"Aluminum 6061-T6":{E:69000,y:276,rho:2700,cost:8,proc:"CNC machining"},"Mild steel":{E:200000,y:250,rho:7850,cost:3,proc:"Laser cut / weld"},
"Stainless 304":{E:193000,y:215,rho:8000,cost:7,proc:"CNC / laser"},"Brass C360":{E:97000,y:310,rho:8500,cost:9,proc:"CNC turning"},"Structural steel S355":{E:210000,y:355,rho:7850,cost:2.5,proc:"Steel fabrication"},"Timber C24":{E:11000,y:24,rho:420,cost:1.2,proc:"Carpentry"},"Spring steel":{E:207000,y:1300,rho:7850,cost:6,proc:"Wire coiling / heat treat"}};
const MAL={"spring steel|music wire":"Spring steel","structural":"Structural steel S355","petg":"PETG","abs":"ABS","nylon":"Nylon PA12","alumin":"Aluminum 6061-T6","stainless":"Stainless 304","brass":"Brass C360","steel":"Mild steel","wood|timber|lumber|pine|oak":"Timber C24","pla":"PLA"};
export function detectMat(t,fb){for(const k in MAL) if(new RegExp("\\b("+k+")").test(t)) return MAL[k]; return fb;}
// ---- geometry helpers ----
const M4=()=>new T.Matrix4();
function place(g,{x=0,y=0,z=0,rx=0,ry=0,rz=0}={}){g=g.toNonIndexed?g.index?g.toNonIndexed():g:g;g.applyMatrix4(M4().makeRotationFromEuler(new T.Euler(rx,ry,rz)));g.translate(x,y,z);return g;}
function clean(g){g=g.index?g.toNonIndexed():g;for(const k of Object.keys(g.attributes)) if(k!=='position'&&k!=='normal') g.deleteAttribute(k);return g;}
function rrect(w,h,r){const s=new T.Shape();r=Math.max(0.01,Math.min(r,w/2-0.01,h/2-0.01));s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
function hole(s,x,y,r){const p=new T.Path();p.absarc(x,y,r,0,2*PI,true);s.holes.push(p);return s;}
const ext=(s,d)=>new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:32});
function ring(ro,ri,h,seg=64){const s=new T.Shape();s.absarc(0,0,ro,0,2*PI,false);if(ri>0)hole(s,0,0,ri);return ext(s,h);}  // along +Z
const box=(w,d,h,o)=>place(new T.BoxGeometry(w,d,h),o);
const cyl=(r,h,o,seg=48)=>place(new T.CylinderGeometry(r,r,h,seg),o);
export function merge(gs){return mergeGeometries(gs.map(clean));}
function holesGrid(n,L,W){const pts=[];if(n<=0)return pts;if(n===1)return[[0,0]];if(n===2)return[[-L*0.35,0],[L*0.35,0]];
  const c=Math.ceil(n/2);for(let i=0;i<n;i++){const row=i<c?1:-1,k=i<c?i:i-c,m=i<c?c:n-c;pts.push([m===1?0:-L*0.38+L*0.76*k/(m-1),row*W*0.3]);}return pts;}
// ---- beam helpers for checks ----
const bendRect=(F,L,b,h)=>6*F*L/(b*h*h);
function iss(sev,note,pos,fix){return{sev,note,pos,fix:fix||{}};}
export const PARTS={};
function part(n,o){PARTS[n]={name:n,...o};}
part("mounting_plate",{cat:"Brackets",icon:"▭",re:/\b(mounting |base |flat )?plate\b/,ex:"mounting plate 120 x 80 mm, 6 mm thick, four 5 mm holes, rounded corners, aluminum",mat:"Aluminum 6061-T6",
 P:{length:[120,10,1000,"Length",["long","length"]],width:[80,10,1000,"Width",["wide","width"]],thickness:[6,0.8,60,"Thickness",["thick"]],holes:[4,0,12,"Holes",[]],hole_d:[5,1,40,"Hole Ø",["hole","holes"]],corner_r:[6,0,60,"Corner radius",["corner","radius"]],ribs:[0,0,6,"Ribs",["ribs"]]},
 build:p=>{const s=rrect(p.length,p.width,p.corner_r);for(const[x,y]of holesGrid(p.holes,p.length,p.width))hole(s,x,y,p.hole_d/2);const g=[ext(s,p.thickness)];
  for(let i=0;i<p.ribs;i++)g.push(box(p.length*0.8,p.thickness,p.thickness*1.5,{y:-p.width*0.4+p.width*0.8*(i+0.5)/p.ribs,z:p.thickness*1.75}));return g;},
 check:(p,m,F)=>{const out=[];const s=bendRect(F,p.length/2,p.width,p.thickness*(p.ribs?2:1));if(m.y/s<2)out.push(iss("high",`Bending stress ${s.toFixed(1)} MPa vs yield ${m.y}: plate too thin.`,[0,0,p.thickness],{thickness:+(p.thickness*1.4).toFixed(1)}));
  if(p.holes&&p.hole_d>p.width*0.3)out.push(iss("med","Holes take more than 30% of the width - edge tear-out.",[p.length*0.35,0,p.thickness],{hole_d:+(p.width*0.2).toFixed(1)}));
  if(p.corner_r<1)out.push(iss("med","Sharp corners: stress risers and sharp edges.",[p.length/2,p.width/2,p.thickness],{corner_r:4}));return out;}});
part("l_bracket",{cat:"Brackets",icon:"∟",re:/\b(l[- ]?|angle |corner )bracket\b/,ex:"L bracket 40 mm legs, 25 mm wide, 3 mm thick, holds 5 kg, PETG",mat:"PETG",
 P:{leg:[40,10,400,"Leg length",["legs","leg","long"]],width:[25,5,300,"Width",["wide","width"]],thickness:[3,0.8,30,"Thickness",["thick"]],hole_d:[5,0,30,"Hole Ø",["hole","holes"]],gussets:[0,0,3,"Gussets",["gussets"]]},
 build:p=>{const{leg:L,width:W,thickness:t}=p;const s1=rrect(L,W,1);if(p.hole_d)hole(s1,L*0.15,0,p.hole_d/2);const a=place(ext(s1,t),{x:L/2});
  const s2=rrect(L,W,1);if(p.hole_d)hole(s2,L*0.15,0,p.hole_d/2);const b=place(ext(s2,t),{ry:-PI/2,x:t,z:L/2});const g=[a,b];
  for(let i=0;i<p.gussets;i++){const s=new T.Shape();s.moveTo(0,0);s.lineTo(L*0.6,0);s.lineTo(0,L*0.6);s.closePath();g.push(place(ext(s,t),{rx:PI/2,x:t,z:t,y:-W/2+W*(i+0.5)/p.gussets+t/2}));}return g;},
 check:(p,m,F)=>{const out=[];const s=bendRect(F,p.leg,p.width,p.thickness);const fos=m.y/s*(1+p.gussets*2);if(fos<2)out.push(iss("high",`Corner bending ${s.toFixed(1)} MPa, safety ${fos.toFixed(1)}: will bend at the corner.`,[p.thickness,0,p.thickness],{thickness:+(p.thickness*1.5).toFixed(1),gussets:Math.max(1,p.gussets)}));
  if(p.hole_d>p.width*0.5)out.push(iss("med","Hole too big for the leg width.",[p.leg*0.65,0,p.thickness],{hole_d:+(p.width*0.3).toFixed(1)}));return out;}});
part("project_box",{cat:"Enclosures",icon:"▢",re:/\b(project |electronics )?(box|enclosure|case)\b/,ex:"project box 120x80x45 mm, 2.5 mm walls, 4 standoffs, vents",mat:"PETG",
 P:{length:[120,20,600,"Length",["long","length"]],width:[80,20,600,"Width",["wide","width"]],height:[45,10,400,"Height",["tall","high","height"]],wall:[2.5,0.8,12,"Wall",["wall","walls"]],standoffs:[4,0,4,"Standoffs",["standoffs"]],vents:[0,0,12,"Vents",[]]},
 build:p=>{const{length:L,width:W,height:H,wall:t}=p;const o=rrect(L,W,t*2);o.holes.push(new T.Path(rrect(L-2*t,W-2*t,t).getPoints(8)));
  const g=[ext(rrect(L,W,t*2),t),place(ext(o,H-t),{z:t})];const sp=[[-1,-1],[1,-1],[1,1],[-1,1]].slice(0,p.standoffs);for(const[a,b]of sp)g.push(place(ring(3.5,1.4,H*0.35),{x:a*(L/2-t-6),y:b*(W/2-t-6),z:t}));
  for(let i=0;i<p.vents;i++)g.push(box(t*0.6,2,H*0.4,{x:-L/2-t*0.2,y:-W*0.35+W*0.7*i/Math.max(1,p.vents-1),z:H*0.55}));return g;},
 check:(p,m,F)=>{const out=[];const span=Math.max(p.length,p.width);if(span/p.wall>60)out.push(iss("med",`Wall ${p.wall} mm on a ${span} mm span: walls flex and may warp when printed.`,[0,-p.width/2,p.height/2],{wall:+(span/50).toFixed(1)}));
  if(!p.vents&&p.height>30)out.push(iss("info","No vents: electronics may run warm.",[-p.length/2,0,p.height/2],{vents:4}));return out;}});
part("spacer",{cat:"Fasteners",icon:"◎",re:/\b(spacer|spacer ring|round spacer|cylinder|shim)\b/,ex:"spacer 12 mm OD, 5 mm bore, 10 mm long, nylon",mat:"Nylon PA12",
 P:{od:[12,2,300,"Outer Ø",["od","outer","diameter"]],id:[5,0,290,"Bore",["bore","id","hole"]],length:[10,0.5,500,"Length",["long","length","tall"]]},
 build:p=>[ring(p.od/2,Math.min(p.id,p.od-1)/2,p.length)],
 check:(p,m,F)=>{const out=[];const w=(p.od-p.id)/2;if(w<1.2)out.push(iss("high",`Wall only ${w.toFixed(1)} mm: will crack.`,[p.od/2,0,p.length/2],{od:+(p.id+3).toFixed(1)}));if(p.length/p.od>8)out.push(iss("med","Very long and thin: may buckle.",[0,0,p.length],{od:+(p.length/6).toFixed(1)}));return out;}});
part("spur_gear",{cat:"Power transmission",icon:"⚙",re:/\b(spur )?(gear|cog|pinion)\b/,ex:"spur gear 24 teeth module 1.5, 6 mm thick, 5 mm bore, nylon",mat:"Nylon PA12",
 P:{teeth:[24,8,150,"Teeth",[]],module:[1.5,0.5,8,"Module",["module"]],thickness:[6,1,100,"Face width",["thick","face"]],bore:[5,0,100,"Bore",["bore","hole","shaft"]]},
 build:p=>{const z=Math.round(p.teeth),m=p.module,rp=z*m/2,ra=rp+m,rf=rp-1.25*m,s=new T.Shape();const N=z*8;
  for(let i=0;i<=N;i++){const a=i/N*2*PI,ph=(i%8);const r=ph<1?rf:ph<2?rp:ph<4?ra:ph<5?rp:rf;i?s.lineTo(r*Math.cos(a),r*Math.sin(a)):s.moveTo(r*Math.cos(a),r*Math.sin(a));}
  if(p.bore>0)hole(s,0,0,Math.min(p.bore/2,rf-1));return[ext(s,p.thickness)];},
 check:(p,m,F)=>{const out=[];const T_=F*p.teeth*p.module/2/1000;const Ft=F;const Y=0.32;const s=Ft/(p.thickness*p.module*Y);if(m.y/s<2)out.push(iss("high",`Tooth root stress ${s.toFixed(1)} MPa (Lewis): teeth may snap.`,[p.teeth*p.module/2,0,p.thickness],{thickness:+(p.thickness*1.5).toFixed(1),module:+(p.module*1.25).toFixed(2)}));
  if(p.teeth<12)out.push(iss("med","Fewer than 12 teeth: undercut and rough meshing.",[0,0,0],{teeth:14}));return out;}});
part("flange",{cat:"Pipe fittings",icon:"◍",re:/\bflange\b/,ex:"flange 80 mm diameter, 10 mm thick, 6 m6 holes on a 60 mm bolt circle, 20 mm bore, aluminum",mat:"Aluminum 6061-T6",
 P:{diameter:[80,20,1000,"Outer Ø",["diameter","od"]],thickness:[10,2,100,"Thickness",["thick"]],holes:[6,0,24,"Bolt holes",[]],bolt_circle:[60,10,950,"Bolt circle",["bolt circle","pcd"]],hole_d:[6.6,2,40,"Hole Ø",["hole"]],bore:[20,0,900,"Bore",["bore"]],hub:[1,0,1,"Hub 0/1",[]]},
 build:p=>{const s=new T.Shape();s.absarc(0,0,p.diameter/2,0,2*PI,false);if(p.bore)hole(s,0,0,p.bore/2);for(let i=0;i<p.holes;i++){const a=2*PI*i/p.holes;hole(s,p.bolt_circle/2*Math.cos(a),p.bolt_circle/2*Math.sin(a),p.hole_d/2);}
  const g=[ext(s,p.thickness)];if(p.hub)g.push(place(ring(Math.max(p.bore/2+p.thickness*0.8,p.bore/2+3),p.bore/2,p.thickness*1.2),{z:p.thickness}));return g;},
 check:(p,m,F)=>{const out=[];const e=(p.diameter-p.bolt_circle)/2;if(e<p.hole_d)out.push(iss("high","Bolt holes too close to the rim: edge will tear.",[p.bolt_circle/2,0,p.thickness],{bolt_circle:+(p.diameter-2.5*p.hole_d).toFixed(1)}));
  if(p.bolt_circle-p.hole_d<p.bore+4)out.push(iss("high","Bolt holes overlap the bore.",[0,0,p.thickness],{bore:+(p.bolt_circle-p.hole_d-6).toFixed(1)}));return out;}});
part("shelf_bracket",{cat:"Brackets",icon:"◺",re:/\b(shelf|triangle|wall) bracket\b/,ex:"shelf bracket 150 mm legs, 30 mm wide, 5 mm thick, holds 15 kg, PLA",mat:"PLA",
 P:{leg:[150,40,600,"Leg length",["legs","leg","long","deep"]],width:[30,10,100,"Width",["wide","width"]],thickness:[5,2,20,"Thickness",["thick"]],brace:[1,0,1,"Diagonal brace",[]]},
 build:p=>{const{leg:L,width:W,thickness:t}=p;const g=[box(L,W,t,{x:L/2,z:L-t/2}),box(t,W,L,{x:t/2,z:L/2})];if(p.brace){const d=Math.hypot(L*0.8,L*0.8);g.push(box(d,W*0.8,t,{x:L*0.4+t/2,z:L*0.6-t,ry:PI/4}));}return g;},
 check:(p,m,F)=>{const out=[];const s=bendRect(F,p.leg,p.width,p.thickness)/(p.brace?6:1);if(m.y/s<2)out.push(iss("high",`Arm stress ${s.toFixed(1)} MPa: shelf will sag or snap.`,[p.leg,0,p.leg],{thickness:+(p.thickness*1.4).toFixed(1),brace:1}));return out;}});
part("v_pulley",{cat:"Power transmission",icon:"◉",re:/\b(pulley|sheave|wheel)\b/,ex:"pulley 60 mm diameter, 16 mm wide, 8 mm bore",mat:"Aluminum 6061-T6",
 P:{diameter:[60,15,400,"Outer Ø",["diameter","od"]],width:[16,6,80,"Width",["wide","width"]],bore:[8,2,100,"Bore",["bore","shaft"]]},
 build:p=>{const R=p.diameter/2,w=p.width,g=Math.min(w*0.35,R*0.2),pts=[[p.bore/2,0],[R,0],[R,w*0.2],[R-g,w/2],[R,w*0.8],[R,w],[p.bore/2,w]].map(([r,z])=>new T.Vector2(r,z));
  return[place(new T.LatheGeometry(pts,64),{rx:PI/2})];},
 check:(p,m,F)=>{const out=[];if((p.diameter-p.bore)/2<p.width*0.4)out.push(iss("med","Thin hub around the bore.",[0,0,p.width/2],{diameter:+(p.bore+p.width*1.2).toFixed(1)}));return out;}});
part("wall_hook",{cat:"Hooks",icon:"ʃ",re:/\b(wall |coat )?hook\b/,ex:"wall hook 20 mm wide 6 mm thick that holds 3 kg, PETG",mat:"PETG",
 P:{width:[20,6,80,"Width",["wide","width"]],thickness:[6,2,30,"Thickness",["thick"]],reach:[40,10,200,"Reach",["reach","deep"]]},
 build:p=>{const{width:W,thickness:t,reach:R}=p;const s=rrect(W,R*1.5,3);hole(s,0,R*0.45,2.2);const g=[place(ext(s,t),{rx:PI/2,y:t,z:R*0.75})];
  g.push(box(W,R,t,{y:-R/2+t,z:t/2}));g.push(box(W,t,R*0.4,{y:-R+t*1.5,z:R*0.2}));return g;},
 check:(p,m,F)=>{const out=[];const s=bendRect(F,p.reach,p.width,p.thickness);if(m.y/s<2)out.push(iss("high",`Arm stress ${s.toFixed(1)} MPa: hook will droop.`,[0,-p.reach/2,p.thickness],{thickness:+(p.thickness*1.4).toFixed(1)}));return out;}});
part("phone_stand",{cat:"Invent",icon:"📱",re:/\b(phone|tablet) (stand|holder|dock)\b/,ex:"phone stand 90 mm wide at 65 degrees, 12 mm slot",mat:"PLA",
 P:{width:[90,40,300,"Width",["wide","width"]],angle:[65,40,85,"Angle °",["degrees","angle"]],slot:[12,6,30,"Phone slot",["slot"]],thickness:[5,2,15,"Thickness",["thick"]]},
 build:p=>{const a=p.angle*PI/180,t=p.thickness,L=110,s=new T.Shape();s.moveTo(0,0);s.lineTo(L,0);s.lineTo(L,t);s.lineTo(t+p.slot+t,t);s.lineTo(t+p.slot+t,t+12);s.lineTo(t+p.slot,t+12);s.lineTo(t+p.slot,t);
  s.lineTo(t,t);s.lineTo(t+Math.cos(a)*90,t+Math.sin(a)*90);s.lineTo(Math.cos(a)*90,Math.sin(a)*90+t);s.lineTo(0,t);s.closePath();return[place(ext(s,p.width),{rx:PI/2,y:p.width/2,x:-L/2})];},
 check:(p,m,F)=>{const out=[];if(p.angle>78)out.push(iss("med","Very steep: phone may tip backward.",[0,0,60],{angle:68}));return out;}});
part("shaft",{cat:"Power transmission",icon:"━",re:/\b(shaft|axle|rod|pin)\b/,ex:"shaft 20 mm diameter, 120 mm long, steel",mat:"Mild steel",
 P:{diameter:[20,3,200,"Diameter",["diameter","od"]],length:[120,10,3000,"Length",["long","length"]]},
 build:p=>[cyl(p.diameter/2,p.length,{rx:PI/2,z:p.diameter/2})],
 check:(p,m,F)=>{const out=[];const s=32*F*p.length/4/(PI*p.diameter**3);if(m.y/s<2)out.push(iss("high",`Bending ${s.toFixed(1)} MPa at mid-span.`,[0,0,p.diameter],{diameter:+(p.diameter*1.3).toFixed(1)}));return out;}});
part("nut",{cat:"Fasteners",icon:"⬡",re:/\b(hex )?nut\b/,ex:"M8 hex nut, steel",mat:"Mild steel",P:{d:[8,2,24,"Thread M",[]]},
 build:p=>{const af=p.d*1.6,s=new T.Shape();for(let i=0;i<6;i++){const a=PI/6+i*PI/3,r=af/Math.sqrt(3);i?s.lineTo(r*Math.cos(a),r*Math.sin(a)):s.moveTo(r*Math.cos(a),r*Math.sin(a));}hole(s,0,0,p.d*0.43);return[ext(s,p.d*0.8)];},check:()=>[]});
part("washer",{cat:"Fasteners",icon:"○",re:/\bwasher\b/,ex:"M6 washer",mat:"Mild steel",P:{d:[6,2,24,"For bolt M",[]],thickness:[1.6,0.3,6,"Thickness",["thick"]]},build:p=>[ring(p.d,p.d*0.55,p.thickness)],check:()=>[]});
// ---- structures (dimensions in m in params; geometry scaled to mm) ----
part("truss_bridge",{cat:"Bridges",mode:"bridge",icon:"⟁",re:/\bbridge\b/,ex:"truss bridge spanning 30 m, 4 m wide, 6 panels, steel",mat:"Structural steel S355",
 P:{span:[30,4,200,"Span m",["span","spanning","long"]],width:[4,2,30,"Deck width m",["wide","width"]],panels:[6,2,20,"Panels",["panels"]],height:[4,1,30,"Truss height m",["high","height","deep"]],member:[300,50,1200,"Member mm",["member"]]},
 build:p=>{const S=p.span*1000,Wd=p.width*1000,H=p.height*1000,n=Math.round(p.panels),m=p.member,g=[];const bar=(a,b)=>{const va=new T.Vector3(...a),vb=new T.Vector3(...b),L=va.distanceTo(vb),geo=new T.BoxGeometry(m,m,L);
   const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),vb.clone().sub(va).normalize());geo.applyQuaternion(q);const c=va.add(vb).multiplyScalar(0.5);geo.translate(c.x,c.y,c.z);g.push(geo);};
  for(const y of[-Wd/2,Wd/2]){bar([-S/2,y,0],[S/2,y,0]);bar([-S/2+S/n,y,H],[S/2-S/n,y,H]);for(let i=0;i<=n;i++){const x=-S/2+S*i/n;if(i>0&&i<n)bar([x,y,0],[x,y,H]);}
   for(let i=0;i<n;i++){const x0=-S/2+S*i/n,x1=x0+S/n;if(i<n/2)bar([x0,y,i===0?0:H],[x1,y,i===0?H:0]);else bar([x0,y,i===n-1?H:0],[x1,y,i===n-1?0:H]);}}
  for(let i=1;i<n;i++){const x=-S/2+S*i/n;bar([x,-Wd/2,H],[x,Wd/2,H]);}g.push(box(S,Wd,m*0.8,{z:-m*0.2}));return g;},
 check:(p,m,F)=>{const out=[];const r=p.span/p.height;if(r>10)out.push(iss("high",`Span/depth ${r.toFixed(1)} > 10: truss too shallow, big deflection.`,[0,0,p.height*1000],{height:+(p.span/8).toFixed(1)}));
  if(p.span/p.panels>8)out.push(iss("med","Panels longer than 8 m: deck stringers get heavy.",[0,0,0],{panels:Math.ceil(p.span/6)}));if(p.member<p.span*8)out.push(iss("med",`Members ${p.member} mm look light for ${p.span} m.`,[p.span*250,p.width*500,0],{member:Math.round(p.span*10)}));
  out.push(iss("info","Preliminary only - a licensed engineer must design real bridges.",[0,0,0]));return out;}});
part("gable_roof",{cat:"Roofs",mode:"roof",icon:"⌂",re:/\b(gable |hip )?roof\b/,ex:"gable roof 8 m span, 12 m long, 35 degree pitch, timber rafters",mat:"Timber C24",
 P:{span:[8,2,30,"Span m",["span","wide"]],length:[12,2,60,"Length m",["long","length"]],pitch:[35,5,60,"Pitch °",["degree","degrees","pitch"]],rafter:[200,100,400,"Rafter depth mm",["rafter","depth"]],spacing:[600,300,1200,"Spacing mm",["spacing","centres","centers"]]},
 build:p=>{const S=p.span*1000,L=p.length*1000,a=p.pitch*PI/180,run=S/2,h=run*Math.tan(a),rl=run/Math.cos(a),g=[],n=Math.floor(L/p.spacing)+1;
  for(let i=0;i<n;i++){const y=-L/2+L*i/(n-1);for(const sd of[-1,1]){const geo=new T.BoxGeometry(rl,50,p.rafter);geo.rotateY(sd*a);geo.translate(sd*run/2,y,h/2);g.push(geo);}g.push(box(S,50,p.rafter*0.8,{y}));}
  g.push(box(60,L,p.rafter,{z:h}));return g;},
 check:(p,m,F)=>{const out=[];const run=p.span*500,ln=run/Math.cos(p.pitch*PI/180);if(ln/p.rafter>20)out.push(iss("high",`Rafter L/d ${(ln/p.rafter).toFixed(0)} > 20: sag risk.`,[run/2,0,run/2*Math.tan(p.pitch*PI/180)],{rafter:Math.round(ln/18/10)*10}));
  if(p.spacing>600)out.push(iss("med","Spacing over 600 mm: sheathing will sag.",[0,0,0],{spacing:600}));if(p.pitch<15)out.push(iss("med","Pitch under 15°: shingles leak.",[0,0,0],{pitch:22}));
  out.push(iss("info","Check local building codes; snow and wind loads not modelled.",[0,0,0]));return out;}});
// ---- assemblies ----
export const ASSEMBLIES={
 hinge:{name:"Hinge (2 leaves + pin)",ex:"hinge 80 mm long, 25 mm leaves",joint:"revolute",
  build:()=>{const L=80,Wl=25,t=3,r=4;const a=[box(Wl,L,t,{x:-Wl/2-r,z:0}),cyl(r,L/2-1,{y:-L/4})],b=[box(Wl,L,t,{x:Wl/2+r}),cyl(r,L/2-1,{y:L/4})],pin=[cyl(1.5,L+4,{})];
   return[{name:"Leaf A",geo:merge(a),color:0x37e0ff},{name:"Leaf B",geo:merge(b),color:0xffb547,move:(m,t)=>m.rotation.y=-Math.abs(Math.sin(t))*PI*0.8},{name:"Pin",geo:merge(pin),color:0xdddddd}];}},
 gear_pair:{name:"Gear pair (24:12)",ex:"two meshing gears",joint:"gear",
  build:()=>{const g1=merge(PARTS.spur_gear.build({teeth:24,module:2,thickness:8,bore:6})),g2=merge(PARTS.spur_gear.build({teeth:12,module:2,thickness:8,bore:5}));g2.translate(0,0,0);
   return[{name:"Gear 24T",geo:g1,color:0x37e0ff,move:(m,t)=>m.rotation.z=t*0.5},{name:"Pinion 12T",geo:g2,color:0xffb547,x:36,rz:PI/12,move:(m,t)=>m.rotation.z=-t+PI/12}];}},
 slider:{name:"Slider on rail",ex:"carriage sliding on a rail",joint:"slider",
  build:()=>[{name:"Rail",geo:merge([box(200,20,10,{})]),color:0x888fa0},{name:"Carriage",geo:merge([box(40,34,14,{z:10})]),color:0x37e0ff,move:(m,t)=>m.position.x=Math.sin(t)*75}]}};
// ---- text parsing ----
const NUM="(\\d+(?:\\.\\d+)?)";
const WORDN={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twelve:12};
export function detect(text){const t=" "+text.toLowerCase()+" ";let best=null;for(const n in PARTS){const re=new RegExp(PARTS[n].re.source,'g');let len=0;for(const m of t.matchAll(re))len=Math.max(len,m[0].length);if(len&&(!best||len>best[0]))best=[len,n];}return best&&best[1];}
export function parse(name,text){const P=PARTS[name];let t=text.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/g,w=>WORDN[w]);
 const inch=v=>v*25.4;t=t.replace(new RegExp(NUM+"\\s*(?:\"|in\\b|inch(?:es)?)","g"),(_,v)=>(inch(+v)).toFixed(2)+" mm").replace(new RegExp(NUM+"\\s*cm\\b","g"),(_,v)=>(v*10)+" mm");
 const p={};for(const k in P.P)p[k]=P.P[k][0];const notes=[];
 const cnt=t.match(new RegExp("(\\d+)\\s*(?:\\w+\\s+)?(holes|teeth|panels|standoffs|vents|gussets|ribs)\\b"));
 const cm={holes:"holes",teeth:"teeth",panels:"panels",standoffs:"standoffs",vents:"vents",gussets:"gussets",ribs:"ribs"};
 const tc=t.replace(/(\d+)\s*(?:x\s*)?(?:\w+\s+)?(holes|teeth|panels|standoffs|vents|gussets|ribs)\b/g,(s,v,w)=>{if(cm[w] in p){p[cm[w]]=+v;notes.push(`${w}=${v}`);}return " ";});
 if(/module\s*(\d+(?:\.\d+)?)/.test(t)&&"module"in p)p.module=+t.match(/module\s*(\d+(?:\.\d+)?)/)[1];
 const mm=tc.match(/\bm(\d+)\b/);if(mm&&"d"in p)p.d=+mm[1];
 const dims=tc.match(new RegExp(NUM+"\\s*(?:mm)?\\s*x\\s*"+NUM+"(?:\\s*(?:mm)?\\s*x\\s*"+NUM+")?"));
 if(dims){const ks=["length","width","height"].filter(k=>k in p);[dims[1],dims[2],dims[3]].forEach((v,i)=>{if(v&&ks[i])p[ks[i]]=+v;});notes.push("dims "+dims[0]);}
 for(const k in P.P){if(dims&&["length","width","height"].includes(k)&&P.P[k])continue;for(const al of P.P[k][4]){const r1=new RegExp(NUM+"\\s*(?:mm|m|kg|°|deg|degrees?)?\\s*(?:[a-z]\\w*\\s)?"+al+"\\b"),r2=new RegExp("\\b"+al+"\\s*(?:of|is|=|:|at)?\\s*"+NUM);
   const m=tc.match(r1)||tc.match(r2);if(m){p[k]=+m[1];notes.push(`${k}=${m[1]}`);break;}}}
 if("angle"in p||"pitch"in p){const m=t.match(/(\d+(?:\.\d+)?)\s*(?:°|deg)/);if(m)p["angle"in p?"angle":"pitch"]=+m[1];}
 for(const k in P.P)p[k]=Math.min(Math.max(p[k],P.P[k][1]),P.P[k][2]);
 let load=null;const lk=t.match(/(\d+(?:\.\d+)?)\s*kg/),ln=t.match(/(\d+(?:\.\d+)?)\s*n\b/),lb=t.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)\b/);
 if(lk)load=+lk[1]*9.81;else if(ln)load=+ln[1];else if(lb)load=+lb[1]*4.448;
 let mat=detectMat(t,P.mat);if(P.mode&&mat=="Mild steel")mat="Structural steel S355";return{p,notes,load,mat};}
export function buildGeo(name,p){const g=merge(PARTS[name].build(p));g.computeVertexNormals();g.computeBoundingBox();return g;}
export function volume(g){const a=g.attributes.position.array;let v=0;for(let i=0;i<a.length;i+=9){v+=(a[i]*(a[i+4]*a[i+8]-a[i+5]*a[i+7])-a[i+1]*(a[i+3]*a[i+8]-a[i+5]*a[i+6])+a[i+2]*(a[i+3]*a[i+7]-a[i+4]*a[i+6]))/6;}return Math.abs(v);}
// ---- inspection & generations (port of inspect_evolve.options) ----
export function inspect(name,p,mat,F){return PARTS[name].check(p,MATS[mat]||MATS.PLA,F);}
export function score(I){return Math.max(0.3,3-0.7*I.filter(i=>i.sev=="high").length-0.25*I.filter(i=>i.sev=="med").length);}
const STR=["thickness","arm_t","wall","rafter","member","height","module","diameter","od","leg"];
function clampP(name,p){const P=PARTS[name].P;for(const k in P)p[k]=+Math.min(Math.max(p[k],P[k][1]),P[k][2]).toFixed(2);return p;}
export function evolve(name,p,mat,F){p={...p};const log=[];for(const i of inspect(name,p,mat,F))for(const k in i.fix)if(k in p&&i.fix[k]!==p[k]){log.push(`${k}: ${p[k]} → ${i.fix[k]}`);p[k]=i.fix[k];}clampP(name,p);return{p,log};}
export function options(name,p0,mat,F){const base=evolve(name,p0,mat,F),bad=q=>inspect(name,q,mat,F).filter(i=>i.sev!="info").length,out=[];
 let L={...base.p},ll=[...base.log];for(const k of STR)if(k in L&&!(name.match(/bridge|roof/)&&k=="height"&&0)){const t=clampP(name,{...L,[k]:L[k]*0.88});if(bad(t)<=bad(L)){ll.push(`trim ${k} ${L[k]}→${t[k]}`);L=t;}}
 for(const k of["ribs","gussets","standoffs"])if(k in L&&L[k]>0){const t={...L,[k]:L[k]-1};if(bad(t)<=bad(L)){ll.push(`drop one ${k.slice(0,-1)}`);L=t;}}out.push({name:"Lighter",p:L,log:ll});
 let S={...base.p},sl=[...base.log];for(const k of STR)if(k in S&&k!="module"&&k!="height"&&k!="leg"){S[k]*=1.25;sl.push(`boost ${k} +25%`);}for(const k of["ribs","gussets"])if(k in S){S[k]+=1;sl.push(`add a ${k.slice(0,-1)}`);}
 if("brace"in S&&!S.brace){S.brace=1;sl.push("add diagonal brace");}clampP(name,S);out.push({name:"Stronger",p:S,log:sl});
 let C={...base.p},cl=[...base.log];for(const k of STR)if(k in C){const r=C[k]>5?Math.round(C[k]):Math.round(C[k]*2)/2;if(r>=C[k]&&r!==C[k]){cl.push(`round ${k} to stock ${r}`);C[k]=r;}}
 for(const k of["ribs","vents"])if(k in C&&C[k]>0){cl.push(`skip ${k}`);C[k]=0;}if("corner_r"in C&&C.corner_r>3){C.corner_r=3;cl.push("smaller corner radius (less machining)");}
 const cm=Object.entries(MATS).filter(([n,m])=>m.cost*m.rho<(MATS[mat].cost*MATS[mat].rho)*0.7&&m.y>=MATS[mat].y*0.8&&!/Timber|S355/.test(n)).sort((a,b)=>a[1].cost*a[1].rho-b[1].cost*b[1].rho)[0];
 const o3={name:"Cheaper",p:clampP(name,C),log:cl};if(cm){o3.mat=cm[0];cl.push(`cheaper material: ${cm[0]}`);}out.push(o3);
 return out.map(o=>{for(let r=0;r<2;r++){const I=inspect(name,o.p,o.mat||mat,F).filter(i=>i.sev!="info");if(!I.length)break;const e=evolve(name,o.p,o.mat||mat,F);o.p=e.p;o.log.push(...e.log);}const I=inspect(name,o.p,o.mat||mat,F);return{...o,safety:+score(I).toFixed(1),issues:I.filter(i=>i.sev!="info").length};});}
// ===== library expansion (port of text-cad/library.py list) =====
const tube=(ro,ri,h,o)=>place(ring(ro,ri,h),o);
const hexP=(af,h,bore)=>{const s=new T.Shape();for(let i=0;i<6;i++){const a=PI/6+i*PI/3,r=af/Math.sqrt(3);i?s.lineTo(r*Math.cos(a),r*Math.sin(a)):s.moveTo(r*Math.cos(a),r*Math.sin(a));}if(bore)hole(s,0,0,bore/2);return ext(s,h);};
const thinWall=(od,t,name,pos)=>((od-0)/2/t>25?[iss("med",`Wall ${t} mm is thin for Ø${od} - dents and leaks.`,pos,{[name]:+(od/40).toFixed(1)})]:[]);
const ISO={2:[0.4,3.8,4],2.5:[.45,4.5,5],3:[.5,5.5,5.5],4:[.7,7,7],5:[.8,8.5,8],6:[1,10,10],8:[1.25,13,13],10:[1.5,16,16],12:[1.75,18,18],16:[2,24,24],20:[2.5,30,30],24:[3,36,36]};
const near=d=>{const k=Object.keys(ISO).map(Number).reduce((a,b)=>Math.abs(b-d)<Math.abs(a-d)?b:a);return[k,...ISO[k]];};
part("bolt",{cat:"Fasteners",icon:"🔩",re:/\b(bolt|screw|cap screw|machine screw)\b/,ex:"M6 x 20 socket head bolt, steel",mat:"Mild steel",
 P:{d:[6,2,24,"Thread M",[]],length:[20,4,200,"Length",["long","length"]],head:[0,0,1,"Head 0 socket / 1 hex",[]]},
 build:p=>{const[d,pt,hd]=near(p.d);const g=[cyl(d/2*0.92,p.length,{rx:PI/2,z:p.length/2})];for(let z=1;z<p.length-pt;z+=pt*2)g.push(tube(d/2,d/2*0.9,pt*0.6,{z}));
  g.push(p.head?place(hexP(hd*0.95,d*0.65),{z:p.length}):tube(hd/2,0,d,{z:p.length}));return g;},
 check:(p,m,F)=>{const[d]=near(p.d);const A={2:2.07,2.5:3.39,3:5.03,4:8.78,5:14.2,6:20.1,8:36.6,10:58,12:84.3,16:157,20:245,24:353}[d];const s=F/A,o=[];if(m.y/s<3)o.push(iss("high",`Tensile stress ${s.toFixed(0)} MPa on M${d} (stress area ${A} mm²).`,[0,0,p.length/2],{d:d*1.4}));if(p.length<d*1.5)o.push(iss("med","Very short: less than 1.5×d of thread engagement.",[0,0,0],{length:d*2}));return o;}});
part("standoff",{cat:"Fasteners",icon:"⬡",re:/\b(stand-?off|pcb spacer|hex spacer|threaded spacer)\b/,ex:"M3 standoff 10 mm long, brass",mat:"Brass C360",
 P:{d:[3,2,8,"Thread M",[]],length:[10,3,60,"Length",["long","length","tall"]]},build:p=>[hexP(near(p.d)[3]*0.6+1,p.length,p.d*0.85)],
 check:p=>p.length>p.d*12?[iss("med","Long thin standoff can bend; use a bigger thread.",[0,0,p.length],{d:Math.min(8,p.d+1)})]:[]});
part("heat_set_boss",{cat:"Fasteners",icon:"▣",re:/\b(heat[- ]?set|threaded) insert (boss|post)\b|\binsert boss\b/,ex:"heat set insert boss M3, 8 mm tall",mat:"PETG",
 P:{d:[3,2,6,"Insert M",[]],height:[8,3,40,"Height",["tall","high"]],base:[4,1,20,"Base plate",["base"]]},
 build:p=>{const hd=p.d*1.35,od=hd+2*Math.max(1.6,p.d*0.7);return[box(od*3,od*3,p.base,{z:p.base/2}),tube(od/2,hd/2,p.height,{z:p.base})];},
 check:p=>{const w=Math.max(1.6,p.d*0.7);return w<1.6?[iss("high","Boss wall too thin for the insert.",[0,0,p.height],{})]:p.height<p.d*1.8?[iss("med","Boss shorter than insert length (~2×d).",[0,0,p.height],{height:+(p.d*2.2).toFixed(1)})]:[];}});
part("timing_pulley",{cat:"Power transmission",icon:"⚙",re:/\b(gt2|htd|timing)\b.*\bpulley\b|\btiming pulley\b/,ex:"GT2 timing pulley 20 teeth, 6 mm belt, 5 mm bore",mat:"Aluminum 6061-T6",
 P:{teeth:[20,10,80,"Teeth",[]],width:[6,4,30,"Belt width",["belt","wide","width"]],bore:[5,2,20,"Bore",["bore","shaft"]]},
 build:p=>{const z=Math.round(p.teeth),r=z*2/PI/2,s=new T.Shape();for(let i=0;i<=z*6;i++){const a=i/(z*6)*2*PI,rr=i%6<2?r-0.75:r;i?s.lineTo(rr*Math.cos(a),rr*Math.sin(a)):s.moveTo(rr*Math.cos(a),rr*Math.sin(a));}hole(s,0,0,p.bore/2);
  return[ext(s,p.width+1),place(ring(r+1.5,p.bore/2,1),{z:-1}),place(ring(r+1.5,p.bore/2,1),{z:p.width+1}),place(ring(Math.max(p.bore/2+4,r*0.8),p.bore/2,7),{z:p.width+2})];},
 check:p=>{const o=[];if(p.teeth<16)o.push(iss("med","Under 16 teeth wears GT2 belts quickly.",[0,0,0],{teeth:20}));if(p.bore/2+2>p.teeth*2/PI/2-1)o.push(iss("high","Bore too large for this tooth count.",[0,0,0],{teeth:Math.ceil(PI*(p.bore+6)/2)}));return o;}});
part("shaft_collar",{cat:"Power transmission",icon:"◎",re:/\b(shaft |set |clamp )?collar\b/,ex:"shaft collar 10 mm bore, 22 mm OD, 10 mm wide",mat:"Mild steel",
 P:{bore:[10,3,60,"Bore",["bore","shaft","id"]],od:[22,8,120,"OD",["od","diameter"]],width:[10,4,40,"Width",["wide","width","thick"]]},
 build:p=>[ring(p.od/2,p.bore/2,p.width),box(2,(p.od-p.bore)/2,p.width,{x:0,y:(p.od+p.bore)/4,z:p.width/2})],
 check:p=>(p.od-p.bore)/2<p.bore*0.3?[iss("med","Thin collar wall: set screw may strip.",[p.od/2,0,p.width/2],{od:+(p.bore*1.8).toFixed(1)})]:[]});
part("flanged_bushing",{cat:"Power transmission",icon:"◉",re:/\b(flanged )?(bushing|bush|sleeve bearing|plain bearing)\b/,ex:"flanged bushing 8 mm ID, 12 mm OD, 12 mm long, bronze",mat:"Brass C360",
 P:{id:[8,2,80,"Bore",["id","bore"]],od:[12,4,100,"OD",["od","outer"]],length:[12,2,100,"Length",["long","length"]],flange:[1,0,1,"Flange 0/1",[]]},
 build:p=>{const g=[ring(p.od/2,p.id/2,p.length)];if(p.flange)g.push(ring(p.od/2+(p.od-p.id)/2+1.5,p.id/2,1.5+(p.od-p.id)/4));return g;},
 check:p=>{const o=[];if((p.od-p.id)/2<1)o.push(iss("high","Wall under 1 mm.",[p.od/2,0,p.length/2],{od:p.id+3}));if(p.length>2.5*p.id)o.push(iss("info","Long bushing: check alignment.",[0,0,p.length]));return o;}});
part("bearing_housing",{cat:"Power transmission",icon:"⊚",re:/\b(pillow block|bearing (housing|block|holder|mount)|plummer block)\b/,ex:"pillow block for 608 bearing, 8 mm base, PETG",mat:"PETG",
 P:{bearing_od:[22,10,62,"Bearing OD",["bearing","od"]],bearing_w:[7,4,16,"Bearing width",["width"]],base_t:[8,3,40,"Base thickness",["base","thick"]]},
 build:p=>{const D=p.bearing_od,W=D*2.8,H=D*0.9+p.base_t;const s=new T.Shape();s.moveTo(-W/2,0);s.lineTo(W/2,0);s.lineTo(W/2,p.base_t);s.lineTo(D*0.75,p.base_t);s.absarc(0,H-D*0.15,D*0.75,0,PI,false);s.lineTo(-D*0.75,p.base_t);s.lineTo(-W/2,p.base_t);s.closePath();
  hole(s,0,H-D*0.15,D/2);const b=place(ext(s,p.bearing_w+4),{rx:PI/2,y:(p.bearing_w+4)/2});return[b];},
 check:p=>p.base_t<p.bearing_od*0.25?[iss("med","Thin base for this bearing size: housing may flex.",[0,0,p.base_t],{base_t:Math.ceil(p.bearing_od*0.35)})]:[]});
part("tslot_extrusion",{cat:"Frames",icon:"▦",re:/\b(t[- ]?slot|v[- ]?slot|aluminium extrusion|aluminum extrusion|extrusion profile)\b|\b(2020|2040|3030|4040|4080) ?(extrusion|profile|rail|bar)\b/,ex:"2020 T-slot extrusion 300 mm long",mat:"Aluminum 6061-T6",
 P:{size:[20,20,40,"Series",["series","size"]],length:[300,20,3000,"Length",["long","length"]],load:[0,0,0,"",[]]},
 build:p=>{const a=p.size,s=rrect(a,a,0.5);hole(s,0,0,a*0.21/2);const sw=a*0.31;for(let i=0;i<4;i++){const ang=i*PI/2,c=Math.cos(ang),si=Math.sin(ang),q=new T.Path();const pts=[[a/2+0.01,-sw/2],[a/2-a*0.12,-sw/2],[a/2-a*0.12,-sw],[a/2-a*0.3,-sw],[a/2-a*0.3,sw],[a/2-a*0.12,sw],[a/2-a*0.12,sw/2],[a/2+0.01,sw/2]].map(([x,y])=>new T.Vector2(x*c-y*si,x*si+y*c));q.setFromPoints(pts);s.holes.push(q);}return[ext(s,p.length)];},
 check:(p,m,F)=>{const I={20:7000,30:28000,40:90000}[p.size<25?20:p.size<35?30:40];const dl=F*p.length**3/(48*69000*I);return dl>p.length/300?[iss("med",`Mid-span sag ≈ ${dl.toFixed(2)} mm on a ${p.length} mm span.`,[0,0,p.length/2],{size:p.size<35?p.size+10:40})]:[];}});
part("extrusion_corner",{cat:"Frames",icon:"◣",re:/\b(corner bracket|gusset)\b.*\b(2020|3030|4040|extrusion|t-?slot)\b|\b(2020|3030|4040|extrusion) (corner|gusset|bracket)\b/,ex:"2020 extrusion corner bracket",mat:"Aluminum 6061-T6",
 P:{size:[20,20,40,"Series",["series"]],thickness:[3,2,8,"Thickness",["thick"]]},
 build:p=>{const a=p.size,t=p.thickness;const s1=rrect(a,a,1);hole(s1,0,0,a*0.15);const s2=rrect(a,a,1);hole(s2,0,0,a*0.15);const s=new T.Shape();s.moveTo(0,0);s.lineTo(a,0);s.lineTo(0,a);s.closePath();
  return[place(ext(s1,t),{x:a/2+t}),place(ext(s2,t),{ry:-PI/2,x:t,z:a/2+t}),place(ext(s,t),{rx:PI/2,x:t,z:t,y:t/2})];},check:p=>p.thickness<p.size*0.12?[iss("med","Thin bracket for this profile.",[p.size/2,0,p.size/2],{thickness:Math.ceil(p.size*0.15)})]:[]});
part("rect_frame",{cat:"Frames",icon:"▭",re:/\b(rectangular |square |welded )?frame\b/,ex:"rectangular frame 400 x 300 mm, 20 mm square tube, steel",mat:"Mild steel",
 P:{width:[400,50,3000,"Width",["wide","width"]],height:[300,50,3000,"Height",["tall","high","height"]],tube:[20,8,100,"Tube size",["tube","section"]],wall:[1.5,0.8,6,"Wall",["wall"]]},
 build:p=>{const{width:W,height:H,tube:a}=p,mk=(l,o)=>{const s=rrect(a,a,0.5);s.holes.push(new T.Path(rrect(a-2*p.wall,a-2*p.wall,0.3).getPoints(4)));const g=ext(s,l);g.translate(0,0,-l/2);return place(g,o);};
  return[mk(W,{ry:PI/2,z:a/2,y:-H/2+a/2}),mk(W,{ry:PI/2,z:a/2,y:H/2-a/2}),mk(H-2*a,{rx:PI/2,z:a/2,x:-W/2+a/2}),mk(H-2*a,{rx:PI/2,z:a/2,x:W/2-a/2})];},
 check:(p,m,F)=>{const I=(p.tube**4-(p.tube-2*p.wall)**4)/12,s=F*p.width/4*(p.tube/2)/I;return m.y/s<2?[iss("high",`Mid-span stress ${s.toFixed(0)} MPa on the long side.`,[0,p.height/2,p.tube],{tube:+(p.tube*1.4).toFixed(0)})]:[];}});
const clipBuild=(d,t,w,open)=>{const s=new T.Shape();const R=d/2+t,a0=open/2;s.absarc(0,0,R,PI/2+a0,PI/2-a0+2*PI,false);s.absarc(0,0,d/2,PI/2-a0+2*PI,PI/2+a0,true);s.closePath();return ext(s,w);};
part("cable_clip",{cat:"Clips & clamps",icon:"Ω",re:/\b(cable|wire|cord|hose) (clip|holder|clamp|tie mount)\b/,ex:"cable clip for 6 mm cable, screw mount",mat:"PETG",
 P:{cable_d:[6,1,40,"Cable Ø",["cable","wire","cord","diameter"]],thickness:[2,0.8,6,"Thickness",["thick"]],width:[10,4,30,"Width",["wide","width"]]},
 build:p=>{const R=p.cable_d/2+p.thickness;return[place(clipBuild(p.cable_d,p.thickness,p.width,0.9),{rx:PI/2,y:p.width/2,z:R}),box(R*2+12,p.width,p.thickness,{z:p.thickness/2})];},
 check:p=>p.thickness>p.cable_d*0.6?[iss("med","Too stiff to snap over the cable.",[0,0,p.cable_d],{thickness:+(p.cable_d*0.3).toFixed(1)})]:[]});
part("pipe_clip",{cat:"Clips & clamps",icon:"C",re:/\b(snap|spring|c)[- ]?clip\b|\b(pipe|tube|rod) (clip|clamp|holder)\b/,ex:"snap clip for 16 mm pipe, 2.5 mm wall",mat:"PETG",
 P:{pipe_d:[16,3,120,"Pipe Ø",["pipe","tube","rod","diameter"]],thickness:[2.5,1,8,"Wall",["thick","wall"]],width:[12,4,40,"Width",["wide","width"]]},
 build:p=>[place(clipBuild(p.pipe_d,p.thickness,p.width,1.6),{rx:PI/2,y:p.width/2,z:p.pipe_d/2+p.thickness}),box(p.pipe_d*0.6,p.width,p.thickness,{z:p.thickness/2})],
 check:(p,m)=>{const e=p.thickness*0.1*p.pipe_d/(p.pipe_d**2/4)*1.5;return e*m.E>m.y?[iss("high","Snap strain too high: clip will crack when fitted.",[0,0,p.pipe_d],{thickness:+(p.thickness*0.7).toFixed(1)})]:[];}});
part("pipe_saddle",{cat:"Clips & clamps",icon:"⌒",re:/\b(saddle|two[- ]hole) (clamp|clip|strap)\b|\bpipe strap\b|\bconduit strap\b/,ex:"saddle clamp for 22 mm pipe, 2 mm steel",mat:"Mild steel",
 P:{pipe_d:[22,6,150,"Pipe Ø",["pipe","tube","diameter"]],thickness:[2,1,6,"Thickness",["thick"]],width:[15,6,40,"Width",["wide","width"]]},
 build:p=>{const R=p.pipe_d/2,t=p.thickness,s=new T.Shape();s.absarc(0,R,R+t,0,PI,false);s.absarc(0,R,R,PI,0,true);s.closePath();const s2=rrect(R*1.4,p.width,2);hole(s2,0,0,2.5);
  return[place(ext(s,p.width),{rx:PI/2,y:p.width/2}),place(ext(s2,t),{x:-R-R*0.7-t}),place(ext(rrect(R*1.4,p.width,2),t),{x:R+R*0.7+t})];},check:()=>[]});
part("pull_handle",{cat:"Handles",icon:"⊓",re:/\b(pull |drawer |door |cabinet |u[- ]?)?handle\b|\bgrab (bar|handle)\b/,ex:"drawer pull handle 96 mm hole spacing, 12 mm grip",mat:"Aluminum 6061-T6",
 P:{span:[96,30,600,"Hole spacing",["hole spacing","spacing","centers","span"]],grip_d:[12,6,40,"Grip Ø",["grip","diameter"]],standoff:[30,15,80,"Clearance",["clearance","standoff","height"]]},
 build:p=>{const r=p.grip_d/2;return[cyl(r,p.span+p.grip_d,{rz:PI/2,z:p.standoff}),cyl(r,p.standoff,{rx:PI/2,x:-p.span/2,z:p.standoff/2}),cyl(r,p.standoff,{rx:PI/2,x:p.span/2,z:p.standoff/2})];},
 check:(p,m,F)=>{const o=[];if(p.standoff-p.grip_d/2<25)o.push(iss("med","Less than 25 mm finger clearance.",[0,0,p.standoff],{standoff:p.grip_d/2+30}));const s=F*p.span/4*32/(PI*p.grip_d**3);if(m.y/s<2)o.push(iss("high","Grip bar bends under a hard pull.",[0,0,p.standoff],{grip_d:p.grip_d*1.3}));return o;}});
part("pipe_elbow",{cat:"Pipe fittings",icon:"⌐",re:/\b(elbow|90 ?(deg|°)? bend|pipe bend)\b/,ex:"pipe elbow 90 degree, 26.7 mm OD, 2.9 mm wall",mat:"PETG",
 P:{od:[26.7,6,200,"Pipe OD",["od","pipe","diameter"]],wall:[2.9,0.8,15,"Wall",["wall","thick"]],bend_r:[40,10,500,"Bend radius",["radius","bend"]]},
 build:p=>{const g=new T.TorusGeometry(p.bend_r,p.od/2,24,48,PI/2);const gi=new T.TorusGeometry(p.bend_r,p.od/2-p.wall,24,48,PI/2);gi.index&&gi.setIndex([...gi.index.array].map((v,i,a)=>a[i-i%3+(2-i%3)]));return[place(g,{rx:PI/2,z:p.od/2}),place(gi,{rx:PI/2,z:p.od/2})];},
 check:p=>{const o=thinWall(p.od,p.wall,"wall",[p.bend_r,0,p.od/2]);if(p.bend_r<p.od)o.push(iss("med","Bend radius under 1×OD: high flow loss.",[0,0,0],{bend_r:+(p.od*1.5).toFixed(0)}));return o;}});
part("pipe_tee",{cat:"Pipe fittings",icon:"┳",re:/\b(pipe )?(tee|t[- ]?piece|t[- ]?junction|wye)\b/,ex:"pipe tee 26.7 mm OD, 80 mm run",mat:"PETG",
 P:{od:[26.7,6,200,"Pipe OD",["od","pipe","diameter"]],wall:[2.9,0.8,15,"Wall",["wall","thick"]],length:[80,20,600,"Run length",["long","length","run"]]},
 build:p=>{const r=p.od/2,ri=r-p.wall;return[tube(r,ri,p.length,{ry:PI/2,x:-p.length/2,z:r}),tube(r,ri,p.length/2,{z:r})];},check:p=>thinWall(p.od,p.wall,"wall",[0,0,p.od])});
part("pipe_coupling",{cat:"Pipe fittings",icon:"═",re:/\b(coupling|coupler|socket fitting|reducer|adapter)\b/,ex:"pipe coupling for 33.4 mm pipe, 50 mm long",mat:"PETG",
 P:{od:[33.4,6,200,"Pipe OD",["od","pipe","diameter"]],wall:[3,0.8,15,"Wall",["wall","thick"]],length:[50,10,400,"Length",["long","length"]]},
 build:p=>[ring(p.od/2+p.wall,p.od/2+0.1,p.length),ring(p.od/2+p.wall,p.od/2-p.wall,p.wall,48)],check:p=>p.length<p.od?[iss("med","Socket depth under 1×OD: weak joint.",[0,0,p.length],{length:+(p.od*1.3).toFixed(0)})]:[]});
const sheetBend=(segs,w,t)=>{const s=new T.Shape();let x=0,y=0;const pts=[[0,0]];for(const[dx,dy]of segs){x+=dx;y+=dy;pts.push([x,y]);}
 const off=pts.map(([a,b],i)=>[a+(i?0:0),b]);const g=[];for(let i=0;i<pts.length-1;i++){const[a,b]=pts[i],[c,d]=pts[i+1],L=Math.hypot(c-a,d-b),ang=Math.atan2(d-b,c-a);const bx=new T.BoxGeometry(L+t,w,t);bx.rotateY(-ang);bx.translate((a+c)/2,0,(b+d)/2);g.push(bx);}return g;};
part("z_bracket",{cat:"Brackets",icon:"Z",re:/\bz[- ]?(bracket|offset bracket)\b|\boffset bracket\b/,ex:"Z bracket 25 mm offset, 25 mm flanges, 2 mm steel",mat:"Mild steel",
 P:{offset:[25,5,200,"Offset",["offset","step"]],flange:[25,8,150,"Flange length",["flanges","flange","leg"]],width:[25,8,200,"Width",["wide","width"]],thickness:[2,0.8,10,"Thickness",["thick"]]},
 build:p=>sheetBend([[p.flange,0],[0,p.offset],[p.flange,0]],p.width,p.thickness),
 check:(p,m,F)=>{const s=bendRect(F,p.flange,p.width,p.thickness);return m.y/s<2?[iss("high",`Bend stress ${s.toFixed(0)} MPa at the step.`,[p.flange,0,p.offset/2],{thickness:+(p.thickness*1.4).toFixed(1)})]:[];}});
part("u_bracket",{cat:"Brackets",icon:"⊔",re:/\b(u|channel)[- ]?(bracket|mount|strap)\b/,ex:"U bracket 30 mm inside, 30 mm legs, 25 mm deep, 2 mm",mat:"Mild steel",
 P:{inner_w:[30,5,300,"Inside width",["inside","inner","gap"]],leg:[30,5,200,"Leg height",["legs","leg","tall"]],length:[25,5,200,"Depth",["long","deep","length"]],thickness:[2,0.8,10,"Thickness",["thick"]]},
 build:p=>[box(p.inner_w+2*p.thickness,p.length,p.thickness,{z:p.thickness/2}),box(p.thickness,p.length,p.leg,{x:-p.inner_w/2-p.thickness/2,z:p.leg/2}),box(p.thickness,p.length,p.leg,{x:p.inner_w/2+p.thickness/2,z:p.leg/2})],
 check:(p,m,F)=>{const s=bendRect(F/2,p.leg,p.length,p.thickness);return m.y/s<2?[iss("high","Legs bend outward under load.",[p.inner_w/2,0,p.leg],{thickness:+(p.thickness*1.4).toFixed(1)})]:[];}});
part("mending_plate",{cat:"Brackets",icon:"▬",re:/\b(mending|repair|joining|flat|strap|splice) (plate|strap|bracket)\b|\bflat bar\b/,ex:"mending plate 100 mm long, 20 mm wide, 2 mm, 4 holes",mat:"Mild steel",
 P:{length:[100,20,600,"Length",["long","length"]],width:[20,8,150,"Width",["wide","width"]],thickness:[2,0.8,12,"Thickness",["thick"]],holes:[4,2,12,"Holes",[]],hole_d:[4.5,2,14,"Hole Ø",["hole"]]},
 build:p=>{const s=rrect(p.length,p.width,2);const n=Math.round(p.holes);for(let i=0;i<n;i++)hole(s,-p.length*0.42+p.length*0.84*i/(n-1),0,p.hole_d/2);return[ext(s,p.thickness)];},
 check:(p,m,F)=>{const net=(p.width-p.hole_d)*p.thickness,s=F/net,o=[];if(m.y/s<2)o.push(iss("high","Net section at a hole yields.",[0,0,p.thickness],{thickness:+(p.thickness*1.5).toFixed(1)}));if(p.hole_d>p.width*0.5)o.push(iss("med","Holes over half the width.",[p.length*0.42,0,p.thickness],{hole_d:+(p.width*0.35).toFixed(1)}));return o;}});
part("pcb_enclosure",{cat:"Enclosures",icon:"▤",re:/\b(pcb|electronics|arduino|raspberry ?pi|esp32|circuit board) (enclosure|box|case|housing)\b|\b(enclosure|case|box) for (an? )?(pcb|arduino|raspberry|esp32|circuit)/,ex:"enclosure for arduino uno, 2 mm walls",mat:"PETG",
 P:{pcb_l:[68.6,10,400,"Board length",["board length"]],pcb_w:[53.4,10,400,"Board width",["board width"]],height:[30,10,200,"Height",["tall","high","height"]],wall:[2,1,6,"Wall",["wall","walls"]]},
 build:p=>{const L=p.pcb_l+2*p.wall+6,W=p.pcb_w+2*p.wall+6;return PARTS.project_box.build({length:L,width:W,height:p.height,wall:p.wall,standoffs:4,vents:4});},
 check:p=>p.height<15?[iss("med","Under 15 mm tall: little room above the board.",[0,0,p.height],{height:25})]:[]});
part("hook_rail",{cat:"Hooks",icon:"ꟻ",re:/\b(coat|towel|key) (rack|rail|hook rail)\b|\bhook rail\b/,ex:"coat hook rail 300 mm long with 4 hooks",mat:"PLA",
 P:{length:[300,60,1200,"Length",["long","length"]],hooks:[4,1,12,"Hooks",["hooks"]],height:[40,15,120,"Height",["tall","high"]],thickness:[6,3,20,"Thickness",["thick"]]},
 build:p=>{const{length:L,height:h,thickness:t}=p,g=[box(L,t,h,{z:h/2})],n=Math.round(p.hooks);for(let i=0;i<n;i++){const x=-L/2+L*(i+0.5)/n;g.push(cyl(t*0.4,h*0.8,{rx:PI/2,x,y:-h*0.4,z:h*0.45}));g.push(place(new T.SphereGeometry(t*0.6,16,12),{x,y:-h*0.8,z:h*0.45}));}return g;},
 check:(p,m)=>{const s=bendRect(30,p.height*0.8,p.thickness*0.8,p.thickness*0.8);return m.y/s<2?[iss("high","Hook pegs too thin for a heavy coat.",[0,-p.height*0.4,p.height*0.45],{thickness:+(p.thickness*1.3).toFixed(1)})]:[];}});
part("compression_spring",{cat:"Springs",icon:"🌀",re:/\b(compression |coil |helical )?spring\b/,ex:"compression spring 1.5 mm wire, 15 mm OD, 40 mm long, 8 coils",mat:"Spring steel",
 P:{wire_d:[1.5,0.3,10,"Wire Ø",["wire","wire diameter"]],coil_od:[15,3,150,"Coil OD",["od","outer diameter","coil"]],free_length:[40,5,400,"Free length",["long","length","tall"]],coils:[8,2,40,"Active coils",["coils","turns"]]},
 build:p=>{const R=(p.coil_od-p.wire_d)/2,n=p.coils+2;class H extends T.Curve{getPoint(t,v=new T.Vector3()){const a=t*n*2*PI;return v.set(R*Math.cos(a),R*Math.sin(a),p.wire_d/2+t*(p.free_length-p.wire_d));}}return[new T.TubeGeometry(new H(),Math.round(n*32),p.wire_d/2,10,false)];},
 check:(p,m,F)=>{const d=p.wire_d,D=p.coil_od-d,C=D/d,Kw=(4*C-1)/(4*C-4)+0.615/C,tau=Kw*8*F*D/(PI*d**3),allow=1300*0.45,o=[];if(tau>allow)o.push(iss("high",`Wire shear ${tau.toFixed(0)} MPa > ${allow.toFixed(0)} allowed (spring steel).`,[R0(p),0,p.free_length/2],{wire_d:+(d*1.25).toFixed(2)}));if(C<4)o.push(iss("med","Spring index under 4: hard to coil.",[0,0,0],{coil_od:d*6}));if(p.free_length/p.coil_od>4)o.push(iss("med","Slender spring will buckle sideways; use a guide rod.",[0,0,p.free_length],{}));return o;}});
const R0=p=>p.coil_od/2;
part("knob",{cat:"Handles",icon:"◉",re:/\b(knob|dial|thumb ?screw head)\b/,ex:"knob 30 mm diameter 15 mm tall knurled with 6 mm bore",mat:"PLA",
 P:{diameter:[30,8,150,"Diameter",["diameter","od"]],height:[15,5,80,"Height",["tall","high","height"]],bore:[6,0,40,"Bore",["bore","shaft"]],ridges:[18,0,60,"Grip ridges",["ridges"]]},
 build:p=>{const s=new T.Shape(),R=p.diameter/2,n=Math.max(1,Math.round(p.ridges))*2;for(let i=0;i<=n*4;i++){const a=i/(n*4)*2*PI,r=p.ridges?R-(i%4<2?0:R*0.04):R;i?s.lineTo(r*Math.cos(a),r*Math.sin(a)):s.moveTo(r*Math.cos(a),r*Math.sin(a));}if(p.bore)hole(s,0,0,p.bore/2);return[ext(s,p.height)];},
 check:p=>p.diameter-p.bore<8?[iss("med","Thin wall around the bore.",[0,0,p.height],{diameter:p.bore+12})]:[]});
part("butt_hinge",{cat:"Mechanisms",icon:"⫴",re:/\bhinge\b/,ex:"hinge 80 mm long, 25 mm leaf, 3 mm pin",mat:"Mild steel",
 P:{length:[80,20,400,"Length",["long","length"]],leaf:[25,8,120,"Leaf width",["leaf","wide"]],thickness:[2,0.8,8,"Thickness",["thick"]],pin:[3,1.5,15,"Pin Ø",["pin"]],knuckles:[5,3,11,"Knuckles",["knuckles"]]},
 build:p=>{const r=p.pin/2+p.thickness,n=Math.round(p.knuckles)|1,g=[box(p.leaf,p.length,p.thickness,{x:-p.leaf/2-r}),box(p.leaf,p.length,p.thickness,{x:p.leaf/2+r})];for(let i=0;i<n;i++)g.push(place(ring(r,p.pin/2,p.length/n-0.4),{rx:PI/2,y:-p.length/2+p.length*(i+1)/n-0.2}));g.push(cyl(p.pin/2,p.length,{}));return g;},
 check:(p,m,F)=>{const s=F/(2*PI*p.pin**2/4);return m.y*0.6/s<2?[iss("high","Pin shear too high.",[0,0,0],{pin:+(p.pin*1.4).toFixed(1)})]:[];}});
part("beam_bridge",{cat:"Bridges",mode:"bridge",icon:"═",re:/\b(beam|girder|footbridge|foot bridge|span) bridge\b|\bfootbridge\b/,ex:"beam bridge 12 m span, 3 m wide, 4 girders",mat:"Structural steel S355",
 P:{span:[12,3,40,"Span m",["span","spanning","long"]],width:[3,1,20,"Deck width m",["wide","width"]],girders:[4,2,10,"Girders",["girders"]],depth:[600,200,2500,"Girder depth mm",["deep","depth"]]},
 build:p=>{const S=p.span*1000,W=p.width*1000,d=p.depth,n=Math.round(p.girders),g=[box(S,W,200,{z:d+100})];for(let i=0;i<n;i++){const y=-W/2+W*(i+0.5)/n;g.push(box(S,d*0.04+8,d,{y,z:d/2}),box(S,d*0.35,d*0.05,{y,z:d*0.97}),box(S,d*0.35,d*0.05,{y,z:d*0.03}));}for(const x of[-S/2,S/2])g.push(box(1000,W+600,1200,{x,z:-600}));return g;},
 check:p=>{const o=[];const r=p.span*1000/p.depth;if(r>20)o.push(iss("high",`Span/depth ${r.toFixed(0)} > 20: too bouncy.`,[0,0,p.depth],{depth:Math.ceil(p.span*1000/18/50)*50}));if(p.width*1000/p.girders>2500)o.push(iss("med","Girders more than 2.5 m apart.",[0,0,p.depth],{girders:Math.ceil(p.width/2.2)}));o.push(iss("info","Preliminary only - a licensed engineer must design real bridges.",[0,0,0]));return o;}});
part("building_frame",{cat:"Buildings",mode:"bridge",icon:"▥",re:/\b(building frame|building|steel frame|warehouse|story|storey)\b/,ex:"2 story building frame 16 x 10 m, 3.5 m floors",mat:"Structural steel S355",
 P:{stories:[2,1,10,"Stories",["story","stories","storey","floors"]],length:[16,4,80,"Length m",["long","length"]],width:[10,4,60,"Width m",["wide","width"]],story_h:[3.5,2.5,6,"Floor height m",["floor height","story height"]],column:[250,100,800,"Column mm",["column"]]},
 build:p=>{const L=p.length*1000,W=p.width*1000,h=p.story_h*1000,c=p.column,nx=Math.ceil(p.length/8),ny=Math.ceil(p.width/8),g=[];for(let s=0;s<p.stories;s++){const z=s*h;for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++)g.push(box(c,c,h,{x:-L/2+L*i/nx,y:-W/2+W*j/ny,z:z+h/2}));
  for(let j=0;j<=ny;j++)g.push(box(L,c*0.6,c*1.2,{y:-W/2+W*j/ny,z:z+h}));for(let i=0;i<=nx;i++)g.push(box(c*0.6,W,c*1.2,{x:-L/2+L*i/nx,z:z+h}));g.push(box(L,W,120,{z:z+h+c*0.6}));}return g;},
 check:p=>{const o=[],need=200+40*p.stories;if(p.column<need)o.push(iss("high",`Columns ${p.column} mm look small for ${p.stories} stories (rough guide ≥ ${need} mm).`,[0,0,p.story_h*500],{column:need}));if(p.stories>3)o.push(iss("info","Add bracing/shear walls for wind and seismic.",[0,0,0]));o.push(iss("info","Preliminary only - needs a licensed engineer.",[0,0,0]));return o;}});
part("shed_roof",{cat:"Roofs",mode:"roof",icon:"◸",re:/\b(shed|mono[- ]?pitch|lean[- ]?to|skillion) roof\b/,ex:"shed roof 4 m span, 6 m long, 10 degree pitch",mat:"Timber C24",
 P:{span:[4,1,12,"Span m",["span","wide"]],length:[6,1,40,"Length m",["long","length"]],pitch:[10,3,45,"Pitch °",["pitch"]],rafter:[200,100,400,"Rafter depth mm",["rafter","depth"]],spacing:[600,300,1200,"Spacing mm",["spacing","centers"]]},
 build:p=>{const S=p.span*1000,L=p.length*1000,a=p.pitch*PI/180,rl=S/Math.cos(a),n=Math.floor(L/p.spacing)+1,g=[];for(let i=0;i<n;i++){const y=-L/2+L*i/(n-1),b=new T.BoxGeometry(rl,50,p.rafter);b.rotateY(-a);b.translate(0,y,S/2*Math.tan(a));g.push(b);}g.push(box(100,L,200,{x:-S/2}),box(100,L,200,{x:S/2,z:S*Math.tan(a)}));return g;},
 check:p=>{const o=[],ln=p.span*1000/Math.cos(p.pitch*PI/180);if(ln/p.rafter>20)o.push(iss("high",`Rafter L/d ${(ln/p.rafter).toFixed(0)} > 20.`,[0,0,0],{rafter:Math.round(ln/18/10)*10}));if(p.pitch<5)o.push(iss("med","Under 5°: water ponds.",[0,0,0],{pitch:5}));if(p.spacing>600)o.push(iss("med","Spacing over 600 mm.",[0,0,0],{spacing:600}));return o;}});
part("truss_roof",{cat:"Roofs",mode:"roof",icon:"⋀",re:/\b(truss(ed)? roof|roof truss(es)?|fink truss)\b/,ex:"truss roof 10 m span, 15 m long, 30 degree pitch",mat:"Timber C24",
 P:{span:[10,3,30,"Span m",["span","wide"]],length:[15,2,60,"Length m",["long","length"]],pitch:[30,10,60,"Pitch °",["pitch"]],depth:[150,75,300,"Chord depth mm",["depth","chord"]],spacing:[600,400,1200,"Spacing mm",["spacing"]]},
 build:p=>{const S=p.span*1000,L=p.length*1000,a=p.pitch*PI/180,h=S/2*Math.tan(a),n=Math.floor(L/p.spacing)+1,g=[],bar=(x1,z1,x2,z2,y)=>{const l=Math.hypot(x2-x1,z2-z1),b=new T.BoxGeometry(l,40,p.depth*0.6);b.rotateY(-Math.atan2(z2-z1,x2-x1));b.translate((x1+x2)/2,y,(z1+z2)/2);g.push(b);};
  for(let i=0;i<n;i++){const y=-L/2+L*i/(n-1);bar(-S/2,0,0,h,y);bar(0,h,S/2,0,y);bar(-S/2,0,S/2,0,y);bar(-S/6,0,-S/4,h/2,y);bar(-S/6,0,0,h,y);bar(S/6,0,S/4,h/2,y);bar(S/6,0,0,h,y);}return g;},
 check:p=>{const o=[],ln=p.span*500/Math.cos(p.pitch*PI/180)/2;if(ln/p.depth>24)o.push(iss("high","Top chord too slender between webs.",[0,0,0],{depth:Math.round(ln/22/10)*10}));if(p.spacing>600)o.push(iss("med","Truss spacing over 600 mm.",[0,0,0],{spacing:600}));return o;}});
part("bike_rack",{cat:"Invent",icon:"🚲",re:/\b(bike|bicycle) (rack|stand|hook)\b/,ex:"bike rack 3 bikes, steel",mat:"Mild steel",
 P:{bikes:[3,1,10,"Bikes",["bikes"]],tube:[30,15,60,"Tube Ø",["tube"]],height:[800,500,1100,"Height",["tall","high"]]},
 build:p=>{const n=Math.round(p.bikes),g=[],r=p.tube/2;for(let i=0;i<n;i++){const x=i*400;g.push(place(new T.TorusGeometry(300,r,12,32,PI),{rx:PI/2,x,z:p.height-300}),cyl(r,p.height-300,{rx:PI/2,x:x-300,z:(p.height-300)/2}),cyl(r,p.height-300,{rx:PI/2,x:x+300,z:(p.height-300)/2}));}g.push(cyl(r,n*400+400,{rz:PI/2,x:(n-1)*200,z:r}));return g;},
 check:p=>p.tube<25?[iss("med","Under 25 mm tube bends if a bike falls on it.",[0,0,p.height],{tube:32})]:[]});
part("planter_box",{cat:"Invent",icon:"🪴",re:/\b(planter|flower box|raised bed|garden bed)\b/,ex:"planter box 600 x 200 x 200 mm, 3 mm walls",mat:"PETG",
 P:{length:[600,100,3000,"Length",["long","length"]],width:[200,60,1500,"Width",["wide","width"]],height:[200,50,800,"Height",["tall","high","height"]],wall:[3,1.5,40,"Wall",["wall","walls"]],drains:[3,0,10,"Drain holes",[]]},
 build:p=>PARTS.project_box.build({length:p.length,width:p.width,height:p.height,wall:p.wall,standoffs:0,vents:0}),
 check:p=>{const o=[],q=0.5*1000*9.81*(p.height/1000)**2*p.length,s=6*q*p.height/3/(p.length*p.wall**2);if(s>15)o.push(iss("high","Soil pressure will bulge the long walls.",[0,-p.width/2,p.height/2],{wall:+(p.wall*Math.sqrt(s/12)).toFixed(1)}));if(!p.drains)o.push(iss("med","No drain holes: roots rot.",[0,0,0],{drains:3}));return o;}});
// ===== realistic weight for big structures: steel members are hollow/I sections, decks & floors are concrete =====
// Returns {kg, cost, note}. Without this the solid preview boxes would be weighed as solid steel (way too heavy).
const CONC={rho:2400,cost:0.13};const hollowA=m=>{const t=Math.max(8,m/16);return m*m-(m-2*t)**2;};
const STRUCT={
 truss_bridge:(p,M)=>{const S=p.span*1000,W=p.width*1000,H=p.height*1000,n=Math.round(p.panels),pl=S/n;
  const side=S+(S-2*pl)+(n-1)*H+n*Math.hypot(pl,H),Lm=2*side+(n-1)*W;const steel=Lm*hollowA(p.member)*1e-9*M.rho;
  const stringers=Math.ceil(W/1500)*S*9000*1e-9*M.rho; // ~W250 stringers, 9000 mm² each
  const deck=S*W*200*1e-9*CONC.rho;return{kg:steel+stringers+deck,cost:(steel+stringers)*M.cost+deck*CONC.cost,
  note:`steel ${(steel+stringers)/1000|0} t (hollow box members ${p.member} mm, ${Math.max(8,p.member/16).toFixed(0)} mm wall) + 200 mm concrete deck ${deck/1000|0} t`};},
 beam_bridge:(p,M)=>{const S=p.span*1000,W=p.width*1000,d=p.depth,n=Math.round(p.girders);const A=(d*0.04+8)*d*0.9+2*(d*0.35)*(d*0.05);
  const steel=n*S*A*1e-9*M.rho,deck=S*W*200*1e-9*CONC.rho,abut=2*1000*(W+600)*1200*1e-9*CONC.rho;
  return{kg:steel+deck+abut,cost:steel*M.cost+(deck+abut)*CONC.cost,note:`steel girders ${(steel/1000).toFixed(1)} t + concrete deck & abutments ${((deck+abut)/1000).toFixed(0)} t`};},
 building_frame:(p,M)=>{const L=p.length*1000,W=p.width*1000,h=p.story_h*1000,c=p.column,nx=Math.ceil(p.length/8),ny=Math.ceil(p.width/8),s=p.stories;
  const col=s*(nx+1)*(ny+1)*h*hollowA(c),bA=(c*1.2)*(c*0.6)-(c*1.2-2*Math.max(8,c/20))*(c*0.6-Math.max(8,c/20)); // I-ish beam area
  const beams=s*((ny+1)*L+(nx+1)*W)*bA,steel=(col+beams)*1e-9*M.rho,slab=s*L*W*120*1e-9*CONC.rho;
  return{kg:steel+slab,cost:steel*M.cost+slab*CONC.cost,note:`steel frame ${(steel/1000).toFixed(1)} t (hollow columns, I-beams) + 120 mm concrete floors ${(slab/1000).toFixed(0)} t`};}};
export function massOf(name,p,mat,geo){const M=MATS[mat]||MATS.PLA;if(STRUCT[name])return STRUCT[name](p,M);const kg=volume(geo)*1e-9*M.rho;return{kg,cost:kg*M.cost,note:""};}
// ===== robotics & drones =====
part("drone_frame",{cat:"Robotics",icon:"✚",re:/\b(drone|quad(copter)?|hexa(copter)?|octo(copter)?|multirotor|fpv)( frame)?\b/,ex:"quadcopter frame 250 mm motor to motor, 4 mm carbon arms, 2306 motors, 800 g all-up",mat:"Nylon PA12",
 P:{size:[250,100,1000,"Motor-to-motor mm",["motor to motor","wheelbase","size","frame"]],arm_w:[14,6,40,"Arm width",["arm width","wide"]],arm_t:[4,2,12,"Arm thickness",["arms","arm","thick"]],mount:[28,12,60,"Motor mount Ø",["mount","motor mount"]],plate:[90,40,300,"Center plate",["plate","center"]]},
 build:p=>{const R=p.size/2,g=[box(p.plate,p.plate*0.8,p.arm_t,{z:p.arm_t/2}),box(p.plate*0.9,p.plate*0.7,2,{z:p.arm_t+28})];
  for(const a of[PI/4,3*PI/4,5*PI/4,7*PI/4]){const geo=new T.BoxGeometry(R,p.arm_w,p.arm_t);geo.translate(R/2,0,p.arm_t/2);geo.rotateZ(a);g.push(geo);g.push(cyl(p.mount/2,p.arm_t+1,{rx:PI/2,x:R*Math.cos(a),y:R*Math.sin(a),z:(p.arm_t+1)/2}));
   g.push(cyl(p.mount/2*0.9,12,{rx:PI/2,x:R*Math.cos(a),y:R*Math.sin(a),z:p.arm_t+7}));}for(const[x,y]of[[1,1],[1,-1],[-1,1],[-1,-1]])g.push(cyl(2,28,{rx:PI/2,x:x*p.plate*0.35,y:y*p.plate*0.3,z:p.arm_t+14}));return g;},
 check:(p,m,F)=>{const o=[],L=p.size/2-p.plate*0.35,thrust=Math.max(F,8)*2/4; // each arm carries ~2× hover thrust at full throttle
  const s=bendRect(thrust,L,p.arm_w,p.arm_t);if(m.y/s<1.5)o.push(iss("high",`Arm bending ${s.toFixed(0)} MPa at full thrust: arms will snap in a crash or punch-out.`,[p.size/2*0.7,p.size/2*0.7,0],{arm_t:+(p.arm_t*Math.sqrt(s*1.5/m.y)*1.05).toFixed(1)}));
  const d=thrust*L**3/(3*m.E*p.arm_w*p.arm_t**3/12);if(d>L*0.01)o.push(iss("med",`Arm tip flexes ${d.toFixed(1)} mm: vibration/oscillation risk, PID tune will suffer.`,[p.size/2*0.7,0,0],{arm_t:+(p.arm_t*1.3).toFixed(1)}));
  if(m.E<20000)o.push(iss("info","Real racing frames use 4–6 mm carbon fibre plate (E ≈ 50–70 GPa); printed nylon is fine for prototypes and small whoops.",[0,0,0]));return o;}});
part("robot_arm_link",{cat:"Robotics",icon:"⟋",re:/\b(robot(ic)? arm|arm link|link arm|servo arm|robot link)\b/,ex:"robot arm link 150 mm between joints, 30 mm wide, 6 mm thick, lifts 500 g, PETG",mat:"PETG",
 P:{length:[150,40,600,"Joint spacing",["between joints","long","length"]],width:[30,10,100,"Width",["wide","width"]],thickness:[6,2,30,"Thickness",["thick"]],bore:[8,2,30,"Joint bore",["bore","shaft"]]},
 build:p=>{const s=new T.Shape();const L=p.length,r=p.width/2;s.absarc(0,0,r,PI/2,3*PI/2,false);s.lineTo(L,-r);s.absarc(L,0,r,-PI/2,PI/2,false);s.lineTo(0,r);hole(s,0,0,p.bore/2);hole(s,L,0,p.bore/2);if(L>4*p.width)hole(s,L/2,0,p.width*0.25);return[place(ext(s,p.thickness),{x:-L/2})];},
 check:(p,m,F)=>{const o=[],s=bendRect(F,p.length,p.thickness,p.width);if(m.y/s<2)o.push(iss("high",`Link bending ${s.toFixed(1)} MPa at full reach.`,[0,0,0],{width:+(p.width*Math.sqrt(s*2/m.y)*1.05).toFixed(1)}));
  const bear=F/(p.bore*p.thickness);if(bear>m.y/3)o.push(iss("med","Joint hole bearing stress high: add a bushing or thicker link.",[-p.length/2,0,0],{thickness:+(p.thickness*1.4).toFixed(1)}));
  o.push(iss("info",`Joint torque needed ≈ ${(F*p.length/1000).toFixed(2)} N·m (${(F*p.length/1000/0.0981).toFixed(1)} kg·cm) plus the link's own weight; pick a servo with 2× that.`,[0,0,0]));return o;}});
part("wheel",{cat:"Robotics",icon:"◎",re:/\b(robot )?wheel\b(?! ?(bearing|pulley))/,ex:"robot wheel 65 mm diameter, 25 mm wide, 5 mm D shaft",mat:"PLA",
 P:{diameter:[65,20,400,"Diameter",["diameter","across"]],width:[25,5,120,"Width",["wide","width"]],bore:[5,2,30,"Shaft bore",["shaft","bore"]],spokes:[5,0,12,"Spokes",["spokes"]]},
 build:p=>{const R=p.diameter/2,g=[ring(R,R-4,p.width),ring(p.bore/2+5,p.bore/2,p.width)];for(let i=0;i<p.spokes;i++){const a=i*2*PI/p.spokes,l=R-4-(p.bore/2+5);const b=new T.BoxGeometry(l,4,p.width*0.6);b.translate(p.bore/2+5+l/2,0,p.width*0.3);b.rotateZ(a);g.push(b);}if(!p.spokes)g.push(ring(R-3,p.bore/2+4,p.width*0.4));return g;},
 check:(p,m,F)=>{const o=[];if(p.spokes&&p.spokes<3)o.push(iss("med","Fewer than 3 spokes: wheel wobbles.",[0,0,0],{spokes:5}));if(F/(p.width*8)>m.y/4)o.push(iss("high","Rim crushes under this load.",[p.diameter/2,0,0],{width:Math.round(p.width*1.5)}));return o;}});
part("motor_mount",{cat:"Robotics",icon:"⊕",re:/\b(motor|stepper|nema ?17|nema ?23) (mount|bracket|plate)\b/,ex:"NEMA 17 motor mount 5 mm thick, PETG",mat:"PETG",
 P:{size:[42.3,20,90,"Motor face",["face"]],thickness:[5,2,15,"Thickness",["thick"]],bolt:[31,10,80,"Bolt square",["bolt"]]},
 build:p=>{const S=p.size+10,s=rrect(S,S,4);hole(s,0,0,11.5);for(const[x,y]of[[1,1],[1,-1],[-1,1],[-1,-1]])hole(s,x*p.bolt/2,y*p.bolt/2,1.7);return[ext(s,p.thickness),box(p.thickness,S,S*0.8,{x:-S/2+p.thickness/2,z:S*0.4}),box(S*0.6,p.thickness,S*0.6,{x:-S*0.2,y:S/2-p.thickness/2,z:S*0.3})];},
 check:(p,m,F)=>p.thickness<4&&m.E<10000?[iss("med","Under 4 mm printed plate flexes and lets belts lose tension.",[0,0,0],{thickness:5})]:[]});
