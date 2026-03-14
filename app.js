const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json());

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Repo2APK — Build Android Apps</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#070b0f;--surface:#0d1117;--border:#1c2a3a;--accent:#00ff88;--accent2:#00d4ff;--warn:#ffaa00;--error:#ff4455;--text:#e2e8f0;--muted:#64748b;--card:#0f1923}
body{background:var(--bg);color:var(--text);font-family:'Syne',sans-serif;min-height:100vh}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,255,136,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}
nav{position:sticky;top:0;z-index:100;background:rgba(7,11,15,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:58px}
.logo{font-family:'Space Mono',monospace;font-weight:700;font-size:17px;color:var(--accent);text-decoration:none;display:flex;align-items:center;gap:8px}
.logo-icon{width:26px;height:26px;background:var(--accent);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#000;font-size:13px}
.nav-links{display:flex;gap:6px}
.nav-btn{padding:5px 12px;border-radius:6px;font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);text-decoration:none;transition:all .2s}
.nav-btn:hover{color:var(--text);border-color:var(--accent2)}
.hero{position:relative;z-index:1;padding:60px 20px 30px;text-align:center;max-width:750px;margin:0 auto}
.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.2);border-radius:20px;font-size:11px;font-family:'Space Mono',monospace;color:var(--accent);margin-bottom:20px}
h1{font-size:clamp(28px,6vw,52px);font-weight:800;line-height:1.1;margin-bottom:14px}
h1 span{background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{font-size:15px;color:var(--muted);max-width:480px;margin:0 auto 28px;line-height:1.7}
.wrap{position:relative;z-index:1;max-width:720px;margin:0 auto;padding:0 20px 40px}
.nb{padding:11px 14px;border-radius:8px;font-size:12px;display:flex;gap:8px;align-items:flex-start;line-height:1.5;margin-bottom:7px}
.nb.warn{background:rgba(255,170,0,.08);border:1px solid rgba(255,170,0,.2);color:var(--warn)}
.nb.info{background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);color:var(--accent2)}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:20px}
.ch{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.ch h2{font-size:14px;font-weight:700}
.cb{padding:20px}
label{display:block;font-size:10px;font-family:'Space Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}
.iw{position:relative;margin-bottom:12px}
.iw svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted);width:14px;height:14px}
input,select{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:10px 11px 10px 34px;color:var(--text);font-size:13px;font-family:'Space Mono',monospace;outline:none;transition:border-color .2s}
select{padding-left:11px;appearance:none;cursor:pointer}
input:focus,select:focus{border-color:var(--accent2)}
input::placeholder{color:var(--muted)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.bbtn{width:100%;padding:13px;background:var(--accent);color:#000;border:none;border-radius:7px;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .2s;margin-top:3px}
.bbtn:hover{background:#00e87a;transform:translateY(-1px)}
.bbtn:disabled{background:var(--border);color:var(--muted);cursor:not-allowed;transform:none}
.prog{display:none;padding:0 20px 20px}
.prog.show{display:block}
.steps{display:flex;border-radius:7px;overflow:hidden;border:1px solid var(--border);margin-bottom:14px}
.step{flex:1;padding:7px 3px;text-align:center;font-size:9px;font-family:'Space Mono',monospace;color:var(--muted);background:var(--surface);border-right:1px solid var(--border);transition:all .3s}
.step:last-child{border-right:none}
.step.active{color:var(--accent2);background:rgba(0,212,255,.06)}
.step.done{color:var(--accent);background:rgba(0,255,136,.06)}
.step.error{color:var(--error);background:rgba(255,68,85,.06)}
.si{font-size:13px;display:block;margin-bottom:2px}
.pbw{background:var(--surface);border-radius:3px;height:4px;overflow:hidden;margin-bottom:12px;border:1px solid var(--border)}
.pb{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:3px;transition:width .5s ease;width:0%}
.con{background:#020608;border:1px solid var(--border);border-radius:7px;overflow:hidden}
.conh{padding:8px 11px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:7px;font-family:'Space Mono',monospace;font-size:10px;color:var(--muted)}
.dots{display:flex;gap:4px}
.d{width:8px;height:8px;border-radius:50%}
.cs{margin-left:auto;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700}
.cs.building{background:rgba(0,212,255,.15);color:var(--accent2)}
.cs.success{background:rgba(0,255,136,.15);color:var(--accent)}
.cs.failed{background:rgba(255,68,85,.15);color:var(--error)}
.conb{padding:11px;height:190px;overflow-y:auto;font-family:'Space Mono',monospace;font-size:11px;line-height:1.7}
.conb::-webkit-scrollbar{width:3px}
.conb::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
.lg{display:flex;gap:7px;margin-bottom:1px}
.ln{color:#2a3a4a;min-width:22px}
.lt{color:#8899aa}
.lt.g{color:var(--accent)}.lt.b{color:var(--accent2)}.lt.r{color:var(--error)}.lt.y{color:var(--warn)}
.res{margin-top:12px;padding:13px;border-radius:7px;display:none}
.res.ok{display:block;background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.2)}
.res.fail{display:block;background:rgba(255,68,85,.06);border:1px solid rgba(255,68,85,.2)}
.rt{font-size:13px;font-weight:700;margin-bottom:9px;display:flex;align-items:center;gap:7px}
.dlbtn{display:inline-flex;align-items:center;gap:5px;padding:8px 16px;background:var(--accent);color:#000;border-radius:7px;text-decoration:none;font-weight:700;font-size:12px;transition:all .2s}
.dlbtn:hover{background:#00e87a}
.ghl{display:inline-flex;align-items:center;gap:4px;padding:8px 12px;border:1px solid var(--border);color:var(--muted);border-radius:7px;text-decoration:none;font-size:11px;margin-left:5px;transition:all .2s}
.ghl:hover{color:var(--text);border-color:var(--accent2)}
.st{font-size:12px;font-weight:700;color:var(--muted);font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between}
.va{font-size:10px;color:var(--accent2);text-decoration:none}
.hl{display:flex;flex-direction:column;gap:6px}
.hi{background:var(--card);border:1px solid var(--border);border-radius:9px;padding:11px 13px;display:flex;align-items:center;gap:9px;cursor:pointer;transition:border-color .2s}
.hi:hover{border-color:var(--accent2)}
.hd{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.hd.success{background:var(--accent);box-shadow:0 0 5px var(--accent)}
.hd.failed{background:var(--error)}
.hin{flex:1;min-width:0}
.hn{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hm{font-size:10px;color:var(--muted);margin-top:1px;font-family:'Space Mono',monospace}
.hb{padding:2px 6px;border-radius:3px;font-size:9px;font-family:'Space Mono',monospace;font-weight:700}
.hb.success{background:rgba(0,255,136,.12);color:var(--accent)}
.hb.failed{background:rgba(255,68,85,.12);color:var(--error)}
.mo{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(4px);z-index:200;align-items:center;justify-content:center;padding:18px}
.mo.show{display:flex}
.md{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px;max-width:420px;width:100%}
.md h3{font-size:16px;font-weight:700;margin-bottom:7px}
.md p{font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.6}
.mds{background:var(--surface);border-radius:7px;padding:11px;margin-bottom:14px;font-size:11px;color:var(--muted);line-height:2;font-family:'Space Mono',monospace}
.mds a{color:var(--accent2)}
.mf{display:flex;gap:7px;margin-top:12px}
.bsec{flex:1;padding:9px;background:transparent;border:1px solid var(--border);border-radius:7px;color:var(--muted);font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.bsec:hover{color:var(--text);border-color:var(--text)}
.bpri{flex:2;padding:9px;background:var(--accent);border:none;border-radius:7px;color:#000;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s}
.bpri:hover{background:#00e87a}
footer{position:relative;z-index:1;text-align:center;padding:18px;color:var(--muted);font-size:11px;font-family:'Space Mono',monospace;border-top:1px solid var(--border)}
footer a{color:var(--accent2);text-decoration:none}
@media(max-width:580px){.row{grid-template-columns:1fr}.hero{padding:40px 16px 24px}.wrap{padding-left:16px;padding-right:16px}}
</style>
</head>
<body>
<nav>
  <a class="logo" href="#"><div class="logo-icon">⚡</div>Repo2APK</a>
  <div class="nav-links">
    <a class="nav-btn" href="https://github.com/lawalfataikola123/Repo2apk2/actions" target="_blank">Actions</a>
    <button class="nav-btn" onclick="showM()">⚙ Token</button>
  </div>
</nav>
<div class="hero">
  <div class="badge">⚡ GitHub Actions — 100% Free</div>
  <h1>Build Android Apps<br><span>From GitHub</span></h1>
  <p class="sub">Paste any GitHub repo URL and get a ready-to-install APK. Supports Flutter, Native Android & React Native.</p>
</div>
<div class="wrap">
  <div class="nb warn">⚠ You need a GitHub Token with <strong>repo</strong> and <strong>workflow</strong> scopes.</div>
  <div class="nb info">ℹ iOS builds require macOS and are not supported.</div>
  <div class="card">
    <div class="ch"><span style="color:var(--accent)">▶</span><h2>New Build</h2></div>
    <div class="cb">
      <div class="iw">
        <label>GitHub Repository URL</label>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
        <input type="text" id="ru" placeholder="https://github.com/username/android-app"/>
      </div>
      <div class="row">
        <div><label>Build Engine</label><select id="eng"><option value="auto">🔍 Auto Detect</option><option value="gradle">🤖 Native Android</option><option value="flutter">🐦 Flutter</option></select></div>
        <div><label>Build Type</label><select id="bt"><option value="debug">Debug APK</option><option value="release">Release APK</option></select></div>
      </div>
      <div class="iw">
        <label>GitHub Token *</label>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <input type="password" id="gt" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"/>
      </div>
      <button class="bbtn" id="bb" onclick="go()">▶ Start Build</button>
    </div>
    <div class="prog" id="pg">
      <div class="steps">
        <div class="step" id="sc"><span class="si">📥</span>CLONE</div>
        <div class="step" id="sd"><span class="si">🔍</span>DETECT</div>
        <div class="step" id="si2"><span class="si">📦</span>INSTALL</div>
        <div class="step" id="sco"><span class="si">⚙</span>COMPILE</div>
        <div class="step" id="ss"><span class="si">✍</span>SIGN</div>
        <div class="step" id="sf"><span class="si">✅</span>FINISH</div>
      </div>
      <div class="pbw"><div class="pb" id="pb"></div></div>
      <div class="con">
        <div class="conh">
          <div class="dots"><div class="d" style="background:#ff5f57"></div><div class="d" style="background:#febc2e"></div><div class="d" style="background:#28c840"></div></div>
          <span>Build Console</span>
          <span class="cs building" id="cst">BUILDING</span>
        </div>
        <div class="conb" id="cb2"></div>
      </div>
      <div class="res" id="res">
        <div class="rt" id="rt"></div>
        <div id="ra"></div>
      </div>
    </div>
  </div>
  <div class="st"><span>↻ Recent Builds</span><a class="va" href="https://github.com/lawalfataikola123/Repo2apk2/actions" target="_blank">View All →</a></div>
  <div class="hl" id="hl"></div>
</div>
<div class="mo" id="mo" onclick="if(event.target===this)closeM()">
  <div class="md">
    <h3>🔑 GitHub Token</h3>
    <p>Create a token to trigger builds. Free and takes 1 minute!</p>
    <div class="mds">1. Go to <a href="https://github.com/settings/tokens/new" target="_blank">github.com/settings/tokens/new</a><br>2. Note: "Repo2APK"<br>3. Check: <strong style="color:var(--accent)">repo</strong> and <strong style="color:var(--accent)">workflow</strong><br>4. Generate and copy</div>
    <div class="iw">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--muted)"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <input type="password" id="mt" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"/>
    </div>
    <div class="mf">
      <button class="bsec" onclick="closeM()">Cancel</button>
      <button class="bpri" onclick="saveT()">Save Token</button>
    </div>
  </div>
</div>
<footer>© 2026 Repo2APK | <a href="https://github.com/lawalfataikola123/Repo2apk2" target="_blank">GitHub</a></footer>
<script>
const O='lawalfataikola123',R='Repo2apk2';
let H=JSON.parse(localStorage.getItem('bh')||'[]'),N=1,PI=null;
const sv=localStorage.getItem('ght');if(sv)document.getElementById('gt').value=sv;
renderH();
function showM(){const t=localStorage.getItem('ght');if(t)document.getElementById('mt').value=t;document.getElementById('mo').classList.add('show')}
function closeM(){document.getElementById('mo').classList.remove('show')}
function saveT(){const t=document.getElementById('mt').value.trim();if(!t)return alert('Enter token!');localStorage.setItem('ght',t);document.getElementById('gt').value=t;closeM();lg('Token saved!','g')}
function lg(tx,c=''){const b=document.getElementById('cb2');const d=document.createElement('div');d.className='lg';const ts=new Date().toISOString().substr(11,8);d.innerHTML='<span class="ln">'+String(N++).padStart(3,'0')+'</span><span class="lt '+c+'">['+ts+'] '+tx+'</span>';b.appendChild(d);b.scrollTop=b.scrollHeight}
function st(id,s){const e=document.getElementById(id);if(e)e.className='step '+s}
function sp(p){document.getElementById('pb').style.width=p+'%'}
async function go(){
  const url=document.getElementById('ru').value.trim();
  const tok=document.getElementById('gt').value.trim();
  if(!url){alert('Enter GitHub URL!');return}
  if(!tok){showM();return}
  if(!url.includes('github.com')){alert('Enter valid GitHub URL!');return}
  localStorage.setItem('ght',tok);
  N=1;document.getElementById('cb2').innerHTML='';
  document.getElementById('res').className='res';
  document.getElementById('pb').style.width='0%';
  document.getElementById('cst').className='cs building';
  document.getElementById('cst').textContent='BUILDING';
  ['sc','sd','si2','sco','ss','sf'].forEach(s=>st(s,''));
  document.getElementById('pg').classList.add('show');
  document.getElementById('bb').disabled=true;
  document.getElementById('bb').textContent='⏳ Building...';
  lg('Triggering GitHub Actions...','b');lg('Repo: '+url);
  st('sc','active');sp(5);
  try{
    const r=await fetch('/api/trigger-build',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repoUrl:url,token:tok})});
    const d=await r.json();
    if(d.ok){lg('✅ Triggered!','g');st('sc','done');st('sd','active');sp(15);setTimeout(()=>findR(tok,url),6000)}
    else throw new Error(d.error||'Failed');
  }catch(e){lg('❌ '+e.message,'r');showE(e.message)}
}
async function findR(tok,url){
  try{
    lg('Finding run...','');
    const r=await fetch('/api/runs?token='+tok);
    const d=await r.json();
    if(d.workflow_runs&&d.workflow_runs.length>0){
      const run=d.workflow_runs[0];
      lg('Run #'+run.run_number,'b');sp(25);poll(tok,run.id,url);
    }else{lg('Retrying...','y');setTimeout(()=>findR(tok,url),5000)}
  }catch(e){setTimeout(()=>findR(tok,url),8000)}
}
function poll(tok,id,url){
  let p=25;const steps=['sd','si2','sco','ss'];let si=0;
  PI=setInterval(async()=>{
    try{
      const r=await fetch('/api/run/'+id+'?token='+tok);
      const run=await r.json();
      if(p<85){p+=7;sp(p);if(si<steps.length){if(si>0)st(steps[si-1],'done');st(steps[si],'active');si++}}
      lg('Status: '+run.status+' | '+(run.conclusion||'pending'));
      if(run.status==='completed'){
        clearInterval(PI);sp(100);steps.forEach(s=>st(s,'done'));st('ss','done');
        st('sf',run.conclusion==='success'?'done':'error');
        if(run.conclusion==='success'){
          lg('✅ Build successful!','g');
          document.getElementById('cst').className='cs success';
          document.getElementById('cst').textContent='SUCCESS';
          await getA(tok,id,url,run.html_url);
        }else{
          lg('❌ Failed!','r');
          document.getElementById('cst').className='cs failed';
          document.getElementById('cst').textContent='FAILED';
          showE('Build failed. <a href="'+run.html_url+'" target="_blank" style="color:var(--accent2)">View logs →</a>');
        }
        resetB();saveH(url,run.conclusion==='success'?'success':'failed',run.html_url);
      }
    }catch(e){lg('Polling...','y')}
  },10000);
}
async function getA(tok,id,url,ru){
  try{
    lg('Fetching artifacts...','b');
    const r=await fetch('/api/artifacts/'+id+'?token='+tok);
    const d=await r.json();
    if(d.artifacts&&d.artifacts.length>0){
      const a=d.artifacts[0];
      const mb=(a.size_in_bytes/1024/1024).toFixed(1);
      lg('✅ APK: '+a.name+' ('+mb+' MB)','g');
      document.getElementById('res').className='res ok';
      document.getElementById('rt').innerHTML='✅ APK Built! <span style="font-size:10px;color:var(--muted);font-weight:400">'+mb+' MB</span>';
      document.getElementById('ra').innerHTML='<a href="https://github.com/'+O+'/'+R+'/actions/runs/'+id+'" target="_blank" class="dlbtn">⬇ Download APK</a><a href="'+ru+'" target="_blank" class="ghl">GitHub →</a><p style="margin-top:9px;font-size:10px;color:var(--muted);line-height:1.6">Tap Download APK → scroll to Artifacts → tap '+a.name+'</p>';
    }
  }catch(e){
    document.getElementById('res').className='res ok';
    document.getElementById('rt').innerHTML='✅ Build Successful!';
    document.getElementById('ra').innerHTML='<a href="https://github.com/'+O+'/'+R+'/actions/runs/'+id+'" target="_blank" class="dlbtn">⬇ Download APK</a>';
  }
}
function showE(msg){
  document.getElementById('res').className='res fail';
  document.getElementById('rt').innerHTML='❌ Build Failed';
  document.getElementById('ra').innerHTML='<p style="font-size:12px;color:var(--error);line-height:1.6">'+msg+'</p><a href="https://github.com/'+O+'/'+R+'/actions" target="_blank" class="ghl" style="margin-top:7px;display:inline-flex">View Logs →</a>';
  resetB();
}
function resetB(){document.getElementById('bb').disabled=false;document.getElementById('bb').textContent='▶ Start Build'}
function saveH(url,status,ru){const name=url.split('/').slice(-2).join('/');H.unshift({name,url,status,ru,time:new Date().toISOString()});if(H.length>10)H.pop();localStorage.setItem('bh',JSON.stringify(H));renderH()}
function renderH(){const l=document.getElementById('hl');if(!H.length){l.innerHTML='<div style="text-align:center;padding:22px;color:var(--muted);font-size:11px;background:var(--card);border:1px solid var(--border);border-radius:9px;font-family:Space Mono,monospace">No builds yet!</div>';return}l.innerHTML=H.map(b=>'<div class="hi" onclick="window.open(\''+b.ru+'\',\'_blank\')"><div class="hd '+b.status+'"></div><div class="hin"><div class="hn">'+b.name+'</div><div class="hm">'+new Date(b.time).toLocaleString()+'</div></div><span class="hb '+b.status+'">'+b.status.toUpperCase()+'</span></div>').join('')}
</script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(HTML);
});

app.post('/api/trigger-build', async (req, res) => {
  const {repoUrl, token} = req.body;
  try {
    const r = await fetch('https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/workflows/build-apk.yml/dispatches', {
      method: 'POST',
      headers: {'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json'},
      body: JSON.stringify({ref: 'main', inputs: {repo_url: repoUrl}})
    });
    res.json({ok: r.status === 204});
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.get('/api/runs', async (req, res) => {
  try {
    const r = await fetch('https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/runs?per_page=5', {headers: {'Authorization': 'token ' + req.query.token, 'Accept': 'application/vnd.github.v3+json'}});
    res.json(await r.json());
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.get('/api/run/:id', async (req, res) => {
  try {
    const r = await fetch('https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/runs/' + req.params.id, {headers: {'Authorization': 'token ' + req.query.token, 'Accept': 'application/vnd.github.v3+json'}});
    res.json(await r.json());
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.get('/api/artifacts/:id', async (req, res) => {
  try {
    const r = await fetch('https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/runs/' + req.params.id + '/artifacts', {headers: {'Authorization': 'token ' + req.query.token, 'Accept': 'application/vnd.github.v3+json'}});
    res.json(await r.json());
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.listen(PORT, '0.0.0.0', () => console.log('Repo2APK running on port ' + PORT));
