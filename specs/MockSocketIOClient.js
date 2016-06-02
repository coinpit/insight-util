var assert = require('assert')

module.exports = (function MockSocketIOClient(url) {
  var mocksock = {}
  var callbacks = {}

  mocksock.on = function(event, callback) {
    assert(typeof event    === 'string',   'Event should be specified' + event)
    assert(typeof callback === 'function', 'Please specify a callback function' + callback)

    callbacks[event] = callbacks[event] || []
    callbacks[event].push(callback)
  }

  mocksock.trigger = function(event, data) {
    var eventCallbacks = callbacks[event] || []
    for(var i = 0; i < eventCallbacks.length; i++) {
      eventCallbacks[i](data)
    }
  }

  return mocksock
})()
