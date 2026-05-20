import prisma from "../config/prisma.js";
import { validateTripCreationLimit } from "./paymentService.js";

export const createTripTransaction = async (userId, tripData) => {

    // FIREWALL ACTION: Intercepts call and throws an exception if free limits are exhausted
    await validateTripCreationLimit(userId);

    const newTrip = await prisma.$transaction(async (tx) => {
        //1. create the trip itself
        const trip = await tx.trip.create({
            data: {
                title: tripData.title,
                destination: tripData.destination,

                //convert strings into real JS Date objects 
                start_date: new Date(tripData.start_date),
                // Only map end_date if the user provided one, otherwise keep it null/undefined
                end_date: tripData.end_date ? new Date(tripData.end_date) : undefined,

                // This is the critical part: we link the trip to the creator's user ID directly in the database, using Prisma's relation connect syntax. This ensures that the trip is securely associated with the authenticated user, and prevents any possibility of spoofing or creating trips under another user's account.
                creator: {
                    connect: { id: userId } // This links the trip to the logged-in User ID!
                },
                cover_image: tripData.cover_image,
            }
        });

        //2. add the creator as the admin in the TripMember table
        await tx.tripMember.create({
            data: {
                trip_id: trip.id,
                user_id: userId,
                role: 'ADMIN'
            }
        });

        return trip;//return the created trip back to controller
    });

    return newTrip;
}

//1. onboard a friend onto the trip
export const addMemberToTrip = async (adminId, tripId, memberEmail, requestedRole = 'VIEWER') => {
    const validRoles = ['VIEWER', 'EDITOR'];
    const assignedRole = validRoles.includes(requestedRole) ? requestedRole : 'VIEWER';

    //A. verify that this request is being made by an admin of the trip
    const adminCheck = await prisma.tripMember.findUnique({
        where: {
            trip_id_user_id: {
                trip_id: tripId,
                user_id: adminId
            }
        }
    });

    if (!adminCheck || adminCheck.role !== 'ADMIN') {
        throw new Error("Only trip admins can add members to the trip.");
    }

    //B. find the user by email
    const targetUser = await prisma.user.findUnique({
        where: { email: memberEmail }
    });

    if (!targetUser) {
        throw new Error("No user found with that email address.");
    }

    //C. check if already a member to avoid duplicates
    const existingMember = await prisma.tripMember.findUnique({
        where: {
            trip_id_user_id: {
                trip_id: tripId,
                user_id: targetUser.id
            }
        }
    });

    if (existingMember) {
        throw new Error("ALREADY_A_MEMBER");
    }

    // D. Onboard them into the trip!
    const newMember = await prisma.tripMember.create({
        data: {
            trip_id: tripId,
            user_id: targetUser.id,
            role: 'VIEWER' // Default role for invitees
        },
        include: {
            // Optionally include user details in the response, but be careful not to include sensitive info like password hashes. We can select only the safe fields we want to return.
            user: {
                select: { id: true, name: true, email: true }
            }
        }
    });

    return newMember;
};

//also add a fxn to change a member's role
export const changeMemberRole = async (adminId, tripId, targetUserId, newRole) => {
    // A. Check if the requester is the Admin
    const adminCheck = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: adminId } }
    });
    if (!adminCheck || adminCheck.role !== 'ADMIN') {
        throw new Error("NOT_AUTHORIZED_ADMIN");
    }

    // B. Prevent the Admin from accidentally demoting themselves!
    if (adminId === targetUserId) {
        throw new Error("CANNOT_DEMOTE_SELF");
    }

    // C. Validate the new role
    if (newRole !== 'VIEWER' && newRole !== 'EDITOR') {
        throw new Error("INVALID_ROLE");
    }

    // D. Update the role in the database
    const updatedMember = await prisma.tripMember.update({
        where: {
            trip_id_user_id: {
                trip_id: tripId,
                user_id: targetUserId
            }
        },
        data: { role: newRole },
        include: { user: { select: { id: true, name: true, email: true } } }
    });

    return updatedMember;
}

//2. get all trips for a user
export const getUserTripsList = async (userId) => {
    const memberships = await prisma.tripMember.findMany({
        where: { user_id: userId },
        include: {
            trip: true//natively join the trip data with the membership, so we get all the trip details in one query without needing to manually stitch them together in code
        }
    });

    //clean up the data to return only the trip details, we don't need to return the membership info to the client
    return memberships.map(m => ({
        ...m.trip,
        myRole: m.role
    }));
}


//DELETING a user from a trip 
export const removeMemberFromTrip = async (adminId, tripId, targetUserId) => {
    //A. check if requester is admin
    const adminCheck = await prisma.tripMember.findUnique({
        where: {
            trip_id_user_id: {
                trip_id: tripId,
                user_id: adminId
            }
        }
    });

    if (!adminCheck || adminCheck.role !== 'ADMIN') {
        throw new Error("NOT_AUTHORIZED_ADMIN");
    }

    // B. Prevent the Admin from accidentally deleting themselves
    if (adminId === targetUserId) {
        throw new Error("CANNOT_REMOVE_SELF");
    }

    // C. Verify the target user is actually in the trip
    const targetMemberCheck = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: targetUserId } }
    });

    if (!targetMemberCheck) {
        throw new Error("MEMBER_NOT_FOUND");
    }

    //D. delete the member record
    await prisma.tripMember.delete({
        where: {
            trip_id_user_id: {
                trip_id: tripId,
                user_id: targetUserId
            }
        }
    });

    return true;//indicate success
}


//getting trip details from a tripId
export const getTripDetails = async (tripId, userId) => {
    const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
            members: true//include members to check permission
        }
    });

    if (!trip) {
        throw new Error("Trip not found");
    }

    //check user is a member of trip
    const isMember = trip.members.some(m => m.user_id === userId);
    if (!isMember) {
        throw new Error("Unauthorized: You do not have access to this trip");
    }

    return trip;
}