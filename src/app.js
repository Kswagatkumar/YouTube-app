import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));//kuch bhi param na doge bhi chlega but we can use some

app.use(express.json({limit: "16kb"}));//ye limit humne isliye di hai kyunki jab hum image upload karte hai toh wo 50mb se jyada ho sakta hai toh ye error nahi aayega  
app.use(express.urlencoded({limit: "16kb", extended: true}));   //this is for when url is encoded ram sahu will be encoded as ram+sahu and some places ram%20sahu , express ko samjhana h ye sab
//ye upar ke dono me jo parameters die hai wo not needed hai but de skte h
app.use(express.static("public"));//ye public folder me jo bhi static files hai unko serve karega
app.use(cookieParser());
export default app;