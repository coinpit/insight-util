var bluebird = require('bluebird')
var REST     = require('rest.js')
var affirm   = require('affirm.js')
var xlat     = require('xlat')()
var util     = require('util')

module.exports = function (baseUrl) {
  var insight    = {}
  var dictionary = {
    "address": ['addrStr', 'addr']
  }

  insight.logging = false
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
    if (insight.logging) util.log(Date.now(), "sendTransaction", tx)
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
    affirm(addresses, 'Specify addresses for which to get unspents')
    return Array.isArray(addresses) ? addresses.join(',') : addresses
  }


  insight.getCurrentMiningFee = function () {
    return REST.get(baseUrl + "/utils/estimatefee").then(function (result) {
      affirm(result.body && result.body[2] && !isNaN(result.body[2]) && result.body[2] > 0, 'Invalid mining fee')
      return (result.body[2] * 1e8).toFixed(0) - 0
    })
  }

  insight.getTransactionsFor = function(address, from, to){
    affirm(address, 'Address is not specified')
    from = from || 0
    to = to||10
    affirm(from >= 0 && to > 0 && to > from, "to and from must be positive number and from must be greater than to")
    return REST.get(baseUrl + "/addrs/"+ address + "/txs?from=" + from + "&to=" + to).then(function(result){
      return result.body
    })
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
