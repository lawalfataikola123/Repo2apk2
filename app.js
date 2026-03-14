const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
app.get('/', (req, res) => res.send('OK - new version working'));
app.listen(PORT, '0.0.0.0', () => console.log('Port: ' + PORT));
