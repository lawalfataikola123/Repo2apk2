const express=require('express');
const router=express.Router();
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {body,validationResult}=require('express-validator');
const {v4:uuidv4}=require('uuid');
const users=require('../services/userStore');
const {jwtSecret}=require('../middleware/authenticate');
function tokenFor(id){return jwt.sign({userId:id},jwtSecret(),{expiresIn:'7d',algorithm:'HS256'});}
function valid(req,res){const e=validationResult(req);if(!e.isEmpty()){res.status(400).json({success:false,error:'Validation failed',details:e.array()});return false;}return true;}
router.post('/register',[body('email').isEmail().normalizeEmail(),body('password').isLength({min:8}).withMessage('Password must be at least 8 characters')],async(req,res,next)=>{try{if(!valid(req,res))return;const {email,password}=req.body;if(users.findByEmail(email))return res.status(409).json({success:false,error:'Email already registered'});const user={id:uuidv4(),email,password:await bcrypt.hash(password,12),createdAt:new Date().toISOString(),apiKey:uuidv4()};if(!users.create(email,user))return res.status(409).json({success:false,error:'Email already registered'});return res.status(201).json({success:true,token:tokenFor(user.id),user:{id:user.id,email:user.email}});}catch(e){return next(e);}});
router.post('/login',[body('email').isEmail().normalizeEmail(),body('password').notEmpty()],async(req,res,next)=>{try{if(!valid(req,res))return;const {email,password}=req.body;const user=users.findByEmail(email);if(!user||!(await bcrypt.compare(password,user.password)))return res.status(401).json({success:false,error:'Invalid credentials'});return res.json({success:true,token:tokenFor(user.id),user:{id:user.id,email:user.email,apiKey:user.apiKey}});}catch(e){return next(e);}});
module.exports=router;
