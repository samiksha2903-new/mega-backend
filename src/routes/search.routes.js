import { Router } from "express";
import { getSearchedVideo } from "../controllers/search.controller.js";

const router = Router();

router.route("/search").get(getSearchedVideo);

export default router;