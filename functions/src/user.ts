import * as functions from "firebase-functions";
import fsdb from "./fsdb";

/**
 * Create a new user in the database
 */
export const createUser =
functions.https.onRequest(async (request, response) => {
  const username = request.body.username;
  const userRef = fsdb.collection("users").doc();
  try {
    await userRef.set({
      name: username,
    });
    response.send(`Created user with id ${userRef.id}`);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

/**
 * Retrieve a user by ID
 */
export const getUser =
functions.https.onRequest(async (request, response) => {
  const userId = request.query.id;
  console.log(userId);
  const userRef = fsdb.doc(`users/${userId}`);
  try {
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      response.send(userDoc.data());
    } else {
      response.status(500).send("User not found");
    }
  } catch (error) {
    response.status(500).send(error);
  }
});

/**
 * Update a user
 */

export const updateUser =
functions.https.onRequest(async (request, response) => {
  const userId = request.query.id;
  console.log(userId);
  const userData = request.body.updates;
  const userRef = fsdb.doc(`users/${userId}`);
  try {
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update(userData);
      response.send(`Updated user with id ${userId} -- added ${userData}`);
    } else {
      response.status(500).send("User not found");
    }
  } catch (error) {
    response.status(500).send(error);
  }
});

export const deleteUser =
functions.https.onRequest(async (request, response) => {
  const userId = request.query.id;
  console.log(userId);
  const userRef = fsdb.doc(`users/${userId}`);
  try {
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.delete();
      response.send(`Deleted user with id ${userId}`);
    } else {
      response.status(500).send("User not found");
    }
  } catch (error) {
    response.status(500).send(error);
  }
});

