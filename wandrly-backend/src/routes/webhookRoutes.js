import express from 'express';
import prisma from '../config/prisma.js';
import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

// 🚨 CRUCIAL: We use express.raw() to capture the exact byte-stream before JSON parsing mutates it

router.post('/razorpay',express.raw({type:'application/json'}),asyncHandler(async(req,res)=>{
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
        return res.status(400).json({ status: "error", message: "Missing signature payload." });
    }

    //1. reconstruct the signature locally using hidden secret
    const hmac = crypto.createHmac('sha256',secret);
    hmac.update(req.body);//req.body is a raw buffer here not a JSON object
    const generatedSignature = hmac.digest('hex');

    //2. cryptographic timing-safe equality check(prevents timing attacks)
    const isAuthentic = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(generatedSignature)
    );
    if (!isAuthentic) {
        console.error("🚨 CRITICAL: Fake webhook payload detected and blocked!");
        return res.status(403).json({ status: "error", message: "Invalid signature." });
    }

    // 3. Signature matches! It is safe to parse the buffer into JSON now.
    const eventData = JSON.parse(req.body.toString());

    //4. listen for succesfull captures
    if(eventData.event==='payment.captured'){
        const {notes} = eventData.payload.payment.entity;
        const targetUserId = notes?.userId;//we injected this earlier in createPremiumOrder

        if(targetUserId){
            //5. upgrade user
            await prisma.user.update({
                where:{id:targetUserId},
                data:{is_premium:true}
            });
            console.log(`👑 SUCCESS: User ${targetUserId} upgraded to PREMIUM via verified Webhook.`);
        }
    }
    // 6. Razorpay requires a fast 200 OK response, otherwise it assumes failure and retries
    res.status(200).json({ status: "ok" });
}));

export default router;