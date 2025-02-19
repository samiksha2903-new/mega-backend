import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy="createdAt", sortType="desc", userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    if (!query || query.trim() === "") {
        // !query -> show all videos
        const allVids = await Video.aggregate([
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
                                fullName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    user_details: {
                        $arrayElemAt: ["user_details", 0]
                    }
                }
            },
            {
                $skip: (page - 1) * limit
            },
            {
                $limit: parseInt(limit)
            }
        ]);

       if (!allVids) {
        throw new ApiError(
            500,
            "Couldn't fetch videos"
        )
       }

       return res
       .status(200)
       .json(
        new ApiResponse(
            200,
            allVids,
            "All videos fetched successfully"
        )
       )
    }

    // get videos based on query, sortBy, sortType
    const sortCriteria = {};
    sortCriteria[sortBy] = sortType === "desc" ? -1 : 1;

    let videos;
    if (!userId) {
        // show videos based on query
        videos = await Video.aggregate([
            {
                $match: {
                    title: {
                        $regex: query,
                        $options: i
                    }
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
                                fullName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    user_details: {
                        $first: "$user_details"
                    }
                }
            },
            {
                $sort: sortCriteria
            },
            {
                $skip: (page - 1) * 10
            },
            {
                $limit: parseInt(limit)
            }
        ])
    } else {
        // if userid exist then show the videos of its own as per query
        videos = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
                    title: {
                        $regex: query,
                        $options: i
                    }
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
                                fullName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    user_details: {
                        $arrayElemAt: ["$user_details", 0]
                    }
                }
            },
            {
                $sort: sortCriteria
            },
            {
                $skip: (page - 1) * 10
            },
            {
                $limit: parseInt(limit)
            }
        ]);
    }

    if (!videos || videos.length == 0) {
        throw new ApiError(404, "No Videos with such query paramaters")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "All Videos fetched successfully"
        )
    )

});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const owner = req.user?._id
    // TODO: get video, upload to cloudinary, create video
    // validate each field
    // get the path of video, thumbnail
    // upload the video, thumbnail and duration of video on the cloudinary
    // create the video db.| store the details on the database
    // check for errors
    if (
        [title, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "Title and description are required to publish a video")
    } 

    const videoFilePath = req.files?.videoFile[0]?.path;
    if (!videoFilePath) {
        throw new ApiError(400, "Video File is required");
    }

    const thumbnailFilePath = req.files?.thumbnail[0]?.path;
    if (!thumbnailFilePath) {
        throw new ApiError(400, "thumbnail is required");
    }

    const videoFile = await uploadOnCloudinary(videoFilePath);
    if (!videoFile) {
        throw new ApiError(400, "Cloudinary Error: Couldn't upload Video File")
    }

    const thumbnailFile = await uploadOnCloudinary(thumbnailFilePath);
    if (!thumbnailFile) {
        throw new ApiError(400, "Cloudinary Error: Couldn't upload Thumbnail File")
    }

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnailFile.url,
        title,
        description,
        duration: videoFile.duration,
        isPublished: true,
        owner: req.user?._id
    });

    if (!video) {
        throw new ApiError(500, "Error while uploading video");
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            video,
            video.length === 0 ? "Video can not upload" : "Video uploaded successfully"
        )
    )
    
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    // search for id in Video model
    // validate
    // write aggregation pipeline to get the video as well as the owner details
    // send the response.
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId).populate("owner", "username avatar");

    if (!video) {
        throw new ApiError(500, "Error while fetching the video");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video fetched successfully"
        )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    
    const { title, description } = req.body;
    if ([title, description].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "Title or description is required");
    }

    let updatedvalues = { title, description };

    if (req.file) {
      const thumbnailFilePath = req.file?.path;
      
      if (!thumbnailFilePath) {
        throw new ApiError(400, "Thumbnail is missing");
      }

      const thumbnailFile = await uploadOnCloudinary(thumbnailFilePath);
      if (!thumbnailFile) {
        throw new ApiError(400, "Cloudinary Error: Couldn't upload thumbnail")
      }

      updatedvalues.thumbnail = thumbnailFile.url;
      // haven't deleted the old thumbnail.
    }


    // runValidators option ensures that schema validation rules are applied when updating a document.
    const updatingVideo = await Video.findByIdAndUpdate(
       video._id,
       {
        $set: updatedvalues
       },
       {
        new: true, runValidators: true
       }
    )
   
    if (!updatingVideo) {
        throw new ApiError(500, "Error while updating the video")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatingVideo,
            "Video updated successfully"
        )
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video ID is missing")
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "Video not found.")
    }

    // check if the user is the owner of the video -> permission
    if (req.user?._id.toString() !== video.owner.toString()) {
        throw new ApiError(401, "You do not have permission to perform this action on this resource")
    }

    // const videoPublicId = video.videoFile.split("/").pop().split(".")[0];
    // const thumbnailPublicId = video.thumbnail.split("/").pop().split(".")[0];

    await deleteFromCloudinary(video.videoFile, "video");
    await deleteFromCloudinary(video.thumbnail, "image");

    // delete from db as well
    const deletedVideo = await Video.findByIdAndDelete(videoId);
    if (!deleteVideo) {
        throw new ApiError(500, `video with ${videoId} does not exist`);
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    )

});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "videoId is missing");
    }


    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(500, "Video does not exist");
    }

    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false }); // this will automatically save the isPublish value in db

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "video publish status updated successfully"
        )
    )
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
