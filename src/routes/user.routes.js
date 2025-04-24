import {Router} from 'express';
import { registerUser} from '../controllers/user.controller.js';
import { loginUser} from '../controllers/user.controller.js';
import { logoutUser} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { refreshAccessToken } from '../controllers/user.controller.js';
const router = Router();

//file handling keliye pehle multer se milake aage kaam krenge
//multer ke bahut functions hai doc chk kro 
router.route("/register").post( upload.fields([
    //2file ayega ek avatar aur ek cover
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }

    //frontend me inka naam avatar aur cover hone chaiye tbhi extract hoga
]),registerUser)
//url ese banega ki localhost:3000/api/v1/users/register

router.route("/login").post(loginUser)

//now we will some routes to user when it is logged in 
//SECURED ROUTES
router.route("/logout").post( verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
//no need to write verifyJWT as we handled everything inside function
//isiliye next() likhte h taki middleware ko bataya jaega ko uske baad usko kaha jake excute krna h
export default router;