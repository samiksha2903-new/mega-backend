import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    // a user can do many/multiple tweets
    const { content } = req.body;
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "User is invalid");
    }

    if (content.length < 1 || content.trim() == "") {
        throw new ApiError(411, "Tweet can't be empty");
    }

    const tweet = await Tweet.create({
        content,
        owner: userId
    });

    if (!tweet) {
        throw new ApiError(500, "Error while posting Your Tweet");
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            tweet,
            "Tweet created successfully"
        )
    )

});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    // get userId thrgh params
    // do checks for valid/not
    // pipelines to match the userid with the documents

    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "UserId is not in valid format")
    }

    const user = await User.findById(userId);

    if (!user) {
       throw new ApiError(500, "User not found"); 
    }

    const getTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner_details",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
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
    ]);

    if (!getTweets) {
        throw new ApiError(500, "Could not fetched tweets");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            getTweets,
            "Tweets fetched successfully"
        )
    )
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const tweetId = req.params;
    const { content } = req.body;
    if (!tweetId) {
        throw new ApiError(tweetId);
    }

    if (content.length < 1 || content.trim() == "") {
        throw new ApiError(411, "Tweet can't be empty");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(500, "Tweet is Invalid")
    }

    const updatingTweet = await Tweet.findByIdAndUpdate(
        tweet._id,
        {
            $set: {
                content,
            }
        },
        { new: true }
    );

    if (!updatingTweet) {
        throw new ApiError(500, "Unable to update tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatingTweet,
            "Tweet updated successfully"
        )
    )
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const tweetId = req.params;
    if (!tweetId) {
        throw new ApiError(tweetId);
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(500, "Tweet Not Found");
    }

    const tweetToDelete = await Tweet.findByIdAndDelete(tweet._id);
    if (!tweetToDelete) {
        throw new ApiError(500, "Error while deleting tweet");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Tweet Deleted Successfully"
        )
    )
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
