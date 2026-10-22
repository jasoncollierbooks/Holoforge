// Lexicon: WordNet 3.1 (Princeton license, see LEXICON-LICENSE.txt) sharded by two-letter prefix in lex/<a>/<ab>.json,
// lazy-loaded; plus lex/jargon.json (trade/engineering abbreviations) and lex/bridge.json (word → project vocabulary).
const NODE=typeof window=="undefined";let fs=null,base=null;
if(NODE){fs=await import('fs');base=new URL('./lex/',import.meta.url);}
const SH={},PEND={};let JARGON={},BRIDGE={},SENSE={},DOM=null;
function readJSON(name){try{return JSON.parse(fs.readFileSync(new URL(name,base),'utf8'));}catch{return null;}}
if(NODE){JARGON=readJSON('jargon.json')||{};BRIDGE=readJSON('bridge.json')||{};SENSE=readJSON('projsense.json')||{};}
const key=w=>/^[a-z]/.test(w)?(/^[a-z][a-z]/.test(w)?w.slice(0,2):w[0]+"_"):"_";const path=c=>c[0]+"/"+c+".json";
export async function init(){if(NODE)return;const[j,b,p]=await Promise.all(["jargon","bridge","projsense"].map(n=>fetch("lex/"+n+".json").then(r=>r.ok?r.json():{}).catch(()=>({}))));JARGON=j;BRIDGE=b;SENSE=p;DOM=null;}
export const projSense=()=>SENSE;
// ---- word-sense disambiguation ----
// Each noun sense is scored by (a) overlap of its definition/synonyms/broader terms with the surrounding words
// (the rest of the request + the current design) and (b) a domain prior: how often its broader terms describe
// things in the projects library (vessel, vehicle, furniture… score high; glass, container, beverage low).
const tokw=s=>s.toLowerCase().split(/[^a-z]+/).filter(w=>w.length>2).map(w=>w.replace(/(ing|ed|es|s)$/,""));
function domain(){if(DOM)return DOM;DOM={};for(const bag of Object.values(SENSE))for(const w of bag)DOM[w]=(DOM[w]||0)+1;return DOM;}
export function wsd(word,ctx=[]){const e=entry(word)||entry(lemma(word));if(!e)return[];const C=new Set(ctx.flatMap(tokw));const d=domain();
 return e.map((s,i)=>{const[p,g,syn,hyp]=s;const bag=new Set([...tokw(g),...syn.flatMap(tokw),...hyp.flatMap(tokw)]);let ov=0;for(const w of bag)if(C.has(w))ov++;let pri=0;for(const h of hyp.slice(0,3))for(const t of tokw(h))pri+=Math.log(1+(d[t.slice(0,6)]||d[t]||0));
  return{s,i,score:(p=="n"?0:-2)+3*ov+pri/3-i*0.3,ov,pri};}).sort((a,b)=>b.score-a.score);}
export async function ensure(text){if(NODE)return;const cs=[...new Set(toks(text).map(key))].filter(c=>!SH[c]);await Promise.all(cs.map(c=>PEND[c]||(PEND[c]=fetch("lex/"+path(c)).then(r=>r.ok?r.json():{}).then(d=>{SH[c]=d;}).catch(()=>{SH[c]={};}))));}
export const loaded=()=>Object.keys(SH);
function shard(c){if(!SH[c]&&NODE)SH[c]=readJSON(path(c))||{};return SH[c]||null;}
export function entry(w){w=w.toLowerCase().replace(/ /g,"_");const s=shard(key(w));return s?s[w]||null:null;}
export const toks=t=>(t.toLowerCase().replace(/[’']/g,"").match(/[a-z][a-z0-9\-]*|\d+(?:\.\d+)?/g)||[]);
const IRR={men:"man",women:"woman",feet:"foot",teeth:"tooth",mice:"mouse",geese:"goose",children:"child",knives:"knife",shelves:"shelf",leaves:"leaf",halves:"half",wolves:"wolf",lives:"life",built:"build",made:"make",bought:"buy",cut:"cut",dice:"die",oxen:"ox",people:"person",axes:"axis",indices:"index",dwarves:"dwarf",calves:"calf",loaves:"loaf",thieves:"thief"};
const RULES=[["ies","y"],["ves","f"],["xes","x"],["ches","ch"],["shes","sh"],["sses","ss"],["ses","s"],["zes","z"],["s",""],["ing","e"],["ing",""],["ied","y"],["ed","e"],["ed",""],["er",""],["est",""],["er","e"],["est","e"]];
const LC={};
export function lemma(w,known){w=w.toLowerCase();if(LC[w]!==undefined)return LC[w];if(IRR[w])return LC[w]=IRR[w];const ok=x=>x.length>2&&((known&&known(x))||!!entry(x));if(entry(w)&&!/s$/.test(w))return LC[w]=w;
 if(/(ss|us|is)$/.test(w)||w.length<4)return LC[w]=w;
 const R=/(ing|ed)$/.test(w)&&/[^aeiou][aeiou][^aeiouwxy]$/.test(w.replace(/(ing|ed)$/,""))?RULES:RULES.map(r=>r).sort((x,y)=>(x[0]==y[0]&&/^(ing|ed)$/.test(x[0]))?(x[1]==""?-1:1):0);
 for(const[a,b]of R)if(w.endsWith(a)){const x=w.slice(0,-a.length)+b;if(ok(x)){if(/(ing|ed|er|est)$/.test(a)&&ok(w)&&!/(ing|ed)$/.test(a))break;return LC[w]=x;}
  const dbl=w.slice(0,-a.length);if(/(ing|ed|er|est)$/.test(a)&&/([b-df-hj-np-tv-z])\1$/.test(dbl)&&ok(dbl.slice(0,-1)))return LC[w]=dbl.slice(0,-1);}
 return LC[w]=w;}
export const jargon=()=>JARGON;export const bridge=w=>BRIDGE[w]||null;
// normalise text: jargon phrases first (longest), then lemma + bridge per word. Returns {text, map:[[from,to,why]]}
export function normalize(text,known,ctx=[]){const ALL=toks(text);let t=" "+text.toLowerCase().replace(/[’']/g,"")+" ";const map=[];
 const ph=Object.keys(JARGON).filter(k=>k.includes(" ")||/[^a-z0-9]/.test(k)).sort((a,b)=>b.length-a.length);
 for(const k of ph){const re=new RegExp("(^|[^a-z0-9])"+k.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&")+"(?=$|[^a-z0-9])","g");if(re.test(t)){t=t.replace(re,"$1"+JARGON[k][0]);map.push([k,JARGON[k][0],"jargon"]);}}
 const out=[];for(const w of toks(t)){if(/^\d/.test(w)){out.push(w);continue;}
  if(JARGON[w]&&!(known&&known(w))){out.push(JARGON[w][0]);map.push([w,JARGON[w][0],"abbreviation"]);continue;}
  const l=lemma(w,known);if(l!=w)map.push([w,l,"word form"]);
  if(known&&known(l)){out.push(l);continue;}
  const el=entry(l);let b=BRIDGE[l];if(/ing$/.test(w)){const st=entry(w.slice(0,-3))||entry(w.slice(0,-3)+'e');if(st&&st.some(x=>x[0]=='v'))b=null;}
  if(el&&el.filter(x=>x[0]=='n').length>1&&known){const W=wsd(l,ALL.filter(x=>x!=w).concat(ctx));const top=W[0];if(top&&top.i>0&&top.s[0]=='n'){b=null;for(const h of top.s[2].concat(top.s[3])){const hw=h.split('_');const k=hw.slice().reverse().find(x=>known(x));if(k){b=[hw.length>1&&known(hw[hw.length-1])?h:k,`sense: “${top.s[1]}” (chosen from context)`];break;}}}}
  if(b&&!(el&&el.some(s=>s[0]=='v'))){out.push(b[0]);map.push([l,b[0].replace(/_/g," "),b[1]]);continue;}
  out.push(l);}
 return{text:out.join(" ").replace(/_/g," "),map};}
const POS={n:"noun",v:"verb",a:"adjective",r:"adverb"};
export function define(word){const w=word.toLowerCase().trim().replace(/^(an?|the)\s+/,"");const j=JARGON[w];const e=entry(w)||entry(lemma(w));
 if(!e&&!j)return null;return{word:w,jargon:j?{expand:j[0],def:j[1]}:null,senses:(e||[]).map(([p,g,s,h])=>({pos:POS[p]||p,gloss:g,syn:s.map(x=>x.replace(/_/g," ")),broader:h.slice(0,3).map(x=>x.replace(/_/g," "))}))};}
