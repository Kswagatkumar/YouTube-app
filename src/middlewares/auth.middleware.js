//it will just check if the user is logged in or not
//here it will check the access token and add another object req.User with the user details
//midleware like multer dont need us to manually call next() as it does it automatically
// auth middleware is written by us so we need to call next() manually
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
//below req,res,next we wont use res so we can use _ ex:- async (req, _ , next) production grade code 
export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ", "")
        //we used ?optional cuz in some cases cookies are sent in custom header like mobile applications 
        //when it is passed in header , we generally write its key as "Authorization" : Bearer <token . Bearer keyword then a space then the actual token is written so we need to remove the extra things like "Bearer "
        if(!token){
            throw new ApiError(401,"Unauthorized Request");
        }
        
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        //some times we mayt need to do await in jwt but not here 
        //decoed token contains id,username,email,name etc all the things that we gave to it in generateAccessToken in usermodel.js
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
            throw new ApiError(401,"Invalid Acess token");
        }
    
        req.user = user
        next();
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Acess token");
    }
})