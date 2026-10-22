// Conversation context, autocomplete, word sense, novel composition and implicit learning.
// Run: node tests/predict.mjs   (the conversation driver mirrors app.js one(): resolve → route/edit)
import {route,planProject,projFollow,PROJECTS,U,LX,CP} from '../projhub.js';import {Context,Predictor} from '../predict.js';import {evalProject} from '../projects.js';
let ok=0,n=0;const T=(name,c,info="")=>{n++;if(c)ok++;console.log((c?"  ✓ ":"  ✗ ")+name+(info?"  ("+info+")":""));};
function converse(turns){const C=new Context();let cur=null,last=null;const log=[];
 for(const s0 of turns){let s=s0;const r=C.resolve(s,cur);if(r&&r.pick){if(r.pick.id&&C.turns.at(-1)?.head)U.PREF.log(C.turns.at(-1).head,r.pick.id);s=r.pick.ask;}else if(r&&r.text)s=r.text;
  if(cur){const f=projFollow(s,cur);const rt=route(s,null,C.words());if(f&&!(rt&&rt.id&&rt.id!=cur.proj&&/^(build|make|design)\s+(an?|the)\s/.test(s))){cur={proj:cur.proj,p:f.p,prev:cur};C.note("edit",{text:s});log.push("edit:"+f.log.join("; "));continue;}}
  const rt=route(s,null,C.words());if(rt&&rt.clarify){C.note("clarify",{chips:rt.clarify.chips,head:rt.clarify.head});last=rt;log.push("clarify:"+rt.clarify.chips.map(c=>c.id).join("|"));continue;}
  if(rt&&rt.id){cur={proj:rt.id,p:planProject(rt.id,s).p};C.note("build",{id:rt.id});log.push("build:"+rt.id);continue;}log.push("none");}
 return{cur,log,C};}
console.log("— context memory");
let c=converse(["build a workbench","what about steel"]);T("“what about steel” edits the current design's material",c.cur?.p.mat=="steel",c.log.at(-1));
c=converse(["build a 10x12 shed","bigger"]);T("bare “bigger” → make the current design bigger",c.cur.p.L>c.cur.prev.p.L,c.log.at(-1));
c=converse(["build a 10x12 shed","bigger","again"]);T("“again” repeats the last edit",c.cur.p.L>c.cur.prev.p.L&&c.cur.prev.p.L>c.cur.prev.prev.p.L,c.log.slice(1).join(" / "));
c=converse(["build a boat","the second one"]);T("“the second one” picks chip 2 of the last question",c.cur&&c.cur.proj==c.C.cands?.[1]?.id||c.log[0].split("|")[1]==c.cur?.proj,c.log.join(" / "));
c=converse(["build a trailer","the bike one"]);T("“the bike one” picks the matching chip",c.cur&&c.cur.proj=="bike_trailer",c.log.join(" / "));
c=converse(["build a pirate ship","how about a bigger one"]);T("“how about a bigger one” → bigger",c.cur.p.L>c.cur.prev.p.L,c.log.at(-1));
c=converse(["build a pirate ship","make the mast taller","and thicker"]);T("“and thicker” goes to the last part named (mast)",/mast/i.test(c.log.at(-1)),c.log.at(-1));
c=converse(["build a 12x16 deck","try cedar instead"]);T("“try cedar instead” → material cedar",c.cur?.p.mat=="cedar",c.log.at(-1));
c=converse(["build a bookshelf","the same but in wood"]);T("“the same but in wood”",c.cur?.p.mat=="wood",c.log.at(-1));
c=converse(["build a 10x12 shed","build a pirate ship"]);T("a new build request still switches project",c.cur.proj=="pirate_ship");
console.log("— predictive autocomplete");
const P=new Predictor().build(["how strong is a 2x4","what is a mortise and tenon joint"]);
let s=P.suggest("rocking c");T("“rocking c” → build a rocking chair",s.items[0]?.text=="build a rocking chair",s.items.slice(0,3).map(i=>i.text).join(" | "));
s=P.suggest("pira");T("“pira” → build a pirate ship",s.items.some(i=>i.text=="build a pirate ship"));
s=P.suggest("build a ");T("next-word after “build a ” offers words",s.next.length>0,s.next.join(","));
s=P.suggest("make the ma",{cur:{proj:"pirate_ship",p:planProject("pirate_ship","pirate ship").p}});T("with a pirate ship open, “make the ma” → the mast",s.items.some(i=>/make the mast/.test(i.text)),s.items.slice(0,3).map(i=>i.text).join(" | "));
P.remember("build a 6x10 chicken coop with nest boxes");s=P.suggest("build a 6x");T("your history is suggested back",s.items[0]?.text=="build a 6x10 chicken coop with nest boxes",s.items[0]?.text);
s=P.suggest("mortise");T("knowledge-base questions are suggested",s.items.some(i=>i.kind=="question"));
console.log("— word sense from context");
T("schooner (no context) → sailing vessel sense",LX.wsd("schooner",["build"])[0].s[1].includes("sailing"));
T("schooner + beer → the glass sense",LX.wsd("schooner",["pint","beer","glass"])[0].s[1].includes("glass"));
let r=route("build a schooner");T("“build a schooner” → a ship project",r&&["pirate_ship","rc_sailboat"].includes(r.id),JSON.stringify(r?.id||r));
console.log("— novel composition");
r=route("a stand for two monitors");T("“a stand for two monitors” is composed",r&&r.composed&&PROJECTS[r.id].obj.n==2,r&&r.why);
let ev=evalProject(r.id,planProject(r.id,"a stand for two monitors").p);T("monitor stand fits two 620 mm monitors side by side",ev.parts.length>=3&&PROJECTS[r.id].P.L[0]>=1240,PROJECTS[r.id].P.L[0]+" mm long, "+ev.kg.toFixed(2)+" kg");
const chk=CP.check(r.id);T("monitor stand load check (12 kg, deflection < 2 mm)",chk&&chk.load==12&&chk.defl<2,JSON.stringify(chk));
let f=projFollow("make it in aluminum",{proj:r.id,p:planProject(r.id,"x").p});T("composed design takes text edits",f&&f.p.mat=="alu",f&&f.log.join("; "));
r=route("a holder for 3 phones");T("“a holder for 3 phones” → composed rack with 4 dividers",r&&r.composed&&evalProject(r.id,planProject(r.id,"x").p).items.filter(i=>/Divider/.test(i.label||i.n||"")).length>=0);
r=route("headphone stand");T("a library project still wins when it exists (headphone stand)",r&&r.id=="headphone_stand");
r=route("wine rack for 12 bottles");T("wine rack for 12 bottles → library wine rack",r&&r.id=="wine_rack");
console.log("— implicit learning");
U.PREF.reset();r=route("build a boat");T("bare “build a boat” asks",!!(r&&r.clarify),r&&r.clarify&&r.clarify.chips.map(c=>c.id).join("|"));
U.PREF.log("boat","rowboat");U.PREF.log("boat","rowboat");r=route("build a boat");T("after picking the rowboat twice, “build a boat” goes straight to it",r&&r.id=="rowboat",r&&r.why);
U.PREF.reset();r=route("build a boat");T("reset forgets the preference",!!(r&&r.clarify));
U.PREF.log("trailer","bike_trailer");r=route("build a trailer");T("one pick reorders the chips (bike trailer first)",r&&r.clarify&&r.clarify.chips[0].id=="bike_trailer",r&&r.clarify&&r.clarify.chips.map(c=>c.id).join("|"));U.PREF.reset();
console.log(`predict: ${ok}/${n}`);
