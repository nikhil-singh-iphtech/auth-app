import express from "express";
import {login,signup} from "../controllers/authController.js"
import otpController from "../controllers/otpController.js";

const router=express.Router()

router.get("/health",(req,res)=>{
    res.json({
        success:true,
        message:"auth service is running"
    })
})

router.post("/signup",signup)
router.post("/login",login)

router.post('/send-otp', otpController.sendOtp);
router.post('/verify-otp', otpController.verifyOtp);

export default router