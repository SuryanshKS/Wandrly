import prisma from "../config/prisma.js";

export const createExpenseTransaction = async (requesterId, tripId, expenseData, isSettlement = false) => {
    const { description, total_amount, paid_by, splits } = expenseData;

    //1. verify that the requester is an ADMIN or EDITOR of the trip
    const memberCheck = await prisma.tripMember.findUnique({
        where: {
            trip_id_user_id: {
                trip_id: tripId,
                user_id: requesterId,
            }
        }
    });

    //context-aware checking
    // If you aren't in the trip at all, OR (you are a VIEWER AND this is NOT a settlement) -> Blocked.
    if (!memberCheck || (!isSettlement && memberCheck.role === 'VIEWER')) {
        throw new Error("NOT_AUTHORIZED_FINANCE");
    }

    //2. mathematical integrity check, ensure that the sum of the splits equals the total amount, and that the paid_by user is included in the splits

    const calculatedTotal = splits.reduce((sum, split) => sum + parseFloat(split.amount_owed), 0);

    //check if the difference is greater than 1 cent/paisa (JS Floating error)
    if (Math.abs(calculatedTotal - parseFloat(total_amount)) > 0.01) {
        throw new Error("MATH_MISMATCH");
    }

    //3. create the expense transaction and the associated splits in a single atomic transaction to maintain data integrity
    const newExpense = await prisma.expense.create({
        data: {
            trip_id: tripId,
            description: description,
            total_amount: total_amount,
            paid_by: paid_by || requesterId,//if paid_by is not provided, default to the requester

            //nested write for the ExpenseSplits, we create multiple splits based on the splits array provided in the request body
            splits: {
                create:
                    splits.map(split => ({
                        user_id: split.user_id,
                        amount_owed: split.amount_owed,
                    }))

            }
            /*
            the nested create to insert a parent(Expense) and its children(ExpenseSplits) in one go is a powerful feature of Prisma. It ensures that the entire operation is atomic, meaning that if any part of the transaction fails (like a database constraint violation), the whole transaction will be rolled back, preventing partial data from being saved. This is crucial for maintaining data integrity, especially in financial operations like expense splitting where consistency is key.
            */
        },
        include:{
            splits:true,//include the created splits in the returned expense object
        }
    });

    return newExpense;//return the created expense back to the controller
}