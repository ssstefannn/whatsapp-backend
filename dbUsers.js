import mongoose from "mongoose";

const whatsappSchema = mongoose.Schema({
    email:String,
    username:String,
    avatarUrl:String,
});

export default mongoose.model('users',whatsappSchema);