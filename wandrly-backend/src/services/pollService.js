import prisma from "../config/prisma.js";

const verifyTripMember = async (userId, tripId) => {
    const member = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: userId } }
    });
    if (!member) throw new Error("NOT_A_MEMBER");
    return member;
};

//1. create a poll (admin/editor only)
export const createTripPoll = async (userId, tripId, question, optionsArray) => {
    const member = await verifyTripMember(userId, tripId);

    if (member.role === 'VIEWER') throw new Error("NOT_AUTHORIZED_POLLING");

    if (!optionsArray || optionsArray.length < 2) {
        throw new Error("MINIMUM_TWO_OPTIONS");
    }

    //using a nested write to create the poll and its options in one atomic transaction
    return await prisma.poll.create({
        data: {
            trip_id: tripId,
            created_by: userId,
            question: question,
            options: {
                create:
                    optionsArray.map(optionText => ({
                        option_text:optionText
                    }))
            }
        },
        include:{
            options:true
        }
    });
};


//2. get all polls for a trip (only members can view)
export const getTripPolls = async(userId,tripId)=>{
    await verifyTripMember(userId, tripId);//will throw error if not a member

    return await prisma.poll.findMany({
        where:{
            trip_id: tripId
        },
        include:{
            creator:{
                select:{
                    id:true,
                    name:true,
                }
            },
            options:{
                include:{
                    _count:{
                        select:{
                            votes:true//automatically aggregates vote counts
                        }
                    }
                }
            },
            votes:{
                where:{
                    user_id:userId//shows if current user has voted and for which option
                },
                select:{
                    option_id:true
                }
            }
        },
        orderBy:{
            created_at:'desc'
        }
    })
};


//3, cast a vote
export const castPollVote = async(userId,tripId,pollId,optionId)=>{
    await verifyTripMember(userId, tripId);

    //verify the option actually belongs to the poll 
    const optionCheck = await prisma.pollOption.findFirst({
        where: { id: optionId, poll_id: pollId }
    });
    if (!optionCheck) throw new Error("INVALID_OPTION");

    try{
        //upsert allows users to CHANGE their vote safely
        //if a record with this composite key exists, update, else create it
        return await prisma.vote.upsert({
            where:{
                poll_id_user_id:{
                    poll_id: pollId,
                    user_id: userId
                }
            },
            update:{
                option_id: optionId
            },
            create:{
                poll_id: pollId,
                user_id: userId,
                option_id: optionId
            }
        });
    }catch (error) {
        throw error;
    }
};