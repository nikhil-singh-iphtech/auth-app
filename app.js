import express from "express";
import cors from 'cors'
import helmet from "helmet";
import 'dotenv/config'

import authRoutes from './routes/authRoute.js'
import errorHandler from "./middleware/errorHandler.js";


const app=express()
console.log(authRoutes)


app.use(helmet())


app.use(cors({
    origin:process.env.CLIENT_ORIGIN || '*'
}))


app.use(express.json())

app.use(
    express.urlencoded({
        extended:false,
    })
)

app.use('/api/auth',authRoutes)

app.use((req,res)=>{
    res.status(404).json({
        success:false,
        message:"Route not found"
    })
})

app.use(errorHandler)

export default app;


