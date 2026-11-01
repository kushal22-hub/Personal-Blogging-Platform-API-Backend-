
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = async (req, res, next) => {
  try {
    // 1. Get access token
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const token = authHeader.slice(7);

    // 2. Verify token
    const decodedToken = jwt.verify(
       token,
  process.env.JWT_ACCESS_SECRET,
  {
    algorithms: ["HS256"],
  }
    );

    // 3. Find user from token subject
    const user = await User.findById(decodedToken.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication",
      });
    }

    // 4. Attach authenticated user
    req.user = user;

    // 5. Continue to next middleware/controller
    return next();

  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }

    return next(error);
  }
};