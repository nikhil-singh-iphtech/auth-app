const errorHandler=(err,req,res,next)=>{
    const statusCode = Number(err.statusCode) >= 100 && Number(err.statusCode) < 600
    ? err.statusCode
    : 500;
    res.status(statusCode).json({
        success:false,
        message:err.message || "internal server erorr",
        stack:process.env.NODE_ENV=="develpment"?err.stack :undefined
    })
}

export default errorHandler