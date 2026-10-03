import express from "express";
import {getMe, login, signup, logout} from "../controllers/authControllers.js"
import {protectRoute} from "../middleware/protectRoute.js"

const router = express.Router();

router.get("/me", protectRoute, getMe); //check if user is authenticated 
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
