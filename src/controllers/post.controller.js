
import slugify from "slugify";
import { Post } from "../models/post.model.js";
import mongoose from "mongoose";
import { isValidObjectId } from "mongoose";
// 1. Create Post
const createPost = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }
     const slug = slugify(title.trim(), {
      lower: true,
      strict: true,
      trim: true,
    });

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid title",
      });
    }


    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      slug,
      author: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: post,
    });
  } catch (error) {
    next(error);
  }
};


// 2. Get All Published Posts
const getAllPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ status: "published" })
      .sort({ createdAt: -1 })
      .populate("author", "username");

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Single Post
const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
      });
    }

    const post = await Post.findOne({
      _id: id,
      status: "published",
    }).populate("author", "username");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};
//4. Update post
const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
      });
    }

    const updates = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }
      updates.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Content cannot be empty",
        });
      }
      updates.content = content.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide title or content to update",
      });
    }

    const post = await Post.findOneAndUpdate(
      { _id: id, author: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or you are not the owner",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Own Post
const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
      });
    }

    const post = await Post.findOneAndDelete({
      _id: id,
      author: req.user._id,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or you are not the owner",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
};

