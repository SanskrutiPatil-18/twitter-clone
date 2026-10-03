import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import {generateTokenAndSetCookie} from "../lib/utils/generateToken.js";

export const signup = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    if (!username || !fullName || !email || !password) {
      return res.status(400).json({
        error: "Username, Full Name, Email, Password fields are required.",
      });
    }

    //Check username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        error: "User already exists",
      });
    }

    //Check email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid Email Format",
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        error: "Email is already taken",
      });
    }

    //check password
    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be atleast 8 characters long",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //Create User
    const newUser = new User({
      username,
      fullName,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    //Generate auth token
    generateTokenAndSetCookie(newUser._id, res);

    return res.status(201).json({
      message: "User created successfully",
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
    });
  } catch (error) {
    console.log("Error in the signup controller", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and Password fields are required.",
      });
    }

    const user = await User.findOne({ email });

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user?.password || "",
    );

    if (!user || !isPasswordCorrect) {
      return res.status(400).json({
        error: "Incorrect Email and Password",
      });
    }

    generateTokenAndSetCookie(user._id, res);

    return res.status(200).json({
      message: "User login successful",
      _id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.log("Error in the login controller", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    return res.status(200).json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.log("Error in the logout controller", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

export const getMe = async (req, res) => {
  try{
    const user = await User.findById(req.user._id).select("-password");
    return res.status(200).json(user);
  }catch(error){
    console.log("Error in the getMe controller.", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
      error: {
        code: "INTERNAL_ERROR",
      },
    });
  }
};