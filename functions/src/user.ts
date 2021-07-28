import * as functions from "firebase-functions";
import fsdb from "./fsdb";

/**
 * Create a new user in the database
 */
export const createUser =
functions.https.onRequest(async (request, response) => {
  const user = request.body.user;
  const userRef = fsdb.collection("users").doc();
  try {
    await userRef.set(user);
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
  const userRef = fsdb.doc(`users/${userId}`);
  try {
    const userDoc = await userRef.get();
    response.send(userDoc.data());
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
  const userData = request.body.updates;
  const userRef = fsdb.doc(`users/${userId}`);
  try {
    await userRef.update(userData);
    response.send(`Updated user with id ${userId} -- added ${userData}`);
  } catch (error) {
    response.status(500).send(error);
  }
});

/**
 * Delete a user
 */
export const deleteUser =
functions.https.onRequest(async (request, response) => {
  const userId = request.query.id;
  const userRef = fsdb.doc(`users/${userId}`);
  try {
    await userRef.delete();
    response.send(`Deleted user with id ${userId}`);
  } catch (error) {
    response.status(500).send(error);
  }
});

