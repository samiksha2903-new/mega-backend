import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


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
      $set: {
        refreshToken: undefined
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

export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken
};