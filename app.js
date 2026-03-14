const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API proxy to avoid CORS
app.post('/api/trigger-build', async (req, res) => {
  const { repoUrl, token } = req.body;
  try {
    const response = await fetch(
      `https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/workflows/build-apk.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main', inputs: { repo_url: repoUrl } })
      }
    );
    res.status(200).json({ ok: response.status === 204 });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/runs', async (req, res) => {
  const { token } = req.query;
  try {
    const r = await fetch(
      'https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/runs?per_page=5',
      { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
    );
    res.json(await r.json());
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/run/:id', async (req, res) => {
  const { token } = req.query;
  try {
    const r = await fetch(
      `https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/runs/${req.params.id}`,
      { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
    );
    res.json(await r.json());
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/artifacts/:id', async (req, res) => {
  const { token } = req.query;
  try {
    const r = await fetch(
      `https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/runs/${req.params.id}/artifacts`,
      { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
    );
    res.json(await r.json());
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Repo2APK running on port ${PORT}`);
});
