import prisma from "../config/prisma.js";

//helper to check write permissions 
const verifyWriteAccess = async(userId,tripId)=>{
    const member = await prisma.tripMember.findUnique({
        where:{
            trip_id_user_id:{
                trip_id: tripId,
                user_id: userId
            }
        }
    });
    if(!member || member.role === 'VIEWER'){
        throw new Error("NOT_AUTHORIZED_LOGISTICS");
    }
    return true;
};

//1. create an itinerary event for a trip
export const createItineraryEvent = async(userId,tripId,eventData)=>{
    await verifyWriteAccess(userId,tripId);//check if the user has permission to modify the trip's logistics (only ADMIN and EDITOR can)

    const {title, start_time, end_time, lat, lng, intensity_level} = eventData;

    //chronological integrity check: start_time should be before end_time
    if (new Date(start_time) >= new Date(end_time)) {
        throw new Error("INVALID_TIMEFRAME");
    }
    
    return await prisma.itineraryEvent.create({
        data: {
            trip_id: tripId,
            title,
            start_time: new Date(start_time),
            end_time: new Date(end_time),
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null,
            intensity_level: intensity_level || 'MEDIUM'
        }
    })
};


//2. read the whole schedule of itinerary events for a trip
export const getTripItenary = async(userId,tripId)=>{
    const member = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: userId } }
    });
    if (!member) throw new Error("NOT_A_MEMBER");

    //fetch all itinerary events for the trip, ordered by start_time
    return await prisma.itineraryEvent.findMany({
        where:{
            trip_id: tripId
        },
        orderBy:{
            start_time: 'asc'
        }
    })
};


//3. delete an event
export const deleteItenaryEvent = async(userId,tripId,eventId)=>{
    //check if the user has permission to modify the trip's logistics (only ADMIN and EDITOR can)
    await verifyWriteAccess(userId,tripId);

    //delete the event, but only if it belongs to the specified trip
    return await prisma.itineraryEvent.deleteMany({
        where:{
            id: eventId,
            trip_id: tripId
        }
    });
    //deleteMany is used instead of delete as delete would throw an error if the event with the given ID does not exist or does not belong to the trip, while deleteMany will simply return a count of 0 deleted records, 
}


export const updateItenaryEvent = async(userId, tripId,eventId,updatedData)=>{
    //1. check if user is ADMIN or EDITOR of the trip
    await verifyWriteAccess(userId,tripId);

    //2. tenant isolation check : does the event actually belong to the trip?
    const existingEvent = await prisma.itineraryEvent.findFirst({
        where: {
            id: eventId,
            trip_id: tripId
        }
    });

    if (!existingEvent) {
        throw new Error("EVENT_NOT_FOUND");
    }

    //3. if start_time or end_time are being updated, perform the chronological integrity check
    const newStartTime = updatedData.start_time ? new Date(updatedData.start_time) : existingEvent.start_time;
    const newEndTime = updatedData.end_time ? new Date(updatedData.end_time) : existingEvent.end_time;

    if (newStartTime >= newEndTime) {
        throw new Error("INVALID_TIMEFRAME");
    }

    //4. peform the update
    return await prisma.itineraryEvent.update({
        where:{
            id: eventId
        },
        data:{
            title: updatedData.title,
            start_time: updatedData.start_time ? new Date(updatedData.start_time) : undefined,
            end_time: updatedData.end_time ? new Date(updatedData.end_time) : undefined,
            lat: updatedData.lat !== undefined ? parseFloat(updatedData.lat) : undefined,
            lng: updatedData.lng !== undefined ? parseFloat(updatedData.lng) : undefined,
            intensity_level: updatedData.intensity_level
        }
    });
}