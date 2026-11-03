
import { Router } from "express";
import { createComment,getAllComments,updateComment,deleteComment } from "../controllers/comment.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const commentRouter = Router()

//public router
commentRouter.get("/post/:postId", getAllComments);

// Protected routes
commentRouter.post("/post/:postId", verifyJWT, createComment);
commentRouter.patch("/:commentId", verifyJWT, updateComment);
commentRouter.delete("/:commentId", verifyJWT, deleteComment);




export default commentRouter