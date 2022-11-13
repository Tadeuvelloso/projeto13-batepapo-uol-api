import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const app = express();

//configs
dotenv.config();
app.use(cors());
app.use(express.json());
const mongoClient = new MongoClient(process.env.MONGO_URI)
let db;
let messages;
let participants;

try {
    await mongoClient.connect();
    db = mongoClient.db("uol");
    messages = db.collection("messages");
    participants = db.collection("participants");
} catch (err){
    console.log(err);
};


// app.post("/participants", (req, res) => {
//     if(!res.body.name){
//         res.status(422).send("Me envie um nome!");
//         return
//     }
//     //Date.now() para saber a hora do login lastStatus: Datenow()

// });

app.get("/participants", async(req, res) => {
    try{
        const Allparticipants = await participants.find().toArray();
        res.status(201).send(Allparticipants);
    } catch (err){
        res.sendStatus(500);
    };
});

// app.post("messages", (req, res) => {
//     messages.insertOne(res.body)
// });

app.get("/messages", async(req, res) => {
    try{
        const allMessages = await messages.find().toArray();
        res.status(201).send(allMessages);
    } catch (err) {
        res.sendStatus(500);
    };
    
    
});


app.listen(5000, () => {console.log("Server running in port: 5000")})