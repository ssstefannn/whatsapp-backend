import mongoose from "mongoose";

const whatsappSchema = mongoose.Schema({
    name : String,
    avatarUrl : String,
});

export default mongoose.model('chats',whatsappSchema);