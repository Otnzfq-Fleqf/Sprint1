Here are the contents of my Software Engineering project for the 1st sprint. Right now, it's still a work in progress, but the initial framework is built and working.

How to get this project to work:
In the root directory, you need to run the following commands AFTER you connect to MongoDB and enable the nodemailer email/password account:
npm install
npm start
node app.js

You can make your own version of this project, if you set up your own mongoDB and successfully link you automated emailer via nodemailer.

PLEASE NOTE: THE EMAIL FROM THE REGISTRATION SERVICE WILL SHOW UP AS SPAM AND MALICIOUS. I am not sure why it does this, but I can assure you that there is nothing malicious about it.
In addition, your password is hashed, so I cannot see it once you register.
