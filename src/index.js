import dotenv from "dotenv"  
import connectDB from "./db/index.js";
//usually ./db me apne aap connectdb load hojana chaiye but idhr hme .js extension lgana pd rha kbhi kbhi hojata
dotenv.config({path:'./env'})
connectDB()//async function always return a promise
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`App is listening on port ${process.env.PORT}`)
    }
    )
}
).catch((err)=>{
    console.log("DB connection failed",err)
}
)
/*
require('dotenv').config({path:'./env'})
this require syntax breaks consistency cuz all other are in import
m2 use import syntax and config dotenv then change in dev script in json
"dev": "nodemon -r dotenv/config --experimental-json-modules src/index.js"
we used an experimental feature to import dotenve using import syntax
ye experimentalfeature k trh abhi use ho rha hai baad me implement hojaega node kandar hi then nikalna pdega ye line
*/
/*
import express from "express";
const app=express()
connect krne keliye toh ek line me connect krwa lenge db ko lekin to be proffesional 
 function connectDB(){} and then call it
connectDB() //ese kr skte hai lekin better ye rhega ki to use iife

;(async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`) // slash krke kia as we need dbname after the url
        app.on("error",(error)={
            console.log("server error",error)//we can listen to events using express , like db toh connect hogya lekin shyd server baat nhi kr paarhi then ye express ka listner kam ayega
            throw error
        }) 
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port${process.env.PORT}`)
        })
    }   catch(err){
        console.log(err)
        throw err
    }
})()   //; lagaya hmne function strt ke pehle becuz kbhi kbhi agar iske pehle line me semi colon nhi hogi thn prblm aa skti hai , standard prctice hai ye
//ye connectDB() function ko humne index.js se alag file me daal diya hai kyunki ye ek db specific function hai toh isko db folder me rakhna chahiye

comment krdia kyunki index file me connectDB() call nhi krta tha as pollute ho rha hai , ham isko db folder m rkhenge
*/
