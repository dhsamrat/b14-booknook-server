import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from 'cors';

const app = express();
const port = 5000;

app.use(cors())
app.use(express.json())


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("b14-booknook")
const addCollectio = db.collection("add")


app.post('/add-book', async (req, res) => {
    const data = req.body

    const result = await addCollectio.insertOne(data)

    console.log(result);

    res.send(result)
})


app.get('/all-books', async (req, res) => {

    const result = await addCollectio.find().toArray()
    res.send(result)
})


app.get('/all-books/:id', async (req, res) => {
    const {id} = req.params
    const result = await addCollectio.findOne({_id: new ObjectId(id)})

    res.send(result)
})


app.patch('/all-books/:id', async (req, res) =>{
    const {id} = req.params
    const updatedData = req.body
    const result = await addCollectio.updateOne(
        {_id: new ObjectId(id)},
        {$set:updatedData}
    )
    res.json(result)
})

app.delete('/all-book/:id', async (req, res)=>{
     const {id} = req.params
     const result = await addCollectio.deleteOne(
         {_id: new ObjectId(id)},
     )
     res.json(result)
})





app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});