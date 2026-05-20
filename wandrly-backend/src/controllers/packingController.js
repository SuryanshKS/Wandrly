import { addPackingItem, getPackingList, removePackingItem, updatePackingItem, generateSmartPackingList } from "../services/packingService.js";
import asyncHandler from "../utils/asyncHandler.js";


export const addItem = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const { item_name } = req.body;
    const userId = req.user.id;

    if (!item_name) {
        res.status(400);
        throw new Error("Item name is required.");
    }

    try {
        const item = await addPackingItem(userId, tripId, item_name);
        res.status(201).json({ message: "Item added to packing list.", item });
    } catch (error) {
        if (error.message === "NOT_AUTHORIZED_LOGISTICS") {
            res.status(403);
            throw new Error("Forbidden: Viewers cannot modify the packing list.");
        }
        throw error;
    }
});

export const getItems = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const userId = req.user.id;

    try {
        const items = await getPackingList(userId, tripId);
        res.status(200).json({ status: "success", count: items.length, items });
    } catch (error) {
        if (error.message === "NOT_A_MEMBER") {
            res.status(403);
            throw new Error("Forbidden: Only trip members can view this list.");
        }
        throw error;
    }
});

export const updateItem = asyncHandler(async (req, res) => {
    const { tripId, itemId } = req.params;
    const { is_packed, new_item_name } = req.body;
    const userId = req.user.id;

    if (typeof is_packed !== 'boolean') {
        res.status(400);
        throw new Error("is_packed must be a boolean value.");
    }

    try {
        const updatedItem = await updatePackingItem(userId, tripId, itemId, is_packed, new_item_name);
        res.status(200).json({
            message: "Item updated!",
            item: updatedItem,
        });
    } catch (error) {
        if (error.message === "NOT_AUTHORIZED_LOGISTICS") {
            res.status(403);
            throw new Error("Forbidden: Viewers cannot check off items.");
        }
        if (error.message === "ITEM_NOT_FOUND") {
            res.status(404);
            throw new Error("Item not found or does not belong to this trip.");
        }
        throw error;
    }
});

export const deleteItem = asyncHandler(async (req, res) => {
    const { tripId, itemId } = req.params;
    const userId = req.user.id;

    try {
        await removePackingItem(userId, tripId, itemId);
        res.status(200).json({
            message: "Item deleted successfully!",
        })
    } catch (error) {
        if (error.message === "NOT_AUTHORIZED_LOGISTICS") {
            res.status(403);
            throw new Error("Forbidden: Viewers cannot delete items.");
        }
        throw error;
    }
});



export const triggerAiPacking = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const userId = req.user.id;

    try {
        const items = await generateSmartPackingList(userId, tripId);
        res.status(201).json({
            status: "success",
            message: `Successfully generated and inserted ${items.length} AI-recommended items.`,
            items
        });
    } catch (error) {
        if (error.message === "NOT_AUTHORIZED_LOGISTICS") {
            res.status(403);
            throw new Error("Forbidden: Viewers cannot trigger AI automation layers.");
        }
        if (error.message === "TRIP_NOT_FOUND") {
            res.status(404);
            throw new Error("Target trip record could not be found.");
        }
        if (error.message === "AI_GENERATION_FAILED" || error.message === "AI_MALFORMED_RESPONSE") {
            res.status(502);
            throw new Error("Bad Gateway: The AI engine failed to return a valid structured payload.");
        }

        // FIXED: Catch external Google API Overload / 503 errors dynamically
        if (error.message.includes("503") || error.status === 503 || error.message.includes("GoogleGenerativeAI")) {
            return res.status(503).json({
                status: "error",
                message: "The AI service is currently experiencing unusually high demand. Please wait a moment and try again."
            });
        }

        throw error;
    }
})