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

    // 1.5 Fetch Trip Destination Context
    const tripContext = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { destination: true }
    });
    const destination = tripContext?.destination || "the specified travel destination";

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

    // 5. construct contextual AI prompt
    const systemPrompt = `
  You are Wandrly's Geospatial Travel Assistant. Your exact current location is: **${destination}**.
  Look at the empty gaps of time between a group's planned travel activities.
  
  CRITICAL RULES:
  1. PROPORTIONAL SUGGESTIONS: Calculate the duration of the gap. If it's a 2-hour gap, suggest 1 event. If it's a 10-hour gap, suggest 3-4 distinct events spaced logically throughout the day. Similarly, determine the no. of events you suggest based on the gap durations, if there are multiple gaps, treat each gap as one time_frame and suggest the no. of events for that particular time frame, ex if there are 2 gaps of 2 hours and 6 hours, then in first gap suggest 1 1 hour event, in second suggest 2 2 hours events or 4 1 hour events.
  2. BE SPECIFIC: Do NOT suggest generic places (e.g., "Downtown Cafe"). Suggest REAL, specific, highly-rated businesses, restaurants, or landmarks for ${destination}. You can search online and refer to search results from sites like reddit for real user experiences at those places. Make sure to keep these suggested events nearby from the previous event or current location.
  3. You MUST provide valid ISO 8601 timestamps for start_time and end_time. Leave breathing room (30-60 mins) between multiple events.
  4. intensity_level must be "CHILL", "MEDIUM", or "INTENSE".

  EXACT JSON OUTPUT FORMAT REQUIRED:
  {
    "gaps_analyzed": [
      {
        "time_window": "9:00 AM - 8:00 PM",
        "recommendations": [
          {
            "activity_title": "Breakfast at Blue Tokai Coffee Roasters",
            "type": "Cafe",
            "description": "Start your morning with artisanal coffee and fresh croissants at this top-rated local roastery.",
            "estimated_duration": "1 hour",
            "start_time": "2026-05-20T09:30:00.000Z",
            "end_time": "2026-05-20T10:30:00.000Z",
            "intensity_level": "CHILL"
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

    // 6. execute AI processing
    const aiData = await generativeStructuredAIResponse(systemPrompt, userContext);
    console.log("🤖 RAW AI RESPONSE:", JSON.stringify(aiData, null, 2));

    // 7. Safely extract nested recommendations from the AI's preferred format
    let eventsToCreate = [];

    if (aiData && Array.isArray(aiData.gaps_analyzed)) {
        aiData.gaps_analyzed.forEach(gap => {
            if (Array.isArray(gap.recommendations)) {
                gap.recommendations.forEach(rec => {
                    // Attempt to parse the AI's dates
                    const start = new Date(rec.start_time);
                    const end = new Date(rec.end_time);

                    // Only add to the DB array if dates are valid
                    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                        eventsToCreate.push({
                            trip_id: tripId,
                            title: rec.activity_title || "AI Suggested Activity",
                            description: rec.description || null,
                            start_time: start,
                            end_time: end,
                            intensity_level: rec.intensity_level || "MEDIUM"
                        });
                    }
                });
            }
        });
    }

    // Bulk insert the new events into PostgreSQL
    try {
        if (eventsToCreate.length > 0) {
            await prisma.itineraryEvent.createMany({ data: eventsToCreate });
            console.log(`✅ Successfully saved ${eventsToCreate.length} events to database!`);
        } else {
            console.log("⚠️ AI returned empty recommendations. Nothing saved.");
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