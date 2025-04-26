import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    //isloggedin etc we dont need to check here as we are already in a protected route
    const {oldPassword, newPassword} = req.body;
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid credentials");
    }
    user.password = newPassword;
    await user.save({validateBeforeSave: false});
    return res.status(200).json(new ApiResponse(200,null,"Password changed successfully"));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200,req.user,"User fetched successfully")); 
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email, username} = req.body;
    //kahin agar koi file update krwa rhe h ese then keep their controllers in a different file and separate endpoints
    //as sirf image etc keliye poora text data bar bar jaega and i.e. 2middleware use krna h auth,multer
    if(fullName === "" || email === "" || username === ""){
        throw new ApiError(400,"Please fill all the fields");
    }
    const user = User.findByIdAndUpdate(req.user?._id,{ $set : {fullName, email}},{new:true}).select("-password -refreshToken")
    //new:true kia h so after updating the user the new user will be returned and then password and refreshtoken will be removed then the object will be stored in variable
    //db calls bachegi
    res.status(200).json(new ApiResponse(200,user,"User updated successfully"));
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    //we did .file not .files() as we want only 1file . if remember we did upload.fields() in register route middleware as we needed array of files

    if(!avatarLocalPath){
        throw new ApiError(400,"Please upload avatar");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new ApiError(400,"error while uploading avatar");
    }
    const user = await User.findByIdAndUpdate(req.user?._id,{ $set : {avatar: avatar.url}},{new:true}).select("-password -refreshToken")
    return res.status(200).json(new ApiResponse(200,user,"User avatar updated successfully"));
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    //we did .file not .files() as we want only 1file . if remember we did upload.fields() in register route middleware as we needed array of files

    if(!coverImageLocalPath){
        throw new ApiError(400,"Please upload cover img");
    }
    const coverImage = await uploadOnCloudinary(avatarLocalPath)
    if(!coverImage){
        throw new ApiError(400,"error while uploading cover img");
    }
    const user = await User.findByIdAndUpdate(req.user?._id,{ $set : {coverImage: coverImage.url}},{new:true}).select("-password -refreshToken")
    return res.status(200).json(new ApiResponse(200,user,"User cover image updated successfully"));
})


//writing aggreagation pipelines in MongoDB

const getUserChannelProfile = asyncHandler(async (req, res) => {
    //when we want user profile we go to his url , we will get this in params 

    const {username} = res.params
    if(!username?.trim()){
        throw new ApiError(400,"username is missing");
    }
    //return object is an array of objects
    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
            //match will find all those documents which have the username
        },
        //till now we have only one document channel (i.e. the user object) we have to finds it total number of subscribers 
        {
            $lookup: {
                //we named it (capital S) Subscription but mongoDB converts it to lowercase and adds a "s" to the end so we need to put that name which is present in mongodb website interface
                from : "subscriptions",
                localField: "_id", //we found the user object using username in match , so we have the whole user object so we need the _id member in the object as local field
                foreignField: "channel",
                as: "subscribers"
            }
        },
        /*After a $match in MongoDB aggregation, you get the documents that satisfy the condition.Then, when you apply $lookup, it adds a new array field to each of those matched documents, based on the join condition you provided.So after $lookup: we have The full original document (from $match) Plus a new array field (e.g., "subscribers" or "subscribedTo" in your case), containing the matched documents from the other collection.*/
        //we havent count the number of subscribers yet
        {
            $lookup: {
                from : "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo" //jis jis channel ko subscribe kia h wo sab subscriber member me rhega in model 
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" }, //used $ in subscribers cuz it is a field in the object
                subscribedToCount: { $size: "$subscribedTo" },
                //also the USer who is visiting the channel is he subscriber to the channel or not ?
                isSubscribed: {
                    $cond: {
                        //tells true or false
                        //we already have the user object in req.user by auth middleware
                        if: { $in: [req.user._id, "$subscribers.subscriber"] }, //subscribers is an array of object with 2fields chanel , subscriber
                        then: true, //return true
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                //we will give those things only which we need i.e. selected object
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedTo: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email:1
            }
        }
    ])
    console.log(channel);
    //aggregate will return an array of objects
    if(!channel?.length){ //array ayega return me toh .length lgana pdega , undefined ata toh !channel krdete
        throw new ApiError(400,"chanel not found");
    }
    return  res.status(200)
    .json(new ApiResponse(200,channel[0],"User channel profile fetched successfully"));
})

// now for watch history 
//here if you see the model , user have a ref to videos for id , and each video has a ref to user for the video owner which is again a user 
//to obtain wach history will have to do nested lookups so that as soon as we found the video details we can find the user details of the video owner
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = User.aggregate([
        {
            $match:{ 
                _id : new mongoose.Types.ObjectId(req.user._id) // mongoose ki id banani pdegiactually if we do req.user._id then we get the string value only which is inside () . but the actual mongoDB id is ObjectId(’ < req.user._id> ’) . but as we use mongoose .findone etc it automatically it converts to mongoDB id . so for interviews , actualy mongo id is ObjectId(’ < req.user._id> ’)
                //mongoose.Types.ObjectId is a constructor so we used neew
            }
            //untill now we have got the user whoose watch history is needed to be accesses
        },
        {
            $lookup: {
                from: "videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                //pipeline for getting Owner field in videos section
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localfield:"owner",//now we are inside of watchhistory ka videos , so localfield owner hua
                            foreignField:"_id",
                            as:"owner",//owner name se hi wapis save hoga
                            pipeline:[
                                {
                                    ///doing project becuz owner field got so many values but we dont need avatar coverImage etc so passing on only important fields
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                    //ye wale pipeline me jo bhi hoga wo direct owner field me hi chala jaega
                                    //ye wala pipeline bahar bhi kr skte h lekin hamara jo data hamko chaiye uska structure thoda change hojaega 
                                }
                            ]
                        }
                    },
                    //here owner field me sara owner ka data jaega but note - it will be inside of an array so when we need to access it we need to do owner[0] , now we will just improve the structure of owner field just for easier accces by frntend 
                    {
                        $addFields:{
                            //kuch aur naam de skte h but owner denge toh existing field hi overwrite hojaega
                            owner:{
                                $first :"$owner" //also we can use $arrayElemAt: ["$owner", 0]
                            }
                        }
                    }  
                ]
            }
            /*“For each value in watchHistory (localField), go to the videos collection (from), find the document where _id (foreignField) matches, and return it.”These matched video documents will be added as an array to the same field name: "watchHistory". So after this stage, the watchHistory field will no longer be just an array of IDs, it will now be an array of full video objects. */
            //we have the user object now we perform join operation with the current user’s watchHistory array and the videos collection.
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user[0].watchHistory, //aggregate will return array so we do [0] , we gave only watch history as thats what was needed only,
                                //watch history is intenstionally an array so we didnt do [0] on watchHistory
        "Watch history fetched successfully"
    ))
}
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}