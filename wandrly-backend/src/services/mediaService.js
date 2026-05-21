import prisma from "../config/prisma.js";
import { uploadToCloudinary , deleteFromCloudinary } from "../config/cloudinary.js";

export const processMediaUpload = async(userId,tripId,eventId,fileBuffer)=>{
    // 1. RBAC Check: Ensure the user is an Admin or Editor on this trip
    const member = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: userId } }
    });
    if (!member || member.role === 'VIEWER') throw new Error("NOT_AUTHORIZED_MEDIA");

    //2. stream the image binary to cloudinary
    const publicUrl = await uploadToCloudinary(fileBuffer);

    //3. save the public url to DB
    return await prisma.tripMedia.create({
        data:{
            trip_id:tripId,
            event_id:eventId || null,
            uploaded_by:userId,
            file_url:publicUrl
        }
    });
};

//one-click travelogue query engine
export const compileChronologicalTravelogue = async(userId,tripId) => {
    //ensure user has reading rights
    const member = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: userId } }
    });
    if (!member) throw new Error("NOT_A_MEMBER");
    
    //fetch only those events that contain coordinates
    return await prisma.itineraryEvent.findMany({
        where:{
            trip_id:tripId,
        },
        include:{
            media:{
                select:{
                    file_url:true,
                    uploader:{
                        select:{
                            id:true,
                            name:true,
                        }
                    }
                }
            }
        },
        orderBy:{
            start_time:'asc'//traces the route chronolgically
        }
    });
};


export const removeMediaRecord = async(userId,tripId,mediaId)=>{
    // 1. Fetch the targeted media asset to check ownership and retrieve the URL
    const mediaItem = await prisma.tripMedia.findUnique({
        where: { id: mediaId }
    });
    if (!mediaItem) throw new Error("MEDIA_NOT_FOUND");
    if (mediaItem.trip_id !== tripId) throw new Error("MISMATCHED_RESOURCE");

    // 2. Auth Check: Only the original uploader OR a Trip Admin can delete a media asset
    const member = await prisma.tripMember.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: userId } }
    });
    
    const isOwner = mediaItem.uploaded_by === userId;
    const isAdmin = member?.role === 'ADMIN';

    if (!isOwner && !isAdmin) throw new Error("UNAUTHORIZED_DELETION");

    // 3. Step One: Delete from Cloudinary Cloud Storage
    await deleteFromCloudinary(mediaItem.file_url);

    // 4. Step Two: Atomically remove the structural ledger entry from PostgreSQL
    return await prisma.tripMedia.delete({
        where: { id: mediaId }
    });
}