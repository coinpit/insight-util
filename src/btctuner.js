var assert      = require('affirm.js')
var io          = require('socket.io-client')
var util        = require('util')
var bitcoinutil = require("bitcoinutil")
var Url         = require('url')

module.exports = (function (baseUri, insight) {
  var tuner              = {}
  var subscriptions      = {}
  var unconfirmedBalance = {}

  tuner.subscribe = function (address, callback) {
    assert(Object.keys(subscriptions).length < 100, 'Too many addresses to watch, only 100 supported')
    assert(bitcoinutil.isValidBitcoinAddress(address), 'Not a valid bitcoin address ' + address)
    unconfirmedBalance[address] = true
    subscriptions[address]      = callback
  }

  tuner.getSocketUri = function (baseurl) {
    assert(baseurl, 'baseurl is not defined')
    var urlObject = Url.parse(baseurl)
    assert(urlObject, 'Invalid url object')
    return Url.format({ protocol: urlObject.protocol, host: urlObject.host })
  }

  tuner.unsubscribe = function (address) {
    delete subscriptions[address]
  }

  tuner.init = function () {
    if (!tuner.socket) {
      var uri      = tuner.getSocketUri(baseUri)
      tuner.socket = io(uri, { rejectUnauthorized: true })
    }
    tuner.socket.on('connect', function () {
      util.log(Date.now(), 'Connected to insight websocket', uri)
      tuner.socket.emit('subscribe', 'inv')
    })
    tuner.socket.on('tx', callbackUnconfirmedTx)
    tuner.socket.on('block', callbackConfirmedTx)
  }

  function callbackUnconfirmedTx(data) {
    var match = false
    for (var address in subscriptions) {
      if (isMatch(address, data)) {
        match = unconfirmedBalance[address] = true
      }
    }
    if (match) {
      addUnconfirmedInputs(data.txid).then(getBalances).catch(function (e) {
        console.log('Error connecting to insight server', e)
      })
    }
  }

  function isMatch(address, data) {
    for (var i = 0; i < data.vout.length; i++) {
      if (data.vout[i][address]) return true
    }
    return false
  }

  function callbackConfirmedTx(block) {
    getBalances(Object.keys(unconfirmedBalance))
  }

  function getBalances(addresses) {
    if (!addresses || addresses.length === 0) return
    return insight.multi(insight.getAddress, addresses)
      .then(function (results) {
        for (var i = 0; results && i < results.length; i++) {
          var addressInfo = results[i]
          if (addressInfo.unconfirmed == 0) {
            delete unconfirmedBalance[addressInfo.address]
          }
          var subscriptionFunction = subscriptions[addressInfo.address]
          if (subscriptionFunction) subscriptionFunction(addressInfo)
        }
        return results
      })
  }

  function addUnconfirmedInputs(txid) {
    return insight.getTransaction(txid)
      .then(function (tx) {
        for (var i = 0; i < tx.vin.length; i++) {
          var inputAddress = tx.vin[i].addr
          if (subscriptions[inputAddress]) unconfirmedBalance[inputAddress] = true
        }
        return Object.keys(unconfirmedBalance)
      })
  }

  return tuner
})
