// Imports the mongoose library which is used to interact with a MongoDB database.
const mongoose = require('mongoose');

// Defines a schema for the user.
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Defines a username field that is a String, must be provided (required), and must be unique.
  email: { type: String, required: true, unique: true },   // Defines a email field that is a String, must be provided (required), and must be unique.
  password: { type: String, required: true },   // Defines a password field that is of type String and required. (This is hashed, so database admins cannot see the passwords.)
  profilePicture: { type: String } // Defines a profilePicture field that holds the path to the user's profile picture as a String. This is not required by default, so it can be empty if the user hasn't uploaded a picture.
});

const User = mongoose.model('User', userSchema); // Compiles the userSchema into a model. A model is a class with which we construct documents. In this case, each document will be a user with properties and behaviors as declared in our schema.
module.exports = User; // Exports the User model, making it accessible to other parts of the application.
