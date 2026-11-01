

import { randomBytes, createHash } from "node:crypto";

export const generateRefreshToken = () =>
  randomBytes(32).toString("hex");

export const hashToken = (token) =>
  createHash("sha256")
    .update(token)
    .digest("hex");

export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/auth",
};