import prisma from "../config/prisma.js";
import { getPacingAnalytics } from "../services/analyticsService.js";
import { compileChronologicalTravelogue, processMediaUpload, removeMediaRecord } from "../services/mediaService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const uploadMediaItem = asyncHandler(async (req, res) => {
    // 🔥 TRIPWIRES: What did Multer actually catch?
    // console.log("🔥 MULTER FILE:", req.file); this showed that multer succesfully intercepted image and uploaded it to cloudinary, the multer-storage-cloudinary middleware  automatically uploaded image, before even the controller runs and provides the URL inside req.file.path, but our fxn tries to take req.file and upload it again, it expects a buffer but gets URL hence cloudinary gets confused and throws error on this URL instead of getting buffer
    // console.log("🔥 REQUEST BODY:", req.body);
    const { tripId } = req.params;
    // const { event_id } = req.body;
    // const userId = req.user.id;

    // if (!req.file) {
    //     res.status(400);
    //     throw new Error("No file uploaded.");
    // }

    try {
        // 1. Safety check
        if (!req.file) {
            return res.status(400).json({ message: "No image file detected." });
        }
        // 2. Extract the URL that Multer already generated!
        const cloudinaryUrl = req.file.path;
        // 3. Save directly to your database (Make sure this matches your Prisma model name!)
        const newMedia = await prisma.tripMedia.create({
            data: {
                trip_id: tripId,
                file_url: cloudinaryUrl,
                uploaded_by: req.user.id
            }
        });

        // 4. Send the new database record back to the React frontend
        return res.status(201).json({
            status: "success",
            data: newMedia
        });
        // const mediaRecord = await processMediaUpload(userId, tripId, event_id, req.file.buffer);
        // res.status(201).json({
        //     status: "success",
        //     message: "Memory uploaded and securely linked to coordinates.",
        //     mediaRecord
        // });
    } catch (error) {
        // if (error.message === "NOT_AUTHORIZED_MEDIA") {
        //     res.status(403);
        //     throw new Error("Forbidden: Viewers are restricted from contributing media.");
        // }
        // throw error;

        console.error("🔥 MEDIA CONTROLLER ERROR:", error);
        return res.status(500).json({ message: "Failed to save media to database." });
    }
});

export const getTravelogue = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const userId = req.user.id;

    try {
        const routeData = await compileChronologicalTravelogue(userId, tripId);
        res.status(200).json({ status: "success", route_markers: routeData });
    }
    catch (error) {
        if (error.message === "NOT_A_MEMBER") {
            res.status(403);
            throw new Error("Forbidden: You must be a verified trip member to trace this travelogue.");
        }
        throw error;
    }
});

export const deleteMediaItem = asyncHandler(async (req, res) => {
    const { tripId, mediaId } = req.params;
    const userId = req.user.id;

    try {
        await removeMediaRecord(userId, tripId, mediaId);
        res.status(200).json({
            status: "success",
            message: "Memory permanently cleared from both cloud vaults and database logs."
        });
    } catch (error) {
        if (error.message === "MEDIA_NOT_FOUND" || error.message === "MISMATCHED_RESOURCE") {
            res.status(404);
            throw new Error("The target media asset could not be located on this trip cluster.");
        }
        if (error.message === "UNAUTHORIZED_DELETION") {
            res.status(403);
            throw new Error("Forbidden: You lack permissions to drop this media asset record.");
        }
        throw error;
    }
})

// NEW: Dedicated flat-fetch for the Masonry Gallery UI
export const getTripGallery = async (req, res) => {
  const { tripId } = req.params;

  try {
    const media = await prisma.tripMedia.findMany({
      where: { 
        trip_id: tripId 
      },
      orderBy: {
        id: 'desc' // Shows newest uploads first at the top of the gallery
      }
    });

    res.status(200).json({ 
      status: "success", 
      data: media 
    });

  } catch (error) {
    console.error("🔥 GET GALLERY ERROR:", error);
    res.status(500).json({ message: "Failed to fetch gallery." });
  }
};

// NEW: Link a photo to a specific itinerary event
export const assignMediaToEvent = async (req, res) => {
  const { tripId, mediaId } = req.params;
  const { event_id } = req.body; // We will pass the event ID from the frontend dropdown

  try {
    // 1. Verify ownership/admin rights (optional but good practice)
    const media = await prisma.tripMedia.findUnique({ where: { id: mediaId } });
    if (!media) return res.status(404).json({ message: "Media not found." });

    // 2. Update the record
    const updatedMedia = await prisma.tripMedia.update({
      where: { id: mediaId },
      data: { 
        event_id: event_id === "none" ? null : event_id 
      }
    });

    res.status(200).json({ 
      status: "success", 
      message: "Media linked to event successfully.",
      data: updatedMedia 
    });

  } catch (error) {
    console.error("🔥 ASSIGN MEDIA ERROR:", error);
    res.status(500).json({ message: "Failed to link media to event." });
  }
};