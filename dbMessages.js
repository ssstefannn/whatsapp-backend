import mongoose from "mongoose";

const whatsappSchema = mongoose.Schema({
    message : String,
    username : String,
    email : String,
    chat : String,
    avatarUrl : String,
    timestamp : String,
});

export default mongoose.model('messagecontents',whatsappSchema);