import { createItineraryEvent, deleteItenaryEvent, getTripItenary, updateItenaryEvent } from "../services/itenaryService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const addEvent = asyncHandler(async(req,res)=>{
    const { tripId } = req.params;
    const userId = req.user.id;

    if (!req.body.title || !req.body.start_time || !req.body.end_time) {
        res.status(400);
        throw new Error("Title, start_time, and end_time are strictly required.");
    }

    try{
        const event = await createItineraryEvent(userId,tripId,req.body);
        res.status(201).json({
            message: "Itinerary event created successfully!",
            event: event
        })
    }
    catch (error) {
        if (error.message === "NOT_AUTHORIZED_LOGISTICS") {
            res.status(403);
            throw new Error("Forbidden: Viewers cannot modify the itinerary.");
        }
        if (error.message === "INVALID_TIMEFRAME") {
            res.status(400);
            throw new Error("An event cannot end before it starts.");
        }
        throw error;
    }
});


export const getEvents = asyncHandler(async(req,res)=>{
    const {tripId} = req.params;
    const userId = req.user.id;

    try{
        const events = await getTripItenary(userId,tripId);
        res.status(200).json({ status: "success", count: events.length, events });
    }
    catch (error) {
        if (error.message === "NOT_A_MEMBER") {
            res.status(403);
            throw new Error("Forbidden: Only trip members can view the itinerary.");
        }
        throw error;
    }
});


export const removeEvent = asyncHandler(async(req,res)=>{
    const {tripId,eventId} = req.params;
    const userId = req.user.id;

    try{
        await deleteItenaryEvent(userId,tripId,eventId);
        res.status(200).json({ message: "Event successfully removed." });
    }
    catch (error) {
        if (error.message === "NOT_AUTHORIZED_LOGISTICS") {
            res.status(403);
            throw new Error("Forbidden: Viewers cannot delete events.");
        }
        throw error;
    }
});

export const editEvent = asyncHandler(async(req,res)=>{
    const {tripId,eventId} = req.params;
    const userId = req.user.id;

    // Prevent empty updates
    if (Object.keys(req.body).length === 0) {
        res.status(400);
        throw new Error("Please provide data to update.");
    }

    try{
        const updatedEvent = await updateItenaryEvent(userId,tripId,eventId,req.body);
        res.status(200).json({ 
            message: "Event successfully updated.", 
            event: updatedEvent 
        });
    }
    catch (error) {
        if (error.message === "NOT_AUTHORIZED_LOGISTICS") {
            res.status(403);
            throw new Error("Forbidden: Viewers cannot modify events.");
        }
        if (error.message === "EVENT_NOT_FOUND") {
            res.status(404);
            throw new Error("Event not found or does not belong to this trip.");
        }
        if (error.message === "INVALID_TIMEFRAME") {
            res.status(400);
            throw new Error("An event cannot end before it starts.");
        }
        throw error;
    }
})