
import { User } from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { Session } from "../models/session.model.js";
import { randomBytes, createHash } from "node:crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateRefreshToken,
  hashToken,
  refreshCookieOptions,
} from "../utils/token.utils.js";



 const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // 1. Check input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

  

    // 2. Check for existing account
    const existingUser = await User.findOne({
      $or: [
        { email },
        { username},
      ],
    });

    if (existingUser) {
      return res.status(401).json(
        new ApiError(400,"username or email is already in use.")
        
      );
    }

    // 4. Create user
    // Password is hashed by the model save hook
    const user = await User.create({
      username,
      email,
      password,
    });

    // 5. Return safe response
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    // Unique-index races and other DB errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or username is already in use",
      });
    }

    next(error);
  }
};


 const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    // 1. Validate request
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 2. Normalize login identity
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Find user (password excluded by default)
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    // 4. Verify credentials
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid =
      await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 5. Generate access token
    const accessToken = jwt.sign(
      { sub: user._id.toString() },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
    );

    // 6. Generate opaque refresh token
    const refreshToken = randomBytes(32).toString("hex");

    const refreshDays = Number(
      process.env.REFRESH_TOKEN_DAYS || 7
    );

    if (!Number.isInteger(refreshDays) ||
        refreshDays < 1 || refreshDays > 90) {
      throw new Error("Invalid refresh-token lifetime config");
    }

    const expiresAt = new Date(
      Date.now() + refreshDays * 24 * 60 * 60 * 1000
    );

    // 7. Store only the refresh token hash
    await Session.create({
      user: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    // 8. Send refresh token using HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
    });

    // 9. Return safe user details
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};


const getRefreshDays = () => {
  const days = Number(process.env.REFRESH_TOKEN_DAYS || 7);

  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new Error("Invalid refresh-token configuration");
  }

  return days;
};

const createAccessToken = (userId) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT access secret is missing");
  }

  return jwt.sign(
    { sub: userId.toString() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
};

 const refreshAccessToken = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;

    if (
      typeof incomingToken !== "string" ||
      !/^[a-f0-9]{64}$/.test(incomingToken)
    ) {
      res.clearCookie("refreshToken", refreshCookieOptions);

      return res.status(401).json({
        success: false,
        message: "Refresh token is missing or invalid",
      });
    }

    // 1. Hash the incoming token
    const incomingHash = hashToken(incomingToken);

    // 2. Find a valid, unexpired session
    const session = await Session.findOne({
      tokenHash: incomingHash,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      res.clearCookie("refreshToken", refreshCookieOptions);

      return res.status(401).json({
        success: false,
        message: "Refresh session is invalid or expired",
      });
    }

    // 3. Verify that the user still exists
    const user = await User.findById(session.user);

    if (!user) {
      await Session.deleteOne({ _id: session._id });

      res.clearCookie("refreshToken", refreshCookieOptions);

      return res.status(401).json({
        success: false,
        message: "Authentication failed",
      });
    }

    // Add your account-status checks here if applicable.

    // 4. Generate a replacement refresh token
    const newRefreshToken = generateRefreshToken();
    const newHash = hashToken(newRefreshToken);

    const refreshDays = getRefreshDays();
    const expiresAt = new Date(
      Date.now() + refreshDays * 24 * 60 * 60 * 1000
    );

    // 5. Atomically replace the old token hash.
    // Only one concurrent request using the old token can win.
    const rotation = await Session.updateOne(
      {
        _id: session._id,
        tokenHash: incomingHash,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          tokenHash: newHash,
          expiresAt,
        },
      }
    );

    if (rotation.modifiedCount !== 1) {
      res.clearCookie("refreshToken", refreshCookieOptions);

      return res.status(401).json({
        success: false,
        message: "Refresh token has already been used or revoked",
      });
    }

    // 6. Create a fresh access token
    const accessToken = createAccessToken(user._id);

    // 7. Set the replacement refresh cookie
    res.cookie("refreshToken", newRefreshToken, {
      ...refreshCookieOptions,
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Access token refreshed",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

 const logoutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (typeof refreshToken === "string") {
      // Hash the refresh token
      const tokenHash = hashToken(refreshToken);

      // Revoke the corresponding session
      await Session.deleteOne({ tokenHash });
    }

    // Clear the browser cookie
    res.clearCookie("refreshToken", refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};




export{
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
}