import multer from 'multer';

const storage = multer.diskStorage({
    //file here is already with multer and req is what we get from user json data
    destination: function (req, file, cb) {
    cb(null, './public/temp'); 
  },
  filename: function (req, file, cb) {
    //we can also change filename with id etc like nano ids uid etc 
    cb(null, file.originalname); // we can also Use a unique filename by adding suffix
    //agar same naam ke file h toh overwrite ho jayegi but operation will be of very small time in local storage as we will upload it to cloudinary after that then we will delete the file
    //cb(null, Date.now() + '-' + file.originalname); // Use a unique filename by adding timestamp
  }
});
//it returns path and original file name
export const upload = multer({
    //storage: storage krna chaiye as we are passing object but as both the names are same ES6 me chalega
    storage
});