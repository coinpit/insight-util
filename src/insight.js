var bluebird = require('bluebird')
var REST     = require('rest.js')
var assert   = require('affirm.js')
var xlat     = require('xlat')()
var util     = require('util')

module.exports = function (baseUrl, network, index) {
  var insight    = {}
  var dictionary = {
    "address": ['addrStr', 'addr']
  }

  xlat.index(dictionary)

  insight.sync = function () {
    return REST.get(baseUrl + '/sync').then(function (result) {
      if (result.body.status !== 'finished') throw new Error('Waiting for blockchain to sync')
      return result.body
    })
  }

  insight.getAddress = function (address) {
    return insight.getUnspents(address).then(function (utxos) {
      return insight.getBalanceFromUnspents(address, utxos)
    })
  }

  insight.getBalanceFromUnspents = function (address, utxos) {
    var confirmed   = 0
    var unconfirmed = 0
    for (var i = 0; i < utxos.length; i++) {
      var utxo = utxos[i];
      if (utxo.confirmations !== 0) {
        confirmed += utxo.amount
      } else {
        unconfirmed += utxo.amount
      }
    }
    return {
      address    : address,
      confirmed  : confirmed,
      unconfirmed: unconfirmed,
      balance    : confirmed + unconfirmed
    }
  }

  insight.getUnspents = function (addresses) {
    var address = makeAddress(addresses)
    return insight.sync()
      .then(function () {
        return REST.get(baseUrl + '/addrs/' + address + '/utxo')
      }).then(function (result) {
        return result.body
      }).then(normalizeUnspents)
  }

  insight.getConfirmedUnspents = function (addresses) {
    return insight.getUnspents(addresses).then(function (unspents) {
      var confirmed = []
      for (var i = 0; i < unspents.length; i++) {
        var unspent = unspents[i];
        if (unspent.confirmations && unspent.confirmations > 0) confirmed.push(unspent)
      }
      return confirmed
    })
  }

  insight.getTransaction = function getTransaction(txid) {
    return REST.get(baseUrl + '/tx/' + txid).then(function (result) {
      return result.body
    })
  }

  insight.sendTransaction = function (tx) {
    if (index.logging)util.log(Date.now(), "sendTransaction", tx)
    return REST.post(baseUrl + '/tx/' + 'send', { "content-type": "application/json" }, { rawtx: tx }).then(function (result) {
      return result.body
    })
  }

  insight.multi = function multi(api, addresses) {
    var promises = []
    for (var i = 0; i < addresses.length; i++) {
      promises.push(api(addresses[i]))
    }
    return bluebird.all(promises)
  }

  function makeAddress(addresses) {
    assert(addresses, 'Specify addresses for which to get unspents')
    return Array.isArray(addresses) ? addresses.join(',') : addresses
  }

  function normalizeUnspents(unspents) {
    for (var i = 0; i < unspents.length; i++) {
      unspents[i].amount = ((unspents[i].amount * 1e8).toFixed(0) - 0)
    }
    return unspents
  }

  insight.rest = REST
  return insight
}
