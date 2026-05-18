import prisma from "../config/prisma.js";
import { calculateSettlements } from "../services/settlementService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getTripSettlements = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const requesterId = req.user.id;//get the authenticated user's ID from the auth middleware

    //1. verify if the requester is part of the trip, only trip members can view settlements
    const memberCheck = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: requesterId } }
    });
    if (!memberCheck) {
        res.status(403);
        throw new Error("Forbidden: You must be a member of the trip to view settlements.");
    }

    //2. calculate settlements using the service function
    const settlements = await calculateSettlements(tripId);

    res.status(200).json({
        status: "success",
        total_transactions_required: settlements.length,
        settlements: settlements
    });
});
