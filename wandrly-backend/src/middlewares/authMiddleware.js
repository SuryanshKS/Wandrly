import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../config/prisma.js';

export const protect = asyncHandler(async (req,resizeBy,next)=>{
    let token;

    //1. check if token exists in the Authorization header, and if it starts with "Bearer"
    // The standard format is: "Authorization: Bearer <token>"

    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
        try{
            // Get just the token string (remove the word "Bearer ")
            token = req.headers.authorization.split(' ')[1];

            //2. verify the token using jwt.verify, which will decode the token and check its signature
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            //3. find the user in the database using the decoded userId from the token payload, and attach the user object to the request for use in later middleware or route handlers
            req.user = await prisma.user.findUnique({
                where:{id:decoded.userId},
                select:{
                    id:true,
                    name:true,
                    email:true,
                    //do not select password_hash here
                }
            });

            /*
            we attach the user's secure database record to the req (Request) object, every single controller that runs after this middleware will automatically know exactly who the user is. When we write the createTrip controller next, we won't need to ask the user, "Hey, what is your ID?" We will just securely pull it from req.user.id. This prevents hackers from spoofing requests and creating trips under someone else's account!
            */

            //4. move to the next middleware or route handler, the controller in this case
            next();
        }
        catch(error){
            console.error(error);
            res.status(401);
            throw new Error("Not authorized, token failed");
        }
    }

    //5. if no token found
    if (!token) {
        res.status(401);
        throw new Error("Not authorized, no token provided");
    }
})

/*
strictly avoid relying on user IDs passed in the request body for authorization, instead, use an authentication middleware that extracts the JWT from the Bearer header, cryptographically verifies it, and attaches the authenticated user object directly to the Express req pipeline. Downstream controllers rely exclusively on req.user.id to establish ownership and permissions, making spoofing via payload manipulation impossible
*/