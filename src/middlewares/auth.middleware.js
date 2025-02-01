import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

// This is what happeing in req.hearder(),the authorization header contains - Bearer hb3gvgm -> token  "hb3gvgm".
//const str = "Bearer abc123xyz";
//const result = str.replace("Bearer ", "TOKEN: ");
//console.log(result); // Output: "TOKEN: abc123xyz"
// cookies is accessible only in Browser client and also can be send in Browser client but in android app/mobiles cookies can't be send hence Authorization headers are used to send the tokens. 
export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token) {
            throw new ApiError(401, "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if (!user) {
            // TODO: discuss about frontend
            throw new ApiError(401, "Invalid Access Token");
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Inavlid access token");
    }
});