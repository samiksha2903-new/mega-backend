import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const userId = req.user?._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(404, "User id is invalid");
  }
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User Not Found");
  }

  const channelStats = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "video_details",
        pipeline: [
          {
            $group: {
              _id: null,
              views: { $sum: "$views" },
            },
          },
          {
            $project: {
              _id: 0,
              views: "$views",
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video_details: {
          $arrayElemAt: ["$video_details", 0],
        },
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers_details",
      },
    },
    {
      $addFields: {
        subscribers_details: {
          $arrayElemAt: { $size: "$subscribers_details" },
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "total_videos",
      },
    },
    {
      $addFields: {
        total_videos: { $size: "$total_videos" },
      },
    },
  ]);

  if (!channelStats) {
    throw new ApiError(500, "Couldn't fetch channel statistics");
  }
 // total likes on the user videos.
  const totalLikes = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video_info"
      }
    },
    {
        $unwind: {
            path: "$video_info",
            preserveNullAndEmptyArrays: true
        }
    }, 
    {
        $match: {
            "video_info.owner": user._id
        }
    },
    {
        $count: "total_likes"
    }
  ]);

  if (!totalLikes) {
    throw new ApiError(500, "Couldn't fetch total Likes");
  }

  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        {channelStats, totalLikes},
        "Channel stats fetched successfully"
    )
  )

});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  // get all the video documents -> video owner -> user._id;

  const userId = req.user?._id;
  const videos = await Video.findById(userId);

  if (!isValidObjectId(userId)) {
    throw new ApiError(404, "User id is invalid");
  }
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User Not Found");
  }

  if(!videos) {
    throw new ApiError(500, "Error while fetching totals videos")
  }

  const getAllVids = await Video.aggregate([
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
            as: "channel_videos",
            pipeline: [
              {
                $project: {
                    username: 1,
                    avatar: 1,
                    fullName: 1
                }
              }
            ]
        }
    },
    {
        $addFields: {
            channel_videos: {
                $arrayElemAt: ["$channel_videos", 0]
            }
        }
    }
  ]);

  if (!getAllVids) {
    throw new ApiError(500, "Error while fetching channel's all videos")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        getAllVids,
        (getAllVids.length === 0) ? "No videos found" : "All videos fetched successfully"
    )
  )

});

export { getChannelStats, getChannelVideos };
