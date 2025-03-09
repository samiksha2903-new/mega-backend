import { Router } from "express";
import { getSearchedVideo } from "../controllers/search.controller";

const router = Router();

router.route("/search").get(getSearchedVideo);

export default router;