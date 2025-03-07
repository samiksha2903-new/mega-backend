import { Router } from "express";
import { getSearchedVideo } from "../controllers/search.controller";
import router from "./comment.routes";

const router = Router();

router.route("/search").get(getSearchedVideo);

export default router;