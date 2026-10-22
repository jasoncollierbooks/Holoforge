// Shaped geometry helpers: lofted boat hulls, real wheels (tyre + rim + spokes), turned/tapered legs,
// lathe fuselages, airfoil wings, king-post trusses. All return world-unit BufferGeometry (mm), z up.
import * as T from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const PI=Math.PI;
const nonIdx=g=>{g=g.index?g.toNonIndexed():g;for(const k of Object.keys(g.attributes))if(!["position","normal","uv"].includes(k))g.deleteAttribute(k);if(!g.attributes.uv)g.setAttribute("uv",new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g;};
export const merge=gs=>{const m=mergeGeometries(gs.map(nonIdx));m.computeVertexNormals();return m;};
// Lofted displacement hull: transom stern, fine bow, round (n≈2.4) or V (n≈1.4) sections, keel rocker. z: keel 0 → sheer H.
export function hull(L,B,H,{n=2.4,transom=0.72,rocker=0.12,stations=28,ring=18,deck=true}={}){
 const pos=[],idx=[];const beam=u=>{/*u 0 stern → 1 bow*/const s=u<0.35?transom+(1-transom)*Math.sin(u/0.35*PI/2):Math.cos((u-0.35)/0.65*PI/2)**0.85;return Math.max(0.002,s)*B/2;};
 const sheer=u=>H*(1+0.10*(u-0.45)**2*4);const keel=u=>H*rocker*((u<0.15?(0.15-u)/0.15*0.6:0)+(u>0.75?((u-0.75)/0.25)**2*2.2:0));
 for(let i=0;i<=stations;i++){const u=i/stations,x=-L/2+u*L,b=beam(u),z0=keel(u),z1=sheer(u),d=z1-z0;
  for(let j=0;j<=ring;j++){const a=-PI/2+j/ring*PI;const c=Math.cos(a),s=Math.sin(a);const y=Math.sign(s)*Math.abs(s)**(2/n)*b,zz=z1-Math.abs(c)**(2/n)*d;pos.push(x,y,zz);}}
 const R=ring+1;for(let i=0;i<stations;i++)for(let j=0;j<ring;j++){const a=i*R+j,b=a+R;idx.push(a,b,a+1,b,b+1,a+1);}
 const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setIndex(idx);
 const parts=[g];
 // transom + deck caps
 const cap=(sel,flip)=>{const cg=new T.BufferGeometry(),p=[],id=[];sel.forEach(v=>p.push(...v));for(let k=1;k<sel.length-1;k++)flip?id.push(0,k+1,k):id.push(0,k,k+1);cg.setAttribute("position",new T.Float32BufferAttribute(p,3));cg.setIndex(id);return cg;};
 const ringPts=i=>Array.from({length:R},(_,j)=>pos.slice((i*R+j)*3,(i*R+j)*3+3));parts.push(cap(ringPts(0),true));
 if(deck){const top=[];for(let i=0;i<=stations;i++)top.push(pos.slice((i*R)*3,(i*R)*3+3));for(let i=stations;i>=0;i--)top.push(pos.slice((i*R+ring)*3,(i*R+ring)*3+3));parts.push(cap(top,false));}
 return merge(parts);}
// Wheel along the y axis: rounded tyre (lathe), dished rim, hub and spokes. r = outer radius, w = width.
export function wheel(r,w,{spokes=r>60?5:0,rimFrac=0.62}={}){const tw=w/2,ri=r*rimFrac,pts=[];
 const N=18;for(let k=0;k<=N;k++){const a=-PI/2+k/N*PI;pts.push(new T.Vector2(ri+(r-ri)*(0.55+0.45*Math.cos(a)),tw*Math.sin(a)*0.98));}
 const t2=new T.LatheGeometry(pts,48);
 const rimPts=[new T.Vector2(ri*0.98,-tw*0.8),new T.Vector2(ri*0.98,tw*0.8),new T.Vector2(ri*0.9,tw*0.8),new T.Vector2(ri*0.3,tw*0.15),new T.Vector2(ri*0.2,tw*0.5),new T.Vector2(0.01,tw*0.5)];const rim=new T.LatheGeometry(rimPts,40);
 const parts=[t2,rim];if(spokes){for(let k=0;k<spokes;k++){const s=new T.BoxGeometry(ri*0.16,tw*0.3,ri*0.72);s.translate(0,tw*0.2,ri*0.45);s.rotateY(k/spokes*2*PI);parts.push(s);}}
 const hubG=new T.CylinderGeometry(ri*0.2,ri*0.2,w*0.9,24);parts.push(hubG);return merge(parts);}
// Turned / tapered leg along z from 0 to h. sq = square tapered (modern), else turned (lathe).
export function leg(w,h,{sq=true,taper=0.72}={}){if(sq){const g=new T.BoxGeometry(w,w,h,1,1,6);const p=g.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i),u=(z+h/2)/h,s=1-(1-taper)*(1-u);p.setX(i,p.getX(i)*s);p.setY(i,p.getY(i)*s);}g.translate(0,0,h/2);g.computeVertexNormals();return g;}
 const r=w/2,pts=[[0,0],[r*0.62,0],[r*0.7,h*0.03],[r*0.55,h*0.08],[r*0.62,h*0.5],[r*0.8,h*0.72],[r*0.7,h*0.76],[r,h*0.8],[r,h],[0,h]].map(([a,b])=>new T.Vector2(a,b));const g=new T.LatheGeometry(pts,28);g.rotateX(PI/2);return g;}
// Fuselage along x: lathe with pointed tail, rounded nose. Length L, max radius r.
export function fuselage(L,r){const pts=[];const N=24;for(let k=0;k<=N;k++){const u=k/N;const rr=r*(u<0.18?Math.sqrt(u/0.18):u<0.45?1:Math.max(0.12,1-(u-0.45)/0.55*0.88));pts.push(new T.Vector2(Math.max(0.01,rr),u*L-L/2));}pts.unshift(new T.Vector2(0.01,-L/2));pts.push(new T.Vector2(0.01,L/2));const g=new T.LatheGeometry(pts,32);g.rotateZ(PI/2);return g;}
// NACA 4-digit airfoil wing along y. chord c, span s, thickness t (fraction), camber m.
export function wing(c,s,{t=0.12,m=0.02,taper=0.75}={}){const sh=new T.Shape(),N=30,up=[],lo=[];for(let k=0;k<=N;k++){const x=(1-Math.cos(k/N*PI))/2;const yt=5*t*(0.2969*Math.sqrt(x)-0.126*x-0.3516*x*x+0.2843*x**3-0.1015*x**4);const p=0.4,yc=x<p?m/p/p*(2*p*x-x*x):m/(1-p)**2*(1-2*p+2*p*x-x*x);up.push([x,yc+yt]);lo.push([x,yc-yt]);}
 sh.moveTo((0.5-up[0][0])*c,up[0][1]*c);for(const[x,y]of up)sh.lineTo((0.5-x)*c,y*c);for(const[x,y]of lo.reverse())sh.lineTo((0.5-x)*c,y*c);
 const g=new T.ExtrudeGeometry(sh,{depth:s,bevelEnabled:false,steps:4});g.translate(0,0,-s/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const zz=p.getZ(i),f=1-(1-taper)*Math.abs(zz)/(s/2);p.setX(i,p.getX(i)*f);p.setY(i,p.getY(i)*f);}g.rotateX(PI/2);g.computeVertexNormals();return g;}
// Triangular gable-end infill: base W along x at z=0, apex rise; thickness t along y (centred).
export function gableEnd(W,rise,t=12){const s=new T.Shape();s.moveTo(-W/2,0);s.lineTo(W/2,0);s.lineTo(0,rise);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:t,bevelEnabled:false});g.translate(0,0,-t/2);g.rotateX(PI/2);return g;}
