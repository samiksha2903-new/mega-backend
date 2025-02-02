import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on video
    // get user id.
    // video exist or not
    // check user has already like or not
    // if not -> create video like document.
    // if yes -> remove the like from like model
    const {videoId} = req.params
    const userId = req.user?._id;

    const isVideoValid = await Video.findById(videoId);
    if (!isVideoValid) {
      throw new ApiError(400, "Video doesn't exist");
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

    if (!existingLike) {
      const newLike = await Like.create({ video: videoId, likedBy: userId });
      return res
        .status(201)
        .json(new ApiResponse(201, newLike, "Liked successfully"));
    } else {
        await Like.findByIdAndDelete(existingLike._id);
        return res
         .status(200)
         .json(new ApiResponse(200, {}, "Unliked successfully"));
    }

});

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on comment
    // get commentId thrgh params
    // get userId
    // check like on comment exists or not.
    // exists -> remove
    // not -> like.
    const {commentId} = req.params;
    const userId = req.user?._id;

    const isCommentExist = await Comment.findById(commentId);
    if (!isCommentExist) {
        throw new ApiError(400, "Comment doesn't exist");
    }

    const existingLike = await Like.findOne({comment: commentId, likedBy: userId});
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Comment dislike successfully"
            )
        )
    } else {
        const like = await Like.create({ comment: commentId, likedBy: userId });
        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                like,
                "Comment like successfully"
            )
        )
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on tweet
    const {tweetId} = req.params;
    const userId = req.user?._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet does not exist");
    }

    const existingLike = await Like.findOne({tweet: tweetId, likedBy: userId});
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Tweet dislike successfully"
            )
        )
    } else {
        const newLike = await Like.create({ tweet: tweetId, likedBy: userId });
        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                newLike,
                "Tweet like successfully"
            )
        )
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.aggregate([
        {
            $match: {
                $and: [
                    {likedBy: new mongoose.Types.ObjectId(req.user._id)},
                    { video: {$exists: true}} // more precisely we want only videos. hence need to specify.
                ]
            }
        },
        {
            //  video: {
            //  type: Schema.Types.ObjectId,
            //  ref: "Video"  }
            // these kind of object in models only give ID so to get the further details we need to further lookup
            // loField: gives videoid from like model, // foField: gives _id of video from video model , hence both are common and matched. but to get the owner details , as it will only give ID of owner hence, need to further lookup
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                       $lookup: {
                          from: "users",
                          localField: "owner",
                          foreignField:  "_id",
                          as: "owner_details",
                          pipeline: [
                            {
                                $project: {
                                    avatar: 1,
                                    username: 1,
                                    fullName: 1
                                }
                            }
                          ]
                       } 
                    },
                    {
                        $addFields: {
                            owner_details: {
                                $arrayElemAt: ["$owner_details", 0]
                            }
                        }
                    }

                ]
            }
        },
        {
            $addFields: {
                likedVideos: {
                    $arrayElemAt: ["$likedVideos", 0]
                }
            }
        }
    ]);

    if (!likedVideos) {
        throw new ApiError(400, "Error occur while fetching liked videos")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            likedVideos,
            likedVideos.length === 0 ? "No Liked Videos by user" : "Liked Videos by user fetched successfully"
        )
    )
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}