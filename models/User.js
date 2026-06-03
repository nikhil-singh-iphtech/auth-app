import mongoose from "mongoose";
import bcrypt from "bcrypt"


const User=new mongoose.Schema({
    name:{
       type:String,
       required:[true, "Name is required"],
       trim:true
    },
    email:{
        type:String,
        required:[true, "Email is required"],
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        minlength:[6, "Password must be at least 6 characters"]

    },
    authProvider:{
       type:String,
       enum:['local','google'],
       default:'local'
    },
    refreshToken:{
      type:String,
      default:null
    },
    otpCode:{
        type:String,
        defualt:null
    },
    otpExpiry:{
        type:String,
        default:null
    },

},
{timestamps:true}
)

User.pre('save', async function(next){
   
    
    if(! this.isModified('password') || !this.password) return;

    this.password=await bcrypt.hash(this.password,10)
    
    
})


User.methods.matchPassword=async function (enteredPassword){
    return bcrypt.compare(enteredPassword,this.password)
}


    User.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
  this.otpCode = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  return otp;
};


User.methods.verifyOTP = function (enteredOtp) {
  if (!this.otpCode || !this.otpExpiry) return false;
  if (this.otpExpiry < new Date()) return false;      
  return this.otpCode === enteredOtp;                  
};


User.methods.clearOTP = function () {
  this.otpCode = null;
  this.otpExpiry = null;
};

export default mongoose.model('User', User);



