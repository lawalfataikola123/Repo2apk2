const https = require('https');

exports.handler = async (event) => {
  const { token, runId, owner, repo, action } = event.queryStringParameters || {};
  const OWNER = owner || 'lawalfataikola123';
  const REPO  = repo  || 'Repo2apk2';
  const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'};

  if (!token || !runId) {
    return {statusCode:400,headers,body:JSON.stringify({error:'Missing token or runId'})};
  }

  try {
    const artifacts = await ghGet('/repos/'+OWNER+'/'+REPO+'/actions/runs/'+runId+'/artifacts', token);
    if (!artifacts.artifacts || artifacts.artifacts.length === 0) {
      return {statusCode:404,headers,body:JSON.stringify({error:'No artifacts found. Build may still be uploading.'})};
    }
    const art = artifacts.artifacts[0];

    if (action === 'info') {
      return {statusCode:200,headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({name:art.name,sizeMB:Math.round(art.size_in_bytes/1024/1024*10)/10,id:art.id,expired:art.expired})};
    }

    const zipUrl = 'https://api.github.com/repos/'+OWNER+'/'+REPO+'/actions/artifacts/'+art.id+'/zip';
    const redirectUrl = await getRedirectUrl(zipUrl, token);
    const zipData = await downloadFile(redirectUrl);
    return {statusCode:200,headers:{...headers,'Content-Type':'application/zip','Content-Disposition':'attachment; filename="'+art.name+'.zip"'},body:zipData.toString('base64'),isBase64Encoded:true};
  } catch(e) {
    return {statusCode:500,headers,body:JSON.stringify({error:e.message})};
  }
};

function ghGet(path, token) {
  return new Promise((resolve, reject) => {
    https.get({hostname:'api.github.com',path,headers:{'Authorization':'token '+token,'Accept':'application/vnd.github.v3+json','User-Agent':'Repo2APK'}}, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function getRedirectUrl(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({hostname:'api.github.com',path:url.replace('https://api.github.com',''),headers:{'Authorization':'token '+token,'Accept':'application/vnd.github.v3+json','User-Agent':'Repo2APK'}}, res => {
      if (res.statusCode === 302 || res.statusCode === 301) resolve(res.headers.location);
      else reject(new Error('Expected redirect, got '+res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}
