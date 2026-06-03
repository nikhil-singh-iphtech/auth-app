import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const protect=async(req,resizeBy,next)=>{
    try{
        console.log(req.headers.authorization);
        const authHeader=req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")){
           const err = new Error('No token provided');
           err.statusCode = 401;
           return next(err);
        }

        const token=authHeader.split(' ')[1]

        const decoded=jwt.verify(token,process.env.JWT_SECRET)

        const user = await User.findById(decoded.id).select('-password -otpCode -otpExpiry');

        if(!user){
            const err=new Error("User no longer exist");
            err.statusCode=401
            return next(err)
        }

        req.user=user
        next()


    }catch(error){
        if (error.name === 'TokenExpiredError') {
      const err = new Error('Access token expired');
      err.statusCode = 401;
      return next(err);
    }
    if (error.name === 'JsonWebTokenError') {
      const err = new Error('Invalid token');
      err.statusCode = 401;
      return next(err);
    }
    next(error);
    }
}

export default protect;