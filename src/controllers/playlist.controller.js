import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"
import { User } from "../models/user.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    // only creating the empty playlist(no videos, only playlist with name and des)
    const {name, description} = req.body;
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID format")
    }

    if (
        [name, description].some((field) => field?.trim() === " ")
    ) {
       throw new ApiError(400, "Name and description are required to create playlist"); 
    }

    const playlist = await Playlist.create(
        {
           name,
           description,
           owner: userId 
        }
    );

    if (!playlist) {
        throw new ApiError(400, "Error while creating playlist");
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            playlist,
            "Playlist created successfully"
        )
    );

});

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    // pipelines for fetching playlist and owner details
    const {userId} = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID format")
    }

    const user = await User.findById(userId);

    const userPlaylist = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user._id) // error might occur here
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                owner: 1
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "result",
                pipeline: [
                   {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            coverImage: 1
                        }
                   }
                ]
            }
        },
        {
            $addFields: {
                result: {
                    $arrayElemAt: ["$result", 0]
                }
            }
        }
    ]);

    if (!userPlaylist) {
        throw new ApiError(400, "Error occur while fetching playlists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            201,
            userPlaylist,
            "Playlists fetched successfully"
        )
    )
});

const getPlaylistById = asyncHandler(async (req, res) => {
    // TODO: get playlist by id
    // check if playlist exist.
    // use aggregation pipeline to match videos that added in this particular playlist
    const {playlistId} = req.params;
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist does not exist");
    }

    const getPlaylist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlist._id)
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                owner: 1
            }
        },
        {
            // details of owner of the playlist
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "playlist_owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            coverImage: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                $first: "$playlist_owner" 
            }
        },
        {
            $unwind: {
                path: "$videos",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "user_Details",
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
                            user_Details: {
                                $first: "$user_Details"
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                videoDetails: {
                    $first: "$videoDetails"
                }
            }
        },
        {
            $group: {
                _id: "$_id",
                name: { $first: "$name" },
                description: { $first: "$description" },
                owner: { $first: "$owner" },
                playlist_owner: { $first: "$playlist_owner" },
                videos: { $push: "$videoDetails" } // Reconstruct array of video objects
            }
        }
    ]);

    if (!getPlaylist) {
        throw new ApiError(500, "Error while fetching playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            getPlaylist,
            (getPlaylist.length === 0) ? "No playlist found" : "All playlist fetched successfully"
        )
    )

});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    // TODO: 
    // check if playlist exist from db.
    // check video exist from db.
    // update db -> push into videos fields of playlist.
    const {playlistId, videoId} = req.params;

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);
    if (!playlist) {
        throw new ApiError(400, "Playlist does not exist");
    }

    if (!video) {
        throw new ApiError(400, "Video does not exist");
    }

    const addToPlaylist = await Playlist.findByIdAndUpdate(
        playlist._id,
        {
            $push: {videos: video._id}
        },
        { new: true }
    ).populate("vidoes");

    if (!addToPlaylist) {
        throw new ApiError(500, "Error occur while adding video to playlist");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            addToPlaylist,
            "Video added to playlist successfully"
        )
    )
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    const {playlistId, videoId} = req.params

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) {
        throw new ApiError(400, "Playlist does not exist");
    }

    if (!video) {
        throw new ApiError(400, "Video does not exist");
    }

    const removeVidFromPlaylist = await Playlist.findByIdAndUpdate(
        playlist._id,
        {
            $pull: {
                videos: video._id
            }
        },
        { new: true }
    );

    if (!removeVidFromPlaylist) {
        throw new ApiError(500, "Error while removing video from playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video removed from playlist successfully"
        )
    )

});

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const {playlistId} = req.params;
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist does not exist.")
    }

    const deletePlaylist = await Playlist.findByIdAndDelete(playlist._id);

    if (!deletePlaylist) {
        throw new ApiError(400, "Error while deleting playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Playlist deleted successfully"
        )
    )
});

const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist
    const {playlistId} = req.params;
    const {name, description} = req.body;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist does not exist")
    }

    if (
        [name, description].some((field) => field?.trim() === " ")
    ) {
        throw new ApiError(
            400,
            "Empty values can not be update."
        )   
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist._id,
        {
            $set: {
                name,
                description
            }
        },
        { new: true}
    );

    if (!updatePlaylist) {
        throw new ApiError(500, "Could not update playlist")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            updatedPlaylist,
            "Playlist updated successfully"
        )
    )
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
