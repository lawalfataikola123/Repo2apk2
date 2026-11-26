/** Persistent build state for a single server instance. Use a shared database for multi-instance deployments. */
const path=require('path');
const fs=require('fs-extra');
const dir=path.join(__dirname,'../data');
const file=path.join(dir,'builds.json');
fs.ensureDirSync(dir);
let builds=new Map();
try{builds=new Map(Object.entries(fs.readJsonSync(file)||{}));}catch(e){if(e.code!=='ENOENT')throw e;}
function persist(){const tmp=file+'.tmp';fs.writeJsonSync(tmp,Object.fromEntries(builds),{spaces:2});fs.renameSync(tmp,file);}
module.exports={
 create(id,data){builds.set(id,{...data,logs:[],createdAt:new Date().toISOString()});persist();return builds.get(id);},
 get(id){return builds.get(id)||null;},
 getAll(){return Object.fromEntries(builds);},
 update(id,updates){const b=builds.get(id);if(!b)return null;const next={...b,...updates};builds.set(id,next);persist();return next;},
 addLog(id,entry){const b=builds.get(id);if(!b)return;b.logs.push(entry);if(b.logs.length>1000)b.logs=b.logs.slice(-1000);persist();},
 delete(id){const ok=builds.delete(id);if(ok)persist();return ok;},
 getExpired(maxAgeMs=3600000){const now=Date.now();return [...builds.entries()].filter(([,b])=>now-new Date(b.createdAt).getTime()>maxAgeMs).map(([id])=>id);},
 count(){return builds.size;}
};
