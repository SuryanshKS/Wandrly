import { createPremiumOrder } from "../services/paymentService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const initializeCheckout = asyncHandler(async(req,res)=>{
    const userId = req.user.id;

    try{
        const order = await createPremiumOrder(userId);
        res.status(201).json({
            status: "success",
            key_id: process.env.RAZORPAY_KEY_ID, // Frontend uses this identifier string to render the dashboard widget
            order
        });
    }catch (error) {
        if (error.message === "ALREADY_PREMIUM") {
            res.status(400);
            throw new Error("Your profile status has already achieved the Premium tier level.");
        }
        res.status(502);
        throw new Error("Bad Gateway: Unable to register transaction voucher with financial server.");
    }
})