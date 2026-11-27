require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { GoogleGenAI } = require("@google/genai");

const {
  initializeApp,
  cert
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");


const app = express();

const PORT =
  Number(process.env.PORT) || 3000;


// =========================================================
// GEMINI AI
// =========================================================

const ai =
  new GoogleGenAI({
    apiKey:
      process.env.GEMINI_API_KEY
  });


// =========================================================
// MIDDLEWARE
// =========================================================

app.use(cors());

app.use(
  express.json({
    limit: "1mb"
  })
);


// =========================================================
// FIREBASE CONFIGURATION
// =========================================================

let serviceAccount;


if (
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON
) {

  // Render / Hosted Environment

  serviceAccount =
    JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

} else {

  // Local Development

  const credentialsPath =
    path.resolve(
      __dirname,
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        "./serviceAccountKey.json"
    );


  if (
    !fs.existsSync(
      credentialsPath
    )
  ) {

    console.error(
      "Firebase service account file not found:"
    );

    console.error(
      credentialsPath
    );

    process.exit(1);

  }


  serviceAccount =
    JSON.parse(
      fs.readFileSync(
        credentialsPath,
        "utf8"
      )
    );

}


initializeApp({
  credential:
    cert(serviceAccount),

  projectId:
    serviceAccount.project_id
});


const db =
  getFirestore();


const productsCollection =
  db.collection("products");


const transactionsCollection =
  db.collection("transactions");


const usersCollection =
  db.collection("users");


const sessionsCollection =
  db.collection("sessions");


// =========================================================
// HEALTH CHECK
// =========================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      success: true,

      message:
        "MiniInventory API is running",

      database:
        "Firestore configured"
    });

  }
);


// =========================================================
// AUTHENTICATION
// =========================================================


// =========================================================
// REGISTER
// =========================================================

app.post(
  "/api/auth/register",
  async (req, res) => {

    try {

      const {
        name,
        email,
        password
      } = req.body;


      // -----------------------------------------
      // VALIDATE NAME
      // -----------------------------------------

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {

        return res.status(400).json({
          success: false,

          message:
            "Name is required."
        });

      }


      // -----------------------------------------
      // VALIDATE EMAIL
      // -----------------------------------------

      if (
        typeof email !== "string" ||
        !email.trim()
      ) {

        return res.status(400).json({
          success: false,

          message:
            "Email is required."
        });

      }


      // -----------------------------------------
      // VALIDATE PASSWORD
      // -----------------------------------------

      if (
        typeof password !== "string" ||
        password.length < 6
      ) {

        return res.status(400).json({
          success: false,

          message:
            "Password must be at least 6 characters."
        });

      }


      const cleanName =
        name.trim();


      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      // -----------------------------------------
      // CHECK EXISTING ACCOUNT
      // -----------------------------------------

      const existingSnapshot =
        await usersCollection
          .where(
            "email",
            "==",
            cleanEmail
          )
          .limit(1)
          .get();


      if (
        !existingSnapshot.empty
      ) {

        return res.status(409).json({
          success: false,

          message:
            "An account with this email already exists."
        });

      }


      // -----------------------------------------
      // HASH PASSWORD
      // -----------------------------------------

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      // -----------------------------------------
      // CREATE USER
      // -----------------------------------------

      const userData = {

        name:
          cleanName,

        email:
          cleanEmail,

        passwordHash,

        role:
          "Inventory Manager",

        createdAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp()

      };


      const userRef =
        await usersCollection.add(
          userData
        );


      // -----------------------------------------
      // RESPONSE
      // -----------------------------------------

      res.status(201).json({

        success: true,

        message:
          "Account created successfully.",

        user: {

          id:
            userRef.id,

          name:
            cleanName,

          email:
            cleanEmail,

          role:
            "Inventory Manager"

        }

      });


    } catch (error) {

      console.error(
        "REGISTER error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to create account."

      });

    }

  }
);


// =========================================================
// LOGIN
// =========================================================

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;


      // -----------------------------------------
      // VALIDATE EMAIL
      // -----------------------------------------

      if (
        typeof email !== "string" ||
        !email.trim()
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Email is required."

        });

      }


      // -----------------------------------------
      // VALIDATE PASSWORD
      // -----------------------------------------

      if (
        typeof password !== "string" ||
        !password
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Password is required."

        });

      }


      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      // -----------------------------------------
      // FIND USER
      // -----------------------------------------

      const snapshot =
        await usersCollection
          .where(
            "email",
            "==",
            cleanEmail
          )
          .limit(1)
          .get();


      if (
        snapshot.empty
      ) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid email or password."

        });

      }


      const userDoc =
        snapshot.docs[0];


      const user =
        userDoc.data();


      // -----------------------------------------
      // CHECK PASSWORD
      // -----------------------------------------

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.passwordHash
        );


      if (!passwordMatch) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid email or password."

        });

      }


      // -----------------------------------------
      // CREATE LOGIN TOKEN
      // -----------------------------------------

      const token =
        crypto
          .randomBytes(32)
          .toString("hex");


      // -----------------------------------------
      // SAVE SESSION
      // -----------------------------------------

      await sessionsCollection
        .doc(token)
        .set({

          userId:
            userDoc.id,

          createdAt:
            FieldValue.serverTimestamp()

        });


      // -----------------------------------------
      // RESPONSE
      // -----------------------------------------

      res.json({

        success: true,

        message:
          "Login successful.",

        token,

        user: {

          id:
            userDoc.id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role ||
            "Inventory Manager"

        }

      });


    } catch (error) {

      console.error(
        "LOGIN error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to login."

      });

    }

  }
);


// =========================================================
// CHANGE PASSWORD
// =========================================================

app.post(
  "/api/auth/change-password",
  async (req, res) => {

    try {

      // -----------------------------------------
      // GET TOKEN
      // -----------------------------------------

      const authHeader =
        req.headers.authorization || "";


      const token =
        authHeader.startsWith("Bearer ")
          ? authHeader.substring(7)
          : "";


      if (!token) {

        return res.status(401).json({

          success: false,

          message:
            "You are not logged in."

        });

      }


      // -----------------------------------------
      // FIND ACTIVE SESSION
      // -----------------------------------------

      const sessionDoc =
        await sessionsCollection
          .doc(token)
          .get();


      if (!sessionDoc.exists) {

        return res.status(401).json({

          success: false,

          message:
            "Your session has expired. Please log in again."

        });

      }


      const sessionData =
        sessionDoc.data();


      const userId =
        sessionData.userId ||
        sessionData.uid;


      if (!userId) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid session."

        });

      }


      // -----------------------------------------
      // GET PASSWORDS
      // -----------------------------------------

      const {
        currentPassword,
        newPassword
      } = req.body;


      if (
        !currentPassword ||
        !newPassword
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Please enter your current and new password."

        });

      }


      // -----------------------------------------
      // VALIDATE NEW PASSWORD
      // -----------------------------------------

      if (
        typeof newPassword !== "string" ||
        newPassword.length < 6
      ) {

        return res.status(400).json({

          success: false,

          message:
            "New password must be at least 6 characters."

        });

      }


      // -----------------------------------------
      // GET USER
      // -----------------------------------------

      const userDoc =
        await usersCollection
          .doc(userId)
          .get();


      if (!userDoc.exists) {

        return res.status(404).json({

          success: false,

          message:
            "User account not found."

        });

      }


      const user =
        userDoc.data();


      // -----------------------------------------
      // CHECK CURRENT PASSWORD
      // -----------------------------------------

      const passwordCorrect =
        await bcrypt.compare(
          currentPassword,
          user.passwordHash
        );


      if (!passwordCorrect) {

        return res.status(400).json({

          success: false,

          message:
            "Current password is incorrect."

        });

      }


      // -----------------------------------------
      // HASH NEW PASSWORD
      // -----------------------------------------

      const newPasswordHash =
        await bcrypt.hash(
          newPassword,
          10
        );


      // -----------------------------------------
      // UPDATE PASSWORD
      // -----------------------------------------

      await usersCollection
        .doc(userId)
        .update({

          passwordHash:
            newPasswordHash,

          updatedAt:
            FieldValue.serverTimestamp()

        });


      // -----------------------------------------
      // RESPONSE
      // -----------------------------------------

      return res.json({

        success: true,

        message:
          "Password changed successfully."

      });


    } catch (error) {

      console.error(
        "Change password error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to change password."

      });

    }

  }
);


// =========================================================
// LOGOUT
// =========================================================

app.post(
  "/api/auth/logout",
  async (req, res) => {

    try {

      // -----------------------------------------
      // GET TOKEN
      // -----------------------------------------

      const authHeader =
        req.headers.authorization || "";


      const token =
        authHeader.startsWith("Bearer ")
          ? authHeader.substring(7)
          : "";


      if (!token) {

        return res.status(400).json({

          success: false,

          message:
            "No active session found."

        });

      }


      // -----------------------------------------
      // DELETE SESSION
      // -----------------------------------------

      await sessionsCollection
        .doc(token)
        .delete();


      // -----------------------------------------
      // RESPONSE
      // -----------------------------------------

      return res.json({

        success: true,

        message:
          "Logged out successfully."

      });


    } catch (error) {

      console.error(
        "Logout error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to log out."

      });

    }

  }
);


// =========================================================
// PRODUCT VALIDATION
// =========================================================

function validateProduct(body) {

  const name =
    body.name;

  const category =
    body.category;

  const price =
    body.price;

  const quantity =
    body.quantity;

  const minimum =
    body.minimum;


  if (
    typeof name !== "string" ||
    !name.trim()
  ) {

    return "Product name is required.";

  }


  if (
    typeof category !== "string" ||
    !category.trim()
  ) {

    return "Product category is required.";

  }


  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0
  ) {

    return "Price must be a non-negative number.";

  }


  if (
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {

    return "Quantity must be a non-negative whole number.";

  }


  if (
    !Number.isInteger(minimum) ||
    minimum < 0
  ) {

    return "Minimum stock must be a non-negative whole number.";

  }


  return null;

}


// =========================================================
// GET ALL PRODUCTS
// =========================================================

app.get(
  "/api/products",
  async (req, res) => {

    try {

      const snapshot =
        await productsCollection.get();


      const products =
        snapshot.docs.map(
          doc => ({

            id:
              doc.id,

            ...doc.data()

          })
        );


      products.sort(
        (a, b) => {

          const aTime =
            a.createdAt?.seconds
              ? Number(
                  a.createdAt.seconds
                )
              : 0;


          const bTime =
            b.createdAt?.seconds
              ? Number(
                  b.createdAt.seconds
                )
              : 0;


          return bTime - aTime;

        }
      );


      res.json({

        success: true,

        count:
          products.length,

        products

      });


    } catch (error) {

      console.error(
        "GET products error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to retrieve products."

      });

    }

  }
);


// =========================================================
// GET ONE PRODUCT
// =========================================================

app.get(
  "/api/products/:id",
  async (req, res) => {

    try {

      const doc =
        await productsCollection
          .doc(req.params.id)
          .get();


      if (!doc.exists) {

        return res.status(404).json({

          success: false,

          message:
            "Product not found."

        });

      }


      res.json({

        success: true,

        product: {

          id:
            doc.id,

          ...doc.data()

        }

      });


    } catch (error) {

      console.error(
        "GET product error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to retrieve product."

      });

    }

  }
);


// =========================================================
// CREATE PRODUCT
// =========================================================

app.post(
  "/api/products",
  async (req, res) => {

    const validationError =
      validateProduct(
        req.body
      );


    if (validationError) {

      return res.status(400).json({

        success: false,

        message:
          validationError

      });

    }


    try {

      const quantity =
        Number(
          req.body.quantity
        );


      const product = {

        name:
          req.body.name.trim(),

        category:
          req.body.category.trim(),

        price:
          Number(
            req.body.price
          ),

        quantity:
          quantity,

        minimum:
          Number(
            req.body.minimum
          ),

        createdAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp()

      };


      const doc =
        await productsCollection.add(
          product
        );


      const savedDoc =
        await doc.get();


      // -----------------------------------------
      // RECORD INITIAL STOCK
      // -----------------------------------------

      if (
        quantity > 0
      ) {

        await transactionsCollection.add({

          productId:
            doc.id,

          productName:
            req.body.name.trim(),

          type:
            "Stock In",

          quantity:
            quantity,

          previousStock:
            0,

          newStock:
            quantity,

          remarks:
            "Initial stock",

          createdAt:
            FieldValue.serverTimestamp()

        });

      }


      res.status(201).json({

        success: true,

        message:
          "Product created successfully.",

        product: {

          id:
            doc.id,

          ...savedDoc.data()

        }

      });


    } catch (error) {

      console.error(
        "CREATE product error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to create product."

      });

    }

  }
);


// =========================================================
// UPDATE PRODUCT
// =========================================================

app.put(
  "/api/products/:id",
  async (req, res) => {

    const validationError =
      validateProduct(
        req.body
      );


    if (validationError) {

      return res.status(400).json({

        success: false,

        message:
          validationError

      });

    }


    try {

      const productRef =
        productsCollection
          .doc(req.params.id);


      const existing =
        await productRef.get();


      if (!existing.exists) {

        return res.status(404).json({

          success: false,

          message:
            "Product not found."

        });

      }


      const oldProduct =
        existing.data();


      const oldQuantity =
        Number(
          oldProduct.quantity || 0
        );


      const newQuantity =
        Number(
          req.body.quantity
        );


      const difference =
        newQuantity -
        oldQuantity;


      // -----------------------------------------
      // UPDATE PRODUCT
      // -----------------------------------------

      await productRef.update({

        name:
          req.body.name.trim(),

        category:
          req.body.category.trim(),

        price:
          Number(
            req.body.price
          ),

        quantity:
          newQuantity,

        minimum:
          Number(
            req.body.minimum
          ),

        updatedAt:
          FieldValue.serverTimestamp()

      });


      // -----------------------------------------
      // RECORD STOCK CHANGE
      // -----------------------------------------

      if (
        difference !== 0
      ) {

        await transactionsCollection.add({

          productId:
            productRef.id,

          productName:
            req.body.name.trim(),

          type:
            difference > 0
              ? "Stock In"
              : "Stock Out",

          quantity:
            Math.abs(
              difference
            ),

          previousStock:
            oldQuantity,

          newStock:
            newQuantity,

          remarks:
            difference > 0
              ? "Stock increased"
              : "Stock decreased",

          createdAt:
            FieldValue.serverTimestamp()

        });

      }


      const updated =
        await productRef.get();


      res.json({

        success: true,

        message:
          "Product updated successfully.",

        product: {

          id:
            updated.id,

          ...updated.data()

        }

      });


    } catch (error) {

      console.error(
        "UPDATE product error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to update product."

      });

    }

  }
);


// =========================================================
// DELETE PRODUCT
// =========================================================

app.delete(
  "/api/products/:id",
  async (req, res) => {

    try {

      const productRef =
        productsCollection
          .doc(req.params.id);


      const existing =
        await productRef.get();


      if (!existing.exists) {

        return res.status(404).json({

          success: false,

          message:
            "Product not found."

        });

      }


      await productRef.delete();


      res.json({

        success: true,

        message:
          "Product deleted successfully."

      });


    } catch (error) {

      console.error(
        "DELETE product error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to delete product."

      });

    }

  }
);


// =========================================================
// GET ALL TRANSACTIONS
// =========================================================

app.get(
  "/api/transactions",
  async (req, res) => {

    try {

      const snapshot =
        await transactionsCollection.get();


      const transactions =
        snapshot.docs.map(
          doc => ({

            id:
              doc.id,

            ...doc.data()

          })
        );


      transactions.sort(
        (a, b) => {

          const aTime =
            a.createdAt?.seconds
              ? Number(
                  a.createdAt.seconds
                )
              : 0;


          const bTime =
            b.createdAt?.seconds
              ? Number(
                  b.createdAt.seconds
                )
              : 0;


          return bTime - aTime;

        }
      );


      res.json({

        success: true,

        count:
          transactions.length,

        transactions

      });


    } catch (error) {

      console.error(
        "GET transactions error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to retrieve transactions."

      });

    }

  }
);


// =========================================================
// GET ONE TRANSACTION
// =========================================================

app.get(
  "/api/transactions/:id",
  async (req, res) => {

    try {

      const doc =
        await transactionsCollection
          .doc(req.params.id)
          .get();


      if (!doc.exists) {

        return res.status(404).json({

          success: false,

          message:
            "Transaction not found."

        });

      }


      res.json({

        success: true,

        transaction: {

          id:
            doc.id,

          ...doc.data()

        }

      });


    } catch (error) {

      console.error(
        "GET transaction error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to retrieve transaction."

      });

    }

  }
);


// =========================================================
// AI ASSISTANT
// =========================================================

app.post(
  "/api/ai/chat",
  async (req, res) => {

    try {

      const message =
        req.body.message;


      if (
        typeof message !== "string" ||
        !message.trim()
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Message is required."

        });

      }


      // -----------------------------------------
      // GET CURRENT INVENTORY
      // -----------------------------------------

      const snapshot =
        await productsCollection.get();


      const products =
        snapshot.docs.map(
          doc => ({

            id:
              doc.id,

            ...doc.data()

          })
        );


      const inventoryData =
        products.map(
          product => ({

            name:
              product.name,

            category:
              product.category,

            price:
              product.price,

            quantity:
              product.quantity,

            minimum:
              product.minimum

          })
        );


      // -----------------------------------------
      // AI PROMPT
      // -----------------------------------------

      const prompt = `
You are the MiniInventory Assistant.

You help users understand their inventory.

CURRENT INVENTORY:

${JSON.stringify(
  inventoryData,
  null,
  2
)}

RULES:

- Answer based only on the inventory data provided.
- Do not invent products.
- Do not invent prices.
- Do not invent quantities.
- Do not invent categories.
- If information is unavailable, clearly say so.
- A product is low in stock when quantity is less than or equal to minimum stock.
- Use Philippine peso (₱) for prices.
- Keep responses clear, concise, and helpful.
- You may answer general questions unrelated to inventory.

USER QUESTION:

${message.trim()}
`;


      let response =
        null;


      let lastError =
        null;


      // -----------------------------------------
      // GEMINI RETRIES
      // -----------------------------------------

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {

        try {

          console.log(
            `Gemini request attempt ${attempt}/3...`
          );


          response =
            await ai.models.generateContent({

              model:
                "gemini-3.8-flash",

              contents:
                prompt

            });


          console.log(
            "Gemini response received."
          );


          break;


        } catch (error) {

          lastError =
            error;


          console.error(
            `Gemini attempt ${attempt} failed:`,
            error.message
          );


          if (
            error.status !== 429 &&
            error.status !== 503
          ) {

            break;

          }


          if (
            attempt < 3
          ) {

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  2000
                )
            );

          }

        }

      }


      // -----------------------------------------
      // AI FAILED
      // -----------------------------------------

      if (!response) {

        console.error(
          "Gemini failed:",
          lastError?.message
        );


        return res.status(503).json({

          success: false,

          message:
            "The AI Assistant is temporarily unavailable. Please try again later."

        });

      }


      // -----------------------------------------
      // AI RESPONSE
      // -----------------------------------------

      res.json({

        success: true,

        reply:
          response.text

      });


    } catch (error) {

      console.error(
        "AI chat error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to process your request."

      });

    }

  }
);


// =========================================================
// ERROR HANDLER
// =========================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "Unexpected API error:",
      error
    );


    if (
      error instanceof SyntaxError &&
      error.body !== undefined
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid JSON request body."

      });

    }


    res.status(500).json({

      success: false,

      message:
        "Internal server error."

    });

  }
);


// =========================================================
// START SERVER
// =========================================================

app.listen(
  PORT,
  () => {

    console.log(
      `MiniInventory API running at http://localhost:${PORT}`
    );


    console.log(
      `Health check: http://localhost:${PORT}/api/health`
    );

  }
);