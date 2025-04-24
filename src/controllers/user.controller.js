import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async(userId) => { //asyncHandler use nhi chaiye as jo hmko krna h inbuilt se krna h koi web se request nhi dalni
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        //we did this cuz save() kroge toh mongoose har ek required wali field chk krega and agar fill n hui h then erroor ayega 
        //idhr required wali field abhi fill krne ki jrurt nhi h
        //But to be safe and avoid any random validation errors (say, if the model changed or something weird is missing), you skip validation 
        return {accessToken, refreshToken};
    }catch(err){
        throw new ApiError(500,"Something went wrong while generating access and refresh token");
    }
}
const registerUser = asyncHandler(async (req, res) => {
    //async lagaya h cuz even if using asyncHandler something might go wrong cuz file uploadijg krenge
    /**///think about edge cases what all can go wrong
    //chk if username , email unique
    //username not empty
    //avatar and images chk
    //create user object and remove refresh tokenn and pass then send to frntend
    //chk for user cration  then return res
    //form,json se data ayega toh .body se mil jaega url se ata h then different logic
    const {fullName , email,username,password} = req.body;

    if(fullName === "" || email === "" || username === "" || password === ""){ 
        //can also do [fullName,email,username,password].some((item) => item?.trim() === "")
        //this means some will chk atleast one element satiesfies condition and return T/F , if item existes then trim it thenafter if it is empty then return true so that error comes 
        //If you used .map() in your validation: You’d get an array like [false, false, true, false] — not useful for throwing an error immediately.
        throw new ApiError(400,"Please fill all the fields");
    }
    //now chk if user existes 
    //usr model can diretcly contact with mongodb as we made it with mongoose
    //can also use .find()
    //we will use operators here can also go without them .find({username})
    const existedUser = await User.findOne({$or: [{email}, {username}]});
    if(existedUser){
        throw new ApiError(400,"User already exists");
    }

    //we used a middleware so it adds some more .methods in res like req.files
    //chk manually if file is present or not
    //avatar wala object me bahyt chizein hogi like format size etc , we need the first thing i.e. file itslef
    const avatarLocatPath = req.files?.avatar?.[0]?.path
    const coverLocatPath = req.files?.coverImage?.[0]?.path
    
    //optionally lia h cuz file may not be present
    //multer was told about /public path in multer middleware i.e. local storage
    if(!avatarLocatPath){
        throw new ApiError(400,"Please upload avatar");
    }
    const avatar = await uploadOnCloudinary(avatarLocatPath)
    const coverImage =  await uploadOnCloudinary(coverLocatPath)
    //we will get the whole response object from cloudinary as we defined in func
    if(!avatar){
        throw new ApiError(400,"Please upload avatar");
    }
    //we didnt handle coverImage here so agar nhi deta h toh undefined ho jaega
    //entry in database
    const user = await User.create({
        fullName,
        avatar : avatar.url,
        cover : coverImage?.url || "",//kahin pr chk nhi kia ki 
        email,
        password,
        username:username.toLowerCase(), 
    });
    //directly user wala variable se password and refrreshtoken undefined krke bhej skte h but ese below process se full proof idea 
    //wierd syntax of select() here aall are selected by defualt , write those fields which u dont wamt to be selected in args
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(400,"User not created");
    }
    //apiresponse class me data bhejna allowd h so poora bhej denge
    return res.status(201).json(new ApiResponse(201,createdUser,"User created successfully"));
    //.status me status code dena better approach h ex- postman me bhi wohiread krta h woh
})

//LOGIN USER
const loginUser = asyncHandler(async (req, res) => {
    //res.body->data
    //username/email
    //find user
    //pass chk
    //generate access and refresh token
    //send cookies
    const {email,username,password} = req.body;
     if(!(email && username )){
        throw new ApiError(400,"Please provide email or username");
    }
    const user = await User.findOne({$or: [{email}, {username}]})
    if(!user){
        throw new ApiError(400,"User not found");
    }
    //yaha capital wala User object use mt krna apne khudke actualy user par methods karna
    const isPAsswordValid  = await user.isPasswordCorrect(password)
    if(!isPAsswordValid){
        throw new ApiError(400,"Invalid credentials");
    }
    //accesstoken refresh toeken will be used again nd again so make it a separate method
    const {accessToken,refreshToken}= await generateAccessTokenAndRefreshToken(user._id)

    //ab dekho hamare pass jo user obj h uske reference old wala h so usme refreshtoken etc update nhi hui h , so hamko abhi wapis ek DB call krna pdega wrna old obj me hi manually data wapis input krna pdega 
    //depends on us hamko expensive dbcall karna h ya nahi
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    //sending cookies

    const options = {
        httpOnly : true,
        secure : true,
    }
    //by default cookies ko koi bhi change kr skta h frntend par , but here only backedn can modify it by this
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200,{user : loggedInUser , accessToken,refreshToken},"User logged in successfully"));
    //alag se wapis refreshtoeken etc bheja cuz handling that case when user by his own will wants to save the tokens , not a good practice  but maybe he wants the cookies in some case
})

//LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {
    //idhr hmko logout krne keliye user ke side se tokens remove krdo (if u remember we set httpOnly to true so we can edit the tokens from backend )
    //login ke wakt toh form tha isiliye ham data waha se lekr agye user.id etc abhi logout ke wakt kaha se lae user ke detail s??

    //we will make a middleware for this . example - cookie parser helped us to define and access a new method.cookie from res and req both of them 
    

    // findbyID use kroge toh chlega lekin fir ssave kro then validation false kro bkchodi h
    await User.findByIdAndUpdate(
        req.user._id,
        //we will use operator set
        {
            //here we tell tell what all properties we want to update
            $set:{
                refreshToken:undefined
            }
        },
        //aur fields bhi pass kr skte h 
        {
            new: true
            // idhr agar ham returning object from mongoose store krenge toh mongoose wil return user data before updation if new:false  , if new: true it will first update then return the user object . but in here we arent even storing the returned object so no use case
        }
    )
    const options = {
        httpOnly : true,
        secure : true,
    }
    //for cookies

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,null,"User logged out successfully"));
    //abhi kuch nahi bhejna h kyuki logout ho gaya h
})

//jab accessToken expire hoga tab ek endpoint hit krna hoga api me so that using the refresh token we can generate a new access token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.headers("Authorization")?.replace("Bearer ", "")
    //we used ?optional cuz in some cases cookies are sent in custom header like mobile applications
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET)
        //jruri nhi ki decoded token me payload ho hii ho ye jruri nhi h just saying 
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token");
        }
        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(401,"expired refresh token");
        }
    
        const options = {
            httpOnly : true,
            secure : true,
        }
        const {accessToken , refreshToken } = await generateAccessTokenAndRefreshToken(user._id)
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200,{accessToken,refreshToken},"Access token refreshed successfully"));
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token");    
    }

}

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}