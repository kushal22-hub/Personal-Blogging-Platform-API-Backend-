
import { Router } from "express";
import { loginUser,registerUser,logoutUser,refreshAccessToken } from "../controllers/auth.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post('/refresh', refreshAccessToken)

// Protected route
router.post("/logout", verifyJWT, logoutUser);


export default router