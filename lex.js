// Lexicon: WordNet 3.1 (Princeton license, see LEXICON-LICENSE.txt) sharded by two-letter prefix in lex/<a>/<ab>.json,
// lazy-loaded; plus lex/jargon.json (trade/engineering abbreviations) and lex/bridge.json (word → project vocabulary).
const NODE=typeof window=="undefined";let fs=null,base=null;
if(NODE){fs=await import('fs');base=new URL('./lex/',import.meta.url);}
const SH={},PEND={};let JARGON={},BRIDGE={};
function readJSON(name){try{return JSON.parse(fs.readFileSync(new URL(name,base),'utf8'));}catch{return null;}}
if(NODE){JARGON=readJSON('jargon.json')||{};BRIDGE=readJSON('bridge.json')||{};}
const key=w=>/^[a-z]/.test(w)?(/^[a-z][a-z]/.test(w)?w.slice(0,2):w[0]+"_"):"_";const path=c=>c[0]+"/"+c+".json";
export async function init(){if(NODE)return;const[j,b]=await Promise.all(["jargon","bridge"].map(n=>fetch("lex/"+n+".json").then(r=>r.ok?r.json():{}).catch(()=>({}))));JARGON=j;BRIDGE=b;}
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
export function normalize(text,known){let t=" "+text.toLowerCase().replace(/[’']/g,"")+" ";const map=[];
 const ph=Object.keys(JARGON).filter(k=>k.includes(" ")||/[^a-z0-9]/.test(k)).sort((a,b)=>b.length-a.length);
 for(const k of ph){const re=new RegExp("(^|[^a-z0-9])"+k.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&")+"(?=$|[^a-z0-9])","g");if(re.test(t)){t=t.replace(re,"$1"+JARGON[k][0]);map.push([k,JARGON[k][0],"jargon"]);}}
 const out=[];for(const w of toks(t)){if(/^\d/.test(w)){out.push(w);continue;}
  if(JARGON[w]&&!(known&&known(w))){out.push(JARGON[w][0]);map.push([w,JARGON[w][0],"abbreviation"]);continue;}
  const l=lemma(w,known);if(l!=w)map.push([w,l,"word form"]);
  if(known&&known(l)){out.push(l);continue;}
  const b=BRIDGE[l];const el=entry(l);if(b&&!(el&&el.some(s=>s[0]=='v'))){out.push(b[0]);map.push([l,b[0],b[1]]);continue;}
  out.push(l);}
 return{text:out.join(" ").replace(/_/g," "),map};}
const POS={n:"noun",v:"verb",a:"adjective",r:"adverb"};
export function define(word){const w=word.toLowerCase().trim().replace(/^(an?|the)\s+/,"");const j=JARGON[w];const e=entry(w)||entry(lemma(w));
 if(!e&&!j)return null;return{word:w,jargon:j?{expand:j[0],def:j[1]}:null,senses:(e||[]).map(([p,g,s,h])=>({pos:POS[p]||p,gloss:g,syn:s.map(x=>x.replace(/_/g," ")),broader:h.slice(0,3).map(x=>x.replace(/_/g," "))}))};}
