const { getRequest, postRequest } = require('./apiService');
const { startTracking,startBreak,connectSocket} = require('./common');
const { template } = require('./menu');
// const { getData, saveData } = require('./dataService');

module.exports = {
//   fetchData,
//   getUserDetails,
//   saveUser,
  getRequest,
  postRequest,
  connectSocket,
  template,
};