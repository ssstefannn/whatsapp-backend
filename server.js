import express from 'express';
import mongoose from 'mongoose';
import Messages from './dbMessages.js';
import Users from './dbUsers.js';
import Chats from './dbChats.js';
import UserChatLinks from './dbUserChatLinks.js';
import Pusher from 'pusher';
import Cors from 'cors';


//app config

const app=express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
    appId: "1349873",
    key: "a60f68b438325ff636a1",
    secret: "d923f5c5f3e6dd6024d1",
    cluster: "eu",
    useTLS: true
  });

//middleware
app.use(express.json());
app.use(Cors());

//DB config
const connection_url = "mongodb+srv://ssstefannn:EbDw879vRP2XwLi5@cluster0.cbl4h.mongodb.net/whatsappDB?retryWrites=true&w=majority";

mongoose.connect(connection_url);

const db = mongoose.connection;


//pusher config
db.once('open',() => {
    console.log('DB connected');

    const chatCollection = db.collection("chats");
    const changeStreamChats = chatCollection.watch();
    const uclCollection = db.collection("userchatlinks");
    const changeStreamUCL = uclCollection.watch();

    changeStreamChats.on('change',(change)=>{
        if (change.operationType === 'insert') {
            const chatDetails = change.fullDocument;
            pusher.trigger('chats','inserted',
            {
                _id : chatDetails._id,
                name : chatDetails.name,
                avatarUrl: chatDetails.avatarUrl,
            });
    }});

    changeStreamUCL.on('change',(change)=>{
        if(change.operationType === 'insert') {
            const uclDetails = change.fullDocument;
            Chats.findOne({ _id : mongoose.Types.ObjectId(uclDetails.chat)},(err,data)=>{
                pusher.trigger('chats','inserted',{
                    _id : data._id,
                    name : data.name,
                    avatarUrl : data.avatarUrl,
                });
            });
        } 
    });

    const msgCollection = db.collection("messagecontents");
    const changeStreamMessages = msgCollection.watch();

    changeStreamMessages.on('change',(change)=>{

        if (change.operationType === 'insert') {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages','inserted',
            {
                message: messageDetails.message,
                username: messageDetails.username,
                email: messageDetails.email,
                chat: messageDetails.chat,
                avatarUrl: messageDetails.avatarUrl,
                timestamp: messageDetails.timestamp,
            });
        } 
        else if (change.operationType === 'delete'){
            pusher.trigger('messages','dropped',{
                status: 200
            });
        }
    });


});


//api
app.get('/',(req,res)=>res.status(200).send('Hello World!!!'));

app.post('/messages/new',(req,res)=> {
    const dbMessage = req.body;
    Messages.create(dbMessage, (err,data)=> {
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(201).send(data);
        }
    });
});

app.post('/users/new',(req,res)=> {
    const dbUser = req.body;
    Users.create(dbUser, (err,data) => {
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(201).send(data);
        }
    });
});

app.post('/chats/new',(req,res)=> {
    const dbChat = req.body;
    Chats.create(dbChat, (err,data) => {
        if(err) {
            res.status(500).send(err);
        } else {
            const dbUserChatLink = {
                user : req.query.email,
                chat : data._id,
            }
            UserChatLinks.create(dbUserChatLink,(err,data)=>{
                if(err) {
                    res.status(500).send(err);
                } else {
                    res.status(201).send(data);
                }
            });
        }
    }); 
});

app.post('/addtochat',(req,res) => {
    const dbUserChatLink = req.body;
    Users.find({ email : req.body.user}, (err,data)=>{
        if(err){
            res.status(500).send(err);
        } else {
            if(data.length===0){
                res.status(200).send(data);
            } else {
                UserChatLinks.find({ user : req.body.user, chat : req.body.chat}, (err,data) => {
                    if(err) {
                        res.status(500).send(err);
                    } else {
                        if(data.length===0){
                            UserChatLinks.create(dbUserChatLink,(err,data)=>{
                                if(err){
                                    res.status(500).send(err);
                                } else {
                                    res.status(201).send(data);
                                }
                            });
                        } else{
                            res.status(200).send(data);
                        }
                    }
                });
            }
        }
    });
});

app.get('/user', (req,res)=> {
    Users.findOne({ email:req.query.email },(err,data)=>{
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.get('/user/chats',(req,res) => {
    UserChatLinks.find({user:req.query.email},(err,data)=> {
        if(err){
            res.status(500).send(err);
        } else {
            Chats.find({
                _id : {
                    $in : data.map( (item)=>mongoose.Types.ObjectId(item.chat))
                }
            },(err,data) =>{
                if(err){
                    res.status(500).send(err);
                } else {
                    res.status(200).send(data);
                }
            }); 
        }
    });
});

app.get('/chat/header',(req,res)=> {
    Chats.findOne({_id : mongoose.Types.ObjectId(req.query.currentChat)},(err,data)=>{
        if(err){
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.get('/messages/sync', (req,res)=> {
    Messages.find({chat:req.query.chat},(err,data)=>{
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.delete('/messages/delete', (req,res)=> {
    Messages.collection.deleteMany({chat : req.query.currentChat},(err,data)=>{
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.delete('/users/delete', (req,res)=> {
    Users.collection.deleteMany({},(err,data)=>{
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.delete('/chat/leave',(req,res)=>{
    UserChatLinks.deleteMany({
        user : req.query.email,
        chat : req.query.chat
    },(err,data)=>{
        if(err){
            res.status(500).send(err);
        } else {
            UserChatLinks.find({
                chat : req.query.chat
            },(err,data) => {
                if(err) {
                    res.status(500).send(err);
                } else {
                    if (data.length===0){
                        Messages.deleteMany({
                            chat : req.query.chat
                        },(err,data)=>{
                            if(err){
                                res.status(500).send(err);
                            } else {
                                Chats.deleteMany({
                                    _id : mongoose.Types.ObjectId(req.query.chat)
                                },(err,data)=>{
                                    if(err){
                                        res.status(500).send(err);
                                    } else {
                                        res.status(200).send(data);
                                    }
                                });
                            }
                        });
                    } else {
                        res.status(205).send(data);
                    }
                }
            });
        }
    });
});

app.delete('/chat/delete',(req,res)=> {
    Messages.collection.deleteMany({
        chat : req.query.chat
    },(err,data)=>{
        if(err){
            res.status(500).send(err);
        } else {
            UserChatLinks.collection.deleteMany({
                chat:req.query.chat
            },(err,data)=>{
                if(err){
                    res.status(500).send(err);
                } else {
                    Chats.deleteMany({
                        _id : mongoose.Types.ObjectId(req.query.chat)
                    },(err,data)=>{
                        if(err){
                            res.status(500).send(err);
                        } else {
                            res.status(200).send(data);
                        }
                    });
                }
            });
        }
    });
    
    
});

//listen

app.listen(port,()=>console.log('Listening on localhost',port));