// Constraint-satisfaction understanding layer ("sudoku" reasoning).
// A query is parsed into slots; each slot gets candidate values from the dictionary (lex.js), the projects library
// and the current design; constraints eliminate candidates until each slot is unique. If an important slot keeps
// more than one candidate we ask ONE short clarifying question with chip choices instead of guessing.
import * as LX from './lex.js';
import {PROJECTS,evalProject,nounHits,partNames} from './projects.js';
const FUNC=new Set("a an the my our your his her their its it this that these those some any i me we you to of for on in at by with from into onto and or but so as is are be was were do does did can could would should will shall please want need like make build design create made get got have has had how what which who where why when up down out over under off about there here then than just very really".split(" "));
const GEN=new Set("system thing things kit model plan plans project diy simple easy cheap good best nice new own little small big large mini full scale set style type kind one two three four five six".split(" "));
export const lite=w=>{w=w.toLowerCase();const I={feet:"foot",teeth:"tooth",shelves:"shelf",knives:"knife",leaves:"leaf",children:"child",men:"man",mice:"mouse"};if(I[w])return I[w];
 if(w.length>4&&w.endsWith("ies"))w=w.slice(0,-3)+"y";else if(/(ches|shes|xes|sses|zes)$/.test(w))w=w.slice(0,-2);else if(w.length>3&&/[^sui]s$/.test(w))w=w.slice(0,-1);
 if(w.length>5&&w.endsWith("ing"))w=w.slice(0,-3);else if(w.length>4&&w.endsWith("ed"))w=w.slice(0,-2);if(w.length>3&&/([b-df-hj-np-tv-z])\1$/.test(w)&&!/(ll|ss|ff|zz)$/.test(w))w=w.slice(0,-1);if(w.length>3&&w.endsWith("e"))w=w.slice(0,-1);return w;};
const words=t=>LX.toks(t).filter(w=>!/^\d/.test(w));
// ---- project vocabulary (name, keywords, words inside its trigger patterns, category) ----
let V=null;
function reWords(D){return(D.re||[]).map(r=>r.source.replace(/\(\?[!=][^)]*\)/g," ").replace(/\\[bsdwBSDW]|[?*+^$\\]|\{[^}]*\}/g," ").replace(/[()|\[\]\/.\-]/g," ")).join(" ");}
export function vocab(){if(V&&V.n==Object.keys(PROJECTS).length)return V;const P={},DF={};
 for(const D of Object.values(PROJECTS)){const raw=[D.name,D.kw||"",reWords(D),D.id.replace(/_/g," ")].join(" ");const s=new Set(words(raw.replace(/-/g," ")).filter(w=>!FUNC.has(w)&&w.length>1).map(lite));const head=new Set(words(D.name.replace(/\(.*?\)/g," ")).slice(-2).map(lite));P[D.id]={s,head};for(const w of s)DF[w]=(DF[w]||0)+1;}
 V={P,DF,n:Object.keys(PROJECTS).length,all:new Set(Object.keys(DF))};return V;}
export const known=w=>vocab().all.has(lite(w));
const idf=w=>{const v=vocab();return Math.log(1+v.n/(v.DF[w]||v.n));};
const DIM=new Set("tall high long wide deep thick heavy light ft feet foot inch inches in mm cm m kg lb lbs x by module teeth tooth thick thickness".split(" "));const adjOnly=w=>{const e=LX.entry(w);return!!(e&&e.length&&!e.some(s=>s[0]=="n"));};
// head noun = last content word before the first preposition/clause word
function headNoun(ws){const cut=ws.findIndex((w,i)=>i>0&&/^(for|to|on|with|that|which|in|from|of|using|so|where|and|plus|holds?|holding|by)$/.test(w)||(i>0&&/^\d/.test(w)&&!/^\d/.test(ws[i-1])&&ws.slice(0,i).some(x=>!FUNC.has(x)&&!/^\d/.test(x))));const pre=(cut>0?ws.slice(0,cut):ws).filter(w=>!FUNC.has(w)&&!GEN.has(w)&&!DIM.has(w)&&!/^\d/.test(w)&&!adjOnly(w)&&!/^(build|make|design|create|want|need)$/.test(w));return pre.length?pre[pre.length-1]:null;}
// ---- object slot: score every project, eliminate by the head-noun constraint ----
export function objectSlot(text){const v=vocab();const N=LX.normalize(text,known);const ws=LX.toks(N.text);const inf=new Set(ws.filter((w,i)=>i>0&&ws[i-1]=="to"));const content=[...new Set(ws.filter(w=>!/^\d/.test(w)&&!FUNC.has(w)&&!GEN.has(w)&&!/^(build|make|design|create)$/.test(w)))];
 const gen=new Set(N.map.filter(m=>/^a kind of/.test(m[2])).map(m=>m[1]));const ev=content.map(w=>{const l=lite(w);if(gen.has(w)&&v.all.has(l))return{w,l,wt:0.3,src:"dictionary (broader word)"};if(v.all.has(l))return{w,l,wt:inf.has(w)?0.4:1,src:inf.has(w)?"verb (weak)":"word"};const e=LX.entry(w);if(e){for(const[p,,syn,hyp]of e.slice(0,2)){if(p!="n")continue;for(const s of syn.concat(hyp.slice(0,2))){const sl=lite(s.replace(/_/g," ").split(" ").pop());if(v.all.has(sl))return{w,l:sl,wt:0.6,src:`dictionary: ${w} → ${s.replace(/_/g," ")}`};}}}return{w,l,wt:0,src:"unknown"};});
 let h=headNoun(ws);if(h&&gen.has(h))h=null;const hl=h?lite(h):null;const sc=[];
 for(const id in v.P){const S=v.P[id].s;let s=0,hit=[];for(const e of ev)if(e.wt&&S.has(e.l)){s+=idf(e.l)*e.wt;hit.push(e.w);}if(s>0&&hl&&v.P[id].head.has(hl))s+=1;if(s>0)sc.push({id,s,hit,head:hl&&S.has(hl)});}
 sc.sort((a,b)=>b.s-a.s);let cands=sc,rule=null;
 if(hl&&v.all.has(hl)){const k=sc.filter(c=>c.head);if(k.length){cands=k;if(k.length<sc.length)rule=`head noun “${h}” must be part of the project → ${sc.length-k.length} eliminated`;}}
 const evChars=c=>c?c.hit.reduce((a,w)=>a+w.length,0):0;
 const top=cands[0],sec=cands[1];let status="none",pick=null,choices=[];
 if(top&&top.s>=2.2){if(!sec||top.s>=sec.s*1.3){status="unique";pick=top;}else{status="ambiguous";choices=cands.filter(c=>c.s>=top.s/1.3-1e-9).slice(0,4);if(choices.length<2){status="unique";pick=top;choices=[];}}}
 return{status,pick,choices,cands:cands.slice(0,6),norm:N,head:h,rule,evChars:evChars(pick),ev};}
// ---- route combining the old router with the slot solver ----
export function solveRoute(text,old,pk){const o=objectSlot(text);const why=[];let res=old;const partHead=!!(pk&&o.head&&words(pk.name.replace(/_/g," ")).map(lite).includes(lite(o.head)));o.partHead=partHead;if(partHead){const pn=new Set(words(pk.name.replace(/_/g," ")+" "+(pk.why||"")).map(lite));const extra=o.pick?o.pick.hit.filter(w=>!pn.has(lite(w))):[];o.extra=extra;if(!o.pick||!o.pick.head||extra.join("").length<3)return{res:old,o};}
 if(old&&old.len>0&&old.id!="generic_system"&&o.status=="ambiguous"&&o.head&&old.len<=o.head.length+1&&(()=>{const hh=lite(o.head);const am=o.choices.filter(c=>vocab().P[c.id].head.has(hh));o.amb=am;return am.length>=2&&am.some(c=>c.id==old.id);})()){res={clarify:{q:"Which one did you mean?",chips:o.amb.map(c=>({label:PROJECTS[c.id].name,ask:"build "+PROJECTS[c.id].name.replace(/\(.*?\)/g,"").trim().toLowerCase()}))}};}
 else if(old&&old.len>0&&old.id!="generic_system"){if(o.status=="unique"&&o.pick.id!=old.id&&o.pick.head&&!vocab().P[old.id].s.has(lite(o.head||""))){res={id:o.pick.id,len:old.len,why:`the main noun “${o.head}” rules out ${PROJECTS[old.id].name}; ${o.pick.hit.join(" + ")} fit ${PROJECTS[o.pick.id].name}`};why.push("constraint override");}}
 else if(old&&old.id!="generic_system"){if(o.status=="unique"&&o.pick.id!=old.id&&o.pick.head&&o.pick.s>=4){res={id:o.pick.id,len:0,why:`${o.pick.hit.join(" + ")} → ${PROJECTS[o.pick.id].name}`};}}
 else if(old){}
 else if(pk&&pk.len){res=null;}
 else{const partStrong=pk&&pk.mlen?pk.mlen:0;if(o.status=="unique"&&o.evChars>partStrong&&(o.pick.head||o.pick.s>=4))res={id:o.pick.id,len:0,csp:true,why:`${o.pick.hit.join(" + ")} → ${PROJECTS[o.pick.id].name}${o.norm.map.length?" (understood "+o.norm.map.map(m=>m[0]+"→"+m[1]).join(", ")+")":""}`};
  else if(o.status=="ambiguous"&&!partStrong)res={clarify:{q:`Which one did you mean?`,chips:o.choices.map(c=>({label:PROJECTS[c.id].name,ask:"build "+PROJECTS[c.id].name.replace(/\(.*?\)/g,"").trim().toLowerCase()}))}};}
 return{res,o};}
// ---- edit slots: sub-part, property, direction, value+unit ----
const VERT=/\b(vertical|upright|erect|tall)\b/;const VLIST=new Set("mast pole post leg column tower chimney antenna flagpole stud ladder upright pillar spire stack".split(" "));
function isVertical(D,p,noun){if(VLIST.has(noun))return true;try{const comps=D.build(Object.fromEntries(Object.entries(p)),p).flat().filter(Boolean).filter(c=>c.n&&words(c.n).map(lite).includes(lite(noun)));let v=0,h=0;for(const c of comps){let dz,dxy;if(c.a&&c.b){dz=Math.abs(c.b[2]-c.a[2]);dxy=Math.hypot(c.b[0]-c.a[0],c.b[1]-c.a[1]);}else if(c.d){if(c.s=="cyl"){dz=c.ax?0:c.d[2];dxy=c.ax?c.d[2]:0;}else{dz=c.d[2];dxy=Math.max(c.d[0],c.d[1]);}}else continue;dz>dxy?v++:h++;}if(v+h)return v>h;}catch{}
 const e=LX.entry(noun);return!!(e&&e[0]&&VERT.test(e[0][1]));}
const UNIT={mm:"length",cm:"length",m:"length",in:"length",inch:"length",inches:"length",ft:"length",feet:"length",foot:"length",kg:"load",lb:"load",lbs:"load",pound:"load",pounds:"load","°":"angle",deg:"angle",degree:"angle",degrees:"angle","%":"scale",w:"power",watt:"power",watts:"power"};
export function editSlots(text,node){const D=PROJECTS[node.proj];const t=" "+text.toLowerCase()+" ";const g={intent:"edit",subpart:null,property:null,direction:null,value:null,unit:null,material:null,notes:[]};let rewrite=text,direct=null;
 const hits=nounHits(D,node.p,t);g.subpart=hits.length?{cands:hits,value:hits.length==1?hits[0]:hits.join("/")}:null;
 const um=t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inch|inches|ft|feet|foot|kg|lbs?|pounds?|°|deg|degrees?|%|w|watts?)\b/);if(um){g.value=+um[1];g.unit=um[2];g.property={cands:[UNIT[um[2]]],value:UNIT[um[2]],why:`unit “${um[2]}” is a ${UNIT[um[2]]}`};}
 const dm=t.match(/\b(taller|higher|shorter|longer|wider|narrower|deeper|shallower|thicker|thinner|bigger|larger|smaller|lower|steeper|flatter|less steep)\b/);if(dm)g.direction=/(taller|higher|longer|wider|deeper|thicker|bigger|larger|steeper)/.test(dm[1])?"increase":"decrease";
 // constraint: steeper/flatter ⇒ pitch/slope/angle (roof) parameter
 if(dm&&/steeper|flatter|less steep|shallower/.test(dm[1])&&(/steep|flat/.test(dm[1])||/\b(roof|pitch|slope)\b/.test(t))){const k=Object.keys(D.P).find(k=>/pitch|slope|angle/i.test(k+" "+D.P[k][3]));if(k){const P=D.P[k],cur=node.p[k],up=g.direction=="increase",st=Math.max(1,Math.round(Math.abs(cur)*0.33));const val=Math.min(P[2],Math.max(P[1],cur+(up?st:-st)));g.property={cands:[k],value:P[3],why:`“${dm[1]}” only applies to a slope → ${P[3]}`};g.notes.push(`${dm[1]} ⇒ ${P[3]}`);const p={...node.p};p[k]=val;direct={p,log:val==cur?[`${P[3]} already at its ${up?"maximum":"minimum"} (${cur})`]:[`${P[3]} ${cur} → ${val}${P[4]&&P[4]!="-"?" "+P[4]:""}`],label:"Edit"};}
  else{g.property={cands:[],value:null,why:"no slope parameter on this project"};}}
 // constraint: shorter/longer on a vertical part ⇒ height
 if(dm&&/^(shorter|longer)$/.test(dm[1])&&hits.length){const vert=hits.filter(h=>isVertical(D,node.p,h));if(vert.length){g.property={cands:["height"],value:"height",why:`${vert.join(", ")} ${vert.length>1?"stand":"stands"} upright, so “${dm[1]}” means height`};rewrite=text.replace(new RegExp("\\b"+dm[1]+"\\b"),dm[1]=="shorter"?"lower":"taller");}else g.property={cands:["length"],value:"length",why:"lies flat, so length"};}
 // constraint: bare length value on a vertical part ⇒ tall
 if(um&&g.property&&g.property.value=="length"&&hits.length&&!/\b(deep|wide|tall|high|long|thick)\b/.test(t)){const vert=isVertical(D,node.p,hits[0]);rewrite=text.replace(um[0],um[0]+(vert?" tall":" long"));g.notes.push(`no direction given: ${hits[0]} is ${vert?"upright → tall":"flat → long"}`);}
 if(!g.property&&dm)g.property={cands:[{taller:"height",higher:"height",lower:"height",wider:"width",narrower:"width",deeper:"depth",shallower:"depth",thicker:"thickness",thinner:"thickness"}[dm[1]]||"size"],value:null};if(g.property&&!g.property.value)g.property.value=g.property.cands[0];
 return{g,rewrite,direct};}
// ---- intent slot ----
export function intentOf(text,hasCur){const t=text.toLowerCase().trim();const c=[];
 if(/^(define|definition of|meaning of|what does .+ mean|what is the meaning of|what's the meaning of|dictionary)\b/.test(t))c.push("define");
 if(/\b(compare|vs\.?|versus|difference between)\b/.test(t))c.push("compare");if(/^(undo|go back|revert)\b/.test(t))c.push("undo");
 if(/^(build|make|design|create|i want|i need|plans? for|how (do|to|would) (i|you) (build|make))\b/.test(t))c.push("build");
 if(hasCur&&/\b(out of|steel|aluminum|aluminium|wood|plywood|pine|cedar|oak|pla|petg|abs|brass|plastic|red|blue|green|black|white|taller|shorter|longer|wider|bigger|smaller|steeper|flatter|add|remove|paint|swap|use|no|without|more|fewer|deeper|thicker)\b/.test(t))c.push("edit");
 if(/^(what|why|how|when|which|is|are|can|does|do|should)\b|\?$/.test(t))c.push("ask");
 // elimination: define beats ask; build verb beats edit; undo/compare are exclusive
 let v=c.includes("define")?"define":c.includes("undo")?"undo":c.includes("compare")?"compare":c.includes("build")&&!/^(make (it|the|them))\b/.test(t)?"build":c.includes("ask")&&/^(what|why|how|when|which|is|are|can|does|do|should)\b/.test(t)?"ask":c.includes("edit")?"edit":c.includes("ask")?"ask":"build";
 return{cands:c.length?c:["build"],value:v};}
export function defineTarget(text){const t=text.toLowerCase().trim().replace(/[?.!]+$/,"");const m=t.match(/^(?:define|definition of|meaning of|dictionary)\s+(?:the\s+word\s+)?(.+)$/)||t.match(/^what(?: is|'s) the meaning of\s+(.+)$/)||t.match(/^what does\s+(.+?)\s+mean$/);return m?m[1].replace(/^["“']|["”']$/g,"").trim():null;}
// full grid for the "How I understood this" panel
export function grid(text,node,extra={}){const it=intentOf(text,!!node);const rows=[["Intent",it.cands.join(" / "),it.value]];const N=LX.normalize(text,known);
 if(N.map.length)rows.push(["Words",N.map.map(m=>`${m[0]}→${m[1]}`).join(", "),N.map.map(m=>m[2]).filter((x,i,a)=>a.indexOf(x)==i).join(", ")]);
 if(it.value=="build"||extra.o){const o=extra.o||objectSlot(text);rows.push(["Head noun",o.head||"—",o.rule||""]);rows.push(["Object",o.cands.slice(0,4).map(c=>PROJECTS[c.id].name.replace(/\(.*?\)/g,"").trim()+" "+c.s.toFixed(1)).join(" · ")||"—",o.status=="unique"?PROJECTS[o.pick.id].name:o.status=="ambiguous"?"ambiguous → ask":"none"]);}
 if(node&&it.value=="edit"){const e=editSlots(text,node).g;rows.push(["Sub-part",e.subpart?e.subpart.cands.join(" / "):"—",e.subpart?e.subpart.value:"whole design"]);rows.push(["Property",e.property?e.property.cands.join(" / "):"—",e.property?(e.property.value||"")+(e.property.why?" — "+e.property.why:""):"—"]);rows.push(["Direction",e.direction||"—",e.direction||""]);if(e.value!=null)rows.push(["Value+unit",e.value+" "+e.unit,e.unit]);}
 const mt=text.toLowerCase().match(/\b(steel|aluminum|aluminium|wood|plywood|pine|cedar|oak|pla|petg|abs|brass|copper|plastic|acrylic|stainless)\b/);if(mt)rows.push(["Material",mt[1],mt[1]]);
 const ld=text.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?)\b/);if(ld)rows.push(["Load",ld[0],ld[0]]);
 return rows;}
