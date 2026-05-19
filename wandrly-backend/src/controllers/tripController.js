import { addMemberToTrip, createTripTransaction, getUserTripsList, removeMemberFromTrip } from "../services/tripService.js";
import asyncHandler from "../utils/asyncHandler.js";


//creating a trip
export const createTrip = asyncHandler(async (req, res) => {
    // 1. DIAGNOSTIC LOGS: This will output exactly what is arriving at your server
    console.log("--- TRIP CREATION ENGINE TRIGGERED ---");
    console.log("BODY DATA:", req.body);
    console.log("FILE DATA ARIVED:", req.file);


    const { title, destination, start_date, end_date } = req.body;

    const userId = req.user.id;//get the authenticated user's ID from the auth middleware

    // 2. BULLETPROOF URL EXTRACTOR: Checks path, secure_url, and standard url variants
    let cover_image = null;
    if (req.file) {
        cover_image = req.file.path || req.file.secure_url || req.file.url || null;
    }

    console.log("RESOLVED URL FOR DB:", cover_image);

    if (!title || !start_date) {
        res.status(400);
        throw new Error("Trip title, start date are required.");
    }

    //send the extracted userid and trip data to the service layer, which will handle the transaction
    const trip = await createTripTransaction(userId, {
        title,
        destination,
        start_date,
        end_date,
        cover_image
    });

    res.status(201).json({
        message: "Trip created successfully!",
        trip: trip
    });
})


export const inviteMember = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const { email, role } = req.body;
    const adminId = req.user.id;//get the authenticated user's ID from the auth middleware

    if (!email) {
        res.status(400);
        throw new Error("Member email is required.");
    }

    try {
        const membership = await addMemberToTrip(adminId, tripId, email, role);
        res.status(201).json({
            message: `User successfully onboarded as ${membership.role}!`,
            member: membership
        });
    } catch (error) {
        if (error.message === "NOT_AUTHORIZED_ADMIN") {
            res.status(403);
            throw new Error("Forbidden: Only the Trip Admin can invite members.");
        }
        if (error.message === "USER_NOT_FOUND") {
            res.status(404);
            throw new Error("No registered account found with this email.");
        }
        if (error.message === "ALREADY_A_MEMBER") {
            res.status(400);
            throw new Error("This user is already part of this trip.");
        }
        throw error;
    }
});

export const updateRole = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const { targetUserId, newRole } = req.body;
    const adminId = req.user.id;//get the authenticated user's ID from the auth middleware

    if (!targetUserId || !newRole) {
        res.status(400);
        throw new Error("Target User ID and new role are required.");
    }

    try {
        const updatedMembership = await changeMemberRole(adminId, tripId, targetUserId, newRole);
        res.status(200).json({
            message: "Role updated successfully!",
            member: updatedMembership
        });
    } catch (error) {
        if (error.message === "NOT_AUTHORIZED_ADMIN") {
            res.status(403);
            throw new Error("Forbidden: Only the Trip Admin can change roles.");
        }
        if (error.message === "CANNOT_DEMOTE_SELF") {
            res.status(400);
            throw new Error("Admins cannot change their own role.");
        }
        if (error.message === "INVALID_ROLE") {
            res.status(400);
            throw new Error("Role must be VIEWER or EDITOR.");
        }
        throw error;
    }
});

export const getMyTrips = asyncHandler(async (req, res) => {
    const userId = req.user.id;//get the authenticated user's ID from the auth middleware
    const trips = await getUserTripsList(userId);

    res.status(200).json({
        status: "success",
        results: trips.length,
        trips: trips
    });
});

export const removeMember = asyncHandler(async (req, res) => {
    const { tripId, targetUserId } = req.params;
    const adminId = req.user.id;
    //pulling the targetUserId from the URL params instead of the body, since this is a DELETE request and we want to follow RESTful conventions. The URL would look like: DELETE /api/trips/:tripId/members/:targetUserId

    if (!targetUserId) {
        res.status(400);
        throw new Error("Target User ID is required in the URL.");
    }

    try {
        await removeMemberFromTrip(adminId, tripId, targetUserId);

        res.status(200).json({
            message: "Member successfully removed from the trip."
        });
    }
    catch (error) {
        if (error.message === "NOT_AUTHORIZED_ADMIN") {
            res.status(403);
            throw new Error("Forbidden: Only the Trip Admin can remove members.");
        }
        if (error.message === "CANNOT_REMOVE_SELF") {
            res.status(400);
            throw new Error("Admins cannot remove themselves using this endpoint.");
        }
        if (error.message === "MEMBER_NOT_FOUND") {
            res.status(404);
            throw new Error("This user is not a member of the trip.");
        }
        throw error;
    }
})