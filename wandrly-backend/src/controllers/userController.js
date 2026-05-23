import prisma from '../config/prisma.js';
import { createUser, loginUser } from '../services/userService.js';
import asyncHandler from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';

export const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        // We can still throw standard HTTP errors easily!
        res.status(400);
        throw new Error("Name, email, and password are required.");
    }

    const newUser = await createUser(name, email, password);

    const token = jwt.sign(
        {
            userId: newUser.id,
            email: newUser.email,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '7d',//token expires in 7 days
        }
    );

    res.status(201).json({
        message: "User created successfully!",
        token:token,
        user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email
        }
    });
});

export const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error("Email and password are required.");
    }

    try {
        const { user, token } = await loginUser(email, password);

        //return the token and user data (excluding sensitive info) to the client
        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        if (error.message === "INVALID_CREDENTIALS") {
            res.status(401);
            throw new Error("Invalid email or password.");
        }
        throw error; // Let the global handler catch anything else
    }
});


export const getUserProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user.id
            },
            select: {
                id: true,
                name: true,
                email: true,
                is_premium: true // FIXED: Using your exact snake_case schema name
                // Removed the non-existent freeTripsCount field!
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        res.status(200).json(user);

    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Server error while fetching profile." });
    }
};