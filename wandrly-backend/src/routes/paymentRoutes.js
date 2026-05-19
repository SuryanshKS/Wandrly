import express from 'express';
import { initializeCheckout } from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/checkout',protect,initializeCheckout);

export default router;