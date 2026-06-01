import User from '../models/User.js'
import { generateAccessToken,generateRefreshToken } from '../utils/generateToken.js';


const sendResponse=(res,status,user)=>{
    res.status(status).json({
        success:true,
        user:{
            id:user._id,
            name:user.name,
            email:user.email
        },
    })
}

const issueTokens = async (user, res) => {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Persist refresh token on the user document
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id:    user._id,
      name:  user.name,
      email: user.email,
    },
  });
};

// login 
// POST /api/auth/login

export const login=async (req,res,next)=>{
    try{
        const {email,password}=req.body;
        // validation check
        if(!email || !password){
            const err=new Error("Please Provide email and password");
            err.statusCode=400;
            return next(err);
        }
        
        const user=await User.findOne({email})

        if(!user || !user.password){
            const err=new Error("Invalid email or password")
            err.statusCode=401;
            return next(err)
        }
        console.log("User from DB:", user);
        console.log("Stored password:", user.password);
        console.log("Entered password:",password);

        const isMatch=await user.matchPassword(password);

        console.log(isMatch)

        if(!isMatch){
            const err=new Error("Invalid email or password");
            err.statusCode=401
            return next(err)
        }

       
        await issueTokens(user, res);


    }catch(err){
        next(err)
    }
}




//signup

// POST /api/auth/signup

export const signup=async(req,res,next)=>{
    try{
        const {name, email, password}=req.body;

        if(!name || !email || !password){
            const err=new Error("Please provide name, email and password")
            err.statusCode=400
            return next(err)
        }

        // check if user alredy exist
        const existing=await User.findOne({email})
        if(existing){
            const err=new Error("User with this email already exist")
            err.statusCode=409
            return next(err)
        }

        const user=await User.create({name,email,password})
        await issueTokens(user, res); 
        sendResponse(res,201,user)


    }catch(err){
        next(err)
    }
}