// Routes plain text to a project (or not), shared by the app and the node tests.
import {PROJECTS,detectProject,planProject,projFollow,evalProject,megaSummary,defaults,MATP} from './projects.js';
import './plib_flag.js';import './plib_home.js';import './plib_veh.js';import './plib_toy.js';import './mega.js';
import {pickPart} from './builder.js';
export {PROJECTS,planProject,projFollow,evalProject,megaSummary,defaults,MATP};
const norm=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
// learned: {aliases:[{q,k:"proj|<id>"}]} from Teach-it
export function route(text,learned){const n=norm(text);
 for(const a of (learned&&learned.aliases)||[])if(a.k&&a.k.startsWith("proj|")){const q=norm(a.q);if(q&&(n==q||n.includes(q))&&PROJECTS[a.k.slice(5)])return{id:a.k.slice(5),why:`you taught me “${a.q}”`};}
 const pk=pickPart(text);const d=detectProject(text,{partLen:pk?pk.len:0});if(d)return d;
 if(!pk&&/\b(think big|mega ?project|from scratch|whole system|entire|full[- ]scale|break (it|this) down)\b/.test(n))return{id:"generic_system",why:"big ask with no ready-made project, so I decomposed it"};
 return null;}
export function projectByName(name){const n=norm(name);return Object.values(PROJECTS).find(D=>norm(D.name)==n||D.id==n.replace(/ /g,"_"));}
export function catalog(){const c={};for(const D of Object.values(PROJECTS)){(c[D.cat||"Other"]=c[D.cat||"Other"]||[]).push(D);}return c;}
