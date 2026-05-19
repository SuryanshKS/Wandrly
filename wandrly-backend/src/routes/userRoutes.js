import express from 'express';

import {registerUser,authUser,getUserProfile} from '../controllers/userController.js';

const router = express.Router();

router.post('/register',registerUser);//route for user registration, calls the registerUser controller function when a POST request is made to /api/users/register

router.post('/login',authUser);//route for user login, calls the authUser controller function when a POST request is made to /api/users/login

router.get('/me', protect, getUserProfile);//for getting user data

export default router;//export the router to be used in server.js