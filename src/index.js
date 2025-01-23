// require("dotenv").config({ path: "./env" })
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";

dotenv.config({
  path: "./env"
});

// once this async gets executed so its return a promise which needs to be handled when called that function.
// asynchronous method jbb bhi complete hota hai so it returns a promise.
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("ERRR in listening - ", error);
      throw error;
    });

    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });

/*
import express from "express"
const app = express()
// used IIFE
;( async () => {
    try {
      await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)  
      app.on("error", (error) => {
        console.log("ERRR: ", error);
        throw error
      })

      app.listen(process.env.PORT, () => {
        console.log(`App is listening on port ${process.env.PORT}`)
      })

    } catch (error) {
        console.error("ERROR: ", error)
        throw error
    }
})()
*/
