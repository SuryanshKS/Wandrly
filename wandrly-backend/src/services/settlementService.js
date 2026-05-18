import prisma from "../config/prisma.js";

export const calculateSettlements = async(tripId)=>{
    //1. fetch all the expenses and their splits for the trip

    const expenses = await prisma.expense.findMany({
        where:{
            trip_id: tripId
        },
        include:{
            splits:true
        }
    });

    //2. initialise a hashmap to hold balances for each user
    const balances = {};

    expenses.forEach(expense => {
        //the person who paid gets a positive balance, everyone else gets a negative balance based on what they owe
        if(!balances[expense.paid_by]) balances[expense.paid_by] = 0;//as payer owes no one for this expense, we can initialize their balance to 0 if not already present, and then add the total amount to their balance to reflect that they are owed money by others
        balances[expense.paid_by] += parseFloat(expense.total_amount);

        //everyone involved in split gets a negative balance based on what they owe, including the payer if they owe a part of the expense
        expense.splits.forEach(split=>{
            if(!balances[split.user_id]) balances[split.user_id] = 0;//as a split user owes money, we can initialize their balance to 0 if not already present, and then subtract the amount they owe from their balance to reflect that they owe money to the payer
            balances[split.user_id] -= parseFloat(split.amount_owed);
        });
    });

    //3. separate the map into two arrays - one for users with positive balances (creditors) and one for users with negative balances (debtors)
    const debtors = [];
    const creditors = [];

    for(const [userId,balance] of Object.entries(balances)){
        //round the balance to 2 decimal places to avoid floating point issues
        const roundedBalance = Math.round(balance * 100) / 100;

        if(roundedBalance<0){
            debtors.push({ userId, amount: Math.abs(roundedBalance) });
        }
        else if (roundedBalance > 0) {
            creditors.push({ userId, amount: roundedBalance });
        }
    }

    //4. sort descending to settle the largest amounts first, this can help minimize the number of transactions needed to settle all debts
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    //5. the greedy 2 pointer algorithm to match debtors and creditors until all balances are settled

    const settlements = [];
    let d = 0;//debtor pointer
    let c = 0;//creditor pointer

    while(d < debtors.length && c < creditors.length){
        const debtor = debtors[d];
        const creditor = creditors[c];

        //the amount to settle is the minimum of what the debtor owes and what the creditor is owed
        const settledAmount = Math.min(debtor.amount, creditor.amount);

        //log the transaction from debtor to creditor
        settlements.push({
            from_user:debtor.userId,
            to_user:creditor.userId,
            amount:Math.round(settledAmount * 100) / 100
        });

        //adjust the balances after settlement
        debtor.amount -= settledAmount;
        creditor.amount -= settledAmount;

        //if a balance hits 0, move the pointer to the next debtor or creditor
        if (Math.abs(debtor.amount) < 0.01) d++;
        if (Math.abs(creditor.amount) < 0.01) c++;//keeping a cent precision threshold to account for any floating point rounding issues
    }
    return settlements;//return the list of settlements back to the controller
};