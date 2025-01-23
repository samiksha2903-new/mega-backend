import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();

// middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit: "16kb"})) // to take json data but setting a limit.
app.use(express.urlencoded({extended: true, limit: "16kb"})) // url encoder that converts the input/request/searchinfo we give into some special character like +, %20 -> for space betwn words.. , Hence needto tell express and making a setup for it.
app.use(express.static("public")); // making a public folder inside our server to store the data like some files, pdf, images or some other assets
app.use(cookieParser());


// routes import 
import userRouter from "./routes/user.routes.js"


// routes declaration
app.use("/api/v1/users", userRouter);


export { app }