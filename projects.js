// HOLO//FORGE projects: pre-built multi-part assemblies (and mega "system of systems") triggered by plain text, editable by follow-ups.
// Pure data + three.js geometry, no DOM. Units inside builds: mm. Params carry their own display unit (ft / in / mm / n / b).
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {search,toks} from './brain.js';
const T=THREE,PI=Math.PI;
export const MATP={wood:{n:"SPF / pine lumber",rho:450,c:1.3,col:0xd9a35b},cedar:{n:"Cedar",rho:380,c:3.2,col:0xc0703a},pt:{n:"Pressure-treated pine",rho:560,c:1.4,col:0x9f9a62},
 ply:{n:"Plywood",rho:600,c:1.7,col:0xe8c27a},osb:{n:"OSB",rho:620,c:1.0,col:0xc9a46a},steel:{n:"Mild steel",rho:7850,c:2.2,col:0x9aa3ad},alu:{n:"Aluminum",rho:2700,c:6,col:0xcfd8e0},
 pla:{n:"PLA (3D print)",rho:1240,c:25,col:0x6fdcff},petg:{n:"PETG (3D print)",rho:1270,c:25,col:0x7affc8},abs:{n:"ABS",rho:1050,c:22,col:0x8899ff},fabric:{n:"Canvas / fabric",rho:300,c:27,col:0xf2ead8},
 brass:{n:"Brass",rho:8500,c:9,col:0xd8b04a},copper:{n:"Copper",rho:8900,c:10,col:0xd07a4a},iron:{n:"Cast iron",rho:7200,c:3,col:0x555b63},acrylic:{n:"Acrylic",rho:1180,c:8,col:0xbfefff},
 rubber:{n:"Rubber",rho:1100,c:4,col:0x222428},carbon:{n:"Carbon fibre",rho:1600,c:60,col:0x30343a},foam:{n:"Foam",rho:40,c:10,col:0xf0f0e0},glass:{n:"Glass",rho:2500,c:3,col:0x9fe6ff},
 silicone:{n:"Silicone",rho:1100,c:20,col:0xf0b8a0},concrete:{n:"Concrete",rho:2400,c:0.13,col:0xb8b8b0},pegboard:{n:"Hardboard pegboard",rho:850,c:1.5,col:0xb5895a},
 roof:{n:"Steel roofing sheet",rho:7850,c:2.6,col:0x6d8aa0},paint:{n:"Black paint",rho:1240,c:25,col:0x2a2a30},red:{n:"PLA red",rho:1240,c:25,col:0xd04040},gold:{n:"PLA gold",rho:1240,c:25,col:0xe8c040},
 hw:{n:"Hardware / bought-in",rho:0,c:0,col:0x888888}};
MATP.aluminum=MATP.alu;MATP.plastic=MATP.abs;MATP.mdf=MATP.ply;
const MATWORD=[["pressure treated|treated","pt"],["cedar","cedar"],["plywood|ply\\b","ply"],["osb","osb"],["carbon","carbon"],["stainless|steel|metal","steel"],["alumin","alu"],["petg","petg"],["abs\\b","abs"],["pla\\b|3d print|printed","pla"],["brass","brass"],["wood|pine|lumber|timber","wood"]];
// ---------- component DSL (positions are centres, mm) ----------
export const B=(n,m,w,d,h,x=0,y=0,z=0,o={})=>({n,m,s:"box",d:[w,d,h],p:[x,y,z],...o});
export const C=(n,m,r,h,x=0,y=0,z=0,o={})=>({n,m,s:"cyl",d:[r,o.r2??r,h],p:[x,y,z],...o}); // axis z unless o.ax="x"|"y"
export const S=(n,m,r,x=0,y=0,z=0,o={})=>({n,m,s:"sph",d:[r],p:[x,y,z],...o});
export const HW=(n,qty,cost,kg=0,o={})=>({hw:1,n,m:"hw",q:qty,cost,kg,...o});
export const G=(n,m,geo,o={})=>({n,m,s:"geo",geo,...o});
export const AT=(n,f)=>Array.from({length:n},(_,i)=>f(i));
export function rep(arr,f){const o=[];for(let i=0;i<arr;i++){const r=f(i);if(Array.isArray(r))o.push(...r);else if(r)o.push(r);}return o;}
// a straight member between two points (for frames, trusses, legs at angles)
export function bar(n,m,a,b,w,h,o={}){const va=new T.Vector3(...a),vb=new T.Vector3(...b),L=va.distanceTo(vb),c=va.clone().add(vb).multiplyScalar(0.5);return{n,m,s:"bar",d:[w,h,L],p:[c.x,c.y,c.z],a,b,...o};}
function geoOf(c){let g;if(c.s=="box")g=new T.BoxGeometry(...c.d);else if(c.s=="cyl"){g=new T.CylinderGeometry(c.d[1],c.d[0],c.d[2],c.seg||24);g.rotateX(PI/2);if(c.ax=="x")g.rotateY(PI/2);if(c.ax=="y")g.rotateX(PI/2);}
 else if(c.s=="sph")g=new T.SphereGeometry(c.d[0],16,12);else if(c.s=="bar"){g=new T.BoxGeometry(c.d[0],c.d[1],c.d[2]);const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...c.b).sub(new T.Vector3(...c.a)).normalize());g.applyQuaternion(q);}
 else if(c.s=="geo")return clean(c.geo.clone());
 if(c.r)g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...c.r)));g.translate(...c.p);return clean(g);}
function clean(g){g=g.index?g.toNonIndexed():g;for(const k of Object.keys(g.attributes))if(k!=="position"&&k!=="normal")g.deleteAttribute(k);return g;}
function vol(g){const a=g.attributes.position.array;let v=0;for(let i=0;i<a.length;i+=9)v+=(a[i]*(a[i+4]*a[i+8]-a[i+5]*a[i+7])-a[i+1]*(a[i+3]*a[i+8]-a[i+5]*a[i+6])+a[i+2]*(a[i+3]*a[i+7]-a[i+4]*a[i+6]))/6;return Math.abs(v);}
function area(g){const a=g.attributes.position.array;let s=0;const u=new T.Vector3(),v=new T.Vector3(),w=new T.Vector3();for(let i=0;i<a.length;i+=9){u.set(a[i],a[i+1],a[i+2]);v.set(a[i+3],a[i+4],a[i+5]).sub(u);w.set(a[i+6],a[i+7],a[i+8]).sub(u);s+=v.cross(w).length()/2;}return s;}
// ---------- registry ----------
export const PROJECTS={};
export function proj(id,d){PROJECTS[id]={id,unit:"in",mats:[],roles:{},steps:[],safety:[],size:null,...d};}
const UF={ft:304.8,in:25.4,mm:1,m:1000};
export function toMM(def,p){const o={};for(const k in def.P){const u=def.P[k][4];o[k]=UF[u]?p[k]*UF[u]:p[k];}o.mat=p.mat;return o;}
export function defaults(id){const D=PROJECTS[id],p={};for(const k in D.P)p[k]=D.P[k][0];p.mat=D.mat||D.mats[0];return p;}
const fmtL=(mm,unit)=>unit=="mm"||unit=="m"?(mm>=1000?(mm/1000).toFixed(2)+" m":Math.round(mm)+" mm"):(()=>{const i=mm/25.4;return i>=48?(i/12).toFixed(i%12?1:0)+" ft":(+i.toFixed(2))+" in";})();
// ---------- evaluate: geometry, cut list, cost, weight, notes ----------
export function evalProject(id,p){const D=PROJECTS[id],q=toMM(D,p),comps=D.build(q,p).flat().filter(Boolean);const byMat=new Map(),rows=new Map();let kg=0,cost=0,watts=0;const subs=new Map();
 const addSub=(c,k,cc)=>{const s=c.sub||D.defSub||"Main",a=c.asm||c.n;if(!subs.has(s))subs.set(s,{kg:0,cost:0,w:0,asm:new Map()});const S=subs.get(s);S.kg+=k;S.cost+=cc;S.w+=(c.w||0)*(c.q||1);if(!S.asm.has(a))S.asm.set(a,[]);S.asm.get(a).push(c);};
 for(const c of comps){if(c.hw){const k=(c.kg||0)*c.q,cc=c.cost*c.q;kg+=k;cost+=cc;watts+=(c.w||0)*c.q;const key="hw|"+c.n;const r=rows.get(key)||{n:c.n,m:"bought-in",dims:c.spec||"",q:0,cost:0,kg:0,rep:c.rep||"source",sub:c.sub};r.q+=c.q;r.cost+=cc;r.kg+=k;rows.set(key,r);addSub(c,k,cc);continue;}
  const M=MATP[c.m]||MATP.wood;const g=geoOf(c);const pts=(c.at||[null]);for(const off of pts){const gg=off?g.clone().translate(...off):g;if(!byMat.has(c.m))byMat.set(c.m,[]);byMat.get(c.m).push(gg);}
  const v=(c.t?area(g)*c.t:vol(g))*1e-9,k=c.buy?c.buy.kg*pts.length:v*M.rho*pts.length,cc=c.buy?c.buy.cost*pts.length:k*M.c;if(c.buy&&!c.rep)c.rep="source";kg+=k;cost+=cc;watts+=(c.w||0)*pts.length;
  const dd=c.s=="cyl"?`Ø${fmtL(c.d[0]*2,D.unit)} × ${fmtL(c.d[2],D.unit)}`:c.s=="sph"?`Ø${fmtL(c.d[0]*2,D.unit)}`:c.s=="geo"?(c.spec||"shaped"):[...c.d].sort((a,b)=>a-b).map(x=>fmtL(x,D.unit)).join(" × ");
  const key=c.n+"|"+c.m+"|"+dd;const r=rows.get(key)||{n:c.n,m:M.n,dims:dd+(c.t?` (shell ${fmtL(c.t,"mm")})`:""),q:0,cost:0,kg:0,rep:c.rep||(/pla|petg|abs|red|gold|paint/.test(c.m)?"print":/steel|alu|wood|ply|cedar|pt|osb|acrylic/.test(c.m)?"fab":"source"),sub:c.sub};r.q+=pts.length;r.cost+=cc;r.kg+=k;rows.set(key,r);addSub(c,k,cc);}
 const items=[...byMat.entries()].map(([m,gs])=>({geo:mergeGeometries(gs),color:(MATP[m]||MATP.wood).col}));
 const parts=[...rows.values()];const notes=D.notes?D.notes(q,p,{kg,cost,comps,parts}):[];
 const out={id,name:D.nameOf?D.nameOf(p):D.name,items,parts,kg,cost,watts,notes,steps:D.steps,safety:D.safety,subs};
 if(D.mega){const byRep={print:0,fab:0,source:0},cRep={print:0,fab:0,source:0};for(const r of parts){byRep[r.rep]+=r.q;cRep[r.rep]+=r.cost;}const tq=byRep.print+byRep.fab+byRep.source,tc=cRep.print+cRep.fab+cRep.source||1;
  out.rep={count:byRep,cost:cRep,pctCount:Math.round((byRep.print+byRep.fab)/tq*100),pctCost:Math.round((cRep.print+cRep.fab)/tc*100),pctDesigns:Math.round(parts.filter(r=>r.rep!="source").length/parts.length*100)};out.roadmap=D.roadmap;}
 return out;}
// ---------- detection ----------
let PIDX=null;const pdocs=()=>PIDX||(PIDX=Object.values(PROJECTS).map(D=>({d:"Projects",t:D.name,g:(D.kw||"")+", "+D.name,a:D.blurb||D.name,pid:D.id})));
export function detectProject(text,{partLen=0}={}){const t=" "+text.toLowerCase().replace(/[’']/g,"")+" ";let best=null;
 for(const D of Object.values(PROJECTS))for(const re of D.re){const m=t.match(re);if(m&&(!best||m[0].length>best.len))best={id:D.id,len:m[0].length,why:`you said “${m[0].trim()}”`};}
 if(best&&best.len>=partLen)return best;if(best||partLen)return null;
 {const cue=/\b(build|make|design|plans?|project|kit|how (do|to|would) (i|you) (build|make))\b/.test(t);const r=search(pdocs(),text,1)[0];if(r&&r.conf>=(cue?0.5:0.6))return{id:r.e.pid,len:0,why:`closest project to your words: “${r.e.t}”`};}
 return null;}
export function projectDocs(){return pdocs().map(({pid,...e})=>e);}
// ---------- parse a request / follow-up ----------
const NUMR="(\\d+(?:\\.\\d+)?)";const WN={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twelve:12,twenty:20};
function prep(s){return " "+s.toLowerCase().replace(/[’']/g,"'").replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty)\b/g,w=>WN[w]).replace(/,/g," ")+" ";}
function convert(v,u,to){const f={ft:304.8,feet:304.8,foot:304.8,"'":304.8,in:25.4,inch:25.4,inches:25.4,'"':25.4,mm:1,cm:10,m:1000}[u]||UF[to];return v*f/UF[to];}
function applyText(D,p,t,log,fresh){let changed=false;const set=(k,v,why)=>{const P=D.P[k];v=Math.min(P[2],Math.max(P[1],+(+v).toFixed(2)));if(v!==p[k]){log.push(`${P[3]} ${p[k]} → ${v}${P[4]=="n"||P[4]=="b"?"":" "+P[4]}${why?" ("+why+")":""}`);p[k]=v;changed=true;}};
 // AxB(xC) sizes
 if(D.size){const m=t.match(new RegExp(NUMR+"\\s*(ft|'|in|\"|mm|m)?\\s*(?:x|by|×)\\s*"+NUMR+"\\s*(ft|'|in|\"|mm|m|feet|foot)?(?:\\s*(?:x|by)\\s*"+NUMR+"\\s*(ft|'|in|\"|mm|m)?)?"));
  if(m){const u=m[4]||m[2]||m[6];[m[1],m[3],m[5]].forEach((v,i)=>{const k=D.size[i];if(v&&k)set(k,u?convert(+v,u,D.P[k][4]):+v,"size "+m[0].trim());});}}
 // explicit "N <alias>" and "<role> N unit"
 for(const k in D.P){const P=D.P[k];for(const al of P[5]||[]){const m=t.match(new RegExp(NUMR+"\\s*(ft|feet|foot|'|in|inch|inches|\"|mm|cm|m)?\\s*(?:-\\s*)?"+al+"\\b"));if(m&&P[4]!="b"){set(k,m[2]?convert(+m[1],m[2],P[4]):+m[1]);break;}}}
 for(const[role,words]of[["l","long|length|deep"],["w","wide|width"],["h","tall|high|height"]]){const k=D.roles[role];if(!k)continue;const m=t.match(new RegExp(NUMR+"\\s*(ft|feet|foot|'|in|inch|inches|\"|mm|cm|m)?\\s*(?:"+words+")\\b"));if(m)set(k,m[2]?convert(+m[1],m[2],D.P[k][4]):+m[1]);}
 // features on/off
 for(const k in D.P){const P=D.P[k];if(P[4]!="b")continue;for(const al of P[5]||[]){if(new RegExp("\\b(no|without|remove|drop|delete|skip|lose|take off|get rid of)\\s+(the\\s+|a\\s+|any\\s+)?"+al).test(t)){set(k,0);break;}if(new RegExp("\\b(add|with|include|put|plus|and|want|need|give it)\\s+(a\\s+|an\\s+|the\\s+|some\\s+)?"+al).test(t)||new RegExp("^\\s*((please )?(build|make|design|create|plan|i want|i need)( me)?\\s+)?(an?\\s+|the\\s+)?"+al+"\\b").test(t)){set(k,1);break;}}}
 // material
 for(const[re,mk]of MATWORD)if(new RegExp("\\b("+re+")").test(t)&&D.mats.includes(mk)&&!new RegExp("\\b(no|not|without)\\s+("+re+")").test(t)){if(p.mat!==mk){log.push(`material ${(MATP[p.mat]||{}).n||p.mat} → ${MATP[mk].n}`);p.mat=mk;changed=true;}break;}
 return changed;}
export function planProject(id,text){const D=PROJECTS[id],p=defaults(id),log=[],t=prep(text);if(D.preset)D.preset(t,p,log);applyText(D,p,t,log,true);return{id,p,why:[`Project: ${D.name}.`,...log.map(l=>l+".")]};}
export function projFollow(text,n){const D=PROJECTS[n.proj],p={...n.p},log=[],t=prep(text);let label="Edit";
 const fac=/\b(twice|double)\b/.test(t)?2:/\bhalf\b/.test(t)?0.5:/\btriple\b/.test(t)?3:(m=>m?1+(+m[1])/100:null)(t.match(/(\d+)\s*%/));
 const scaleK=(keys,f,why)=>{for(const k of keys){const P=D.P[k];const v=Math.min(P[2],Math.max(P[1],+(p[k]*f).toFixed(2)));if(v!==p[k]){log.push(`${P[3]} ${p[k]} → ${v} ${P[4]}`);p[k]=v;}}label=why;};
 const lenKeys=Object.keys(D.P).filter(k=>UF[D.P[k][4]]||k=="scale");
 if(/\b(bigger|larger|scale up|enlarge|grow)\b/.test(t)||(fac&&/\b(as big|size|scale)\b/.test(t)&&fac>1))scaleK(lenKeys,fac||1.25,"Bigger");
 else if(/\b(smaller|scale down|shrink|tinier|compact)\b/.test(t)||(fac&&/\b(as big|size|scale)\b/.test(t)&&fac<1))scaleK(lenKeys,fac&&fac<1?fac:0.8,"Smaller");
 for(const[w,role,dir]of[["as long","l",1],["as wide","w",1],["as tall","h",1],["longer","l",1],["shorter","l",-1],["wider","w",1],["narrower","w",-1],["taller","h",1],["higher","h",1],["lower","h",-1],["deeper","l",1]]){if(new RegExp("\\b"+w+"\\b").test(t)&&D.roles[role]){scaleK([D.roles[role]],fac?(dir>0?fac:1/fac):(dir>0?1.25:0.8),w[0].toUpperCase()+w.slice(1));}}
 if(applyText(D,p,t,log,false))label=label=="Edit"?"Changed":label;
 if(!log.length)return null;return{p,label,log};}
// ---------- mega projects: hierarchical summary text ----------
export function megaSummary(ev){if(!ev.rep)return null;const S=[...ev.subs.entries()].map(([s,v])=>`${s}: $${Math.round(v.cost)} · ${v.kg.toFixed(1)} kg${v.w?` · ${Math.round(v.w)} W`:""} · ${v.asm.size} assemblies`);return S;}
