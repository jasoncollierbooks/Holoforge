// Sketch pad → 3D: freehand (mouse / touch / pen pressure) outline → cleaned polygon (simplify, straighten,
// snap, close, mirror) → extrude, revolve (lathe), loft, or side+front "two-view" solid. Pure functions are node-testable.
import * as T from 'three';
const PI=Math.PI;
// ---------- geometry cleanup ----------
export function rdp(pts,eps){if(pts.length<3)return pts.slice();let dmax=0,ix=0;const[a,b]=[pts[0],pts[pts.length-1]];for(let i=1;i<pts.length-1;i++){const d=segDist(pts[i],a,b);if(d>dmax){dmax=d;ix=i;}}if(dmax>eps){const l=rdp(pts.slice(0,ix+1),eps),r=rdp(pts.slice(ix),eps);return l.slice(0,-1).concat(r);}return[a,b];}
function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy;if(!L)return Math.hypot(p[0]-a[0],p[1]-a[1]);let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L;t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
export function joinStrokes(strokes){let out=[];for(const s of strokes){let p=s.map(q=>[q[0],q[1]]);if(!p.length)continue;if(out.length){const e=out[out.length-1];if(Math.hypot(p[p.length-1][0]-e[0],p[p.length-1][1]-e[1])<Math.hypot(p[0][0]-e[0],p[0][1]-e[1]))p.reverse();}out=out.concat(p);}return out;}
// straighten: snap segment directions to 15° when within 6°, snap points to grid; merge near-collinear points
export function straighten(pts,{grid=10,angle=15,tol=6}={}){if(pts.length<2)return pts;const out=[pts[0].slice()];
 for(let i=1;i<pts.length;i++){const a=out[out.length-1],b=pts[i];const ang=Math.atan2(b[1]-a[1],b[0]-a[0])*180/PI,L=Math.hypot(b[0]-a[0],b[1]-a[1]);const sn=Math.round(ang/angle)*angle;const use=Math.abs(sn-ang)<=tol?sn:ang;out.push([a[0]+L*Math.cos(use*PI/180),a[1]+L*Math.sin(use*PI/180)]);}
 const g=v=>Math.round(v/grid)*grid;const sn=out.map(([x,y])=>[g(x),g(y)]);const ded=[];for(const p of sn)if(!ded.length||Math.hypot(p[0]-ded[ded.length-1][0],p[1]-ded[ded.length-1][1])>0.5)ded.push(p);
 const res=[];for(let i=0;i<ded.length;i++){const a=res[res.length-1],b=ded[i],c=ded[i+1];if(a&&c){const cr=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(cr)<1e-6)continue;}res.push(b);}return res;}
export function closeLoop(pts,tol){if(pts.length>2&&Math.hypot(pts[0][0]-pts[pts.length-1][0],pts[0][1]-pts[pts.length-1][1])<tol)pts=pts.slice(0,-1);return pts;}
export function mirror(pts,cx){const right=pts.filter(p=>p[0]>=cx-0.5);if(right.length<2)return pts;right.sort((a,b)=>a[1]-b[1]);// top→bottom along the axis
 const r=right.map(([x,y])=>[Math.max(x,cx),y]);const l=r.slice().reverse().map(([x,y])=>[2*cx-x,y]);return[[cx,r[0][1]],...r,[cx,r[r.length-1][1]],...l].filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>0.5);}
export const area=pts=>{let s=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
// full cleanup pipeline (canvas pixels in, mm out with z up and x centred)
export function profile(strokes,{snap=true,sym=false,cx=320,widthMM=120,closeTol=28}={}){let pts=joinStrokes(strokes);if(pts.length<3)return null;
 pts=rdp(pts,2.5);if(snap)pts=straighten(pts);pts=closeLoop(pts,closeTol);if(sym)pts=mirror(pts,cx);if(pts.length<3)return null;
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const w=Math.max(...xs)-Math.min(...xs)||1,s=widthMM/w,yb=Math.max(...ys),xc=sym?cx:(Math.max(...xs)+Math.min(...xs))/2;
 let mm=pts.map(([x,y])=>[+((x-xc)*s).toFixed(2),+((yb-y)*s).toFixed(2)]);if(area(mm)<0)mm.reverse();return{pts:mm,scale:s,closed:true,axisX:sym?0:null};}
// ---------- solids ----------
const shapeOf=pts=>{const s=new T.Shape();s.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))s.lineTo(p[0],p[1]);s.closePath();return s;};
function resample(pts,n){const segs=[];let L=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);segs.push([a,b,l]);L+=l;}const out=[];let k=0,acc=0;for(let i=0;i<n;i++){const d=i/n*L;while(k<segs.length-1&&acc+segs[k][2]<d){acc+=segs[k][2];k++;}const[a,b,l]=segs[k],t=l?(d-acc)/l:0;out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}return out;}
function spanAt(pts,z){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]-z)*(b[1]-z)<=0&&a[1]!=b[1]){xs.push(a[0]+(z-a[1])/(b[1]-a[1])*(b[0]-a[0]));}}if(xs.length<2)return null;return[Math.min(...xs),Math.max(...xs)];}
export function solid(sk){const{op="extrude",pts,D=20}=sk;let g;
 if(op=="extrude"){const bv=D>4?Math.min(1.2,D*0.05):0;g=new T.ExtrudeGeometry(shapeOf(pts),{depth:D-2*bv,bevelEnabled:bv>0,bevelThickness:bv,bevelSize:bv,bevelOffset:-bv,bevelSegments:2,curveSegments:8});g.translate(0,0,bv);g.translate(0,0,-D/2);g.rotateX(PI/2);}
 else if(op=="revolve"){const ax=sk.axisX??0;// clip the outline to the right of the axis (keeps the outline order), then spin it
  const P=pts.map(([x,z])=>[x-ax,z]);let C=[];for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];const ai=a[0]>=0,bi=b[0]>=0;if(ai)C.push(a);if(ai!=bi){const t=a[0]/(a[0]-b[0]);C.push([0,a[1]+(b[1]-a[1])*t]);}}
  if(C.length<3)C=P.map(([x,z])=>[Math.abs(x),z]);
  // start the path on the axis so the seam lies on the centre line
  let k=C.findIndex((p,i)=>p[0]<=1e-6&&C[(i+1)%C.length][0]>1e-6);if(k<0)k=0;C=[...C.slice(k),...C.slice(0,k)];
  const lp=C.map(([r,z])=>new T.Vector2(Math.max(0,r),z));lp.push(lp[0].clone());if(area(C)>0)lp.reverse();g=new T.LatheGeometry(lp,72);g.rotateX(PI/2);}
 else if(op=="loft"){const N=64,bot=resample(pts,N),a=Math.abs(area(pts)),r=Math.sqrt(a/PI)*(sk.top??0.6);const cx=bot.reduce((s,p)=>s+p[0],0)/N,cy=bot.reduce((s,p)=>s+p[1],0)/N;const st=Math.atan2(bot[0][1]-cy,bot[0][0]-cx);const top=Array.from({length:N},(_,i)=>[cx+r*Math.cos(st+i/N*2*PI),cy+r*Math.sin(st+i/N*2*PI)]);
  const P=[],add=(a,b,c)=>P.push(...a,...b,...c);const H=D;for(let i=0;i<N;i++){const j=(i+1)%N;const b0=[bot[i][0],bot[i][1],0],b1=[bot[j][0],bot[j][1],0],t0=[top[i][0],top[i][1],H],t1=[top[j][0],top[j][1],H];add(b0,b1,t1);add(b0,t1,t0);}
  const cb=[cx,cy,0],ct=[cx,cy,H];for(let i=0;i<N;i++){const j=(i+1)%N;add(cb,[bot[j][0],bot[j][1],0],[bot[i][0],bot[i][1],0]);add(ct,[top[i][0],top[i][1],H],[top[j][0],top[j][1],H]);}
  g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(P,3));g.translate(-cx,-cy,0);g.computeVertexNormals();}
 else if(op=="views"){const side=resample(pts,160),front=sk.pts2&&sk.pts2.length>2?sk.pts2:null;const fz=front?Math.max(...front.map(p=>p[1])):1,sz=Math.max(...pts.map(p=>p[1]))||1;
  g=new T.ExtrudeGeometry(shapeOf(side),{depth:1,bevelEnabled:false});g.translate(0,0,-0.5);g.rotateX(PI/2);// y ∈ [-0.5,0.5]
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i),u=p.getY(i)+0.5;let lo=-D/2,hi=D/2;if(front){const sp=spanAt(front,z/sz*fz);if(sp){lo=sp[0];hi=sp[1];}else{lo=hi=0;}}p.setY(i,lo+u*(hi-lo));}g.computeVertexNormals();}
 g.computeBoundingBox();const b=g.boundingBox;g.translate(0,0,-b.min.z);g.computeBoundingBox();return g;}
export function volume(g){const gg=g.index?g.toNonIndexed():g,a=gg.attributes.position.array;let v=0;for(let i=0;i<a.length;i+=9)v+=(a[i]*(a[i+4]*a[i+8]-a[i+5]*a[i+7])-a[i+1]*(a[i+3]*a[i+8]-a[i+5]*a[i+6])+a[i+2]*(a[i+3]*a[i+7]-a[i+4]*a[i+6]))/6;return Math.abs(v);}
export const MATS={pla:{n:"PLA (3D print)",rho:1.24,c:25,print:1},petg:{n:"PETG (3D print)",rho:1.27,c:28,print:1},aluminum:{n:"Aluminum 6061",rho:2.7,c:9},steel:{n:"Mild steel",rho:7.85,c:2.5},wood:{n:"Hardwood",rho:0.65,c:6}};
export function inspect(sk,g){const v=volume(g)/1000,M=MATS[sk.mat]||MATS.pla,b=g.boundingBox,sz=[b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z];let kg=v*M.rho/1000;if(M.print)kg=Math.min(kg,kg*0.35+0.002);const issues=[];
 if(sk.op=="extrude"&&sk.D<2)issues.push({lvl:"high",t:"Thinner than 2 mm: likely to snap or fail to print. Make it thicker."});
 if(sk.op=="revolve"&&sk.pts.some(p=>p[0]<-1)&&sk.axisX==null)issues.push({lvl:"info",t:"Revolved around the drawing's centre line; only the right half of the outline was used."});
 if(Math.max(...sz)>250&&M.print)issues.push({lvl:"med",t:`Largest side ${Math.round(Math.max(...sz))} mm: bigger than most printer beds (250 mm) — split it or print diagonally.`});
 if(Math.min(...sz)<1)issues.push({lvl:"high",t:"Part is paper-thin in one direction."});
 return{size:sz,cm3:v,kg,cost:kg*M.c+(M.print?0.5:2),issues,mat:M.n};}
// text follow-ups on a sketch part
export function follow(text,sk){const t=text.toLowerCase(),s={...sk,pts:sk.pts.map(p=>p.slice())},log=[];const num=(t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|in|inch|inches)?/)||[]);const mm=num[1]?+num[1]*({cm:10,in:25.4,inch:25.4,inches:25.4}[num[2]]||1):null;
 const op=t.match(/\b(extrude|revolve|lathe|spin|turn|loft)\b/);if(op){s.op={lathe:"revolve",spin:"revolve",turn:"revolve"}[op[1]]||op[1];log.push(`Operation → ${s.op}`);}
 const mt=t.match(/\b(pla|petg|alumin(?:i)?um|steel|wood)\b/);if(mt){s.mat=mt[1].startsWith("alu")?"aluminum":mt[1];log.push(`Material → ${MATS[s.mat].n}`);}
 if(/\b(thicker|deeper|thinner|shallower|depth|thick|deep|taller|height)\b/.test(t)&&(s.op!="revolve")){const before=s.D;if(mm&&/\b(depth|thick|deep|tall|height)\b/.test(t))s.D=mm;else s.D=+(s.D*(/thinner|shallower/.test(t)?0.75:1.33)).toFixed(1);log.push(`${s.op=="loft"?"Height":"Depth"} ${before} → ${s.D} mm`);}
 const f=/\b(twice|double)\b/.test(t)?2:/\bhalf\b/.test(t)?0.5:/\b(bigger|larger|wider|scale up)\b/.test(t)?1.25:/\b(smaller|narrower|scale down)\b/.test(t)?0.8:null;if(f){s.pts=s.pts.map(([x,y])=>[x*f,y*f]);if(s.pts2)s.pts2=s.pts2.map(([x,y])=>[x*f,y*f]);log.push(`Outline scaled ×${f}`);}
 if(/\bwide\b/.test(t)&&mm){const xs=s.pts.map(p=>p[0]),w=Math.max(...xs)-Math.min(...xs)||1,k=mm/w;s.pts=s.pts.map(([x,y])=>[x*k,y*k]);log.push(`Width → ${mm} mm`);}
 return log.length?{sk:s,log}:null;}
// ---------- interactive pad (browser) ----------
export class Pad{constructor(cv,{onChange}={}){this.cv=cv;this.x=cv.getContext("2d");this.strokes=[];this.cur=null;this.sym=false;this.snap=true;this.onChange=onChange;this.preview=null;
 const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height,e.pressure&&e.pointerType=="pen"?e.pressure:0.5];};
 cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);this.cur=[pos(e)];this.draw();e.preventDefault();});
 cv.addEventListener("pointermove",e=>{if(!this.cur)return;const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];for(const ev of evs)this.cur.push(pos(ev));this.draw();});
 const up=()=>{if(this.cur&&this.cur.length>1){this.strokes.push(this.cur);this.onChange&&this.onChange();}this.cur=null;this.draw();};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);this.draw();}
 undo(){this.strokes.pop();this.preview=null;this.draw();this.onChange&&this.onChange();}
 clear(){this.strokes=[];this.preview=null;this.draw();this.onChange&&this.onChange();}
 load(strokes){this.strokes=strokes.map(s=>s.map(p=>[p[0],p[1],p[2]??0.5]));this.draw();this.onChange&&this.onChange();}
 draw(){const{x,cv}=this,W=cv.width,H=cv.height;x.clearRect(0,0,W,H);x.fillStyle="#051526";x.fillRect(0,0,W,H);
  for(let i=0;i<=W;i+=20){x.strokeStyle=i%100?"rgba(67,228,255,.06)":"rgba(67,228,255,.14)";x.lineWidth=1;x.beginPath();x.moveTo(i+.5,0);x.lineTo(i+.5,H);x.stroke();}
  for(let j=0;j<=H;j+=20){x.strokeStyle=j%100?"rgba(67,228,255,.06)":"rgba(67,228,255,.14)";x.beginPath();x.moveTo(0,j+.5);x.lineTo(W,j+.5);x.stroke();}
  if(this.sym){x.setLineDash([6,6]);x.strokeStyle="rgba(255,181,71,.6)";x.beginPath();x.moveTo(W/2,0);x.lineTo(W/2,H);x.stroke();x.setLineDash([]);}
  const ink=(s,col)=>{x.strokeStyle=col;x.lineCap=x.lineJoin="round";for(let i=1;i<s.length;i++){x.lineWidth=1.2+s[i][2]*4.5;x.beginPath();x.moveTo(s[i-1][0],s[i-1][1]);x.lineTo(s[i][0],s[i][1]);x.stroke();}};
  for(const s of this.strokes)ink(s,"rgba(160,236,255,.55)");if(this.cur)ink(this.cur,"#bff6ff");
  if(this.preview&&this.preview.length>2){x.save();x.shadowColor="#43e4ff";x.shadowBlur=10;x.strokeStyle="#43e4ff";x.lineWidth=2.2;x.fillStyle="rgba(67,228,255,.10)";x.beginPath();x.moveTo(this.preview[0][0],this.preview[0][1]);for(const p of this.preview.slice(1))x.lineTo(p[0],p[1]);x.closePath();x.fill();x.stroke();for(const p of this.preview){x.fillStyle="#fff";x.fillRect(p[0]-2,p[1]-2,4,4);}x.restore();}}
 // cleaned outline in canvas pixels (for live preview)
 cleaned(){let pts=joinStrokes(this.strokes);if(pts.length<3)return null;pts=rdp(pts,2.5);if(this.snap)pts=straighten(pts);pts=closeLoop(pts,28);if(this.sym)pts=mirror(pts,this.cv.width/2);return pts;}}
