import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
//.js likhna pad rha hai..
const connectDB = async () => {
    try {
        //we can also store it in a variable as ongoose returns a object of response
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log(error);
        process.exit(1); //throw bhi kr skte the but this is better read about it in nodejs
    }
}
export default connectDB