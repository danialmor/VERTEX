// Generates <platform>/platform.json (version + changelog from the app file) and docs/POLICY.md from shared/policy.json.
// Run: node tools/platform_meta.js   (run before every commit that changes a platform)
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');
function msp(){const s=fs.readFileSync(path.join(R,'msp-bi/index.html'),'utf8');
 const v=(s.match(/VERSION\s*=\s*['"]([\d.]+)['"]/)||[])[1]||'?';const log=[];
 const i=s.indexOf('CHANGELOG=[');if(i>0){const lines=s.slice(i+11).split('\n');for(const L of lines){const t=L.trim().replace(/,$/,'');if(t.startsWith('];')||t===']')break;if(!t.startsWith('{v:'))continue;try{const e=Function('return '+t)();log.push({v:e.v,date:e.d,title:e.t,items:e.b||[]})}catch(_){}}}
 return {slug:'project-control',n:'I',name:'Project Control',path:'msp-bi/',version:v,generated:new Date().toISOString().slice(0,10),changelog:log}}
const pc=msp();fs.writeFileSync(path.join(R,'msp-bi/platform.json'),JSON.stringify(pc,null,1));
const P=JSON.parse(fs.readFileSync(path.join(R,'shared/policy.json'),'utf8'));
let md='# VERTEX Policy (generated from shared/policy.json — do not edit here)\n\nUpdated: '+P.updated+' · Owner: '+P.owner+'\n';
for(const k of Object.keys(P))if(Array.isArray(P[k]))md+='\n## '+k+'\n'+P[k].map(x=>'- '+x).join('\n')+'\n';
fs.writeFileSync(path.join(R,'docs/POLICY.md'),md);console.log('ok',pc.version,pc.changelog.length,'entries');
