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

    response.send({message: message, expense: newIncomeSnap.data()});
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
        console.log(`Error on expense create trigger \n${error}`);
      }
    });
