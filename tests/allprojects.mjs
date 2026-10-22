// Every project evaluates with parts, mass, steps and safety notes; prints outliers.
import {PROJECTS,planProject,evalProject} from '../projhub.js';let ok=0;const bad=[];
for(const id of Object.keys(PROJECTS)){try{const e=evalProject(id,planProject(id,"").p);const good=e.kg>0&&isFinite(e.kg)&&e.parts.length&&e.steps.length&&e.safety.length;good?ok++:bad.push(id+" kg="+e.kg);}catch(err){bad.push(id+" ERR "+err.message);}}
console.log(`all projects: ${ok}/${Object.keys(PROJECTS).length} evaluate`);bad.forEach(b=>console.log("  ✗",b));
