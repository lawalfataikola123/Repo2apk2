const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json());

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(__dirname + '/index.html');
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

app.listen(PORT, '0.0.0.0', () => console.log('Running on port ' + PORT));
