/* شمارش بازدید هر پلتفرم: <script src="../shared/track.js" data-site="project-control"></script>
   روی سرور خودتان به /api/v1/track می‌فرستد؛ روی github.io فقط در همین مرورگر شمرده می‌شود (localStorage vtx.visits). */
(function(){try{var s=document.currentScript,site=(s&&s.getAttribute('data-site'))||'site';if(site==='project-control'&&/[?&]app=mail/.test(location.search))site='mail';vard=new Date().toISOString().slice(0,10);
var K='vtx.visits',o={};try{o=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
o[site]=o[site]||{};o[site][d]=(o[site][d]||0)+1;localStorage.setItem(K,JSON.stringify(o));
if(!/github\.io$/.test(location.hostname)&&location.protocol!=='file:'&&window.fetch)fetch('/api/v1/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site:site,day:d}),keepalive:true}).catch(function(){})}catch(e){}})();
