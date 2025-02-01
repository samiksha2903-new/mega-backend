import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();

// middlewares
// The cors middleware enables your server to respond to requests from origins other than its own.
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit: "16kb"})) // to take json data but setting a limit.
app.use(express.urlencoded({extended: true, limit: "16kb"})); // url encoder that converts the input/request/searchinfo we give into some special character like +, %20 -> for space betwn words.. , Hence needto tell express and making a setup for it.
app.use(express.static("public")); // making a public folder inside our server to store the data like some files, pdf, images or some other assets
app.use(cookieParser());


// routes import 
import userRouter from "./routes/user.routes.js";
import healthCheckRouter from "./routes/healthCheck.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";


// routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/playlist", playlistRouter);

export { app }