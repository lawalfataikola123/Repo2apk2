const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(__dirname));

// CORS for GitHub API calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Proxy GitHub API to avoid CORS
app.post('/api/trigger-build', async (req, res) => {
  const { repoUrl, token } = req.body;
  try {
    const response = await fetch(
      'https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/workflows/build-apk.yml/dispatches',
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
    res.status(response.status).json({ ok: response.status === 204 });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/runs', async (req, res) => {
  const { token } = req.query;
  try {
    const response = await fetch(
      'https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/runs?per_page=5',
      { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
    );
    const data = await response.json();
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/run/:id', async (req, res) => {
  const { token } = req.query;
  try {
    const response = await fetch(
      `https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/runs/${req.params.id}`,
      { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
    );
    res.json(await response.json());
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/artifacts/:id', async (req, res) => {
  const { token } = req.query;
  try {
    const response = await fetch(
      `https://api.github.com/repos/lawalfataikola123/Repo2apk2/actions/runs/${req.params.id}/artifacts`,
      { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
    );
    res.json(await response.json());
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Repo2APK running on port ${PORT}`);
});
