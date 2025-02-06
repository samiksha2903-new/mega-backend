import mongoose, {isValidObjectId} from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    // check if already subscribed.
    // if done subs -> unsubscribed else subs
    const {channelId} = req.params;
    const user = req.user?._id;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "invalid ChannelID");
    }

    const channel = await Subscription.findOne({ channel: channelId, subscriber: user});

    if (channel) {
        await Subscription.findByIdAndDelete(channel._id);
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "UnSubscribed Successfully!"
            )
        )
    } else {
        const subscribeTo = await Subscription.create(
            {
                subscriber: user,
                channel: channelId
            }
        );

        if (!subscribeTo) {
            throw new ApiError(400, "Could not subscribe")
        }

        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                subscribeTo,
                "Subscribed successfully"
            )
        )
    }

});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // validity of channelid
    // use aggregation pipeline to match channelId
    // find all subscriber for a channelId, find document that contains channelid
    const {channelId} = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid ChannelID")
    }

    const channel = await Subscription.findOne({ channel: channelId});

    if (!channel) {
        throw new ApiError(404, "Channel does not exist");
    }

    const getSubscribers = await Subscription.aggregate([
        {
            $match: {
                $and: [
                    {channel: new mongoose.Types.ObjectId(channel._id)},
                    {channel: {$exists: true}}
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber_details"
            }
        },
        {
            $addFields: {
                subscriber_details: {
                    $first: "$subscriber_details"
                },
                subscribersCount: {
                    $size: "$subscriber_details"
                }
            }
        }
    ]);

    if (!getSubscribers) {
        throw new ApiError(404, "Error while fetching Subscribers")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            getSubscribers,
            getSubscribers.length === 0 ? "No Subscribers" : "Subscribers fetched successfully"
        )
    )
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // basicallly we need to find the documents that matches our requirements.
    // find the channels using subscriberId
    // pipeline to match the documents that contains our subscriber id.
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(404, "Invalid Subscriber ID");
    }

    const subscribedTo = await Subscription.findOne({ subscriber: subscriberId });

    if (!subscribedTo) {
        throw new ApiError(404, "Subscribed channels Not found")
    }

    const getChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscribedTo._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribed_details",
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
                subscribed_details: {
                    $first: "$subscribed_details"
                },
                subscribedToCount: {
                    $size: "$subscribed_details"
                }
            }
        }

    ])

    if (!getChannels) {
        throw new ApiError(404, "Error while fetching Subscribed Channels")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            getChannels,
            getChannels.length === 0 ? "No channels Subscribed" : "Subscribed channels fetched successfully"
        )
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}