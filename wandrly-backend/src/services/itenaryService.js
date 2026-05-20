import prisma from "../config/prisma.js";
import { generativeStructuredAIResponse } from "./llmService.js";

//helper to check write permissions 
const verifyWriteAccess = async (userId, tripId) => {
    const member = await prisma.tripMember.findUnique({
        where: {
            trip_id_user_id: {
                trip_id: tripId,
                user_id: userId
            }
        }
    });
    if (!member || member.role === 'VIEWER') {
        throw new Error("NOT_AUTHORIZED_LOGISTICS");
    }
    return true;
};

//1. create an itinerary event for a trip
export const createItineraryEvent = async (userId, tripId, eventData) => {
    await verifyWriteAccess(userId, tripId);//check if the user has permission to modify the trip's logistics (only ADMIN and EDITOR can)

    const { title, start_time, end_time, lat, lng, intensity_level } = eventData;

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
export const getTripItenary = async (userId, tripId) => {
    const member = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: userId } }
    });
    if (!member) throw new Error("NOT_A_MEMBER");

    //fetch all itinerary events for the trip, ordered by start_time
    return await prisma.itineraryEvent.findMany({
        where: {
            trip_id: tripId
        },
        orderBy: {
            start_time: 'asc'
        }
    })
};


//3. delete an event
export const deleteItenaryEvent = async (userId, tripId, eventId) => {
    //check if the user has permission to modify the trip's logistics (only ADMIN and EDITOR can)
    await verifyWriteAccess(userId, tripId);

    //delete the event, but only if it belongs to the specified trip
    return await prisma.itineraryEvent.deleteMany({
        where: {
            id: eventId,
            trip_id: tripId
        }
    });
    //deleteMany is used instead of delete as delete would throw an error if the event with the given ID does not exist or does not belong to the trip, while deleteMany will simply return a count of 0 deleted records, 
}


export const updateItenaryEvent = async (userId, tripId, eventId, updatedData) => {
    //1. check if user is ADMIN or EDITOR of the trip
    await verifyWriteAccess(userId, tripId);

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
        where: {
            id: eventId
        },
        data: {
            title: updatedData.title,
            start_time: updatedData.start_time ? new Date(updatedData.start_time) : undefined,
            end_time: updatedData.end_time ? new Date(updatedData.end_time) : undefined,
            lat: updatedData.lat !== undefined ? parseFloat(updatedData.lat) : undefined,
            lng: updatedData.lng !== undefined ? parseFloat(updatedData.lng) : undefined,
            intensity_level: updatedData.intensity_level
        }
    });
};

export const analyzeAndFillGaps = async (userId, tripId, targetDateStr) => {
    // 1. Enforce Trip Membership
    const member = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: userId } }
    });
    if (!member) throw new Error("NOT_A_MEMBER");

    //2. parse target date boundaries
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

    //3. fetch all events of this day in sorted order
    const events = await prisma.itineraryEvent.findMany({
        where: {
            trip_id: tripId,
            start_time: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        orderBy: {
            start_time: 'asc'
        }
    });

    //4. gap detection
    const detectedGaps = [];

    for (let i = 0; i < events.length - 1; i++) {
        const currEvent = events[i];
        const nextEvent = events[i + 1];

        const gapInMilliseconds = nextEvent.start_time.getTime() - currEvent.end_time.getTime();

        const gapInHours = gapInMilliseconds / (1000 * 60 * 60);

        //if more than 1 hr, flag it for LLM
        if (gapInHours >= 1.0) {
            detectedGaps.push({
                gap_start: currEvent.end_time.toISOString(),
                gap_end: nextEvent.start_time.toISOString(),
                duration_hours: gapInHours.toFixed(1),
                origin_location: {
                    title: currEvent.title,
                    lat: currEvent.lat ? parseFloat(currEvent.lat) : null,
                    lng: currEvent.lng ? parseFloat(currEvent.lng) : null
                },
                destination_location: {
                    title: nextEvent.title,
                    lat: nextEvent.lat ? parseFloat(nextEvent.lat) : null,
                    lng: nextEvent.lng ? parseFloat(nextEvent.lng) : null
                }
            })
        }
    }

    //if no gaps exit early
    if (detectedGaps.length === 0) {
        return { message: "Your schedule is perfectly optimized! No gaps detected.", suggestions: [] };
    }

    //5. contstruct contextual AI prompt
    const systemPrompt = `
        You are Wandrly's Geospatial Travel Assistant. Your job is to look at empty gaps of time between a group's planned travel activities and suggest 2-3 highly specific, low-commitment activities to fill that gap.
        
        CRITICAL RULES:
        1. Recommendations MUST be physically close to the coordinate boundaries provided.
        2. Suggest quick, easy things: a highly-rated local coffee shop, a nearby scenic viewpoint, a park, or a quick museum walk. Avoid suggesting major excursions that take half a day.
        3. You must output exactly a JSON object matching the required format. Do not add markdown wrapping.
        
        EXACT JSON OUTPUT FORMAT REQUIRED:
        {
            "gaps_analyzed": [
                {
                    "time_window": "11:00 AM - 2:00 PM",
                    "recommendations": [
                        {
                            "activity_title": "Cafe Name or Spot Name",
                            "type": "Cafe / Viewpoint / Park / Quick Stop",
                            "description": "Short description of why this is a perfect stopover between Activity A and Activity B.",
                            "estimated_duration": "45 mins"
                        }
                    ]
                }
            ]
        }
    `;


    const userContext = `
        Target Date Analyzed: ${targetDateStr}
        Identified Timeline Gaps:
        ${JSON.stringify(detectedGaps, null, 2)}
    `;

    //6. execute AI processing
    const aiData = await generativeStructuredAIResponse(systemPrompt, userContext);

    // 🚨 ADD THIS: Let's x-ray exactly what Gemini is returning!
    console.log("🤖 RAW AI RESPONSE:", JSON.stringify(aiData, null, 2));

    // 7. Validate and Insert safely
    let generatedArray = aiData?.new_events || aiData?.events || [];

    // Filter and map ONLY valid events using a reducer
    const eventsToCreate = generatedArray.reduce((acc, event) => {
        // Attempt to parse the dates
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);

        // Only add to the database array if the dates are mathematically valid
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            acc.push({
                trip_id: tripId,
                title: event.title || event.activity_title || "AI Suggested Activity",
                start_time: start,
                end_time: end,
                intensity_level: event.intensity_level || "MEDIUM"
            });
        }
        return acc;
    }, []);

    // Bulk insert the new events into PostgreSQL
    try {
        if (eventsToCreate.length > 0) {
            await prisma.itineraryEvent.createMany({ data: eventsToCreate });
            console.log(`✅ Successfully saved ${eventsToCreate.length} events to database!`);
        } else {
            console.log("⚠️ AI didn't return valid timestamped events. Nothing saved.");
        }
    } catch (dbError) {
        console.error("💥 PRISMA INSERTION ERROR:", dbError);
    }

    return {
        date: targetDateStr,
        total_gaps_found: detectedGaps.length,
        inserted_events: eventsToCreate.length
    };
};
