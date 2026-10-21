// Type-it-builds-it: plain request -> part + sized dimensions + explanation; and follow-up edits with context. Pure JS (no DOM).
import * as L from './parts.js';
const NUM="(\\d+(?:\\.\\d+)?)";
// plain-language words for parts the strict library patterns miss (checked only when L.detect finds nothing)
const WORDS=[[/\bshel(f|ves)\b/,"shelf_bracket"],[/\b(tv|monitor|speaker) (mount|bracket)\b/,"l_bracket"],[/\bbracket\b/,"l_bracket"],[/\b(raspberry|arduino|esp32|pcb|circuit)\b/,"pcb_enclosure"],
 [/\b(coat|towel|key|hat|bag|leash)s?\b.*\bhang|\bhanger\b|\bhook\b/,"wall_hook"],[/\b(phone|tablet|ipad)\b/,"phone_stand"],[/\b(bike|bicycle)s?\b/,"bike_rack"],[/\b(plants?|flowers?|herbs?|garden)\b/,"planter_box"],
 [/\b(cables?|wires?|cords?)\b/,"cable_clip"],[/\b(tv|monitor)\b/,"l_bracket"],[/\b(pipe|tube|conduit)\b.*\b(hold|hang|mount|strap|secure)|\b(hold|hang|mount|secure)\b.*\b(pipe|tube|conduit)\b/,"pipe_clip"],
 [/\b(drawer|door|cabinet|lid)\b/,"pull_handle"],[/\b(axle|spindle)\b/,"shaft"],[/\b(bushing|sleeve)\b/,"flanged_bushing"],[/\b(608|bearing)\b/,"bearing_housing"],[/\bboat|tank|tray|container|bin\b/,"project_box"],
 [/\b(house|garage|warehouse|office|storey|stories)\b/,"building_frame"],[/\b(creek|river|stream|ditch|span over)\b/,"beam_bridge"],[/\b(shed|carport|porch|lean)\b.*\broof|\broof\b/,"gable_roof"],[/\bjoin(ing)? two (boards|pieces)|\bsplice\b/,"mending_plate"]];
// what plain dimension words mean for each part (first key that exists wins)
const ROLE={long:["length","leg","span","reach","free_length","run","flange","bend_r"],deep:["reach","leg","length","standoff","depth"],reach:["reach","leg","length"],
 wide:["width","leaf","inner_w","span"],tall:["height","leg","free_length","offset","story_h"],high:["height","leg","free_length","story_h"],thick:["thickness","wall","base_t","grip_d","tube","member","rafter","column","depth"],
 diameter:["diameter","od","coil_od","pipe_d","cable_d","grip_d","bearing_od"],bore:["bore","id"],hole:["hole_d"]};
const SCALES={dia:["diameter","od","coil_od","bearing_od"],long:["length","leg","span","reach","free_length","run","flange","pcb_l"],wide:["width","arm_w","leaf","inner_w","pcb_w"],tall:["height","leg","free_length","offset","story_h"],thick:["thickness","arm_t","wall","base_t","tube","member","rafter","column","grip_d","wire_d"]};
const isM=n=>!!L.PARTS[n].mode; // structures use metres
function normUnits(text,name){let t=" "+text.toLowerCase().replace(/,/g," ").replace(/(\d)\s*(?:mm|cm|in|ft|m|"|')?\s+by\s+(\d)/g,(s,a,b)=>s.replace(/\s+by\s+/," x ")).replace(/(\d)\s*-\s*(inch|in|foot|ft|mm|cm)\b/g,"$1 $2")+" ";
 t=t.replace(/(\d+)\s+(\d+)\/(\d+)/g,(_,a,b,c)=>(+a+b/c).toString()).replace(/\b(\d+)\/(\d+)\b(?=\s*(?:"|in|inch))/g,(_,a,b)=>(a/b).toString());
 t=t.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|fifty|hundred)\b/g,w=>({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twelve:12,twenty:20,fifty:50,hundred:100})[w]);
 const m=isM(name);
 // "6 x 4 inches" / "20 x 12 ft": the unit applies to every number in the group
 {const UF={'"':0.0254,in:0.0254,inch:0.0254,inches:0.0254,"'":0.3048,ft:0.3048,foot:0.3048,feet:0.3048,cm:0.01,m:1,meter:1,meters:1};
  t=t.replace(new RegExp(NUM+"\\s*x\\s*"+NUM+"(?:\\s*x\\s*"+NUM+")?\\s*(\"|in\\b|inch(?:es)?\\b|'|ft\\b|foot\\b|feet\\b|cm\\b|m\\b|meters?\\b)","g"),(s,a,b,c,u)=>{const f=UF[u]*(m?1:1000);return[a,b,c].filter(Boolean).map(v=>+(v*f).toFixed(m?2:1)).join(" x ")+(m?" m":" mm");});}
 t=t.replace(new RegExp(NUM+"\\s*(?:'|ft\\b|foot\\b|feet\\b)","g"),(_,v)=>m?(v*0.3048).toFixed(2)+" m":(v*304.8).toFixed(1)+" mm");
 if(m){t=t.replace(new RegExp(NUM+"\\s*(?:\"|in\\b|inch(?:es)?\\b)","g"),(_,v)=>(v*0.0254).toFixed(3)+" m");}
 else t=t.replace(new RegExp(NUM+"\\s*(?:m|meters?|metres?)\\b(?!\\d)","g"),(_,v)=>(v*1000)+" mm").replace(new RegExp(NUM+"\\s*cm\\b","g"),(_,v)=>(v*10)+" mm").replace(new RegExp(NUM+"\\s*(?:\"|in\\b|inch(?:es)?\\b)","g"),(_,v)=>(v*25.4).toFixed(1)+" mm");
 t=t.replace(/(\d)\s*(?:-|\s)?\s*tooth\b/g,"$1 teeth").replace(/\bbicycles?\b/g,"bikes").replace(/\bstor(?:y|ey|ies|eys)\b/g,"story");
 t=t.replace(new RegExp(NUM+"\\s*(?:g|grams?)\\b(?!\\w)","g"),(_,v)=>(v/1000)+" kg");
 t=t.replace(/\b(lbs?|pounds?)\b/g,"lb").replace(/\b(kilos?|kilograms?|kgs)\b/g,"kg");return t;}
const PRE=[[/\b(mount|bracket|holder) for (a |an |my )?(nema ?(17|23)|stepper|servo|motor)\b/,"motor_mount"],[/\b(robot|drive|rc|rover|omni|mecanum) wheels?\b|\bwheels?\b.*\bfor (a |my |the )?(robot|rover|car|cart)\b/,"wheel"],[/\b(nema ?(17|23)|stepper|servo|motor) (mount|bracket|holder)\b/,"motor_mount"],[/\b(pedestrian|foot|small|creek|garden) bridge\b|\bbridge (over|across) (a|the) (creek|stream|ditch|brook)\b/,"beam_bridge"],[/\b(raised|garden) bed\b/,"planter_box"],[/\bstrap\b.*\bpipe\b|\bpipe\b.*\bstrap\b/,"pipe_saddle"]];
export function pickPart(text){const t=" "+text.toLowerCase()+" ";for(const[re,nm]of PRE){const m=t.match(re);if(m)return{name:nm,len:m[0].trim().length,why:`“${m[0].trim()}” → ${nm.replace(/_/g," ")}`};}
 const hd=t.match(/^(.*?)\b(?:for|to hold|that holds|on|with)\b/);let n=L.detect(t);const hn=hd&&L.detect(hd[1]);if(hn&&n&&hn!=n){const pos=t.search(new RegExp(L.PARTS[n].re.source));if(pos>=hd[1].length)n=hn;}if(n)return{name:n,why:`you said “${(t.match(new RegExp(L.PARTS[n].re.source))||[n])[0].trim()}”`};
 for(const[re,nm]of WORDS){const m=t.match(re);if(m)return{name:nm,why:`“${m[0].trim()}” → closest library part is a ${nm.replace(/_/g," ")}`};}return null;}
const RW={long:"long|length|deep|depth|reach|out|tall|high|wide|width|thick|thickness",};
export function plan(text){const pk=pickPart(text);if(!pk)return null;const name=pk.name,P=L.PARTS[name],t=normUnits(text,name);
 const r=L.parse(name,t);const p=r.p,why=[`Part: ${name.replace(/_/g," ")} (${pk.why}).`],set=new Set(r.notes.map(x=>x.split("=")[0]));
 // plain dimension words the part's own aliases didn't catch
 for(const m of t.matchAll(new RegExp(NUM+"\\s*(mm|m)?\\s*(?:of\\s+)?(long|deep|wide|tall|high|thick|diameter|across|bore|hole|reach|out from the wall|off the wall|from the wall)\\b","g"))){
  let w=m[3];w=/across/.test(w)?"diameter":/out|off|from/.test(w)?"reach":w;const k=(ROLE[w]||[]).find(k=>k in P.P&&!set.has(k));if(!k)continue;const lo=P.P[k][1],hi=P.P[k][2];
  const v=Math.min(hi,Math.max(lo,+m[1]));p[k]=v;set.add(k);why.push(`${P.P[k][3]} = ${v}${isM(name)&&!/mm/.test(P.P[k][3])?"":" mm"} from “${m[0].trim()}”${v!=+m[1]?` (clamped to the ${lo}–${hi} range)`:""}.`);}
 if("span"in P.P&&!set.has("span")&&!r.notes.some(n=>/^dims/.test(n))){const m=t.match(new RegExp(NUM+"\\s*m\\b(?!\\s*(?:wide|width|long|high|tall|deep|floors?))"));if(m){p.span=Math.min(P.P.span[2],Math.max(P.P.span[1],+m[1]));set.add("span");why.push(`Span = ${p.span} m from “${m[0].trim()}”.`);}}
 if(name=="motor_mount"&&/nema ?23/.test(t)){p.size=56.4;p.bolt=47.1;why.push("NEMA 23 face 56.4 mm, bolts on a 47.1 mm square.");}
 if(name=="drone_frame"){const m=t.match(/(\d+)\s*(?:inch|in|")?\s*(?:props?|propellers?)/);}
 {const lone=[...t.matchAll(new RegExp(NUM+"\\s*mm\\b(?!\\s*(?:long|deep|wide|tall|high|thick|diameter|across|bore|hole|reach|wire|od|id|slot|legs?|walls?|arms?|teeth|module|x|motor|shaft|cord|cable|pipe|hole|spacing))","g"))].filter(m=>!/\b(for|on) an? $/.test(t.slice(Math.max(0,m.index-8),m.index)));const k0=Object.keys(P.P)[0];
  if(lone.length==1&&!set.has(k0)&&!r.notes.some(n=>/^dims/.test(n))&&!/Ø|M$/.test(P.P[k0][3])){const v=Math.min(P.P[k0][2],Math.max(P.P[k0][1],+lone[0][1]));p[k0]=v;set.add(k0);why.push(`${P.P[k0][3]} = ${v} mm from “${lone[0][0].trim()}”.`);}}
 for(const n of r.notes)if(!/^dims/.test(n)){const[k,v]=n.split("=");if(P.P[k])why.push(`${P.P[k][3]} = ${v} (you asked).`);}else why.push(`Size from “${n.slice(5)}”.`);
 let mat=r.mat;const said=L.detectMat(t,null);why.push(said?`Material: ${mat} (you asked).`:`Material: ${mat} (library default for this part; say “in aluminum” to change).`);
 const F=r.load||(P.mode?0:50);why.push(r.load?`Load: ${F.toFixed(0)} N (${(F/9.81).toFixed(1)} kg / ${(F/4.448).toFixed(0)} lb).`:P.mode?"":`Load: none given, checked at a default 50 N (about 5 kg).`);
 const s=autoSize(name,{...p},mat,F,r.load?new Set():set);why.push(...s.log);return{name,p:s.p,mat,F,why:why.filter(Boolean),issues:s.issues};}
// keep fixing weak points the inspector finds (it computes stress, sag, buckling per part) - but never undo a size the user asked for unless it fails
export function autoSize(name,p,mat,F,locked=new Set()){const log=[];for(let i=0;i<8;i++){const I=L.inspect(name,p,mat,F).filter(x=>x.sev=="high"||x.sev=="med");if(!I.length)break;let ch=false;
  for(const x of I)for(const k in x.fix)if(k in p&&x.fix[k]!==p[k]&&!locked.has(k)){const P=L.PARTS[name].P[k];const v=Math.min(P[2],Math.max(P[1],x.fix[k]));if(v===p[k])continue;log.push(`Sized up ${P[3].toLowerCase()} ${p[k]} → ${+(+v).toFixed(2)}: ${x.note}`);p[k]=+(+v).toFixed(2);ch=true;}if(!ch)break;}
 const I=L.inspect(name,p,mat,F),bad=I.filter(x=>x.sev=="high");log.push(bad.length?`⚠ Still weak${locked.size?" (I kept the sizes you gave)":" after sizing (hit the size limits)"}: ${bad.map(x=>x.note).join(" ")} Try a stronger material.`:`Check: no weak points at ${F?F.toFixed(0)+" N":"self-weight"} (the inspector checks stress against the material's yield with a safety margin, plus sag/buckling where it applies). Safety ${L.score(I).toFixed(1)}/3.`);return{p,log,issues:I};}
// ---------- follow-ups ("make it stronger", "now in aluminum", "twice as long", "thinner") ----------
const clamp=(name,p,log)=>{const P=L.PARTS[name].P;for(const k in p){const v=Math.min(P[k][2],Math.max(P[k][1],p[k]));if(v!==p[k]){log.push(`${P[k][3]} limited to ${v} (library range ${P[k][1]}–${P[k][2]})`);}p[k]=+(+v).toFixed(2);}return p;};
const DIRW={longer:["long",1],shorter:["long",-1],wider:["wide",1],narrower:["wide",-1],skinnier:["wide",-1],taller:["tall",1],higher:["tall",1],lower:["tall",-1],thicker:["thick",1],beefier:["thick",1],thinner:["thick",-1],deeper:["long",1],
 bigger:["all",1],larger:["all",1],smaller:["all",-1],tinier:["all",-1]};
export function isFollowup(t){t=t.toLowerCase();return !pickPart(t)||/^(now|make it|and|also|then|but|try|use|switch|change)\b/.test(t)?/\b(stronger|sturdier|tougher|heavier duty|lighter|cheaper|longer|shorter|wider|narrower|taller|higher|lower|thicker|thinner|beefier|skinnier|bigger|larger|smaller|deeper|twice|double|half|triple|holds?|carry|support|hole|holes|brace|in (pla|petg|abs|nylon|alumin|steel|stainless|brass|wood|timber)|(pla|petg|abs|nylon|aluminum|aluminium|steel|stainless|brass|wood|timber)\b)/.test(t):false;}
export function followup(text,n){const t=normUnits(text,n.name),P=L.PARTS[n.name],p={...n.p},log=[];let mat=n.mat,F=n.F,label="Edit",resize=false;
 const og=t.match(/\b(stronger|sturdier|tougher|heavier[- ]duty|lighter|cheaper)\b/);
 if(og){const k={sturdier:"stronger",tougher:"stronger","heavier duty":"stronger","heavier-duty":"stronger"}[og[1]]||og[1];const nm=k[0].toUpperCase()+k.slice(1);
  const o=L.options(n.name,n.p,n.mat,n.F).find(o=>o.name==nm);return{p:o.p,mat:o.mat||n.mat,F,label:nm,log:o.log.length?o.log:["already as "+k+" as the checks allow"]};}
 const m2=L.detectMat(t,null);if(m2&&m2==n.mat&&!/\b(stronger|longer|shorter|wider|thicker|thinner|taller|bigger|smaller)\b/.test(t))return{p,mat,F,label:"No change",log:[`It is already ${mat}.`]};if(m2&&m2!=n.mat){mat=P.mode&&m2=="Mild steel"?"Structural steel S355":m2;log.push(`material ${n.mat} → ${mat}`);label="In "+mat;resize=true;}
 const ld=t.match(new RegExp("(?:holds?|carry|carries|support|supports|for|take|takes|load(?: of)?)\\s*(?:up to\\s*|a\\s*)?"+NUM+"\\s*(kg|lb|n)\\b"));if(ld){F=ld[2]=="kg"?ld[1]*9.81:ld[2]=="lb"?ld[1]*4.448:+ld[1];log.push(`load → ${F.toFixed(0)} N`);label="New load";resize=true;}
 // absolute: "make it 200 mm long"
 for(const m of t.matchAll(new RegExp(NUM+"\\s*(mm|m)?\\s*(long|deep|wide|tall|high|thick)\\b","g"))){const k=(ROLE[m[3]]||[]).find(k=>k in P.P);if(k){log.push(`${P.P[k][3]} ${p[k]} → ${m[1]}`);p[k]=+m[1];label="Resized";}}
 for(const k in P.P){for(const al of[...P.P[k][4],k]){if(/^(long|wide|thick|tall|high|deep|length|width|height)$/.test(al))continue;const m=t.match(new RegExp(NUM+"\\s*(?:mm|m)?\\s*"+al.replace(/_/g," ")+"\\b"));if(m&&+m[1]!==p[k]){log.push(`${P.P[k][3]} ${p[k]} → ${m[1]}`);p[k]=+m[1];label="Resized";resize=resize||!!n.F;break;}}}
 {const m=t.match(new RegExp(NUM+"\\s*(?:°|deg|degrees?)"));const k=["angle","pitch"].find(k=>k in p);if(m&&k&&+m[1]!==p[k]){log.push(`${P.P[k][3]} ${p[k]} → ${m[1]}`);p[k]=+m[1];label="Angle";}}
 {const k=["pitch","angle"].find(k=>k in p),m=t.match(/\b(steeper|flatter|shallower)\b/);if(k&&m){const o=p[k];p[k]=o+(m[1]=="steeper"?5:-5);log.push(`${P.P[k][3]} ${o} → ${p[k]}`);label=m[1][0].toUpperCase()+m[1].slice(1);}}
 // relative
 const fac=(()=>{if(/\b(twice|double|2x)\b/.test(t))return 2;if(/\btriple|three times\b/.test(t))return 3;if(/\bhalf\b/.test(t))return 0.5;let m=t.match(/(\d+)\s*%/);if(m)return 1+(+m[1])/100;return null;})();
 const done=new Set();for(const w in DIRW)if(!done.has(DIRW[w][0])&&(new RegExp("\\b"+w+"\\b").test(t)||(/\b(twice|double|half|triple)\b/.test(t)&&new RegExp("\\bas (?:"+{long:"long",wide:"wide",tall:"tall|high",thick:"thick"}[DIRW[w][0]]+")\\b").test(t)&&DIRW[w][1]>0))){done.add(DIRW[w][0]);
  const[role,dir]=DIRW[w],keys=role=="all"?[...SCALES.dia,...SCALES.long,...SCALES.wide,...SCALES.tall,...SCALES.thick]:SCALES[role];const by=t.match(new RegExp("(?:by\\s*)?"+NUM+"\\s*(mm|m)\\s*"+w));
  let f=fac?(dir<0&&fac>1&&fac<=3&&!/%/.test(t)?1/fac:dir<0&&/%/.test(t)?2-fac:fac):(dir>0?1.25:0.8);let any=false;
  for(const k of keys)if(k in p&&!(role=="all"&&false)){const old=p[k];p[k]=by?old+dir*(+by[1]):old*f;log.push(`${P.P[k][3]} ${old} → ${+p[k].toFixed(2)}`);any=true;if(role!="all")break;}
  if(any)label=w[0].toUpperCase()+w.slice(1);}
 const hm=t.match(/\b(add|with)\s*(\d+)?\s*(more )?holes?\b|\b(\d+)\s*holes\b/);if(hm&&"holes"in p){const v=hm[4]?+hm[4]:p.holes+(hm[2]?+hm[2]:2);log.push(`holes ${p.holes} → ${v}`);p.holes=v;label="Holes";}
 if(/\b(fewer|less) holes\b/.test(t)&&"holes"in p){p.holes=Math.max(0,p.holes-2);log.push("2 fewer holes");}
 if(/\b(add|with) (a )?brace\b/.test(t)&&"brace"in p){p.brace=1;log.push("diagonal brace on");}if(/\b(no|remove|without)( the)? brace\b/.test(t)&&"brace"in p){p.brace=0;log.push("brace off");}
 if(!log.length)return null;clamp(n.name,p,log);if(Object.keys(p).every(k=>p[k]===n.p[k])&&mat==n.mat&&F==n.F)log.push("No change: already at the library limit for that.");
 let warn="";if(resize){const s=autoSize(n.name,p,mat,F);log.push(...s.log);}else{const I=L.inspect(n.name,p,mat,F).filter(x=>x.sev=="high");if(I.length)warn=`⚠ ${I[0].note} Say “make it stronger” to fix.`;}
 if(warn)log.push(warn);return{p,mat,F,label,log};}
