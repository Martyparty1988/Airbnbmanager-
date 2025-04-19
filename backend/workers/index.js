// workers/index.js
const { setupICalJob } = require('./ical');
const { setupEmailJob } = require('./email');

module.exports = {
  setupICalJob,
  setupEmailJob
};