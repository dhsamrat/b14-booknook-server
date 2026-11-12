
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
app.get("/api/health", (req, res) => {
  res.status(200).send({
    success: true,
    message: "BookNook server is running!",
  });
});
const port = process.env.PORT || 5000;

// ==================================
// MIDDLEWARE
// ==================================

app.use(
  cors({
    origin: [
      `${process.env.CLIENT_URL}`,
      //"https://booknook-client-black.vercel.app",
    ],
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

// ==================================
// MONGODB CONNECTION
// ==================================

const client = new MongoClient(process.env.MONGODB_URI);

await client.connect();

console.log("Successfully connected to MongoDB!");

const db = client.db("b14-booknook");

const addCollectio = db.collection("add");
const borrowcollection = db.collection("borrows");

// ==================================
// JWT CONFIGURATION
// ==================================

const BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || `${process.env.CLIENT_URL}`;

const JWKS = createRemoteJWKSet(
  new URL("/api/auth/jwks", BETTER_AUTH_URL)
);

// ==================================
// VERIFY JWT MIDDLEWARE
// ==================================


const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized! Token is missing.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).send({
        success: false,
        message: "Invalid token.",
      });
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: BETTER_AUTH_URL,
      audience: BETTER_AUTH_URL,
    });

    if (!payload.sub || !payload.email) {
      return res.status(401).send({
        success: false,
        message: "Invalid user information in token.",
      });
    }

    req.user = {
      id: payload.sub,
      email: String(payload.email).trim().toLowerCase(),
      name: payload.name || "",
    };

    next();
  } catch (error) {
    console.error("JWT verification error:", error);

    return res.status(401).send({
      success: false,
      message: "Unauthorized! Invalid or expired token.",
    });
  }
};


// ==================================
// CHECK BOOK OWNER
// ==================================

const checkBookOwner = async (bookId, userEmail) => {
  if (!ObjectId.isValid(bookId)) {
    return null;
  }

  return addCollectio.findOne({
    _id: new ObjectId(bookId),
    "addedBy.email": userEmail,
  });
};

// ==================================
// ADD BOOK
// ==================================

app.post("/add-book", verifyToken, async (req, res) => {
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

    const addedByEmail = data.addedBy.email.trim().toLowerCase();

    if (addedByEmail !== req.user.email) {
      return res.status(403).send({
        success: false,
        message: "You cannot add a book using another user's account.",
      });
    }

    const bookData = {
      title: data.title,
      author: data.author,
      category: data.category,
      image: data.image || "",
      description: data.description || "",
      totalCopies: Number(data.totalCopies) || 1,
      availableCopies: Number(data.totalCopies) || 1,
      addedBy: {
        name: req.user.name || data.addedBy.name || "",
        email: req.user.email,
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

// ==================================
// GET ALL BOOKS - PUBLIC
// ==================================

app.get("/all-books", async (req, res) => {
  try {
    const result = await addCollectio
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send(result);
  } catch (error) {
    console.error("Fetch all books error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch books.",
    });
  }
});

// ==================================
// GET LATEST 6 BOOKS - PUBLIC
// ==================================

app.get("/latest-books", async (req, res) => {
  try {
    const result = await addCollectio
      .find()
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.status(200).send(result);
  } catch (error) {
    console.error("Fetch latest books error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch latest books.",
    });
  }
});

// ==================================
// GET SINGLE BOOK - PROTECTED
// ==================================

app.get("/all-books/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid book ID.",
      });
    }

    const result = await addCollectio.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Book not found.",
      });
    }

    res.status(200).send(result);
  } catch (error) {
    console.error("Fetch book details error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch book details.",
    });
  }
});

// ==================================
// UPDATE BOOK - PROTECTED
// ==================================

app.patch("/all-books/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid book ID.",
      });
    }

    const existingBook = await checkBookOwner(id, req.user.email);

    if (!existingBook) {
      return res.status(404).send({
        success: false,
        message: "Book not found or you are not the owner.",
      });
    }

    const {
      title,
      author,
      category,
      image,
      description,
      totalCopies,
      availableCopies,
    } = req.body;

    const updatedData = {};

    if (title !== undefined) updatedData.title = title;
    if (author !== undefined) updatedData.author = author;
    if (category !== undefined) updatedData.category = category;
    if (image !== undefined) updatedData.image = image;
    if (description !== undefined) updatedData.description = description;

    if (totalCopies !== undefined) {
      const newTotal = Number(totalCopies);

      if (!Number.isInteger(newTotal) || newTotal < 1) {
        return res.status(400).send({
          success: false,
          message: "Total copies must be a positive whole number.",
        });
      }

      const oldAvailable = Number(existingBook.availableCopies ?? 0);
      const oldTotal = Number(existingBook.totalCopies ?? 0);
      const borrowedCopies = Math.max(0, oldTotal - oldAvailable);

      if (newTotal < borrowedCopies) {
        return res.status(400).send({
          success: false,
          message: "Total copies cannot be less than currently borrowed copies.",
        });
      }

      updatedData.totalCopies = newTotal;
      updatedData.availableCopies = newTotal - borrowedCopies;
    } else if (availableCopies !== undefined) {
      return res.status(400).send({
        success: false,
        message: "Available copies cannot be updated directly.",
      });
    }

    if (Object.keys(updatedData).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No valid update information provided.",
      });
    }

    const result = await addCollectio.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    res.status(200).send({
      success: true,
      message: "Book updated successfully.",
      result,
    });
  } catch (error) {
    console.error("Update book error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to update book.",
    });
  }
});

// ==================================
// DELETE BOOK - PROTECTED
// ==================================


app.delete("/all-books/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid book ID.",
      });
    }

    const existingBook = await checkBookOwner(id, req.user.email);

    if (!existingBook) {
      return res.status(404).send({
        success: false,
        message: "Book not found or you are not the owner.",
      });
    }

    const activeBorrow = await borrowcollection.findOne({
      bookId: id,
    });

    if (activeBorrow) {
      return res.status(409).send({
        success: false,
        message: "This book cannot be deleted while it is borrowed.",
      });
    }

    await addCollectio.deleteOne({
      _id: new ObjectId(id),
    });

    res.status(200).send({
      success: true,
      message: "Book deleted successfully.",
    });
  } catch (error) {
    console.error("Delete book error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to delete book.",
    });
  }
});


// ==================================
// BORROW BOOK - PROTECTED
// ==================================

app.post("/borrows", verifyToken, async (req, res) => {
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

    const normalizedEmail = userEmail.trim().toLowerCase();

    if (normalizedEmail !== req.user.email) {
      return res.status(403).send({
        success: false,
        message: "You cannot borrow using another user's account.",
      });
    }

    if (returnDate <= borrowDate) {
      return res.status(400).send({
        success: false,
        message: "Return date must be after borrow date.",
      });
    }

    bookObjectId = new ObjectId(bookId);

    const existingBorrow = await borrowcollection.findOne({
      bookId,
      userEmail: req.user.email,
    });

    if (existingBorrow) {
      return res.status(409).send({
        success: false,
        message: "You have already borrowed this book.",
      });
    }

    const bookUpdate = await addCollectio.updateOne(
      {
        _id: bookObjectId,
        $expr: {
          $gt: [
            { $ifNull: ["$availableCopies", "$totalCopies"] },
            0,
          ],
        },
      },
      [
        {
          $set: {
            availableCopies: {
              $subtract: [
                { $ifNull: ["$availableCopies", "$totalCopies"] },
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

    const borrowData = {
      bookId,
      bookTitle,
      bookImage: bookImage || "",
      userName: req.user.name || userName || "",
      userEmail: req.user.email,
      email: req.user.email,
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
// GET MY BORROWS - PROTECTED
// ==================================

app.get("/my-borrows/:email", verifyToken, async (req, res) => {
  try {
    const requestedEmail = req.params.email.trim().toLowerCase();

    if (requestedEmail !== req.user.email) {
      return res.status(403).send({
        success: false,
        message: "You cannot access another user's borrow records.",
      });
    }

    const result = await borrowcollection
      .find({
        userEmail: req.user.email,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send(result);
  } catch (error) {
    console.error("Get my borrows error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load borrowed books.",
    });
  }
});

// ==================================
// RETURN BOOK - PROTECTED
// ==================================

app.delete("/my-borrows/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid borrow ID.",
      });
    }

    const borrowId = new ObjectId(id);

    const borrowRecord = await borrowcollection.findOne({
      _id: borrowId,
      userEmail: req.user.email,
    });

    if (!borrowRecord) {
      return res.status(404).send({
        success: false,
        message: "Borrow record not found or you are not the owner.",
      });
    }

    if (!ObjectId.isValid(borrowRecord.bookId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid book ID in borrow record.",
      });
    }

    const bookObjectId = new ObjectId(borrowRecord.bookId);

    const book = await addCollectio.findOne({
  _id: bookObjectId,
});

    const bookUpdate = await addCollectio.updateOne(
      {
        _id: bookObjectId,
        $expr: {
          $lt: [
            { $ifNull: ["$availableCopies", 0] },
            { $ifNull: ["$totalCopies", 0] },
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
      return res.status(409).send({
        success: false,
        message: "Unable to update available book copies.",
      });
    }

    const deleteResult = await borrowcollection.deleteOne({
      _id: borrowId,
      userEmail: req.user.email,
    });

    if (deleteResult.deletedCount === 0) {
      await addCollectio.updateOne(
        { _id: bookObjectId },
        { $inc: { availableCopies: -1 } }
      );

      return res.status(409).send({
        success: false,
        message: "Borrow record could not be returned. Please try again.",
      });
    }

    res.status(200).send({
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

// ==================================
// HOME ROUTE
// ==================================

app.get("/", (req, res) => {
  res.send("BookNook API is running!");
});

// ==================================
// START SERVER
// ==================================

app.listen(port, () => {
  console.log(`BookNook server listening on port ${port}`);
});