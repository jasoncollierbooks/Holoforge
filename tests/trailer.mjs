// Tongue-weight check: default layouts must land 10–15%.
import {route,planProject,evalProject} from '../projhub.js';let ok=0,n=0;
for(const q of ["7x14 work trailer","6x12 work trailer","7x16 work trailer","8.5x20 work trailer","7x14 tandem work trailer"]){n++;const r=route(q);const e=evalProject(r.id,planProject(r.id,q).p);const m=e.notes.join(" ").match(/= ([\d.]+)% of gross/);const pct=m?+m[1]:NaN;const g=pct>=10&&pct<=15;g&&ok++;console.log(g?"  ✔":"  ✗",q,pct+"%");}
console.log(`trailer tongue: ${ok}/${n}`);
