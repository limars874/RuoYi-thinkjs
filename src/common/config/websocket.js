const redis = require('socket.io-redis');

export default {
  on: false, //是否开启 WebSocket
  type: 'socket.io',
  allow_origin: '',
  sub_protocal: '',
  adp() {
    return redis({ host: '127.0.0.1', port: 6379 })
  },
  path: '/socket', //url path for websocket
  messages: {
    open: 'api/ws/open',
    close: 'api/ws/close',
    chat: 'api/ws/chat',
    typing: 'api/ws/typing',
    stoptyping: 'api/ws/stoptyping',
    adduser: 'api/ws/adduser',
    update: 'api/ws/update'
  }
};
