import mongoose from "mongoose";

const whatsappSchema = mongoose.Schema({
    user : String,
    chat : String,
});

export default mongoose.model('userchatlinks',whatsappSchema);