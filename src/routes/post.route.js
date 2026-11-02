

import { Router } from "express";
import { createPost,getPostById,updatePost,deletePost,getAllPosts } from "../controllers/post.controller.js"; 
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router()

//routes protected
router.post("/",verifyJWT,createPost)
router.patch("/:id",verifyJWT,updatePost)
router.delete("/:id", verifyJWT, deletePost);

//routes
router.get("/",getAllPosts)
router.get("/:id",getPostById)

export default router;