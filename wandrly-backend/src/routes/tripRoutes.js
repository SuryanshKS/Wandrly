import express from 'express';
import { createTrip, getMyTrips, getSingleTrip, inviteMember, removeMember, updateRole } from '../controllers/tripController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { addExpense, settleDebt } from '../controllers/expenseController.js';
import { getTripSettlements } from '../controllers/settlementController.js';
import { addEvent, editEvent, fillItenaryGaps, getEvents, removeEvent } from '../controllers/itenaryController.js';
import { addItem, deleteItem, getItems, triggerAiPacking, updateItem } from '../controllers/packingController.js';
import { addPoll, getPolls, voteInPoll } from '../controllers/pollController.js';
import { getGlobalMapData, getVibeCheck } from '../controllers/analyticsController.js';
import { uploadMiddleware } from '../config/cloudinary.js';
import { deleteMediaItem, getTravelogue, uploadMediaItem, getTripGallery, assignMediaToEvent } from '../controllers/mediaController.js';
import { getCoordinates } from '../utils/geocoder.js';
import prisma from '../config/prisma.js';

const router = express.Router();

router.use(protect);//apply the protect middleware to all routes in this router, so that only authenticated users can access these routes

// The user MUST pass through the 'protect' bouncer before reaching 'createTrip'
// router.post('/', protect, createTrip);
router.post('/', protect, uploadMiddleware.single('coverImage'), createTrip);//create a new trip, only for authenticated users
router.get('/', getMyTrips);//GET /api/trips

// Analytics - Global Map
router.get('/analytics/global-map', protect, getGlobalMapData);

router.post('/:tripId/members', inviteMember);//POST /api/trips/:tripId/members
router.put('/:tripId/members/role', updateRole);
router.delete('/:tripId/members/:targetUserId', removeMember);

//adding the expense routes here as all the expenses belong a trip only, hence it makes sense to keep them nested under the trip routes
router.post('/:tripId/expenses', addExpense);//POST /api/trips/:tripId/expenses, only for authenticated users who are members of the trip (enforced in the controller/service)
router.get('/:tripId/settlements', getTripSettlements);//GET /api/trips/:tripId/settlements, only for authenticated users who are members of the trip (enforced in the controller)
router.post('/:tripId/settle', settleDebt);//POST /api/trips/:tripId/settle, only for authenticated users who are members of the trip (enforced in the controller)

//adding the itenary routes here as well, since the itenary events also belong to a trip, it makes sense to keep them nested under the trip routes
router.post('/:tripId/itenary', addEvent);//POST /api/trips/:tripId/itenary
router.get('/:tripId/itenary', getEvents);//GET /api/trips/:tripId/itenary
router.delete('/:tripId/itenary/:eventId', removeEvent);//DELETE /api/trips/:tripId/itenary/:eventId
router.patch('/:tripId/itenary/:eventId', editEvent);//PATCH /api/trips/:tripId/itenary/:eventId

//packing routes
router.post('/:tripId/packing', addItem);//POST /api/trips/:tripId/packing
router.get('/:tripId/packing', getItems);//GET /api/trips/:tripId/packing
router.patch('/:tripId/packing/:itemId', updateItem);//PATCH /api/trips/:tripId/packing/:itemId
router.delete('/:tripId/packing/:itemId', deleteItem);//DELETE /api/trips/:tripId/packing/:itemId

//polling routes
router.post('/:tripId/polls', addPoll);//POST /api/trips/:tripId/polls
router.get('/:tripId/polls', getPolls);//GET /api/trips/:tripId/polls
router.post('/:tripId/polls/:pollId/vote', voteInPoll);//POST /api/trips/:tripId/polls/:pollId/vote

//analytics engine
router.get('/:tripId/analytics/pacing', getVibeCheck);

//ai automation routes
router.post('/:tripId/packing/auto-generate', triggerAiPacking);//for packing list based on weather and events
// router.get('/:tripId/itenary/fill-gaps',fillItenaryGaps);//for fill-the-gap feature
router.post('/:tripId/itenary/fill-gaps', fillItenaryGaps);

//media uploading and travelogue endpoints
router.post('/:tripId/media/upload', uploadMiddleware.single('image'), uploadMediaItem);
router.get('/:tripId/travelogue', getTravelogue);
router.get('/:tripId/gallery', getTripGallery); // NEW: For our Masonry UI
router.patch('/:tripId/media/:mediaId/assign', assignMediaToEvent);//attaching an image to particular event
router.delete('/:tripId/media/:mediaId', deleteMediaItem);


//getting trip details from tripId
router.get('/:tripId', protect, getSingleTrip);//GET /api/trips/:tripId



export default router;