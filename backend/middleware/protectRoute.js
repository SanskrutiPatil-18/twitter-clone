import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

export const protectRoute = async (req, res, next) => {
  try {

    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token Provided.",
        error: {
          code: "UNAUTHORIZED",
        },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
        error: {
          code: "INVALID_TOKEN",
        },
      });
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        error: {
          code: "USER_NOT_FOUND",
        },
      });
    }
    req.user = user;
    next();

  } catch (error) {
    console.log("Error in protectRoute Middleware", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: {
        code: "INTERNAL_ERROR",
      },
    });
  }
};
