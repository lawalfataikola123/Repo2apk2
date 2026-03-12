const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Repo2APK</title></head>
      <body style="background:#080c14;color:white;font-family:sans-serif;text-align:center;padding:50px">
        <h1 style="color:#00ff88">Repo2APK</h1>
        <p>Convert GitHub repos to Android APK</p>
        <p style="color:#00d4ff">Server is running!</p>
      </body>
    </html>
  `);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
