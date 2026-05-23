//entry to the app, intialises express, sets up middleware and routes, and starts the server

/*
load environment variables from .env file

import dotenv from 'dotenv';
dotenv.config();

this approach wont work, as express first reads all the imports at the top of the file before executing any code, so the environment variables would not be loaded when the imported modules (like prisma.js) try to access them, resulting in errors. By using 'import 'dotenv/config'' as the very first line, we ensure that all environment variables are loaded and available to any module that imports them, including our Prisma configuration and any other part of the application that relies on environment variables.
*/

import 'dotenv/config'; // THIS MUST BE THE ABSOLUTE FIRST LINE!

import express from 'express';
import cors from 'cors';

//import routes
import userRoutes from './src/routes/userRoutes.js';
import tripRoutes from './src/routes/tripRoutes.js';

import paymentRoutes from './src/routes/paymentRoutes.js';
import webhookRoutes from './src/routes/webhookRoutes.js';


import { globalErrorHandler } from './src/middlewares/errorHandler.js';


import { Server } from 'socket.io';
import {createServer} from 'http';

const app = express();
const PORT = process.env.PORT || 5000;

//wrap the express app inside a native node HTTP server as socket.io requires a raw HTTP server to work with
const httpServer = createServer(app);
//initialize socket.io server and attach it to the HTTP server
const io = new Server(httpServer, {
    cors: {
        origin: '*',//replace with frontend URL in production, for now allow all
        methods: ['GET', 'POST']
    }
});

//Mounting the webhook first, before express.json() so it can process raw streams
app.use('/api/webhooks',webhookRoutes);

//MIDDLEWARE
app.use(cors({
    origin:['http://localhost:3000', 'https://wandrly-alpha.vercel.app'],
    credentials:true
}));//enable CORS for all routes, preventing cross-origin attacks
app.use(express.json());//parse incoming JSON requests and make the data available in req.body

//ROUTES
app.use('/api/users', userRoutes);//mount user routes at /api/users
app.use('/api/trips', tripRoutes);//mount trip routes at /api/trips

app.use('/api/payments',paymentRoutes);//mount payment routes at api/payments

app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Server is healthy' });//respond with a JSON message indicating the server is healthy
});

//GLOBAL ERROR HANDLER
app.use(globalErrorHandler); // Must be the last middleware!


//the websocket connection hub
io.on('connection', (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    //listen for a custom event called 'join_trip' from the client, which will be emitted when a user joins a trip, and the payload will contain the tripId
    socket.on('join_trip', (tripId) => {
        socket.join(tripId);//join the socket to a room named after the tripId, so that we can later broadcast messages to all sockets in this room when there are updates related to this trip
        console.log(`👥 User ${socket.id} joined trip room: ${tripId}`);
    });

    //listen for a custom event called 'leave_trip' from the client, which will be emitted when a user leaves a trip, and the payload will contain the tripId
    socket.on('leave_trip', (tripId) => {
        socket.leave(tripId);
        console.log(`🚪 User ${socket.id} left trip room: ${tripId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });


    //TRANSIENT GEOLOCATION ENGINE
    
    //1. user activates live location sharing for a specific event
    socket.on('join_meeting_room',({eventId,userId,userName})=>{
        socket.join(`event_location_${eventId}`);

        console.log(`📍 User ${userName} (${userId}) is sharing location for event: ${eventId}`);
        
        // Broadcast to the room that a new member is active on the map
        socket.to(`event_location_${eventId}`).emit('member_joined_map', { userId, userName });
    });


    //2. high frequency coordinator stream
    socket.on('share_location',({eventId,userId,lat,lng})=>{
        // Use socket.to().emit() to send it to EVERYONE ELSE in the room except the sender
        socket.to(`event_location_${eventId}`).emit('location_updated', {
            userId,
            lat,
            lng,
            timestamp: new Date().toISOString()
        });
    });

    //3. user manually turns off location sharing or closes the map
    socket.on('leave_meeting_point',({eventId,userId,userName})=>{
        socket.leave(`event_location_${eventId}`);
        console.log(`🚪 User ${userName} stopped sharing location for event: ${eventId}`);
        
        // Tell the frontend to wipe this user's marker off the map
        io.to(`event_location_${eventId}`).emit('member_left_map', { userId });
    });

})

// //start server
// app.listen(PORT,()=>{
//     console.log(`🚀 Server is running on http://localhost:${PORT}`);
// })

//replace app.listen with httpServer.listen to start the server, so that it can handle both HTTP requests and WebSocket connections
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

//expose the io instance to the rest of the app by attaching it to the app object, so that we can emit events from our controllers/services when there are updates related to trips, expenses, itenary, packing list, polls etc.
export { io };