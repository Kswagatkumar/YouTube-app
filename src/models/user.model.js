import mongoose , { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
const userSchema = new Schema({
    username :{
        type: String,
        required: true,
        unique : true,
        trim: true,
        minlength: 3,
        index: true, // jo chiz bar bar searching me aayegi usko index karte hain, thoda expensive hai lekin bar bar search krni pdegi toh index krlo
    },
    email :{
        type: String,
        required: true,
        unique : true,
        trim : true,
        lowercase: true,
        minlength: 6,
    },
    fullname:{
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        index:true
    },
    avatar:{
        type: String, // cloudnary ka url denge
        required: true,
    },
    coverImage:{
        type: String,
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Video',
    }],
    password: {
        type: String,
        required: [true, 'Password is required'],
        trim: true,
    },
    refreshToken:{
        type: String,
    }  
}
, {
    timestamps: true,
});

//we dont use arrow function here as we dont have reference to this in arrow function , here we need to know context as save is working on user and it would need access of the data of user
userSchema.pre('save', async function(next){
    if(this.isModified('password')){ //this.isModified('password') → Check karta hai ki password field change hua ya nahi.Sirf tabhi hash hota hai. Efficient and safe 
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
}) 
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}
userSchema.methods.generateAccessToken = function(){ //arrow use mt krna warna data base se chizen access nhi kr paegi ye
    //usually doesnt need much time so no need for async but u can do if you want
    return jwt.sign({
        _id: this._id,
        email : this.email,
        username : this.username,
        fullname : this.fullname,
    },process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,   //expiry goes in object synatx hai bhai
    })
}
userSchema.methods.generateRefreshToken = function(){ //arrow use mt krna warna data base se chizen access nhi kr paegi ye
    //usually doesnt need much time so no need for async but u can do if you want
    return jwt.sign({
        _id: this._id,
        //holds much less info than access tokeb as it refreshes much ffrequently
    },process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,   //expiry goes in object synatx hai bhai
    })
}
export const User = mongoose.model('User', userSchema); 