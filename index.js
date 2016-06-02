module.exports = function (baseUri, socketUri, network) {

  var util = {}
  var insight  = require("./src/insight")(baseUri, network, util)
  var btcTuner = require("./src/btctuner")(socketUri, network, util, insight)

  util =  {
    subscribe             : btcTuner.subscribe,
    unsubscribe           : btcTuner.unsubscribe,
    sync                  : insight.sync,
    getAddress            : insight.getAddress,
    getBalanceFromUnspents: insight.getBalanceFromUnspents,
    getUnspents           : insight.getUnspents,
    getConfirmedUnspents  : insight.getConfirmedUnspents,
    getTransaction        : insight.getTransaction,
    sendTransaction       : insight.sendTransaction,
    multi                 : insight.multi
  }

  return util
}