import { getPacingAnalytics } from "../services/analyticsService.js";
import { compileChronologicalTravelogue, processMediaUpload, removeMediaRecord } from "../services/mediaService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const uploadMediaItem = asyncHandler(async(req,res)=>{
    const {tripId} = req.params;
    const{event_id} = req.body;
    const userId = req.user.id;

    if(!req.file){
        res.status(400);
        throw new Error("No file uploaded.");
    }

    try{
        const mediaRecord = await processMediaUpload(userId,tripId,event_id,req.file.buffer);
        res.status(201).json({ 
            status: "success", 
            message: "Memory uploaded and securely linked to coordinates.", 
            mediaRecord 
        });
    }catch (error) {
        if (error.message === "NOT_AUTHORIZED_MEDIA") {
            res.status(403);
            throw new Error("Forbidden: Viewers are restricted from contributing media.");
        }
        throw error;
    }
});

export const getTravelogue = asyncHandler(async(req,res)=>{
    const{tripId} = req.params;
    const userId = req.user.id;

    try{
        const routeData = await compileChronologicalTravelogue(userId,tripId);
        res.status(200).json({ status: "success", route_markers: routeData });
    }
    catch (error) {
        if (error.message === "NOT_A_MEMBER") {
            res.status(403);
            throw new Error("Forbidden: You must be a verified trip member to trace this travelogue.");
        }
        throw error;
    }
});

export const deleteMediaItem = asyncHandler(async(req,res)=>{
    const { tripId, mediaId } = req.params;
    const userId = req.user.id;

    try{
        await removeMediaRecord(userId, tripId, mediaId);
        res.status(200).json({ 
            status: "success", 
            message: "Memory permanently cleared from both cloud vaults and database logs." 
        });
    }catch (error) {
        if (error.message === "MEDIA_NOT_FOUND" || error.message === "MISMATCHED_RESOURCE") {
            res.status(404);
            throw new Error("The target media asset could not be located on this trip cluster.");
        }
        if (error.message === "UNAUTHORIZED_DELETION") {
            res.status(403);
            throw new Error("Forbidden: You lack permissions to drop this media asset record.");
        }
        throw error;
    }
})