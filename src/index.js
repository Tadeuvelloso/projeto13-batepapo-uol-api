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
const time = Date.now();
const horario = now.format("HH:mm:ss");

try {
    await mongoClient.connect();
    db = mongoClient.db("uol");
    messages = db.collection("messages");
    participants = db.collection("participants");
} catch (err) {
    console.log(err);
};


app.post("/participants", async (req, res) => {
    const participante = req.body;

    const validation = participantsSchema.validate(participante);

    if (validation.error) {
        console.log(validation.error.details);
        res.status(422).send("Me envie um nome!");
        return
    }

    const participantCadastrado = await participants.findOne({ name: participante.name });

    if (participantCadastrado) {
        res.status(409).send("Usuário ja cadastrado!");
        return
    }

    try {
        await participants.insertOne({ name: participante.name, lastStatus: Date.now() });
        res.sendStatus(201);
    } catch (err) {
        res.sendStatus(500);
    }

});

app.get("/participants", async (req, res) => {
    try {
        const allparticipants = await participants.find().toArray();
        res.status(201).send(allparticipants);
    } catch (err) {
        res.sendStatus(500);
    };
});

app.post("/messages", async (req, res) => {
    const message = req.body;
    const { user } = req.headers;


    const validation = messageSchema.validate(message);
    if (validation.error) {
        res.sendStatus(422);
        return
    }

    const usurarioOnline = await participants.findOne({ name: user })

    if (!usurarioOnline) {
        res.sendStatus(404);
        return
    }

    try {
        await messages.insertOne(
            {
                from: user,
                to: message.to,
                text: message.text,
                type: message.type,
                time: horario
            });
        res.sendStatus(201);
        return
    } catch (err) {
        res.sendStatus(500);
        return
    }
});

app.get("/messages", async (req, res) => {
    const { user } = req.headers;
    const { limit } = req.query;

    const verificadorUser = await participants.findOne({ name: user });

    if (!verificadorUser) {
        res.status(404).send("Me envie um usuário valido pelo headers!");
    }

    try {
        const allMessages = await messages.find().toArray();

        const filtredMessages = allMessages.filter((m) => m.to === user || m.to === "Todos");

        if (limit) {
            const lastMessages = filtredMessages.slice(-(limit))
            res.status(201).send(lastMessages);
            return
        }
        res.status(201).send(filtredMessages);
        return
    } catch (err) {
        res.sendStatus(500);
        return
    };

});

app.post("/status", async (req, res) => {
    const { user } = req.headers;


    console.log(time)

    const verificaParticipante = participants.findOne({ name: user });

    if (!verificaParticipante) {
        res.sendStatus(404);
        return
    }

    try {
        const resp = await participants.updateOne({ name: user }, { $set: { name: user, lastStatus: Date.now() } });
        res.sendStatus(200)
        console.log("atualizado")
        return
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
        return
    }
});

setInterval(async () => {

    const allParticipants = await participants.find().toArray();

    const usersExpirado = allParticipants.filter((p) => Number(time) - Number(p.lastStatus) > 10)


    for (let i = 0; i < usersExpirado.length; i++) {

        const participanteExpirado = usersExpirado[i];

        try {

            await messages.insertOne({ from: participanteExpirado.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: horario });
            await participants.deleteOne({ name: participanteExpirado.name });

        } catch (err) {
            console.log(err)
        }
    }
}, 15000)

app.delete("/messages/:id", async (req, res) => {
    const { user } = req.headers;
    const { id } = req.params;

    const verificaParticipante = await participants.findOne({ name: user });
    const verificaMessage = await messages.findOne({ _id: ObjectId(id) });

    if (!verificaMessage) {
        res.sendStatus(404);
        return
    }

    if (!verificaParticipante) {
        res.sendStatus(404);
        return
    }

    if (verificaMessage.name !== user) {
        res.sendStatus(401);
        return
    }

    try {
        await db.messages.deleteOne({ _id: ObjectId(id) });
        res.send("Mensagem apagada com sucesso!")
        return
    } catch (err) {
        res.sendStatus(404)
        return
    }
})

app.put("/messages/:id", async (req, res) => {
    const { user } = req.headers
    const { id } = req.params
    const message = req.body

    const messageFinded = await messages.findOne({ _id: ObjectId(id) });

    if (!messageFinded) {
        res.status(404).send("Mensagem não encontrada!");
        return
    }

    const validation = messageSchema.validate(message);
    if (validation.error) {
        res.sendStatus(422);
        return
    }

    if(user !== messageFinded.from){
        res.sendStatus(401);
        return
    }

    try {
        await messages.updateOne({ _id: new ObjectId(id) }, {
            $set: {
                from: user,
                to: message.to,
                text: message.text,
                type: message.type,
                time: horario
            }
        });
        res.status(201).send("Mensagem atualizada!")
        return

    } catch (err) {
        console.log(err)
        res.sendStatus(500);
    }

});

app.listen(5000, () => { console.log("Server running in port: 5000") })