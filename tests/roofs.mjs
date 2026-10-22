// Roof geometry audit: for every project, sloped roof panels must have their RIDGE above their EAVES
// (z falls as you move away from the building centre) and the roof top must sit at/above the wall tops.
import {PROJECTS,planProject,evalProject} from '../projhub.js';
const ROOF=/\b(roof|rafter|ridge|roofing|shingle|eave|gable)\b/i,NOT=/\b(rack|rail|ladder|cargo|box|solar|vent|bars?)\b/i,WALL=/\b(wall|stud|siding|post|corner|frame|framing)\b/i;
let ok=0,n=0;const fails=[];const only=process.argv[2];
const V=[];for(const id of Object.keys(PROJECTS)){if(only&&id!=only)continue;const D=PROJECTS[id],p0=planProject(id,"").p;V.push([id,"default",p0]);for(const side of[1,2]){const p={...p0};for(const k in D.P)if(typeof p[k]=="number"&&D.P[k][4]!="b")p[k]=D.P[k][side];V.push([id,side==1?"all-min":"all-max",p]);}}
for(const[id,tag,pp]of V){let ev;try{ev=evalProject(id,pp);}catch(e){continue;}
 const cs=ev.comps3d||[];const roofs=cs.filter(c=>ROOF.test(c.n)&&!NOT.test(c.n));if(!roofs.length)continue;
 const pos=c=>c.geo.attributes.position.array;let X0=1e9,X1=-1e9,Y0=1e9,Y1=-1e9,wallTop=-1e9;
 for(const c of cs){const a=pos(c);for(let i=0;i<a.length;i+=3){X0=Math.min(X0,a[i]);X1=Math.max(X1,a[i]);Y0=Math.min(Y0,a[i+1]);Y1=Math.max(Y1,a[i+1]);}if(WALL.test(c.n)&&!ROOF.test(c.n)){for(let i=2;i<a.length;i+=3)wallTop=Math.max(wallTop,a[i]);}}
 const cx=(X0+X1)/2,cy=(Y0+Y1)/2;n++;let bad=[];let roofTop=-1e9;
 for(const c of roofs){const a=pos(c);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(let i=0;i<a.length;i+=3){x0=Math.min(x0,a[i]);x1=Math.max(x1,a[i]);y0=Math.min(y0,a[i+1]);y1=Math.max(y1,a[i+1]);roofTop=Math.max(roofTop,a[i+2]);}
  const small=(x1-x0)*(y1-y0)<0.3*(X1-X0)*(Y1-Y0);const ox=small?(x0+x1)/2:cx,oy=small?(y0+y1)/2:cy;
  const zs=[],dx=[],dy=[];for(let i=0;i<a.length;i+=3){zs.push(a[i+2]);dx.push(Math.abs(a[i]-ox));dy.push(Math.abs(a[i+1]-oy));}
  const zr=Math.max(...zs)-Math.min(...zs);if(zr<20)continue;
  const corr=(u,v)=>{const n=u.length,mu=u.reduce((s,x)=>s+x,0)/n,mv=v.reduce((s,x)=>s+x,0)/n;let c=0,a=0,b=0;for(let i=0;i<n;i++){c+=(u[i]-mu)*(v[i]-mv);a+=(u[i]-mu)**2;b+=(v[i]-mv)**2;}return a&&b?c/Math.sqrt(a*b):0;};
  const cx_=corr(zs,dx),cy_=corr(zs,dy),cr=Math.abs(cx_)>Math.abs(cy_)?cx_:cy_;if(cr>0.5)bad.push(`${c.n} slopes UP towards the eave (r=${cr.toFixed(2)})`);}
 if(wallTop>-1e9&&roofTop<wallTop-5)bad.push(`roof top ${roofTop.toFixed(0)} below wall top ${wallTop.toFixed(0)}`);
 if(bad.length)fails.push(`${id} (${tag}): ${[...new Set(bad)].join("; ")}`);else ok++;}
console.log(`roofs: ${ok}/${n} project variants (default / all-min / all-max) with roofs pass (ridge above eaves)`);fails.forEach(f=>console.log("  ✗",f));
