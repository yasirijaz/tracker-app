const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();
console.log('process.env.NODE_ENV',process.env.environment)
module.exports = {
  // ... other Electron config options
  runtimeConfig: {
    // Check for a `.env.production` file in production
    ...(process.env.environment == 'production')
      ? dotenv.config({ path: path.join(__dirname, '.env.production') })
      : dotenv.config({ path: path.join(__dirname, '.env') }),
  },
};