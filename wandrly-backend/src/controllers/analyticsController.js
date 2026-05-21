import prisma from "../config/prisma.js";
import { getPacingAnalytics } from "../services/analyticsService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getVibeCheck = asyncHandler(async(req,res)=>{
    const {tripId} = req.params;
    const userId = req.user.id;

    try{
        const analytics = await getPacingAnalytics(userId,tripId);
        res.status(200).json({ 
            status: "success", 
            days_analyzed: analytics.length,
            pacing_data: analytics 
        });
    }catch (error) {
        if (error.message === "NOT_A_MEMBER") {
            res.status(403);
            throw new Error("Forbidden: You must be a member of this trip to view analytics.");
        }
        throw error;
    }
});

export const getGlobalMapData = async (req, res) => {
  const userId = req.user.id;
  
  const trips = await prisma.trip.findMany({
    where: { members: { some: { user_id: userId } } },
    select: { 
      id: true, 
      title: true, 
      lat: true, 
      lng: true 
    }
  });

  res.status(200).json({ status: "success", data: trips });
};