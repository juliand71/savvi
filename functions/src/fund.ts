import * as functions from "firebase-functions";
import fsdb from "./fsdb";

/**
 * Basic CRUD functions for Fund Objects
 */
export const createFund =
functions.https.onRequest(async (request, response) => {
  const newFund = request.body.fund;
  const userId = request.body.userId;

  try {
    const userDoc = await fsdb.collection("users").doc(`${userId}`).get();
    const fundDocRef = await userDoc.ref.collection("funds").add(newFund);

    response.send(`Created fund(id ${fundDocRef.id}) for user(id ${userId})`);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

export const getFund =
functions.https.onRequest(async (request, response) => {
  const fundId = request.body.fundId;
  const userId = request.body.userId;

  try {
    const userDocRef = fsdb.collection("users").doc(`${userId}`);
    const fundDoc = await userDocRef.collection("funds").doc(`${fundId}`).get();

    response.send(fundDoc.data());
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

export const updateFund =
functions.https.onRequest(async (request, response) => {
  const fundData = request.body.fund;
  const fundId = request.body.fundId;
  const userId = request.body.userId;

  try {
    const userDoc= await fsdb.collection("users").doc(`${userId}`).get();
    const fundDocRef = userDoc.ref.collection("funds").doc(`${fundId}`);

    await fundDocRef.update(fundData);

    response.send(`Updated fund(id ${fundId}) for user(id ${userId})`);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

export const deleteFund =
functions.https.onRequest(async (request, response) => {
  const fundId = request.body.fundId;
  const userId = request.body.userId;

  try {
    const userDocRef = fsdb.collection("users").doc(`${userId}`);
    await userDocRef.collection("funds").doc(`${fundId}`).delete();

    response.send(`Deleted fund(id ${fundId}) for user(id ${userId})`);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});
/**
 * END OF HTTP FUNCTIONS ON FUND
 */

/**
 * Database Trigger Functions for Fund Objects
 */

// when a fund is created we need to add it's balance to the user
// total balance property
export const fundOnCreate =
functions.firestore.document("users/{userId}/funds/{fundId}")
    .onCreate(async (snap, context) => {
      const userId = context.params.userId;
      const fundBalance = snap.data().balance;
      // need to get the users current total balance
      // then add the balance of the new fund to it
      try {
        const userRef = fsdb.doc(`users/${userId}`);
        const userDoc = await userRef.get();

        // get the users ccurrent total balance
        // if the field does not exist then we are adding the first
        // fund to this user, so just use the fund balance as the total
        const userBalance = userDoc.get("totalBalance");
        if (userBalance == undefined) {
          await userRef.update({
            totalBalance: fundBalance,
          });
        } else {
          await userRef.update({
            totalBalance: (userBalance + fundBalance),
          });
        }
      } catch (error) {
        console.log(`Error on fund create trigger ${error}`);
      }
    });

// when a fund is updated, we need to check what type of change occurred
// in the balance, and apply that to the user total balance
export const fundOnUpdate =
functions.firestore.document("users/{userId}/funds/{fundId}")
    .onUpdate(async (change, context) => {
      const preBalance = change.before.data().balance;
      const postBalance = change.after.data().balance;

      if (postBalance !== preBalance) {
        // first get the user
        const userId = context.params.userId;
        const userRef = fsdb.doc(`users/${userId}`);
        const userDoc = await userRef.get();
        const currentBalance = userDoc.get("totalBalance");
        // need to calculate the difference and add it to
        // user total balance
        // this should work regardless of whether balance increased
        // or decreased
        const addedMoney = postBalance - preBalance;
        userRef.update({
          totalBalance: currentBalance + addedMoney,
        });
      } else {
        // if there was no change in balance on this update
        console.log("No action taken on fund update trigger");
      }
    });
