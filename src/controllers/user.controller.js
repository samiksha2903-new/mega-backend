import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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
  console.log("email", email);

  // checks all fields are available or not(some() -> see if any field is available and then trim() it and checks it with ""empty space, that if any of the field is empty)
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  
  const existedUser = User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  console.log("req.files", req.files)
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0].path;

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
  })

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

export { registerUser };
