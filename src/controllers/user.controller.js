import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
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

export {registerUser}