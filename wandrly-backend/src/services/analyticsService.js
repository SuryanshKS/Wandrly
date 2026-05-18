import prisma from "../config/prisma.js";

//the mathematical weight of each vibe
const INTENSITY_WEIGHTS = {
    CHILL: 1,
    MEDIUM: 2,
    INTENSE: 3
};

export const getPacingAnalytics = async(userId,tripId)=>{
    // 1. Verify trip membership
    const member = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: userId } }
    });
    if (!member) throw new Error("NOT_A_MEMBER");

    //2. fetch all events for this trip
    const events = await prisma.itineraryEvent.findMany({
        where:{
            trip_id:tripId
        },
        orderBy:{
            start_time:'asc'
        }
    });

    //3. group by day and calculate metrics
    const dailyPacing  = {};

    events.forEach(event=>{
        //extract date in YYYY-MM-DD format
        const dateKey = event.start_time.toISOString().split('T')[0];

        //initialise the date entry if it doesn't exist
        if(!dailyPacing[dateKey]){
            dailyPacing[dateKey] = {
                date:dateKey,
                total_intensity_score: 0,
                event_count: 0,
                breakdown:{
                    CHILL:0,
                    MEDIUM:0,
                    INTENSE:0
                },
                events:[]//keeping lightweight event details for potential frontend use
            };
        }

        //apply the intensity weight to calculate the score contribution of this event
        const weight = INTENSITY_WEIGHTS[event.intensity_level] || 2;
        dailyPacing[dateKey].total_intensity_score += weight;
        dailyPacing[dateKey].event_count += 1;
        dailyPacing[dateKey].breakdown[event.intensity_level] += 1;

        //store lightweight event details for potential frontend use
        dailyPacing[dateKey].events.push({
            title: event.title,
            intensity: event.intensity_level,
        });
    });

    //4. transforming the dailyPacing object into an array and calculating average intensity
    return Object.values(dailyPacing).map(day=>{
        let burnoutRisk = "LOW";

        //algo : High if score 8+ or 2+ intense events back to back
        if(day.total_intensity_score>=8 || day.breakdown.INTENSE >=2){
            burnoutRisk = "HIGH";
        } 
        else if(day.total_intensity_score>=5){
            burnoutRisk = "MEDIUM";
        }

        return {
            ...day,
            burnoutRisk
        };
    })
}