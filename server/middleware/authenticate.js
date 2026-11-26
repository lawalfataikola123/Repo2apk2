const jwt = require('jsonwebtoken');
function jwtSecret() {
 if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
 if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be configured in production');
 return 'local-development-only-secret';
}
function authenticate(req,res,next) {
 const m=(req.get('authorization')||'').match(/^Bearer\\s+(.+)$/i);
 if(!m) return res.status(401).json({success:false,error:'Authentication required'});
 try { const p=jwt.verify(m[1],jwtSecret(),{algorithms:['HS256']}); if(!p.userId) throw new Error(); req.user={id:p.userId}; return next(); }
 catch { return res.status(401).json({success:false,error:'Invalid or expired token'}); }
}
module.exports={authenticate,jwtSecret};
