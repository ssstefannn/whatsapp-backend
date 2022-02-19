import express from 'express';
import mongoose from 'mongoose';
import Messages from './dbMessages.js'
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

const db = mongoose.connection


db.once('open',() => {
    console.log('DB connected');

    const msgCollection = db.collection("messagecontents");
    const changeStream = msgCollection.watch();

    changeStream.on('change',(change)=>{

        if (change.operationType === 'insert') {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages','inserted',
            {
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp:messageDetails.timestamp,
            });
        } 
        else if (change.operationType === 'delete'){
            pusher.trigger('messages','dropped',{
                status: 200
            });
        } else {
            console.log('Error triggering Pusher');
        }
    })
});

// ????

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
    })
})

app.get('/messages/sync', (req,res)=> {
    Messages.find((err,data)=>{
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    })
})

app.delete('/messages/delete', (req,res)=> {
    Messages.collection.deleteMany({},(err,data)=>{
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
})

//listen

app.listen(port,()=>console.log('Listening on localhost',port));