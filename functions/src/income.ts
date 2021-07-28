import * as functions from "firebase-functions";
import fsdb from "./fsdb";

/**
 * HTTP function for creating income object
 */
export const createIncome =
functions.https.onRequest(async (request, response) => {
  const userId = request.body.userId;
  const newIncome = request.body.income;
  try {
    const incomeRef = fsdb.collection(`users/${userId}/incomes`);
    const newIncRef = await incomeRef.add(newIncome);

    const message = `Created income id ${newIncRef.id} for user id ${userId}`;

    const newIncomeSnap = await newIncRef.get();

    response.send({message: message, income: newIncomeSnap.data()});
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});
/**
 * Get an income using the user id and income ID provided
 * in the HTTP request Body
 */
export const getIncome =
functions.https.onRequest(async (request, response) => {
  const userId = request.body.userId;
  const incomeId = request.body.incomeId;

  try {
    const incomeRef = fsdb.doc(`users/${userId}/incomes/${incomeId}`);
    const incomeSnap = await incomeRef.get();
    response.send(incomeSnap.data());
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

export const updateIncome =
functions.https.onRequest(async (request, response) => {
  const userId = request.body.userId;
  const incomeId = request.body.incomeId;
  const newIncome = request.body.income;
  try {
    const incomeRef = fsdb.doc(`users/${userId}/incomes/${incomeId}`);
    await incomeRef.update(newIncome);
    response.send(`Created income id ${incomeId} for user id ${userId}`);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

export const deleteIncome =
functions.https.onRequest(async (request, response) => {
  const userId = request.body.userId;
  const incomeId = request.body.incomeId;
  try {
    const incomeRef = fsdb.doc(`users/${userId}/incomes/${incomeId}`);
    await incomeRef.delete();
    response.send(`Deleted income id ${incomeId} for user id ${userId}`);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

/**
 * Database trigger functions
 */

// when an income is created we need to add income to the
// associated
export const incomeOnCreate =
functions.firestore.document("users/{userId}/incomes/{incId}")
    .onCreate(async (snap, context) => {
      const userId = context.params.userId;
      const newIncome = snap.data();
      const fundId = newIncome.fundId;
      try {
        const fundRef = fsdb.doc(`users/${userId}/funds/${fundId}`);
        const fundSnap = await fundRef.get();
        const fundBalance = fundSnap.get("balance");
        // NOTE that updating the fund will trigger the fund update
        // which handles adjusting the user total account balance for us
        await fundRef.update({
          balance: (fundBalance + newIncome.amount),
        });
      } catch (error) {
        console.log(`Error on income create trigger \n${error}`);
      }
    });


// when an income is updated we need to handle a couple of different cases
// the fund that the income is a part of could have changed
// or the amount could have changed
export const incomeOnUpdate =
functions.firestore.document("users/{userId}/incomes/{expId}")
    .onUpdate(async (change, context) => {
      const userId = context.params.userId;
      const oldIncome = change.before.data();
      const newIncome = change.after.data();
      const fundId = newIncome.fundId;
      try {
        const fundRef = fsdb.doc(`users/${userId}/funds/${fundId}`);


        if (oldIncome.fundId !== newIncome.fundId) {
          // income has been updated to go under a different fund
          // get the old funds reference and balance
          const oldFundId = oldIncome.fundId;
          const oldFundRef = fsdb.doc(`users/${userId}/funds/${oldFundId}`);
          const oldFundSnap = await oldFundRef.get();
          const oldBalance = oldFundSnap.get("balance");

          // since we are processing this part BEFORE we process the amount
          // we remove the old income amount from the old fund...
          await oldFundRef.update({
            balance: oldBalance + oldIncome.amount,
          });
          // now we add the OLD income balance to the NEW fund
          // because in the next steps we are calculating the
          // increase or decrease of the income. Since an income could
          // have changed both the amount and the fund, we simplify
          // the branching by moving the old income to the proper location
          const newFundSnap = await fundRef.get();
          const newFundBalance = newFundSnap.get("balance");
          await fundRef.update({
            balance: newFundBalance - oldIncome.amount,
          });
        }

        const fundSnap = await fundRef.get();
        const fundBalance = fundSnap.get("balance");

        if (oldIncome.amount < newIncome.amount) {
          // amount on income has increased
          const increase = newIncome.amount - oldIncome.amount;
          await fundRef.update({
            balance: (fundBalance + increase),
          });
        } else if (oldIncome.amount > newIncome.amount) {
          // amount on income has decresed
          const decrease = oldIncome.amount - newIncome.amount;
          await fundRef.update({
            balance: (fundBalance - decrease),
          });
        }
      } catch (error) {
        console.log(`Error on income create trigger \n${error}`);
      }
    });
