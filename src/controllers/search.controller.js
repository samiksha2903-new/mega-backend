import mongoose from "mongoose";
import { Video } from "../models/video.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const getSearchedVideo = asyncHandler( async (req, res) => {
    // get the query
    // search into the whole video db for the query
    // check for errors if db error occur
    const query = req.query.q;
    if (query === "" || !query) {
        return;
    }

    // gives indexing to the title/description and then search for query into them and sorts as per relevance
    await Video.createIndexes({ title: "text", description: "text"});

    const videos = await Video.find({
       $text: { $search: query}
    }).sort({ score: { $meta: "textScore" }});

    if (!videos) {
        throw new ApiError(500, "Error occur while searching query")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "All videos matched to query fetched successfully"
        )
    )
});