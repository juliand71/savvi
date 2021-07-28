import * as functions from "firebase-functions";
import fsdb from "./fsdb";

/**
 * HTTP function for creating expense object
 */
export const createExpense =
functions.https.onRequest(async (request, response) => {
  const userId = request.body.userId;
  const newExpense = request.body.expense;
  try {
    const expensesRef = fsdb.collection(`users/${userId}/expenses`);
    const newExpRef = await expensesRef.add(newExpense);

    const message = `Created expense id ${newExpRef.id} for user id ${userId}`;

    const newExpenseSnap = await newExpRef.get();

    response.send({message: message, expense: newExpenseSnap.data()});
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});
/**
 * Get an expense using the user id and expense ID provided
 * in the HTTP request Body
 */
export const getExpense =
functions.https.onRequest(async (request, response) => {
  const userId = request.body.userId;
  const expenseId = request.body.expenseId;

  try {
    const expenseRef = fsdb.doc(`users/${userId}/expenses/${expenseId}`);
    const expenseSnap = await expenseRef.get();
    response.send(expenseSnap.data());
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

export const updateExpense =
functions.https.onRequest(async (request, response) => {
  const userId = request.body.userId;
  const expenseId = request.body.expenseId;
  const newExpense = request.body.expense;
  try {
    const expenseRef = fsdb.doc(`users/${userId}/expenses/${expenseId}`);
    await expenseRef.update(newExpense);
    response.send(`Created expense id ${expenseId} for user id ${userId}`);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

export const deleteExpense =
functions.https.onRequest(async (request, response) => {
  const userId = request.body.userId;
  const expenseId = request.body.expenseId;
  try {
    const expenseRef = fsdb.doc(`users/${userId}/expenses/${expenseId}`);
    await expenseRef.delete();
    response.send(`Deleted expense id ${expenseId} for user id ${userId}`);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

/**
 * Database trigger functions
 */

// when an expense is created, we need to subtract the amount
// of the expense from the fund balance
export const expenseOnCreate =
functions.firestore.document("users/{userId}/expenses/{expId}")
    .onCreate(async (snap, context) => {
      const userId = context.params.userId;
      const newExpense = snap.data();
      const fundId = newExpense.fundId;
      try {
        const fundRef = fsdb.doc(`users/${userId}/funds/${fundId}`);
        const fundSnap = await fundRef.get();
        const fundBalance = fundSnap.get("balance");
        // NOTE that updating the fund will trigger the fund update
        // which handles adjusting the user total account balance for us
        await fundRef.update({
          balance: (fundBalance - newExpense.amount),
        });
      } catch (error) {
        console.log(`Error on expense create trigger \n${error}`);
      }
    });

// when an expense is updated we need to handle a couple of different cases
// the fund that the expense is a part of could have changed
// or the amount could have changed
export const expenseOnUpdate =
functions.firestore.document("users/{userId}/expenses/{expId}")
    .onUpdate(async (change, context) => {
      const userId = context.params.userId;
      const oldExpense = change.before.data();
      const newExpense = change.after.data();
      const fundId = newExpense.fundId;
      try {
        const fundRef = fsdb.doc(`users/${userId}/funds/${fundId}`);


        if (oldExpense.fundId !== newExpense.fundId) {
          // expense has been updated to go under a different fund
          // get the old funds reference and balance
          const oldFundId = oldExpense.fundId;
          const oldFundRef = fsdb.doc(`users/${userId}/funds/${oldFundId}`);
          const oldFundSnap = await oldFundRef.get();
          const oldBalance = oldFundSnap.get("balance");

          // since we are processing this part BEFORE we process the amount
          // we remove the old expense amount from the old fund...
          await oldFundRef.update({
            balance: oldBalance + oldExpense.amount,
          });
          // now we add the OLD expense balance to the NEW fund
          // because in the next steps we are calculating the
          // increase or decrease of the expense. Since an expense could
          // have changed both the amount and the fund, we simplify
          // the branching by moving the old expense to the proper location
          const newFundSnap = await fundRef.get();
          const newFundBalance = newFundSnap.get("balance");
          await fundRef.update({
            balance: newFundBalance - oldExpense.amount,
          });
        }

        const fundSnap = await fundRef.get();
        const fundBalance = fundSnap.get("balance");

        if (oldExpense.amount < newExpense.amount) {
          // amount on expense has increased
          const increase = newExpense.amount - oldExpense.amount;
          await fundRef.update({
            balance: (fundBalance - increase),
          });
        } else if (oldExpense.amount > newExpense.amount) {
          // amount on expense has decresed
          const decrease = oldExpense.amount - newExpense.amount;
          await fundRef.update({
            balance: (fundBalance + decrease),
          });
        }
      } catch (error) {
        console.log(`Error on expense create trigger \n${error}`);
      }
    });
