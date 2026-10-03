import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

export const getUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not Found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.log("Error in getUserProfile Controller", error);

    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const followUnfollowUser = async (req, res) => {
  const { id } = req.params;

  try {
    // User being followed/unfollowed
    const userToModify = await User.findById(id);

    // Currently logged-in user
    const currentUser = await User.findById(req.user._id);

    // Can't follow yourself
    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ error: "You can't follow or unfollow yourself." });
    }

    if (!userToModify || !currentUser) {
      return res.status(404).json({ error: "User not Found" });
    }

    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      // UNFOLLOW

      // Remove current user from target user's followers
      await User.findByIdAndUpdate(id, {
        $pull: { followers: req.user._id },
      });

      // Remove target user from current user's following
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: id },
      });

      return res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // FOLLOW

      // Add current user to target user's followers
      await User.findByIdAndUpdate(id, {
        $push: { followers: req.user._id },
      });

      // Add target user to current user's following
      await User.findByIdAndUpdate(req.user._id, {
        $push: { following: id },
      });

      //Send notification to user
      const newNotification = new Notification({
        type: "follow",
        from: req.user._id,
        to: userToModify._id,
      });

      await newNotification.save();

      //TODO - return id of user as response
      return res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    console.log("Error in followUnfollowUser Controller", error);

    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//Optimize later
export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    const usersFollowedByMe = await User.findById(userId).select("following");

    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId }, //ne- not equal
        },
      },
      {
        $sample: { size: 10 },
      },
    ]);

    const filteredUsers = users.filter(
      (user) => !usersFollowedByMe.following.includes(user._id),
    );

    const suggestedUsers = filteredUsers.slice(0, 4);
    suggestedUsers.forEach((user) => (user.password = null));

    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.log("Error in getSuggestedUsers Controller", error);

    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateUserProfile = async (req, res) => {
  const { fullName, email, username, bio, link, newPassword, currentPassword } =
    req.body;
  let { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (
      (!newPassword && currentPassword) ||
      (!currentPassword && newPassword)
    ) {
      return res
        .status(400)
        .json({ error: "Please provide both current and new password" });
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return res
          .status(400)
          .json({ error: "Current Password is incorrect." });

      if (currentPassword === newPassword)
        return res
          .status(400)
          .json({ error: "New Password is same as current password." });

      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters long" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (profileImg) {
      if (user.profileImg) {
        await cloudinary.uploader.destroy(
          user.profileImg.split("/").pop().split(".")[0],
        );
      }
      const uploadedRes = await cloudinary.uploader.upload(profileImg);
      profileImg = uploadedRes.secure_url;
    }

    if (coverImg) {
      if (user.coverImg) {
        await cloudinary.uploader.destroy(
          user.coverImg.split("/").pop().split(".")[0],
        );
      }
      const uploadedRes = await cloudinary.uploader.upload(coverImg);
      coverImg = uploadedRes.secure_url;
    }

    user.fullName = fullName || user.fullName;
    user.username = username || user.username;
    user.email = email || user.email;
    user.link = link || user.link;
    user.bio = bio || user.bio;
    user.profileImg = profileImg || user.profileImg;
    user.coverImg = coverImg || user.coverImg;

    user = await user.save();
    user.password = null;

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error in the updateUserProfile controller", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
