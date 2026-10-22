// Novel-design composer: when no library project fits "a <support> for <N> <objects>", build one from primitives.
// Sizes come from a table of everyday objects (typical dimensions, mm/kg); the structure from a small set of
// support types (stand/riser, rack, holder, shelf, box/tray, hook rail). Load is checked with a plank-bending
// estimate. It is honest about being a parametric composition, not a library project.
import {proj,PROJECTS,B,C,bar,HW,AT,MATP} from './projects.js';
// name: [width along the row, depth, height, kg, how it sits: "flat" | "upright" | "hang"]
export const OBJ={monitor:[620,220,420,6,"flat"],screen:[620,220,420,6,"flat"],tv:[1230,260,720,15,"flat"],television:[1230,260,720,15,"flat"],laptop:[330,240,22,2,"upright"],
 tablet:[250,10,175,0.6,"upright"],ipad:[250,10,175,0.6,"upright"],phone:[78,12,160,0.22,"upright"],smartphone:[78,12,160,0.22,"upright"],book:[30,160,240,0.5,"upright"],
 plant:[220,220,250,4,"flat"],pot:[220,220,250,4,"flat"],speaker:[190,230,320,4,"flat"],printer:[450,420,420,9,"flat"],guitar:[110,400,1050,4,"upright"],
 headphone:[190,90,220,0.3,"hang"],keyboard:[440,140,35,1,"flat"],mug:[90,90,100,0.35,"hang"],cup:[85,85,95,0.3,"flat"],bottle:[80,80,310,1.2,"upright"],
 shoe:[300,210,120,0.9,"flat"],plate:[25,270,270,0.6,"upright"],controller:[160,60,110,0.3,"upright"],record:[6,315,315,0.18,"upright"],vinyl:[6,315,315,0.18,"upright"],
 jar:[60,60,110,0.3,"flat"],knife:[30,20,320,0.15,"upright"],camera:[130,100,100,0.8,"flat"],drill:[90,250,250,1.8,"hang"],spool:[200,70,200,1.2,"upright"],
 skateboard:[810,210,110,2.5,"upright"],bike:[600,1750,1050,13,"upright"],helmet:[260,210,200,0.5,"hang"],hat:[300,300,150,0.2,"hang"],towel:[400,30,600,0.5,"hang"],key:[60,15,80,0.05,"hang"]};
const TYPES={stand:"stand",riser:"stand",rack:"rack",holder:"rack",dock:"rack",organizer:"box",organiser:"box",shelf:"shelf",shelves:"shelf",box:"box",bin:"box",tray:"box",caddy:"box",
 hanger:"hooks",hooks:"hooks",hook:"hooks",rail:"hooks",mount:"shelf",bracket:"shelf"};
const NUM={a:1,an:1,one:1,two:2,pair:2,both:2,couple:2,dual:2,double:2,three:3,triple:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twelve:12,dozen:12,twenty:20};
const sing=w=>w.replace(/ies$/,"y").replace(/(ches|shes|xes)$/,m=>m.slice(0,-2)).replace(/s$/,"");
export function parse(text){const t=text.toLowerCase().replace(/[^a-z0-9 \-]/g," ");const ws=t.split(/\s+/).filter(Boolean);
 let ti=-1,type=null;for(let i=0;i<ws.length;i++){const k=TYPES[ws[i]]||TYPES[sing(ws[i])];if(k){ti=i;type=k;break;}}if(!type)return null;
 let obj=null,n=null,oi=-1;for(let i=0;i<ws.length;i++){if(i==ti)continue;const s=sing(ws[i]);const s2=ws[i]+(ws[i+1]?" "+ws[i+1]:"");if(OBJ[s]){obj=s;oi=i;break;}}
 if(!obj)return null;// numbers before the object (or "dual monitor stand")
 for(let i=Math.max(0,oi-3);i<ws.length;i++){if(i==oi)continue;const w=ws[i];if(/^\d+$/.test(w)&&+w<=60&&!/^(mm|cm|in|inch|kg|lb)/.test(ws[i+1]||"")){n=+w;break;}if(NUM[w]&&w!="a"&&w!="an"){n=NUM[w];break;}}
 const plural=/s$/.test(ws[oi])&&!/ss$/.test(ws[oi]);if(!n)n=plural?(type=="shelf"?6:3):1;return{type,obj,n,typeWord:ws[ti],objWord:ws[oi]};}
let SEQ=0;
export function compose(text){const s=parse(text);if(!s)return null;const[ow,od,oh,okg,how]=OBJ[s.obj];const n=s.n;let type=s.type;if(type=="stand"&&how=="hang")type="hooks";
 const gap=type=="stand"?(n>1?60:0):Math.max(12,ow*0.12);const name=`${s.typeWord[0].toUpperCase()+s.typeWord.slice(1)} for ${n} ${s.obj}${n>1?"s":""}`;
 const big=ow*n>500||okg*n>3;const mats=big?["wood","ply","alu","steel","pla"]:["pla","petg","wood","alu"];
 let L,Dp,H;if(type=="stand"){L=Math.round(n*ow+gap*(n-1)+40);Dp=Math.round(Math.max(200,od+40));H=how=="flat"?120:Math.round(oh*0.5);}
 else if(type=="rack"){L=Math.round(n*(ow+gap)+gap);Dp=Math.round(Math.max(od*0.9,60));H=Math.round(Math.min(oh*0.45,260));}
 else if(type=="shelf"){L=Math.round(Math.max(300,n*(ow+8)+20));Dp=Math.round(od+30);H=Math.round(oh+40);}
 else if(type=="box"){const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);L=Math.round(cols*(ow+10)+10);Dp=Math.round(rows*(od+10)+10);H=Math.round(Math.min(oh*0.6,120));}
 else{L=Math.round(n*Math.max(ow,80)+80);Dp=40;H=90;}
 const id="composed_"+(++SEQ);const T=type;
 proj(id,{name,cat:"Composed",composed:true,unit:"mm",kw:"",re:[],mats,mat:mats[0],size:["L","W","H"],
  P:{L:[L,Math.round(L*0.4),Math.round(L*3),"Length","mm",["long","length","wider","longer"]],W:[Dp,Math.round(Dp*0.5),Math.round(Dp*3),"Depth","mm",["deep","depth"]],H:[H,20,Math.max(H*3,400),"Height","mm",["tall","high","height"]],n:[n,1,Math.max(24,n*3),"Holds","n",[s.obj+"s",s.obj,"slots","count"]],t:[big?18:4,2,40,"Material thickness","mm",["thick","thickness"]]},
  roles:{L:"L",W:"W",H:"H"},
  build(q,p){const m=p.mat,L=q.L,W=q.W,H=q.H,N=Math.max(1,Math.round(q.n)),t=q.t,o=[];
   if(T=="stand"){o.push(B("Top shelf",m,L,W,t,0,0,H-t/2));const legs=L>700?3:2;for(let i=0;i<legs;i++){const x=-L/2+t+i*(L-2*t)/(legs-1);o.push(B("Support panel",m,t*1.5,W*0.9,H-t,x,0,(H-t)/2));}
    if(how!="flat")o.push(B("Back stop",m,L,t,40,0,W/2-t/2,H+20));o.push(HW("Screws / fasteners",legs*4,0.15,0.01));o.push(HW("Rubber feet",legs*2,0.4,0.005));}
   else if(T=="rack"){o.push(B("Base plate",m,L,W,t,0,0,t/2));const pitch=(L-t)/N;for(let i=0;i<=N;i++)o.push(B("Divider",m,t,W,H,-L/2+t/2+i*pitch,0,t+H/2));o.push(B("Back rail",m,L,t,H*0.6,0,W/2-t/2,t+H*0.3));}
   else if(T=="shelf"){o.push(B("Shelf board",m,L,W,t,0,0,H));for(const x of[-L/2+60,L/2-60])o.push(B("Bracket",m,t*1.5,W*0.9,W*0.6,x,0,H-W*0.3-t/2));o.push(B("Wall cleat",m,L,t,40,0,-W/2+t/2,H-25));o.push(HW("Wall anchors + screws",4,0.4,0.02));}
   else if(T=="box"){o.push(B("Bottom",m,L,W,t,0,0,t/2));for(const s of[-1,1]){o.push(B("Side wall",m,t,W,H,s*(L/2-t/2),0,H/2));o.push(B("End wall",m,L,t,H,0,s*(W/2-t/2),H/2));}
    const cols=Math.ceil(Math.sqrt(N)),rows=Math.ceil(N/cols);for(let i=1;i<cols;i++)o.push(B("Divider",m,t*0.7,W-2*t,H*0.85,-L/2+i*L/cols,0,H*0.85/2));for(let j=1;j<rows;j++)o.push(B("Divider",m,L-2*t,t*0.7,H*0.85,0,-W/2+j*W/rows,H*0.85/2));}
   else{o.push(B("Rail",m,L,t*2,H,0,0,H/2));const pitch=L/N;for(let i=0;i<N;i++){const x=-L/2+pitch*(i+0.5);o.push(bar("Hook","steel",[x,t,H*0.3],[x,60,H*0.45],8,8));}o.push(HW("Wall anchors + screws",2+Math.ceil(L/400),0.4,0.02));}
   // load: N objects on the top/shelf; plank bending check (simply supported, uniform load)
   const span=T=="stand"?L/(L>700?2:1):T=="shelf"?L-120:0;if(span>0){const E={wood:10e3,ply:8e3,alu:69e3,steel:200e3,pla:3.5e3,petg:2.1e3}[m]||8e3;const w=N*okg*9.81/span;const I=W*t**3/12;const d=5*w*span**4/(384*E*I);this._chk={load:N*okg,span:Math.round(span),defl:+d.toFixed(2)};}
   return o;},
  steps:[`Cut the parts listed (sized for ${n} × ${s.obj}: about ${ow}×${od}×${oh} mm, ${okg} kg each).`,"Dry-fit, then glue/screw (or print) the structure.","Check it sits flat and holds the load before using it."],
  safety:["Dimensions of the objects are typical values; measure yours and edit the sizes.","Anchor anything tall or heavy to a wall or desk."]});
 const D=PROJECTS[id];D.obj={name:s.obj,dims:[ow,od,oh],kg:okg,how,n};D.type=type;
 return{id,len:0,composed:true,why:`no library project fits, so I composed a ${type} from parts: ${n} × ${s.obj} (typical ${ow}×${od}×${oh} mm, ${okg} kg each)`};}
export function check(id){const D=PROJECTS[id];return D&&D._chk?D._chk:null;}
