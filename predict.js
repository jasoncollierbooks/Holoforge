// Conversation context + predictive typing. No network, no model: a short memory of the conversation, a bigram
// model over the library's own phrases + your history, and simple reference rules ("that one", "what about steel").
import {PROJECTS,partNames,toMM} from './projects.js';
import {PREF,lite} from './understand.js';
const MATW={steel:"steel",aluminum:"alu",aluminium:"alu",alu:"alu",wood:"wood",pine:"wood",cedar:"cedar",plywood:"ply",ply:"ply",pla:"pla",petg:"petg",abs:"abs",brass:"brass",copper:"copper",carbon:"carbon","carbon fiber":"carbon",acrylic:"acrylic",concrete:"concrete","pressure treated":"pt",oak:"wood",plastic:"pla"};
const ORD={first:0,"1st":0,one:0,second:1,"2nd":1,two:1,third:2,"3rd":2,three:2,fourth:3,"4th":3,four:3,last:-1};
const CMP=/^(?:(?:a\s+)?(?:bit|little|lot|touch)\s+)?(?:even\s+|much\s+|way\s+)?(bigger|smaller|taller|shorter|wider|narrower|longer|thicker|thinner|deeper|shallower|heavier|lighter|stronger|cheaper|larger|higher|lower)(?:\s+still)?$/;
export class Context{constructor(){this.turns=[];this.cands=null;this.lastEdit=null;this.lastPart=null;this.proj=null;}
 // words that describe what we are talking about (for word-sense disambiguation)
 words(){const D=this.proj&&PROJECTS[this.proj];return D?[D.name,D.cat||"",D.kw||""].join(" ").toLowerCase().split(/[^a-z]+/).filter(w=>w.length>2):[];}
 note(kind,data){this.turns.push({kind,...data,t:Date.now()});if(this.turns.length>30)this.turns.shift();
  if(kind=="clarify")this.cands=data.chips;if(kind=="build"&&data.id!=this.proj){this.proj=data.id;this.cands=null;this.lastEdit=null;this.lastPart=null;}
  if(kind=="edit"){this.lastEdit=data.text;const m=data.text.toLowerCase().match(/\bthe\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:bigger|smaller|taller|shorter|wider|longer|thicker|thinner|deeper|red|blue|green|black|white)/);if(m)this.lastPart=m[1];}}
 // returns {text, note} (rewritten request) or {pick: chip} or null when nothing to resolve
 resolve(text,cur){const t=text.toLowerCase().trim().replace(/[?.!]+$/,"");let m;
  if(this.cands&&this.cands.length){
   if((m=t.match(/^(?:the\s+)?(first|second|third|fourth|last|1st|2nd|3rd|4th)(?:\s+one)?$|^(?:number|option|#)\s*(\d)$|^(one|two|three|four)$/))){const k=m[1]?ORD[m[1]]:m[2]?(+m[2]-1):ORD[m[3]];const c=k<0?this.cands[this.cands.length-1]:this.cands[k];if(c)return{pick:c,note:`“${text}” → ${c.label}`};}
   if(/^(that|this)( one)?$|^yes$|^(sure|ok|okay)$/.test(t)){const c=this.cands[0];return{pick:c,note:`“${text}” → ${c.label} (the first suggestion)`};}
   for(const c of this.cands){const l=c.label.toLowerCase().replace(/\(.*?\)/g,"").trim();const key=l.split(/\s+/).filter(w=>w.length>2&&!/^(the|and|with)$/.test(w));const ws=t.replace(/^(the|a|an)\s+/,"").replace(/\s+one$/,"").split(/\s+/);if(ws.length<=3&&ws.some(w=>w.length>2&&key.some(k=>k.startsWith(lite(w))||lite(k)==lite(w))))return{pick:c,note:`“${text}” → ${c.label}`};}}
  if(!cur)return null;
  if((m=t.match(/^(?:what|how)\s+about\s+(?:in\s+|using\s+|with\s+)?(.+)$|^(?:try|use)\s+(.+?)(?:\s+instead)?$|^(?:in|out of)\s+(.+?)(?:\s+instead)?$|^(?:the\s+)?same\s+(?:thing\s+|one\s+)?(?:but\s+)?(?:in|out of|with)\s+(.+)$|^(?:and|now)\s+in\s+(.+)$/))){const w=(m[1]||m[2]||m[3]||m[4]||m[5]).replace(/^(a|an|the)\s+/,"").replace(/\s+instead$/,"");
   if(MATW[w]||MATW[w.split(" ").pop()])return{text:`make it in ${w}`,note:`“${text}” → change the material of the current design to ${w}`};
   const c=w.match(CMP);if(c)return{text:`make it ${c[1]}`,note:`“${text}” → edit the current design`};
   if((m=w.match(/^(?:a\s+)?(bigger|smaller|taller|larger|wider|longer)\s+one$/)))return{text:`make it ${m[1]}`,note:`“${text}” → edit the current design`};}
  if((m=t.match(CMP))){const part=/^(and|also)\b/.test(t)&&this.lastPart?this.lastPart:null;return{text:part?`make the ${part} ${m[1]}`:`make it ${m[1]}`,note:part?`“${text}” → the ${part} (last part you edited)`:`“${text}” → the current design (${PROJECTS[cur.proj]?.name||"it"})`};}
  if((m=t.match(/^(?:and|also)\s+(?:make\s+it\s+|make\s+them\s+)?(bigger|smaller|taller|shorter|wider|narrower|longer|thicker|thinner|red|blue|green|black|white)$/))){const p=this.lastPart;return{text:p?`make the ${p} ${m[1]}`:`make it ${m[1]}`,note:p?`“${text}” → the ${p}`:`“${text}” → the current design`};}
  if(/^(again|more|even more|do (it|that) again|once more|same again|a bit more|keep going)$/.test(t)&&this.lastEdit)return{text:this.lastEdit,note:`“${text}” → repeat “${this.lastEdit}”`};
  if((m=t.match(/^(?:make\s+)?(?:it|that|this|them)\s+(?:out\s+of|in)\s+(.+)$/))&&MATW[m[1]])return{text:`make it in ${m[1]}`,note:null};
  if(/^(another|one more|make another( one)?|again but new)$/.test(t)&&cur.proj)return{text:"build "+PROJECTS[cur.proj].name.replace(/\(.*?\)/g,"").trim().toLowerCase(),note:`“${text}” → a fresh ${PROJECTS[cur.proj].name}`};
  return null;}}
// ---- predictive autocomplete ----
const toks=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(Boolean);
export class Predictor{constructor(){this.corpus=[];this.bi={};this.hist=[];try{this.hist=JSON.parse(globalThis.localStorage?.getItem("hf_hist")||"[]");}catch{}}
 build(extra=[]){const C=[];for(const D of Object.values(PROJECTS)){if(D.composed)continue;const n=D.name.replace(/\(.*?\)/g,"").trim().toLowerCase();C.push({t:"build a "+n,k:"project",id:D.id});}
  const EDIT=["make it bigger","make it smaller","make it taller","make it wider","make it longer","make it in steel","make it in aluminum","make it in wood","what does it cost","how heavy is it","export stl","add wheels","remove the roof","paint it blue"];for(const e of EDIT)C.push({t:e,k:"edit"});
  for(const q of extra)C.push({t:q.toLowerCase(),k:"question"});this.corpus=C;this.bi={};for(const c of[...C,...this.hist.map(t=>({t}))]){const w=toks(c.t);for(let i=0;i<w.length-1;i++){const a=this.bi[w[i]]||(this.bi[w[i]]={});a[w[i+1]]=(a[w[i+1]]||0)+1;}}return this;}
 remember(text){const t=text.trim();if(!t||t.length>140)return;this.hist=[t,...this.hist.filter(x=>x.toLowerCase()!=t.toLowerCase())].slice(0,50);try{globalThis.localStorage?.setItem("hf_hist",JSON.stringify(this.hist));}catch{}
  const w=toks(t);for(let i=0;i<w.length-1;i++){const a=this.bi[w[i]]||(this.bi[w[i]]={});a[w[i+1]]=(a[w[i+1]]||0)+1;}}
 nextWord(prefix){const w=toks(prefix);const last=w[w.length-1];const a=this.bi[last]||{};return Object.entries(a).sort((x,y)=>y[1]-x[1]).slice(0,3).map(x=>x[0]);}
 // suggestions for what is typed so far; cur = current design (adds its part names as edit suggestions)
 suggest(prefix,{cur=null,limit=6}={}){const p=prefix.toLowerCase().replace(/\s+/g," ").trimStart();if(p.trim().length<2)return[];const end=/\s$/.test(p);const pw=toks(p);const lastPart=end?"":pw[pw.length-1]||"";const done=end?pw:pw.slice(0,-1);
  let C=this.corpus.slice();for(const h of this.hist)C.push({t:h.toLowerCase(),k:"history"});
  if(cur&&cur.proj&&PROJECTS[cur.proj]){try{for(const n of partNames(PROJECTS[cur.proj],cur.p).slice(0,40)){const nm=n.toLowerCase().replace(/\s*\d.*$/,"").replace(/\(.*?\)/g,"").trim();if(nm.length>2)for(const v of["bigger","smaller","longer","thicker"])C.push({t:`make the ${nm} ${v}`,k:"part"});}}catch{}}
  const out=[];const seen=new Set();
  for(const c of C){const w=toks(c.t);let s=0,i=0,j=0;// subsequence word match: typed words must appear in order (prefix match on the last)
   let ok=true;for(const d of done){while(i<w.length&&!(w[i]==d||lite(w[i])==lite(d)))i++;if(i>=w.length){ok=false;break;}i++;s+=2;}if(!ok)continue;
   if(lastPart){while(j<w.length&&!(j>=i-0&&w[j].startsWith(lastPart)))j++;if(j>=w.length)continue;s+=1+lastPart.length/w[j].length;}
   if(!done.length&&!lastPart)continue;
   const starts=c.t.startsWith(p.trim());s+=starts?3:0;s+=c.k=="history"?2.5:c.k=="edit"&&cur?1.5:c.k=="part"&&cur?1:0;if(c.id)s+=PREF.boost("build",c.id)+PREF.boost(c.t,c.id);s-=w.length*0.05;
   if(!seen.has(c.t)){seen.add(c.t);out.push({text:c.t,kind:c.k,score:s,id:c.id});}}
  out.sort((a,b)=>b.score-a.score);const top=out.slice(0,limit);
  const nw=this.nextWord(end?p:done.join(" "));return{items:top,next:end?nw:[]};}}
