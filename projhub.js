// Routes plain text to a project (or not), shared by the app and the node tests.
import {PROJECTS,detectProject,planProject,evalProject,megaSummary,defaults,MATP,partSuggestions} from './projects.js';
import './plib_flag.js';import './plib_home.js';import './plib_veh.js';import './plib_toy.js';import './mega.js';import './plib_big.js';import './mega2.js';
import {pickPart,plan as partPlan} from './builder.js';
import * as U from './understand.js';import * as CP from './compose.js';export {CP};import * as LX from './lex.js';export {U,LX};
import {projFollow as pf0} from './projects.js';
export function projFollow(text,n){let t=text,pre=[];try{const e=U.editSlots(text,n);if(e.direct)return e.direct;if(e.rewrite!=text){t=e.rewrite;pre.push(`understood “${text}” as “${t}” (${e.g.property.why})`);}}catch(err){}const f=pf0(t,n);if(f&&pre.length)f.log=[...f.log,...pre];return f;}
export {PROJECTS,planProject,evalProject,megaSummary,defaults,MATP,partSuggestions};
const norm=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
// learned: {aliases:[{q,k:"proj|<id>"}]} from Teach-it
export function route(text,learned,ctx=[]){const r=route0(text,learned);if(r&&r.why&&/^you taught me/.test(r.why))return r;let pk=null;try{pk=pickPart(text);}catch{}
 const {res,o}=U.solveRoute(text,r,pk,ctx);LAST={text,o};
 // novel composition: "<support> for <N> <objects>" where no library project carries that object
 let cp=CP.parse(text);if(cp&&pk&&(pk.mlen||pk.len||cp.n<2))cp=null;if(cp&&(!res||res.clarify||(res.id&&!U.vocab().P[res.id]?.s.has(U.lite(cp.obj))))){if(!(res&&res.id&&PROJECTS[res.id]&&!PROJECTS[res.id].composed&&U.vocab().P[res.id]?.s.has(U.lite(cp.obj)))){const c=CP.compose(text);if(c)return c;}}
 return res;}
export let LAST=null;
function route0(text,learned){const n=norm(text);
 for(const a of (learned&&learned.aliases)||[])if(a.k&&a.k.startsWith("proj|")){const q=norm(a.q);if(q&&(n==q||n.includes(q))&&PROJECTS[a.k.slice(5)])return{id:a.k.slice(5),why:`you taught me “${a.q}”`};}
 const pk=pickPart(text);let nf=false;if(!pk){try{nf=!!partPlan(text);}catch{}}const d=detectProject(text,{partLen:pk?(pk.len||0):0,noFallback:nf||!!(pk&&!pk.len)});if(d)return d;
 if(!pk&&/\b(think big|mega ?project|from scratch|whole system|entire|full[- ]scale|break (it|this) down)\b/.test(n))return{id:"generic_system",why:"big ask with no ready-made project, so I decomposed it"};
 return null;}
export function projectByName(name){const n=norm(name);return Object.values(PROJECTS).find(D=>norm(D.name)==n||D.id==n.replace(/ /g,"_"));}
export function catalog(){const c={};for(const D of Object.values(PROJECTS)){(c[D.cat||"Other"]=c[D.cat||"Other"]||[]).push(D);}return c;}
