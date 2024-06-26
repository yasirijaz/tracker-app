const WebSocket = require('ws');

function connectSocket(){
  const socketUrl = 'wss://socket.windshieldhub.com?user_id=7&peer_id=testPeerId';
  
  let connection = new WebSocket(socketUrl);
    // Send ping frame every 30 seconds
    setInterval(() => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify({ ping: "ping" })); // Send a ping frame
      } else {
        // clearInterval(pingInterval);
      }
    }, 30000);
    connection.onopen = event => {console.log('open')};
    connection.onmessage = event => {console.log('onmessage')};
    connection.onerror = event => {console.log('onerror')};
    connection.onclose = event => {console.log('onclose')};
    connection.ondisconnect = event =>
    {console.log('ondisconnect')}
}

module.exports = {
  connectSocket
}