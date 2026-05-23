import prisma from "../config/prisma.js";
import razorpayClient from "../config/razorpay.js";

//check if a user has hit their allocation limits
export const validateTripCreationLimit = async(userId)=>{
    const user = await  prisma.user.findUnique({
        where:{ id: userId },
        select:{is_premium:true}
    });

    if(user?.is_premium)return true;

    //count trips where this user is registered as a creator (ADMIN)
    const ownedTripCount = await prisma.tripMember.count({
        where:{
            user_id:userId,
            role:'ADMIN'
        }
    });

    // Enforce strict limit boundary for tier compliance
    if (ownedTripCount >= 1) {
        throw new Error("PAYWALL_LIMIT_REACHED");
    }
};


//establish communication with razorpay API to establish authentic banking transaction session
export const createPremiumOrder = async(userId) => {
    const user = await prisma.user.findUnique({
        where:{
            id:userId
        }
    });
    if(user?.is_premium) throw new Error("ALREADY_PREMIUM");

    const options = {
        amount: 49900, // Price in lowest denomination currency units (499.00 INR)
        currency: "INR",
        receipt: `receipt_premium_${userId.substring(0, 8)}`,
        notes: {
            userId: userId, // We embed the userId here so we can read it during the webhook step later!
            purpose: "Wandrly Premium Upgrade"
        }
    };

    // Fired across network to Razorpay servers
    const order = await razorpayClient.orders.create(options);
    return order;
}