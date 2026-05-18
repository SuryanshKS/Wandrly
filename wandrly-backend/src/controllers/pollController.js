import { castPollVote, createTripPoll, getTripPolls } from "../services/pollService.js";
import asyncHandler from "../utils/asyncHandler.js";

//1.import websocket server instance
import {io} from "../../server.js";

export const addPoll = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const { question, options } = req.body;
    const userId = req.user.id;

    if (!question || !options) {
        res.status(400);
        throw new Error("Question and options array are strictly required.");
    }

    try {
        const poll = await createTripPoll(userId, tripId, question, options);
        //2. real time broadcast - tell room a new poll is live
        io.to(tripId).emit('poll_created',{
            message:`New poll created: "${question}"`,
            pollId:poll.id
        });

        res.status(201).json({ message: "Poll successfully created.", poll });
    }
    catch (error) {
        if (error.message === "NOT_AUTHORIZED_POLLING") {
            res.status(403);
            throw new Error("Forbidden: Viewers cannot create polls.");
        }
        if (error.message === "MINIMUM_TWO_OPTIONS") {
            res.status(400);
            throw new Error("A poll must contain at least 2 distinct options.");
        }
        throw error;
    }
});


export const getPolls = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const userId = req.user.id;

    try {
        const polls = await getTripPolls(userId, tripId);
        res.status(200).json({ status: "success", count: polls.length, polls });
    } catch (error) {
        if (error.message === "NOT_A_MEMBER") {
            res.status(403);
            throw new Error("Forbidden: You must be a member of this trip to view polls.");
        }
        throw error;
    }
});


export const voteInPoll = asyncHandler(async (req, res) => {
    const { tripId, pollId } = req.params;
    const { optionId } = req.body;
    const userId = req.user.id;

    if (!optionId) {
        res.status(400);
        throw new Error("Option ID is required to cast a vote.");
    }

    try {
        const vote = await castPollVote(userId, tripId, pollId, optionId);

        //3. real time broadcast - tell room a vote has been cast
        io.to(tripId).emit('poll_updated',{
            pollId, 
            userId, 
            optionId,
        })

        res.status(200).json({ message: "Vote cast successfully!", vote });
    } catch (error) {
        if (!optionId) {
            res.status(400);
            throw new Error("Option ID is required to cast a vote.");
        }
    }
})