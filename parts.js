// HOLO//FORGE built-in parametric library (browser port, no AI). Units: mm.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const T=THREE, PI=Math.PI;
export const MATS={"PLA":{E:3500,y:50,rho:1240,cost:25,proc:"FDM 3D print"},"PETG":{E:2100,y:45,rho:1270,cost:25,proc:"FDM 3D print"},"ABS":{E:2200,y:40,rho:1050,cost:22,proc:"FDM 3D print"},
"Nylon PA12":{E:1700,y:48,rho:1010,cost:60,proc:"SLS print"},"Aluminum 6061-T6":{E:69000,y:276,rho:2700,cost:8,proc:"CNC machining"},"Mild steel":{E:200000,y:250,rho:7850,cost:3,proc:"Laser cut / weld"},
"Stainless 304":{E:193000,y:215,rho:8000,cost:7,proc:"CNC / laser"},"Brass C360":{E:97000,y:310,rho:8500,cost:9,proc:"CNC turning"},"Structural steel S355":{E:210000,y:355,rho:7850,cost:2.5,proc:"Steel fabrication"},"Timber C24":{E:11000,y:24,rho:420,cost:1.2,proc:"Carpentry"}};
const MAL={"structural":"Structural steel S355","petg":"PETG","abs":"ABS","nylon":"Nylon PA12","alumin":"Aluminum 6061-T6","stainless":"Stainless 304","brass":"Brass C360","steel":"Mild steel","wood|timber|lumber|pine|oak":"Timber C24","pla":"PLA"};
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
part("spacer",{cat:"Fasteners",icon:"◎",re:/\b(spacer|bushing|sleeve|cylinder|standoff)\b/,ex:"spacer 12 mm OD, 5 mm bore, 10 mm long, nylon",mat:"Nylon PA12",
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
part("gable_roof",{cat:"Roofs",mode:"roof",icon:"⌂",re:/\b(gable |shed |hip )?roof\b/,ex:"gable roof 8 m span, 12 m long, 35 degree pitch, timber rafters",mat:"Timber C24",
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
export function detect(text){const t=" "+text.toLowerCase()+" ";let best=null;for(const n in PARTS){const m=t.match(PARTS[n].re);if(m&&(!best||m[0].length>best[0]))best=[m[0].length,n];}return best&&best[1];}
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
 for(const k in P.P){if(dims&&["length","width","height"].includes(k)&&P.P[k])continue;for(const al of P.P[k][4]){const r1=new RegExp(NUM+"\\s*(?:mm|m|kg|°|deg|degrees?)?\\s*(?:\\w+\\s)?"+al+"\\b"),r2=new RegExp("\\b"+al+"\\s*(?:of|is|=|:|at)?\\s*"+NUM);
   const m=tc.match(r2)||tc.match(r1);if(m){p[k]=+m[1];notes.push(`${k}=${m[1]}`);break;}}}
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
const STR=["thickness","wall","rafter","member","height","module","diameter","od","leg"];
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
