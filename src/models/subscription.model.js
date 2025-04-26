import mongoose ,  {Schema} from "mongoose";

//here we made another model for subscriptions , we can also store the subscriptions in the user object itself no issues , but
//best practice is to make a  new model separate entity subscritions , 2things are there channels and subscriptions both are Users only 
//agar Users within one more field we add for subscriptions then it will be a issue when we want to do deletion array will be remade if we have 1million useres then slow process
//subscriber and chanell both are users only but we are just treating them differently
//
const subscriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    channel:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
},timestamps : true);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);