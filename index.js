module.exports = function (baseUri) {
  var insight  = require("./src/insight")(baseUri)
  var btcTuner = require("./src/btctuner")(baseUri, insight)
  btcTuner.init()
  insight.subscribe   = btcTuner.subscribe
  insight.unsubscribe = btcTuner.unsubscribe
  return insight
}