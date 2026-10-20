// Lab Assistant brain: fuzzy/stemmed knowledge search + calculators. Pure JS (no DOM) so it can be unit-tested.
const STOP=new Set(("a an the is are was were be been what whats what's how do does did i im i'm to of for in on at and or my me it its should can could would will you your be with which why when where who "+
 "tell please need want know give show find get any some about there this that these those much many use using used good best right proper typical normally usually ok okay hey hi hello yo "+
 "need help like just really kind sort").split(" "));
const SYN={aluminium:"aluminum",alu:"aluminum",alum:"aluminum",al:"aluminum",ss:"stainless",inox:"stainless",timber:"wood",lumber:"wood",screw:"bolt",screws:"bolt",bolts:"bolt",fastener:"bolt",
 thick:"thickness",thicc:"thickness",sag:"deflection",droop:"deflection",deflect:"deflection",bend:"bending",bent:"bending",strong:"strength",stronger:"strength",strongest:"strength",tough:"strength",
 heavy:"weight",weigh:"weight",mass:"weight",nm:"torque",tighten:"torque",tightening:"torque",ac:"conditioner",aircon:"conditioner",hvac:"hvac",furnace:"furnace",
 cable:"wire",wiring:"wire",gauge:"gauge",gage:"gauge",ga:"gauge",awg:"awg",drill:"drill",tap:"tap",hole:"hole",holes:"hole",pipe:"pipe",tube:"pipe",plumbing:"plumbing",drain:"drain",
 shingle:"shingles",shingles:"shingles",pitch:"pitch",slope:"slope",rafters:"rafter",rafter:"rafter",joists:"joist",beam:"beam",beams:"beam",ibeam:"beam",column:"column",
 printing:"print",printer:"print",printed:"print",fdm:"print","3d":"print",filament:"filament",pla:"pla",petg:"petg",abs:"abs",nylon:"nylon",
 patent:"patent",patents:"patent",patentable:"patentable",invention:"invention",idea:"invention",lawyer:"attorney",
 code:"software",coding:"software",program:"software",programming:"software",app:"app",holoforge:"app",forge:"app",
 kw:"kilowatt",hp:"horsepower",psi:"psi",mpa:"mpa",gpa:"modulus",stiffness:"modulus",young:"modulus",youngs:"modulus",elastic:"modulus",
 temp:"temperature",hot:"heat",heat:"heat",melt:"heat",cold:"cold",outdoor:"outdoor",outside:"outdoor",sun:"uv",sunlight:"uv",
 rust:"corrosion",rusting:"corrosion",corrode:"corrosion",corrosion:"corrosion",cost:"cost",price:"cost",cheap:"cost",expensive:"cost",
 export:"export",stl:"stl",download:"export",undo:"back",revert:"back",mic:"voice",microphone:"voice",talk:"voice",speak:"voice",
 buckle:"buckling",buckles:"buckling",gear:"gear",gears:"gear",cog:"gear",spring:"spring",springs:"spring",bearing:"bearing",bearings:"bearing",
 celsius:"c",centigrade:"c",fahrenheit:"f",degf:"f",degc:"c",liter:"l",litre:"l",liters:"l",litres:"l",gallon:"gallon",gallons:"gallon",
 kilogram:"kg",kilograms:"kg",kilo:"kg",kilos:"kg",pound:"pound",pounds:"pound",lbs:"pound",lb:"pound",inches:"inch",in:"inch",feet:"foot",ft:"foot",meters:"m",metres:"m",meter:"m",metre:"m",millimeter:"mm",millimeters:"mm",
 tonnage:"ton",tons:"ton",btus:"btu",cfm:"cfm",vent:"vent",venting:"vent",ventilation:"vent",attic:"attic",insulation:"insulation",
 glue:"glue",wood:"wood",concrete:"concrete",cement:"concrete",shelf:"shelf",shelves:"shelf",ladder:"ladder",drywall:"drywall",sheetrock:"drywall",gypsum:"drywall"};
export function stem(w){if(/\d/.test(w)||w.length<5)return w;return w.replace(/(ations?|ings?|ness|ments?|ers?|ies|ied|ed|es|ly|s)$/,"")||w;}
export function norm(s){return s.toLowerCase().replace(/\b(\d+)(ga|gauge|awg|mm|in|ft|kg|lb|a|v)\b/g,"$1 $2").replace(/(\d)\s*x\s*(\d)/g,"$1x$2").replace(/[’']/g,"").replace(/[^a-z0-9.#/x ]+/g," ").replace(/(^|\s)[./]+|[./]+(\s|$)/g," ");}
export function toks(s){const out=[];for(let w of norm(s).split(/\s+/)){if(!w||STOP.has(w))continue;w=SYN[w]||w;out.push(stem(w));}return out;}
function lev(a,b,max){if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const cur=[i];let mn=i;for(let j=1;j<=b.length;j++){cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]==b[j-1]?0:1));mn=Math.min(mn,cur[j]);}if(mn>max)return max+1;prev=cur;}return prev[b.length];}
let IDX=null,IDXN=0;
function build(KB){const docs=KB.map(e=>{const T=toks(e.t),G=toks(e.g),D=toks(e.d),A=toks(e.a);const f=new Map();const add=(arr,w)=>{for(const x of arr)f.set(x,Math.max(f.get(x)||0,w));};add(A,1);add(D,1.5);add(G,3);add(T,4);return{e,f,T:new Set(T)};});
 const df=new Map();for(const d of docs)for(const k of d.f.keys())df.set(k,(df.get(k)||0)+1);const vocab=[...df.keys()];IDX={docs,df,vocab,N:docs.length};IDXN=KB.length;}
function fix(w){if(IDX.df.has(w)||/\d/.test(w)||w.length<4)return[w,1];const max=w.length>=7?2:1;let best=null;for(const v of IDX.vocab){if(Math.abs(v.length-w.length)>max||v[0]!=w[0]&&max<2)continue;const d=lev(w,v,max);if(d<=max&&(!best||d<best[1]||d==best[1]&&IDX.df.get(v)>IDX.df.get(best[0])))best=[v,d];}
 if(best)return[best[0],0.8];const pre=IDX.vocab.find(v=>v.length>=5&&w.length>=5&&(v.startsWith(w)||w.startsWith(v)));return pre?[pre,0.6]:[w,0];}
export function search(KB,q,n=3){if(!IDX||IDXN!==KB.length)build(KB);const all=[...new Set(toks(q))].map(fix),qt=all.filter(([w,c])=>c>0),unk=all.length-qt.length;if(!qt.length)return[];
 const idf=w=>Math.log(1+IDX.N/(IDX.df.get(w)||IDX.N));const scored=[];
 for(const d of IDX.docs){let s=0,hit=0;for(const[w,c]of qt){const f=d.f.get(w);if(f){s+=f*idf(w)*c;hit++;if(/\d/.test(w)&&d.T.has(w))s+=6;}}
  if(hit){for(const t of d.T)if(/\d/.test(t)&&!qt.some(([w])=>w==t)&&qt.some(([w])=>/\d/.test(w)))s-=3;s*=(0.5+0.5*hit/qt.length);scored.push({e:d.e,s,hit});}}
 scored.sort((a,b)=>b.s-a.s);const tot=qt.reduce((a,[w,c])=>a+4*idf(w)*c,0)+unk*4*Math.log(1+IDX.N);return scored.slice(0,n).map(x=>({...x,conf:x.s/tot}));}
// ---------- calculators ----------
const N="(\\d+(?:\\.\\d+)?)";const num=s=>+s;
const RHO={steel:7850,"mild steel":7850,stainless:8000,aluminum:2700,aluminium:2700,brass:8500,copper:8900,titanium:4430,pla:1240,petg:1270,abs:1050,nylon:1010,wood:500,pine:500,oak:750,concrete:2400,water:1000,"cast iron":7200,lead:11340,gold:19300,glass:2500,acrylic:1180,polycarbonate:1200,hdpe:960,delrin:1410};
const E_={steel:200000,"mild steel":200000,stainless:193000,aluminum:69000,aluminium:69000,brass:97000,copper:117000,titanium:114000,pla:3500,petg:2100,abs:2200,nylon:1700,wood:11000,pine:10000,oak:12000,concrete:30000};
const AS={2:2.07,2.5:3.39,3:5.03,4:8.78,5:14.2,6:20.1,8:36.6,10:58,12:84.3,14:115,16:157,20:245,24:353};
const PROOF={"4.6":225,"5.8":380,"8.8":600,"10.9":830,"12.9":970};
const LEN={mm:1,cm:10,m:1000,in:25.4,inch:25.4,inches:25.4,'"':25.4,ft:304.8,foot:304.8,feet:304.8,"'":304.8};
const toMM=(v,u)=>v*(LEN[u]||1);
const matOf=(t,tbl)=>{let best=null;for(const k in tbl)if(new RegExp("\\b"+k+"\\b").test(t)&&(!best||k.length>best.length))best=k;return best;};
const awgD=n=>0.127*92**((36-n)/39);
function forceN(t){let m=t.match(new RegExp(N+"\\s*(kn|n|newtons?|kg|kilos?|lbs?|pounds?|lbf)\\b"));if(!m)return null;const v=+m[1],u=m[2];return u=="kn"?v*1000:/^n/.test(u)?v:/^k/.test(u)?v*9.81:v*4.448;}
const r3=x=>+x.toPrecision(3),r4=x=>+x.toPrecision(4);
export function calc(q){let t=q.toLowerCase().replace(/,/g," ").replace(/×/g,"x").replace(/(\d)\s*by\s*(\d)/g,"$1x$2");let m;
 // unit conversion
 const U={mm:[1,"L"],cm:[10,"L"],m:[1000,"L"],km:[1e6,"L"],in:[25.4,"L"],inch:[25.4,"L"],inches:[25.4,"L"],ft:[304.8,"L"],feet:[304.8,"L"],foot:[304.8,"L"],yd:[914.4,"L"],yard:[914.4,"L"],yards:[914.4,"L"],mile:[1609344,"L"],miles:[1609344,"L"],
  kg:[1,"M"],g:[0.001,"M"],grams:[0.001,"M"],lb:[0.45359237,"M"],lbs:[0.45359237,"M"],pound:[0.45359237,"M"],pounds:[0.45359237,"M"],oz:[0.0283495,"M"],ounces:[0.0283495,"M"],ton:[907.18474,"M"],tonne:[1000,"M"],
  n:[1,"F"],kn:[1000,"F"],lbf:[4.4482216,"F"],kgf:[9.80665,"F"],mpa:[1,"P"],kpa:[0.001,"P"],pa:[1e-6,"P"],psi:[0.0068947573,"P"],ksi:[6.8947573,"P"],bar:[0.1,"P"],atm:[0.101325,"P"],
  "n·m":[1,"T"],nm:[1,"T"],"ft-lb":[1.3558179,"T"],"ft-lbs":[1.3558179,"T"],"lb-ft":[1.3558179,"T"],"in-lb":[0.11298483,"T"],l:[1,"V"],liter:[1,"V"],liters:[1,"V"],litre:[1,"V"],ml:[0.001,"V"],gal:[3.7854118,"V"],gallon:[3.7854118,"V"],gallons:[3.7854118,"V"],
  "m3":[1000,"V"],"ft3":[28.316847,"V"],w:[1,"W"],kw:[1000,"W"],hp:[745.69987,"W"],"btu/h":[0.29307107,"W"],btuh:[0.29307107,"W"],mph:[0.44704,"S"],kph:[0.277778,"S"],"km/h":[0.277778,"S"],"m/s":[1,"S"],knots:[0.514444,"S"]};
 const uk=Object.keys(U).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\/]/g,"\\$&")).join("|");
 m=t.match(new RegExp("(\\d+(?:\\.\\d+)?(?:\\s+\\d+/\\d+|/\\d+)?)\\s*("+uk+")\\s*(?:to|in|into|=|as|in to)\\s*("+uk+")(?![a-z])"));
 if(m&&U[m[2]][1]==U[m[3]][1]&&m[2]!=m[3]){const v=m[1].split(/\s+/).reduce((s,x)=>s+(x.includes("/")?x.split("/")[0]/x.split("/")[1]:+x),0);return`${m[1]} ${m[2]} = ${r4(v*U[m[2]][0]/U[m[3]][0])} ${m[3]}`;}
 m=t.match(new RegExp("(-?\\d+(?:\\.\\d+)?)\\s*°?\\s*(c|f|celsius|fahrenheit)\\b\\s*(?:to|in|into)\\s*°?(c|f|k|celsius|fahrenheit|kelvin)\\b"));
 if(m){const v=+m[1],a=m[2][0],b=m[3][0];const c=a=="c"?v:(v-32)*5/9;const r=b=="c"?c:b=="f"?c*9/5+32:c+273.15;return`${v} °${a.toUpperCase()} = ${r4(r)} ${b=="k"?"K":"°"+b.toUpperCase()}`;}
 // arithmetic
 if(/^\s*(?:what is |whats |calc |calculate |compute |=)?\s*[\d\s+\-*/().^%]+\??$/.test(t)&&/\d\s*[+\-*/^]\s*[\d(]/.test(t)){try{const e=t.replace(/[^\d+\-*/().^%\s]/g,"").replace(/\^/g,"**");return`${e.trim()} = ${+Function('"use strict";return('+e+')')().toPrecision(10)}`;}catch{}}
 // bearing for a shaft
 if(/bearing/.test(t)&&(m=t.match(new RegExp(N+"\\s*mm\\s*(?:shaft|bore|axle|rod)|(?:shaft|bore|axle)\\s*(?:of)?\\s*"+N)))){const d=+(m[1]||m[2]);const B={"623":[3,10,4],"625":[5,16,5],"626":[6,19,6],"608":[8,22,7],"6000":[10,26,8],"6200":[10,30,9],"6001":[12,28,8],"6201":[12,32,10],"6002":[15,32,9],"6202":[15,35,11],"6003":[17,35,10],"6203":[17,40,12],"6004":[20,42,12],"6204":[20,47,14],"6005":[25,47,12],"6205":[25,52,15],"6006":[30,55,13],"6206":[30,62,16]};
  const f=Object.entries(B).filter(([k,v])=>v[0]==d);if(f.length)return`Ball bearings for a ${d} mm shaft: `+f.map(([k,v])=>`${k} (${v[0]}×${v[1]}×${v[2]} mm)`).join(", ")+". The 62xx series is the heavier-duty one.";}
 // bolt torque
 if(/torque/.test(t)&&(m=t.match(/\bm(\d+(?:\.\d+)?)\b/))){const d=+m[1],A=AS[d];if(A){const g=(t.match(/\b(4\.6|5\.8|8\.8|10\.9|12\.9)\b/)||[,"8.8"])[1],K=/lub|oil|grease|anti.?seize|wax/.test(t)?0.15:0.2,F=0.75*PROOF[g]*A;
  return`M${d} grade ${g}: preload ≈ 75% of proof = ${r3(F/1000)} kN; torque T = K·F·d ≈ ${r3(K*F*d/1000)} N·m (${r3(K*F*d/1000/1.3558)} lb·ft) with K = ${K} (${K==0.2?"dry":"lubricated"}). Use the fastener maker's value if you have it.`;}}
 m=t.match(/(?:^|\s)(1\/4|5\/16|3\/8|7\/16|1\/2|5\/8|3\/4)\s*(?:"|in|inch)?/);if(m&&/torque/.test(t)){const D={"1/4":[6.35,20.5],"5/16":[7.94,33.8],"3/8":[9.53,50],"7/16":[11.1,68.6],"1/2":[12.7,91.5],"5/8":[15.9,146],"3/4":[19.05,215]}[m[1]];const pr=/grade 8|gr ?8/.test(t)?827:/grade 2|gr ?2/.test(t)?379:586;const F=0.75*pr*D[1];
  return`${m[1]} in ${pr==827?"grade 8":pr==379?"grade 2":"grade 5"}: preload ≈ ${r3(F/4448)} kip (${r3(F/1000)} kN); dry torque ≈ ${r3(0.2*F*D[0]/1000/1.3558)} lb·ft (${r3(0.2*F*D[0]/1000)} N·m) with K = 0.2.`;}
 // beam deflection
 if(/deflect|sag|bend|stress/.test(t)&&/beam|joist|shelf|plank|bar|board|cantilever|span/.test(t)){const F=forceN(t);const L=t.match(new RegExp(N+"\\s*(mm|cm|m|in|inch|inches|ft|feet|foot)\\b\\s*(?:long|span|length|beam)?"));
  const s=t.match(new RegExp(N+"\\s*(mm|in)?\\s*x\\s*"+N+"\\s*(mm|in)?"));
  if(F&&L&&s){const Lm=toMM(+L[1],L[2]);const u=s[2]||s[4]||(L[2]=="in"||/inch|ft|feet/.test(L[2])?"in":"mm");const b=toMM(+s[1],u),h=toMM(+s[3],u);const mat=matOf(t,E_)||"steel",E=E_[mat],I=b*h**3/12;
   const cant=/cantilever|shelf|overhang|wall bracket/.test(t),udl=/uniform|distributed|evenly|spread/.test(t);let d,M;
   if(cant){d=udl?F*Lm**3/(8*E*I):F*Lm**3/(3*E*I);M=udl?F*Lm/2:F*Lm;}else{d=udl?5*F*Lm**3/(384*E*I):F*Lm**3/(48*E*I);M=udl?F*Lm/8:F*Lm/4;}
   const sg=M*(h/2)/I;return`${cant?"Cantilever":"Simply supported"} ${b}×${h} mm ${mat}, ${r4(Lm)} mm, ${udl?"uniform":"point"} load ${r3(F)} N: deflection ≈ ${r3(d)} mm (L/${Math.round(Lm/d)}), bending stress ≈ ${r3(sg)} MPa.`;}}
 // voltage drop
 if(/voltage drop|volt drop|drop/.test(t)&&(m=t.match(/(\d+)\s*(?:awg|gauge|ga)\b|\b(?:awg|gauge)\s*(\d+)/))){const g=+(m[1]||m[2]);const I=t.match(new RegExp(N+"\\s*(?:a|amps?|amperes?)\\b"));const L=t.match(new RegExp(N+"\\s*(ft|feet|foot|m|meters?|metres?)\\b"));
  if(I&&L){const Lm=/^f/.test(L[2])?+L[1]*0.3048:+L[1];const d=awgD(g),A=Math.PI*d*d/4,R=0.01724*2*Lm/A,V=+(t.match(new RegExp(N+"\\s*v(?:olts?)?\\b"))||[,0])[1],dv=+I[1]*R;
   return`AWG ${g} copper, ${L[1]} ${L[2]} one way at ${I[1]} A: round-trip resistance ${r3(R)} Ω, drop ≈ ${r3(dv)} V${V?` (${r3(dv/V*100)}% of ${V} V)`:""}.`;}}
 // wire size
 if(/wire size|size wire|what (size|gauge) wire|gauge wire|wire gauge|awg.*(for|need)|cable size/.test(t)){const I=t.match(new RegExp(N+"\\s*(?:a|amps?|amperes?)\\b"));const L=t.match(new RegExp(N+"\\s*(ft|feet|foot|m|meters?|metres?)\\b"));const V=t.match(new RegExp(N+"\\s*v(?:olts?)?\\b"));
  if(I){const Lm=L?(/^f/.test(L[2])?+L[1]*0.3048:+L[1]):null,Vv=V?+V[1]:null,pct=3;let gauge=null;if(Lm&&Vv){const A=0.01724*2*Lm*+I[1]/(Vv*pct/100);for(let g=40;g>=-3;g--){if(Math.PI*awgD(g)**2/4>=A){gauge=g;break;}}if(gauge>0&&gauge%2&&gauge<=13)gauge-=1;
    return`For ${I[1]} A over ${L[1]} ${L[2]} at ${Vv} V with ≤${pct}% drop you need ≥ ${r3(A)} mm² copper → AWG ${gauge<0?"0".repeat(-gauge+1):gauge} (${r3(Math.PI*awgD(gauge)**2/4)} mm²) (next common size) or bigger. Also check ampacity for the insulation and installation (NEC 310.16).`;}
   return`Give me the length and voltage too, e.g. 'wire size for ${I[1]} A, 20 ft, 12 V'. For short runs, typical NEC 60 °C copper building wire: 14 AWG = 15 A, 12 AWG = 20 A, 10 AWG = 30 A, 8 AWG = 40 A, 6 AWG = 55 A.`;}}
 // area / volume
 m=t.match(new RegExp("(?:area|size).*?circle.*?(?:diameter|dia|ø|d)?\\s*"+N+"\\s*(mm|cm|m|in|ft)?|circle.*?"+N+"\\s*(mm|cm|m|in|ft)?.*?area"));if(m&&/area/.test(t)){const d=+(m[1]||m[3]),u=m[2]||m[4]||"";const r=/radius/.test(t)?d:d/2;return`Circle ${/radius/.test(t)?"r":"Ø"} ${d}${u}: area = π·r² = ${r4(Math.PI*r*r)} ${u}² ; circumference ${r4(2*Math.PI*r)} ${u}.`;}
 if(/volume|slab|yards|capacity|how much (water|concrete|soil)|cubic|how many (yards|gallons|liters)/.test(t)){const u=(t.match(/\b(mm|cm|m|in|inch|inches|ft|feet|foot)\b/)||[,""])[1];
  if(/cylinder|tank|pipe|tube|round|column|sonotube/.test(t)&&(m=t.match(new RegExp(N+"\\s*(?:mm|cm|m|in|inch|ft|feet)?\\s*(?:diameter|dia|wide|across|x|by)\\s*.*?"+N)))){const d=+m[1],h=+m[2],v=Math.PI*(d/2)**2*h;return`Cylinder Ø${d} × ${h} ${u}: volume = π·r²·h = ${r4(v)} ${u}³${extraVol(v,u)}.`;}
  if(/sphere|ball/.test(t)&&(m=t.match(new RegExp(N)))){const d=+m[1],r=/radius/.test(t)?d:d/2,v=4/3*Math.PI*r**3;return`Sphere ${/radius/.test(t)?"r":"Ø"} ${d} ${u}: volume = ${r4(v)} ${u}³${extraVol(v,u)}.`;}
  if(m=t.match(new RegExp(N+"\\s*(?:mm|cm|m|in|inch|ft|feet|')?\\s*x\\s*"+N+"\\s*(?:mm|cm|m|in|inch|ft|feet|')?\\s*x\\s*"+N))){const[a,b,c]=[+m[1],+m[2],+m[3]];const v=a*b*c;
   if(/slab|concrete|yard/.test(t)&&/ft|feet/.test(u||"ft")&&!/\bin\b|inch/.test(t.replace(/\d+\s*(?:in|inch)\s*(?:thick|deep)/,"")))return`${a}×${b}×${c} ft = ${r4(v)} ft³ = ${r4(v/27)} cubic yards (order ~10% extra).`;
   return`Box ${a} × ${b} × ${c} ${u}: volume = ${r4(v)} ${u}³${extraVol(v,u)}.`;}}
 if(/area/.test(t)&&(m=t.match(new RegExp(N+"\\s*(mm|cm|m|in|ft|feet)?\\s*x\\s*"+N+"\\s*(mm|cm|m|in|ft|feet)?")))){const u=m[2]||m[4]||"";return`Rectangle ${m[1]} × ${m[3]} ${u}: area = ${r4(m[1]*m[3])} ${u}²${/tri/.test(t)?`; a right triangle with those legs is ${r4(m[1]*m[3]/2)} ${u}²`:""}.`;}
 // weight from material and size
 if(/weigh|weight|mass|how heavy/.test(t)){const mat=matOf(t,RHO);if(mat){const rho=RHO[mat];
  if(m=t.match(new RegExp(N+"\\s*(l|liters?|litres?|gal|gallons?)\\b"))){const L=/^g/.test(m[2])?+m[1]*3.7854:+m[1];return`${m[1]} ${m[2]} of ${mat} ≈ ${r4(L*rho/1000)} kg (${r4(L*rho/1000*2.2046)} lb), density ${rho} kg/m³.`;}
  const u=(t.match(/\b(mm|cm|m|in|inch|inches|ft|feet)\b/)||[,"mm"])[1];
  if(m=t.match(new RegExp(N+"\\s*(?:mm|cm|m|in|inch|ft|feet)?\\s*x\\s*"+N+"\\s*(?:mm|cm|m|in|inch|ft|feet)?\\s*x\\s*"+N))){const v=toMM(+m[1],u)*toMM(+m[2],u)*toMM(+m[3],u)*1e-9,kg=v*rho;return`${m[1]}×${m[2]}×${m[3]} ${u} of ${mat}: ${r4(v*1e6)} cm³ → ${kg<1?r3(kg*1000)+" g":r4(kg)+" kg"} (${r3(kg*2.2046)} lb) at ${rho} kg/m³.`;}
  if(/rod|bar|round|shaft|dowel|cylinder/.test(t)&&(m=t.match(new RegExp(N+"\\s*(?:mm|in)?\\s*(?:diameter|dia|ø|round|rod|bar)?.*?"+N+"\\s*(mm|cm|m|in|ft|feet|long)")))){const d=toMM(+m[1],/\d\s*(in|inch)\b/.test(t)&&!/mm/.test(t)?"in":"mm"),L=toMM(+m[2],m[3]=="long"?"mm":m[3]);const kg=Math.PI*(d/2)**2*L*1e-9*rho;return`Round ${mat} Ø${r3(d)} mm × ${r4(L)} mm ≈ ${r4(kg)} kg (${r3(kg*2.2046)} lb).`;}
  if(m=t.match(new RegExp(N+"\\s*(cm3|cc|cubic cm|cubic centimet\\w+|m3|cubic met\\w+|in3|cubic inch\\w*|ft3|cubic f\\w+)"))){const f={cm3:1e-6,cc:1e-6,m3:1,in3:1.6387e-5,ft3:0.0283168}[m[2]]||(/centi/.test(m[2])||m[2]=="cubic cm"?1e-6:/met/.test(m[2])?1:/inch/.test(m[2])?1.6387e-5:0.0283168);const kg=+m[1]*f*rho;return`${m[1]} ${m[2]} of ${mat} ≈ ${r4(kg)} kg (${r3(kg*2.2046)} lb).`;}}}
 // gear ratio
 if(/gear|sprocket|pulley|ratio/.test(t)&&(m=t.match(new RegExp("(\\d+)\\s*(?:t|teeth|tooth)?\\s*(?:to|:|and|driving|drives|with|vs|/)\\s*(?:a\\s*)?(\\d+)\\s*(?:t|teeth|tooth)?")))&&/ratio|gear|sprocket|teeth|pulley/.test(t)){const a=+m[1],b=+m[2];const rpm=t.match(new RegExp(N+"\\s*rpm"));
  return`Ratio ${a}:${b} = ${r4(b/a)}:1 (driven/driver). Output turns ${r4(a/b)}× as fast and gets ${r4(b/a)}× the torque (minus ~2% loss per spur mesh)${rpm?`; ${rpm[1]} rpm in → ${r4(rpm[1]*a/b)} rpm out`:""}.`;}
 m=t.match(/gear.*?(\d+)\s*teeth.*?module\s*(\d+(?:\.\d+)?)|module\s*(\d+(?:\.\d+)?).*?(\d+)\s*teeth/);if(m){const z=+(m[1]||m[4]),mo=+(m[2]||m[3]);return`Pitch Ø = module × teeth = ${r4(z*mo)} mm; outside Ø = ${r4((z+2)*mo)} mm; root Ø ≈ ${r4((z-2.5)*mo)} mm.`;}
 // spring rate
 if(/spring/.test(t)&&/rate|stiff|constant|\bk\b/.test(t)){const d=t.match(new RegExp(N+"\\s*(?:mm)?\\s*(?:wire|dia(?:meter)? wire)"))||t.match(new RegExp("wire\\s*(?:dia(?:meter)?)?\\s*(?:of)?\\s*"+N));const D=t.match(new RegExp(N+"\\s*(?:mm)?\\s*(?:od|outer|outside|coil)"))||t.match(new RegExp("(?:od|outer diameter|coil diameter)\\s*(?:of)?\\s*"+N));const n=t.match(/(\d+(?:\.\d+)?)\s*(?:active\s*)?(?:coils|turns)/);
  if(d&&D&&n){const dw=+d[1],Dm=+D[1]-dw,G=/stainless/.test(t)?69000:79300,k=G*dw**4/(8*Dm**3*+n[1]);return`k = G·d⁴/(8·D³·n) = ${r3(k)} N/mm (${r3(k*5.71)} lb/in) for ${dw} mm wire, mean coil Ø ${r3(Dm)} mm, ${n[1]} active coils, G = ${G/1000} GPa.`;}}
 // board feet
 if(/board ?f(oo|ee)t|bd ?ft|\bbf\b/.test(t)){m=t.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*x\s*(\d+(?:\.\d+)?))?/);if(m){let L=m[3]?+m[3]:null;const Lm=t.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|')\b(?!\s*x)/);if(!L&&Lm)L=+Lm[1];if(L){const q=+((t.match(/(\d+)\s*(?:pieces|pcs|boards|studs|of them)/)||[,1])[1]);const bf=+m[1]*+m[2]*L/12*q;return`${q>1?q+" × ":""}${m[1]}×${m[2]} × ${L} ft = ${r4(bf)} board feet (nominal thickness × width in inches × length in ft ÷ 12).`;}}}
 m=t.match(/(\d+(?:\.\d+)?)\s*kg.*?(?:force|newtons?|in n\b)/);if(m)return`${m[1]} kg weighs ${r4(m[1]*9.81)} N (×9.81 m/s²).`;
 return null;}
function extraVol(v,u){const L={mm:1e-6,cm:1e-3,m:1000,in:0.0163871,inch:0.0163871,inches:0.0163871,ft:28.3168,feet:28.3168,foot:28.3168}[u];return L?` = ${r4(v*L)} L (${r4(v*L/3.78541)} US gal)`:"";}
