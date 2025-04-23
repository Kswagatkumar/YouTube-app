import {Router} from 'express';
import { registerUser} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
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
        name: "cover",
        maxCount: 1
    }

    //frontend me inka naam avatar aur cover hone chaiye tbhi extract hoga
]),registerUser)
//url ese banega ki localhost:3000/api/v1/users/register
export default router;