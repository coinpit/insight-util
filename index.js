module.exports = function (baseUri) {

  var util = {}
  var insight  = require("./src/insight")(baseUri)
  var btcTuner = require("./src/btctuner")(baseUri, insight)
  btcTuner.init()
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