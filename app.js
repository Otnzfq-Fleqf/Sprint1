// Necessary modules:
const express = require('express'); // Web framework for Node.js
const mongoose = require('mongoose'); // ODM library for MongoDB and Node.js
const session = require('express-session'); // Module to create sessions
const nodemailer = require('nodemailer'); // Module for sending emails
const User = require('./models/User'); // Imports the User model
const multer = require('multer'); // Utilizes the multer library for handling multipart/form-data, primarily used for uploading files.
const path = require('path'); // Incorporates the path module to provide utilities for working with file and directory paths.
const bcrypt = require('bcryptjs'); // Employs bcryptjs for hashing passwords, enhancing security by securely storing user passwords.
const saltRounds = 10; // Defines salt rounds as a constant

// Configures storage for multer to define how files should be stored on the server.
const storage = multer.diskStorage({
  // Sets the destination where uploaded files will be stored. This function uses 'public/uploads/' as the storage location.
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  // Determines the filename for stored files. This function generates filenames based on the original field name, the current timestamp, and the original file extension, ensuring uniqueness.
  filename: function (req, file, cb) { 
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});

// Creates a multer instance with the defined storage configuration. This instance ('upload') can be used as middleware in routes to handle file uploads.
const upload = multer({ storage: storage }); // 

// Creates an Express application
const app = express();
const port = 3000; // Port number where the server will listen

// Middleware setup
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(session({
  secret: 'yourSecretKey', // Secret key for signing the session ID cookie
  resave: false, // Do not force session to be saved back to the session store
  saveUninitialized: true, // Forces a session that is "uninitialized" to be saved to the store
}));

// Serves static files from the 'public' directory
app.use(express.static('public'));

// Sets EJS as the view engine for the application
app.set('view engine', 'ejs');

// Connects to MongoDB Atlas database
const dbURI = 'mongodb+srv://USERNAME:CONNECTION PASSWORD';
mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB Atlas', err));

// Configures Nodemaile for sending emails to users on verification
const transporter = nodemailer.createTransport({
  service: 'gmail', // Using Gmail for the automated messages
  auth: {
    user: 'fullstacktestingwebdev@gmail.com', // Your actual email
    pass: 'PASSWORD WILL BE ENTERED HERE TO SEND AUTOMATED EMAIL' // Your actual password (this uses the "less secure apps" method from Google)
  }
});

// Defines routes for the application
// Registration route:
app.post('/register', async (req, res) => {
  // Extracts form data from the request body
  const { username, email, password, confirmPassword } = req.body;

  // Checks if passwords match
  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match.');
  }

  try {
    // Checks for existing user with the same username or email
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    
    // If user exists, sends an error response
    if (existingUser) {
      return res.status(400).send('Username or email is already registered.');
    }

    // Hashes the password before saving to database
    const hashedPassword = await bcrypt.hash(password, saltRounds); // Uses bcryptjs to hash the password

    // Creates a new user with the hashed password instead of the plain one
    const user = new User({
      username,
      email,
      password: hashedPassword // Saves the hashed password
    });
    await user.save();

    // Generates a verification code and send an email
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    transporter.sendMail({
      from: 'YOUR_EMAIL_ADDRESS', 
      to: email,
      subject: 'Verify Your Account',
      text: `Your verification code is: ${verificationCode}`
    }, (error, info) => {
      if (error) {
        return res.status(500).send('Failed to send verification email.');
      } else {
        req.session.verificationCode = verificationCode;
        req.session.userId = user._id; // Saves the user's ID in the session
        res.redirect('/verify.html'); // Redirects to the verification page
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('Internal server error.');
  }
});

// Route for handling user login requests:
app.post('/login', async (req, res) => {
  // Extracts the username and password from the request body.
  const { username, password } = req.body;

  try {
    // Attempts to find a user document in the database with the provided username.
    const user = await User.findOne({ username });
    if (!user) {
      // If the passwords do not match, returns a 401 Unauthorized status with an error message.
      return res.status(401).send('Invalid username or password.');
    }

    // Compares provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    // If the passwords do not match, returns a 401 Unauthorized status with an error message.
    if (!isMatch) {
      return res.status(401).send('Invalid username or password.');
    }

    // If the password matches, proceed with login
    req.session.userId = user._id;
    req.session.username = user.username; 

    // Redirects the user to their profile page after a successful login.
    res.redirect(`/users/${username}`);
  } catch (error) {
     // Logs any errors to the console and returns a 500 Internal Server Error status with an error message.
    console.error('Login error:', error);
    res.status(500).send('An internal server error occurred.');
  }
});


app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    // Destroys the session, effectively logging the user out.
    if (err) {
      console.error('Logout error:', err);
      // If there is an error during logout, it is logged to the console.
      res.status(500).send('An error occurred while logging out.');
      // Sends a 500 Internal Server Error status with a message.
    } else {
      res.redirect('/index.html');
      // If logout is successful, redirect the user to the home page.
    }
  });
});


// User profile page route:
app.get('/users/:username', async (req, res) => {
  const sessionUsername = req.session.username;
  if (!sessionUsername) {
    // Redirects to the login page if there is no username in the session.
    return res.redirect('/login.html');
  }
  if (!req.session.userId) {
    // If the session does not have a user ID (user is not logged in),
    return res.redirect('/login.html');
    // Redirects to the login page.
  }
  
  try {
    const { username } = req.params;
    // Extracts the username from the URL parameters.
    const user = await User.findOne({ username: username });
    // Asynchronously finds one user in the database with the provided username.
    if (!user) {
      return res.status(404).send('User not found');
      // If no user is found, send a 404 Not Found status with a message.
    }
    res.render('userPage', { user });
    // If a user is found, render the 'userPage' template with the user's data.
  } catch (error) {
    console.error(error);
    // If an error occurs, it is logged to the console.
    res.status(500).send('Internal Server Error');
    // Sends a 500 Internal Server Error status with a message.
  }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  // Defines a schema for the user with a username field that must be unique.
  email: { type: String, required: true, unique: true },
  // Defines an email field that must also be unique.
  password: { type: String, required: true },
  // Defines a password field that is required.
  profilePicture: { type: String }
  // Adds a new field for the profile picture URL or path.
});

app.post('/verify', async (req, res) => {
  const { code } = req.body;
  // Destructures the verification code from the request body.
  if (req.session.verificationCode && code == req.session.verificationCode) {
    // If a verification code is stored in the session and it matches the provided code,
    res.redirect('/success.html');
    // Redirects the user to a success page.
  } else {
    res.status(400).send('Invalid verification code.');
    // If the verification code does not match, send a 400 Bad Request status.
  }
});

// Route for uploading a user's profile picture. It uses multer middleware to handle the file upload.
app.post('/upload-profile-pic', upload.single('profilePic'), async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      // If no user ID is present in the session, it implies the user is not logged in.
      return res.status(401).send('You must be logged in.');
    }

    // Updates the user's profile picture path in the database directly
    await User.findByIdAndUpdate(userId, 
      { $set: { profilePicture: `/uploads/${req.file.filename}` } }, 
      { new: true, runValidators: true }
    );

    // Redirects to the user's profile page
    res.redirect(`/users/${req.session.username}`);
  } catch (error) {
    // Logs and responds with an error message if the upload process fails.
    console.error('Profile picture upload error:', error);
    res.status(500).send('An error occurred during the upload.');
  }
});

// Route for removing a user's profile picture.
app.get('/remove-profile-pic', async (req, res) => {
  if (!req.session.userId) {
    // Checks if the user is logged in by looking for a user ID in the session.
    return res.redirect('/login.html');
  }

  try {
    // Updates the user document to remove the profile picture path
    await User.findByIdAndUpdate(req.session.userId, { $unset: { profilePicture: "" } });

    // Redirects to the user's profile page
    res.redirect(`/users/${req.session.username}`);
  } catch (error) {
    // Logs and responds with an error message if there's an issue removing the profile picture.
    console.error('Remove profile picture error:', error);
    console.error('Remove profile picture error:', error);
    res.status(500).send('An error occurred while removing the profile picture.');
  }
});

// Starts the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
// Listens for connections on the specified port and logs a message when the server is running.