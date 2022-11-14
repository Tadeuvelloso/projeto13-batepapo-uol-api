import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

const app = express();

// Schemas / Validations
const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("private_message", "message").required()
})

const participantsSchema = joi.object({
    name: joi.string().min(1).required()
})


//configs
dotenv.config();
app.use(cors());
app.use(express.json());
const mongoClient = new MongoClient(process.env.MONGO_URI)
let db;
let messages;
let participants;
let now = dayjs();

try {
    await mongoClient.connect();
    db = mongoClient.db("uol");
    messages = db.collection("messages");
    participants = db.collection("participants");
} catch (err){
    console.log(err);
};


app.post("/participants", async (req, res) => {
    const participante = req.body;

    const validation = participantsSchema.validate(participante);

    if(validation.error){
        console.log(validation.error.details);
        res.status(422).send("Me envie um nome!");
        return
    }

    const participantCadastrado = await participants.findOne({name: participante.name});

    if(participantCadastrado){
        res.status(409).send("Usuário ja cadastrado!");
        return
    }

    try{
        await participants.insertOne({name: participante.name, lastStatus: Date.now()});
        res.sendStatus(201);
    } catch (err){
        res.sendStatus(500);
    }

});

app.get("/participants", async(req, res) => {
    try{
        const Allparticipants = await participants.find().toArray();
        res.status(201).send(Allparticipants);
    } catch (err){
        res.sendStatus(500);
    };
});

app.post("/messages", async(req, res) => {
    const message = req.body;
    const {user} = req.headers;
    const time = now.format("HH:mm:ss");
    

    const validation = messageSchema.validate(message);
    if(validation.error){
        res.sendStatus(422);
        return
    }

    const usurarioOnline = await participants.findOne({name: user})

    if(!usurarioOnline){
        res.sendStatus(404);
        return
    }

    try{
        await messages.insertOne(
            {from: user,
            to: message.to,
            text: message.text,
            type: message.type,
            time});
        res.sendStatus(201);
    } catch (err) {
        res.sendStatus(500);
    }
});

app.get("/messages", async(req, res) => {
    const { limit } = req.query;
    
    try{
        const allMessages = await messages.find().toArray();
        if(limit){
            const lastMessages = allMessages.slice(-(limit))
            res.status(201).send(lastMessages);
            return
        }
        res.status(201).send(allMessages);
    } catch (err) {
        res.sendStatus(500);
    }; 
    
});

app.post("/status", async (req, res) => {
    const {user} = req.headers;
  

    const verificaParticipante = participants.findOne({name: user});

    if(!verificaParticipante){
        res.sendStatus(404);
    }

    try{
        const resp = await participants.updateOne({name: user}, {$set: {name: user, lastStatus: Date.now()}});
        res.sendStatus(200)
        console.log("atualizado")
        return
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }

    //de 15 em 15 segundos percorrer a array vendo o laststatus de (now - laststatus) < 10 se for menor que 10 tira ele da lista de participants e manda uma mensagem que sair da sala

})



// app.delete("/messages/:id", async(req, res) => {
//     //precisamos receber o nome do user pra verificar se ele exste no banco de dados.
//     const {id} = req.params;

//     try {
//         const resp = await db.messages.deleteOne({_id: new ObjectId(id)});
//         res.send("Mensagem apagada com sucesso!")
//     } catch (err) {
//         res.sendStatus(404)
//     }
// })

// app.put("/messages/:id", async (req, res) => {

//     const {id} = req.params
//     const message = req.body

//     try {
//         const mesageFinded = await db.mensagem.findOne({_id: new ObjectId(id)});
//         if(!mesageFinded){
//             res.status(400).send("Mensagem não encontrada!");
//             return
//         }
//         await mensagem.updateOne({_id: new ObjectId(id)}, {$set: message});
//         res.send("Mensagem atualizada!")

//     } catch (err) {
//         console.log(err)
//         res.sendStatus(500);
//     }

// });

app.listen(5000, () => {console.log("Server running in port: 5000")})