import mongoose from "mongoose";
import bcrypt from "bcrypt"
import crypto from "crypto"


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
     authProviders: {
      type: [String],
      enum: ['local', 'google'],
      default: [],
    },
    refreshToken:{
      type:String,
      default:null
    },
    otpCode:{
        type:String,
        default:null
    },
    otpExpiry:{
        type:Date,
        default:null
    },

    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
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

User.methods.addProvider = function (provider) {
  if (!this.authProviders.includes(provider)) {
    this.authProviders.push(provider);
  }
};

// Check if user has a specific login method available
User.methods.hasProvider = function (provider) {
  return this.authProviders.includes(provider);
};

// Dynamically compute what login methods are available right now
User.methods.getAvailableMethods = function () {
  const methods = [];
  if (this.password)                       methods.push('password');
  if (this.authProviders.includes('google')) methods.push('google');
  methods.push('otp');   // always available if the account exists
  return methods;
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



User.methods.generatePasswordResetToken = function () {
  const rawToken  = crypto.randomBytes(32).toString('hex');
  // store hash — never store raw token in DB
  this.passwordResetToken  = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  return rawToken;  // this goes into the email link
};

User.methods.verifyPasswordResetToken = function (rawToken) {
  if (!this.passwordResetToken || !this.passwordResetExpiry) return false;
  if (this.passwordResetExpiry < new Date()) return false;
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return this.passwordResetToken === hash;
};

User.methods.clearPasswordResetToken = function () {
  this.passwordResetToken  = null;
  this.passwordResetExpiry = null;
};

export default mongoose.model('User', User);



