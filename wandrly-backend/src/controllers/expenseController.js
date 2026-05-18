import asyncHandler from "../utils/asyncHandler.js";
import { createExpenseTransaction } from "../services/expenseService.js";

export const addExpense = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const { description, total_amount, paid_by, splits } = req.body;
    const requesterId = req.user.id;//get the authenticated user's ID from the auth middleware

    //basic payload validation
    if (!description || !total_amount || !splits || !Array.isArray(splits)) {
        res.status(400);
        throw new Error("Description, total_amount, and an array of splits are required.");
    }

    try {
        const expense = await createExpenseTransaction(requesterId, tripId, {
            description,
            total_amount,
            paid_by,
            splits
        });

        res.status(201).json({
            message: "Expense successfully logged!",
            expense: expense
        });
    }
    catch (error) {
        if (error.message === "NOT_AUTHORIZED_FINANCE") {
            res.status(403);
            throw new Error("Forbidden: Viewers cannot add expenses to this trip.");
        }
        if (error.message === "MATH_MISMATCH") {
            res.status(400);
            throw new Error("The sum of the splits does not match the total amount.");
        }
        throw error;
    }
});



export const settleDebt = asyncHandler(async (req, res) => {
    const { tripId } = req.params;
    const { amount, creditorId } = req.body;//the CREDITOR is the one who will receive the payment, so we get the creditor's ID from the request body
    const debtorId = req.user.id;//the DEBTOR will pay the CREDITOR, so we get the debtor's ID from the auth middleware

    if (!amount || !creditorId) {
        res.status(400);
        throw new Error("Amount and Creditor ID are required.");
    }

    // we reuse the same transaction function for settling debts, but we pass a special description to indicate it's a settlement transaction
    const settlement = await createExpenseTransaction(debtorId, tripId, {
        description: "Settlement Transaction",
        total_amount: amount,
        paid_by: debtorId,
        splits: [
            {
                user_id: creditorId,
                amount_owed: amount
            }
        ]

        //there is an issue here, the createExpenseTransaction function will check if the debtor (requester) is an ADMIN or EDITOR of the trip, but in reality, we want to allow any member of the trip to settle their debts, even if they are a VIEWER. To fix this, we would need to modify the createExpenseTransaction function to allow VIEWERS to create transactions with a specific description like "Settlement Transaction", while still enforcing the role checks for regular expenses. This way, we can maintain the integrity of who can add regular expenses while still allowing all members to settle their debts.
        
    }, true);//pass true for the isSettlement flag to indicate that this is a settlement transaction, so that the service function can apply the appropriate authorization logic

    res.status(201).json({
        message: "Debt successfully settled!",
        settlement: settlement
    });
})

