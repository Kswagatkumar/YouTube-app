import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
    // Configuration
cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET 
});
//normal wala jo site me dia h ham wo direct uploader use kr skte h but we need to unlink the localFilePath in local storage so we didi a wrapper
const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null;
        //upload in cloudinary
        const result = await cloudinary.uploader.upload(localFilePath , {
            resource_type: 'auto',
            // we can give photo video etc but auto is easy
        })
        //file upload sucess
        console.log("File uploaded to Cloudinary:", result.url);
        return response ; //user ko jo data chaiye wo yahan se lelega
    } catch (error) {
        //here we know that localfile path roh hai so file toh server par hai hiii
        // agar upload nai hua then we should delete the file for safe cleaning purpose as it might be corrupted
        fs.unlinkSync(localFilePath);//we have unlink() for async but we use sync wala
        console.error("Error uploading file to Cloudinary:", error);
            return null;
        }
    };

export {uploadOnCloudinary}