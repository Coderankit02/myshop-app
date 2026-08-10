// app.config.js — dynamic config (app.json base + conditional FCM wiring)
//
// googleServicesFile ko conditional rakha hai: jab tak user Firebase console se
// google-services.json drop nahi karta, Android builds normal chalte hain.
// File aate hi next build automatically FCM (google-services) include karta hai
// — koi aur config change nahi chahiye.
const fs = require('fs');
const path = require('path');

const appJson = require('./app.json');

const GOOGLE_SERVICES_FILE = './google-services.json';

if (fs.existsSync(path.resolve(__dirname, GOOGLE_SERVICES_FILE))) {
  appJson.expo.android.googleServicesFile = GOOGLE_SERVICES_FILE;
}

module.exports = appJson.expo;
