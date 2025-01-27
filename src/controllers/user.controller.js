import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async(userId) => {
  try {
    const user = await User.findById(userId);
    // generateRefreshToken n generateAccessToken are the methods hence we r writing in this manner. as we usually write methods in js.
    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();
    // updating into db refreshToken field.
    user.refreshToken = refreshToken;
    // saving into db after all updates
    // while saving in db, so some validations kickin like password, like it asks for password hence we use this method: { validateBeforeSave: false }
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken }

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token");
  }
}


const registerUser = asyncHandler(async (req, res) => {
  // ( Algorithm - steps for creation ) :-
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar(coverImage is not that compulsary).
  // upload them to cloudinary, avatar.
  // createuser object - create entry in db.
  //remove password and refresh token field from response
  // check for user creation
  // return res.

  const { fullName, email, username, password } = req.body;

  // checks all fields are available or not(some() -> see if any field is available and then trim() it and checks it with ""empty space, that if any of the field is empty)
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverIq.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage =  await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  });

  // it deselects the fields that we have passed as string else it selects all fields.
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if(!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  )

});

const loginUser = asyncHandler(async (req, res) => {
  // my-algo
  // user will input data - email/username, password
  // check in the db , user exists or not.
  // generate access and refresh token
  // save refresh token in db and access token as into cookie/local storage.
  // brings user on home page.

  // sir-algo
  // req body -> data
  // username or email
  // find the user
  // password check
  // generate access and refresh token
  // send cookie
  // all done -> successfull login

  const {email, username, password} = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or password is required");
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  });

  if (!user) {
    throw new ApiError(404, "User does not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  // while sending cookie so in cookie when we pass the user data so if we send the as it is user object as we get above so it will pass all important details.
  // the above user doesn't conatin refreshtoken hence 1. update the user object above with refreshToken using User.findByIDAndUpdate().  2. again write new query and get user.

  // need to decide here, will it get expensive to again call new db query else/or update that above user.

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  // cookies can be easily modified by default from anywhere(frontend/backend) So when write these options(httpOnly,secure) , its can't be modified by frontend and only server/backend.
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken, refreshToken
      },
      "User logged In Successfully"
    )
  )

});

const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1 // this removes the field from document.
      }
    },
    {
      new: true
    }
  );
  // this new will return the update value directly instead of calling the query again for updated user.
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiError(200, {}, "User logged Out"));
})

// when user login so refresh and access tokens gets generate.
// when access Token will gets expire so instead of logging out user it will use refresh token.
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id);
  
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
  
    // checking that Tokens matches or not.
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
  
    const options =  {
      httpOnly: true,
      secure: true
    }
  
    const {accessToken, newRefreshToken}  = await generateAccessAndRefreshTokens(user._id);
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  // if we want this confirmPassword field
  // if (!(newPassword === confirmPassword)) {
  //   throw new ApiError("401", "Confirm password doesn't match new Password");
  // }

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false });

  return res.
  status(200)
  .json(
    new ApiResponse(200, {}, "Password chnage successfully")
  )
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
  .status(200)
  .json(
    new ApiResponse(200, req.user, "current user fetched successfully")
  )
});

// if user wants to update any file then give it a seperate endpoint. and save that particular file else updating the whole user including all text and images again cause congestion in the network.
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400,"All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email
      }
    },
    {new: true}
  ).select("-password");

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Account details updated successfully")
  )
});
// {new: true} -> update hone ke baad jo data return hota wo isme mil jata h.

// here getting the user details from middleware.
// user must be logged in.
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // TODO: delete old image - assignment
  // make a utility fn -> where take the old url of cloudinary of avatar and delete the old image. 
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading an avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }
  ).select("-password");

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Avatar updated successfully")
  )
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading an Cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    { new: true }
  ).select("-password");

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Cover Image updated successfully")
  );
});

// refre lec no. - 20
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
      throw new ApiError(400, "username is missing");
    }

    // using aggregatation pipelines to find the document which contains the subscriber & channel
    const channel = await User.aggregate([
      // match the user
      {
        $match: {
          username: username?.toLowerCase()
        }
      },
      // counts the subscribers of a user/channel through channel
      {
        $lookup: {
          from: "subscriptions", // name of model
          localField: "_id",
          foreignField: "channel",
          as: "subscribers"
        }
      },
      // counts the channel that user have subscribed to through subscriber
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo"
        }
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers"
          },
          channelsSubscribedToCount: {
            $size: "$subscribedTo"
          },
          // this fn shows that whether that user have subscribed or not
          isSubscribed: {
            $cond: {
              if: {$in: [req.user?._id, "$subscribers.subscriber"]},
              then: true,
              else: false
            }
          }
        }
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1
        }
      }
    ]);
    console.log("aggregation channel: ", channel);

    if(!channel?.length) {
      throw new ApiError(404, "Channel does not exsits")
    }

    return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
});

// refre lec no. - 21
// this is nested lookup pipeline will do here
// watchHistory -> videos(id) -> video owner to get the user details again to -> form the complete document.

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users", // we are in video model now and from ther we r lookinup for user/owner.
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ]);

  return res
  .status(200)
  .json(
    new ApiResponse(
      200,
      user[0].watchHistory,
      "Watch history fetched successfully"
    )
  )
});


// Assignment_1 - Delete user controller


export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};