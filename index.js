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


// app.post('/add-book', async (req, res) => {
//     const data = req.body

//     const result = await addCollectio.insertOne(data)

//     console.log(result);

//     res.send(result)
// })



app.post("/add-book", async (req, res) => {
  try {
    const data = req.body;

    if (
      !data.title ||
      !data.author ||
      !data.category ||
      !data.addedBy?.email
    ) {
      return res.status(400).send({
        success: false,
        message: "Required book information is missing.",
      });
    }

    const bookData = {
      ...data,
      addedBy: {
        name: data.addedBy.name || "",
        email: data.addedBy.email.toLowerCase().trim(),
      },
      createdAt: new Date(),
    };

    const result = await addCollectio.insertOne(bookData);

    res.status(201).send({
      success: true,
      message: "Book added successfully!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Add book error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to add book.",
    });
  }
});


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

// app.delete('/all-books/:id', async (req, res)=>{
//      const {id} = req.params
//      const result = await addCollectio.deleteOne(
//          {_id: new ObjectId(id)},
//      )
//      res.json(result)
// })



app.delete("/all-books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid book ID",
      });
    }

    const result = await addCollectio.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Delete book error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to delete book",
    });
  }
});




// ==================================
// BORROW BOOK
// ==================================

app.post("/borrows", async (req, res) => {
  let copiesDecreased = false;
  let bookObjectId;

  try {
    const {
      bookId,
      bookTitle,
      bookImage,
      userName,
      userEmail,
      borrowDate,
      returnDate,
    } = req.body;

    if (
      !bookId ||
      !ObjectId.isValid(bookId) ||
      !bookTitle ||
      !userEmail ||
      !borrowDate ||
      !returnDate
    ) {
      return res.status(400).send({
        success: false,
        message: "Required borrowing information is missing.",
      });
    }

    if (returnDate <= borrowDate) {
      return res.status(400).send({
        success: false,
        message: "Return date must be after borrow date.",
      });
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    bookObjectId = new ObjectId(bookId);

    // Check duplicate active borrowing
    const existingBorrow = await borrowcollection.findOne({
      bookId,
      $or: [
        { userEmail: normalizedEmail },
        { email: normalizedEmail },
      ],
    });

    if (existingBorrow) {
      return res.status(409).send({
        success: false,
        message: "You have already borrowed this book.",
      });
    }

    // Decrease available copies atomically
    const bookUpdate = await addCollectio.updateOne(
      {
        _id: bookObjectId,
        $expr: {
          $gt: [
            {
              $ifNull: ["$availableCopies", "$totalCopies"],
            },
            0,
          ],
        },
      },
      [
        {
          $set: {
            availableCopies: {
              $subtract: [
                {
                  $ifNull: ["$availableCopies", "$totalCopies"],
                },
                1,
              ],
            },
          },
        },
      ]
    );

    if (bookUpdate.matchedCount === 0) {
      const bookExists = await addCollectio.findOne({
        _id: bookObjectId,
      });

      return res.status(bookExists ? 409 : 404).send({
        success: false,
        message: bookExists
          ? "This book is currently unavailable."
          : "Book not found.",
      });
    }

    copiesDecreased = true;

    // Create borrowing record
    const borrowData = {
      bookId,
      bookTitle,
      bookImage: bookImage || "",
      userName: userName || "",
      userEmail: normalizedEmail,
      email: normalizedEmail,
      borrowDate,
      returnDate,
      createdAt: new Date(),
    };

    const result = await borrowcollection.insertOne(borrowData);

    res.status(201).send({
      success: true,
      message: "Book borrowed successfully!",
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.error("Borrow book error:", error);

    // Roll back copies if borrowing record creation fails
    if (copiesDecreased && bookObjectId) {
      await addCollectio.updateOne(
        { _id: bookObjectId },
        { $inc: { availableCopies: 1 } }
      );
    }

    res.status(500).send({
      success: false,
      message: "Failed to borrow book.",
    });
  }
});


// ==================================
// GET MY BORROWS
// ==================================

app.get("/my-borrows/:email", async (req, res) => {
  try {
    const email = req.params.email.trim().toLowerCase();

    const result = await borrowcollection
      .find({
        $or: [
          { userEmail: email },
          { email: email },
        ],
      })
      .toArray();

    res.send(result);

  } catch (error) {
    console.error("Get my borrows error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load borrowed books.",
    });
  }
});


// ==================================
// RETURN BOOK
// ==================================

app.delete("/my-borrows/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid borrow ID.",
      });
    }

    const borrowId = new ObjectId(id);

    // Find borrow record
    const borrowRecord = await borrowcollection.findOne({
      _id: borrowId,
    });

    if (!borrowRecord) {
      return res.status(404).send({
        success: false,
        message: "Borrow record not found.",
      });
    }

    if (!ObjectId.isValid(borrowRecord.bookId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid book ID in borrow record.",
      });
    }

    const bookObjectId = new ObjectId(borrowRecord.bookId);

    // Delete borrow record first
    const deleteResult = await borrowcollection.deleteOne({
      _id: borrowId,
    });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Borrow record not found.",
      });
    }

    // Increase available copies
    const bookUpdate = await addCollectio.updateOne(
      {
        _id: bookObjectId,
        $expr: {
          $lt: [
            {
              $ifNull: ["$availableCopies", 0],
            },
            {
              $ifNull: ["$totalCopies", 0],
            },
          ],
        },
      },
      {
        $inc: {
          availableCopies: 1,
        },
      }
    );

    if (bookUpdate.matchedCount === 0) {
      // Restore borrow record if book could not be updated
      await borrowcollection.insertOne(borrowRecord);

      return res.status(409).send({
        success: false,
        message: "Unable to update book copies. Borrow record restored.",
      });
    }

    res.send({
      success: true,
      message: "Book returned successfully!",
    });

  } catch (error) {
    console.error("Return book error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to return book.",
    });
  }
});


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});