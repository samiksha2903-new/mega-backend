import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// reminder -> the output of every stage is the input for the next stage.
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    // need to use aggregation pipelines here, get videos id -> get comments -> id/owner of each comment.
    // check first if the videoId exists in commentDB.
    // if videoID doesn't exists then return response that no comments yet.
    // if videoID exists -> pipelines of comment model
    // match only the video from comment model to the videoId from videomodel
    // get -> user detail who comment
    // by lookup -> common field in user and comment -> user_id
    // return avatar, username
    // lookup for the likes for a particular comment in like model (comment) and comment model(owner)
    // count the likes
    // send the response data -> comments
    // check for errors!
    const {videoId} = req.params;
    const {page = 1, limit = 10} = req.query;

    const comments = await Comment.findById(videoId);

    if (!comments) {
        return res
        .status(204)
        .ApiResponse(
            200, 
            [],
            "No Comments yet."
        )
    }

    let allComments;
    try {
        allComments = await Comment.aggregate([
            {
                $match: {
                   video: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "user_details",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "owner",
                    foreignField: "likedBy",
                    as: "likes",
                    pipeline: [
                        {
                            $match: {
                                comment: { $exists: true }
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    user_details: {
                        $$arrayElemAt: ["$user_details", 0]
                    },
                    likes: {
                        $size: "$likes"
                    }
                }
            },
            {
                $skip: (page - 1) * 10
            },
            {
                $limit: parseInt(limit)
            }
        ]);
    } catch (error) {
        throw new ApiError(500, "Something went wrong while fetching comments")
    }

    if (!allComments) {
       throw new ApiError(404, "No comments on this channel yet") 
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, allComments, "All Comments fetched successfully")
    )
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    // use verifyJWT middleware -> only loggedin user can comment.
    // user can add multiple comments.
    // get videoId using params.
    // get user details req.user.
    // get comment thrgh req.body;
    // check validation that comment is not empty
    // check videoId  exists.
    // create the comment.
    const { videoId } = req.params;
    const { content } = req.body;

    const isVideoValid = await Video.findById(videoId);

    if (!isVideoValid) {
        throw new ApiError(400, "No Video found");
    }

    if (content.length < 1 || content.trim() == "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    const user = req.user?._id;
    if (!user) {
        throw new ApiError(401, "User not found");
    }

    const result = await Comment.create({
       content,
       video: videoId,
       owner: user 
    })

    if (!result) {
        throw new ApiError(500, "Something went wrong while posting comment");
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            result,
            "Comment post successfully"
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    // get commentId -> req.params
    // get content -> req.body
    // validation
    // update the comment
    const { commentId } = req.params;
    const { content } = req.body;

    if (!commentId) {
        throw new ApiError(400, "No comment exist");
    }

    if (content.length < 1 || content.trim() == "") {
        throw new ApiError(400, "Content cannot be empty");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
       commentId,
       {
            $set: {
                content
            }   
       },
       { new: true } 
    )

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            updatedComment,
            "Comment updated successfully"
        )
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "Comment does not exist");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new ApiError(400, "Comment already has been deleted");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Comment deleted successfully"
        )
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }