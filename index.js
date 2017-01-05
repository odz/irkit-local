var http = require('http');
var util = require('util');

var queue = Promise.resolve();

function send(host, data, retries, retryDelay) {
  queue = queue.then(function() {
    return do_send(host, data, retries, retryDelay);
  });

  var promise = queue;

  queue = queue.then(function() {
    return new Promise(function(resolve) {
      setTimeout(resolve, 500);
    });
  });

  return promise;
}

function do_send(host, data, retries, retryDelay) {
  return new Promise(function(resolve, reject) {
    var retryCount = 0;
    var encoded = JSON.stringify(data);

    function do_request() {

      var req = http.request({
        hostname: host,
        path: '/messages',
        method: 'POST',
        headers: {
          'X-Requested-With': 'irkit-local',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(encoded)
        }
      });

      req.on('response', function(res) {
        if (res.statusCode == 200) {
          resolve();
        } else if (retryCount < retries) {
          retryCount++;
          setTimeout(do_request, retryDelay);
        } else {
          reject(res.statusMessage);
        }
      });

      req.on('error', function(e) {
        if (retryCount < retries) {
          retryCount++;
          setTimeout(do_request, retryDelay);
        } else {
          reject(e.message);
        }
      });

      req.end(encoded);
    }

    do_request();
  });
}

module.exports = {
  send: send
};
