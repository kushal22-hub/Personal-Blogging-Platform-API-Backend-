import mongoose from "mongoose";
import { Post } from "../models/post.model.js";
import {Comment} from "../models/comment.model.js"

import { isValidObjectId } from "mongoose";
import { log } from "node:console";

const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    // 1. Check authentication
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authorized",
      });
    }

    // 2. Validate content
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required.",
      });
    }

    const trimmedContent = content.trim();
    const MAX_LENGTH = 2000;

    if (trimmedContent.length > MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Comment cannot exceed ${MAX_LENGTH} characters.`,
      });
    }

    // 3. Validate post ID
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Post ID.",
      });
    }

    // 4. Verify post exists
    // Check whether the post exists and is published
  const post = await Post.findOne({
  _id: postId,
  status: "published",
  });

if (!post) {
  return res.status(404).json({
    success: false,
    message: "Published post not found.",
  });
}
    // 5. Create comment
    const comment = await Comment.create({
      content: trimmedContent,
      author: userId,
      post: post._id,
    });

    // 6. Send response
    return res.status(201).json({
      success: true,
      message: "Comment created successfully.",
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

const getAllComments = async(req,res,next)=>{
  const {postId} = req.params
  console.log("post id: ",postId);
  
   if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Post ID.",
      });
    }

  const post = await Post.findOne({
  _id: postId,
  status: "published",
  });

if (!post) {
  return res.status(404).json({
    success: false,
    message: "Published post not found.",
  });
}
    // 4. Pagination
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    // 5. Sorting
    const sortBy = req.query.sortBy === "oldest" ? 1 : -1;

    // 6. Retrieve comments
    const comments = await Comment.find({
      post: postId,
    })
      .populate("author", "username ")
      .sort({ createdAt: sortBy })
      .skip(skip)
      .limit(limit)
      .lean();

    // 7. Get total comment count
    const totalComments = await Comment.countDocuments({
      post: postId,
    });

    const totalPages = Math.ceil(totalComments / limit);

    // 8. Send response
    return res.status(200).json({
      success: true,
      message: "Comments retrieved successfully.",
      data: {
        comments,
        pagination: {
          currentPage: page,
          totalPages,
          totalComments,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });

}

const updateComment = async (req, res, next) => {
  try {
    // 1. Get comment ID
    const { commentId } = req.params;
    const { content } = req.body;

    // 2. Check authentication
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authorized.",
      });
    }

    // 3. Validate comment ID
    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Comment ID.",
      });
    }

    // 4. Validate content
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required.",
      });
    }

    const trimmedContent = content.trim();
    const MAX_LENGTH = 2000;

    if (trimmedContent.length > MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Comment cannot exceed ${MAX_LENGTH} characters.`,
      });
    }

    // 5. Find comment owned by this user
    const comment = await Comment.findOne({
      _id: commentId,
      author: userId,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    // 6. Update allowed field
    comment.content = trimmedContent;
    await comment.save();

    // 7. Return updated comment
    return res.status(200).json({
      success: true,
      message: "Comment updated successfully.",
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};
const deleteComment = async (req, res, next) => {
  try {
    // 1. Get comment ID
    const { commentId } = req.params;

    // 2. Check authentication
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authorized.",
      });
    }

    // 3. Validate comment ID
    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Comment ID.",
      });
    }

    // 4. Find and delete only own comment
    const deletedComment = await Comment.findOneAndDelete({
      _id: commentId,
      author: userId,
    });

    // 5. Check whether comment was found
    if (!deletedComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    // 6. Return response
    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
      data: deletedComment,
    });
  } catch (error) {
    next(error);
  }
};


export {
createComment,
getAllComments,
updateComment,
deleteComment
}


