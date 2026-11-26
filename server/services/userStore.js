const path = require('path');
const fs = require('fs-extra');
const dir = path.join(__dirname, '../data');
const file = path.join(dir, 'users.json');
fs.ensureDirSync(dir);
let users = new Map();
try { users = new Map(Object.entries(fs.readJsonSync(file) || {})); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
function persist() { const tmp=file+'.tmp'; fs.writeJsonSync(tmp,Object.fromEntries(users),{spaces:2}); fs.renameSync(tmp,file); }
module.exports = {
 findByEmail(email) { return users.get(email) || null; },
 create(email,user) { if(users.has(email)) return false; users.set(email,user); persist(); return true; }
};
