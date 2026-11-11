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
const borrowcollection = db.collection("borrows")


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


app.post('/borrows', async (req, res)=>{
     const data = req.body
     const result = await borrowcollection.insertOne(data)
     res.send(result)
})

app.get('/my-borrows/:email', async (req, res)=>{
     const {email} = req.params
     const result = await borrowcollection.find({email:email}).toArray()
     res.send(result)

})

app.delete("/my-borrows/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid borrow ID",
      });
    }

    const result = await borrowcollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Borrow record not found",
      });
    }

    res.send({
      message: "Book returned successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to return book",
    });
  }
});


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});