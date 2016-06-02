var expect        = require('expect.js')
var fixtures      = require('fixtures.js')(__filename)
var util          = require('mangler')
var sinon         = require('sinon')
var insight = require('../src/insight')("insightUri", "testnet", {})
var bluebird      = require('bluebird')
var _             = require('lodash')

require('mocha-generators').install()

describe('Coin functions', function () {
  before(function () {
    sinon.stub(insight.rest, "get", function (url) {
      return bluebird.resolve({body:_.cloneDeep(fixtures.REST[url])})
    })
    sinon.stub(insight.rest, "post", function (url, data) {
      return bluebird.resolve({body:_.cloneDeep(fixtures.REST.POST[url])})
    })
  })

  after(function () {
    insight.rest.get.restore()
    insight.rest.post.restore()
  })

  it('Should get unspents of an address', function*() {
    var unspents = yield insight.getUnspents(fixtures.address)
    var result   = util.delProps(unspents, ['ts', 'confirmations'])
    var fix      = util.delProps(fixtures.unspents, ['ts', 'confirmations'])
    expect(result).to.eql(fix)
  })

  it('Should get sync status', function*() {
    var sync = yield insight.sync()
    expect(sync).to.eql(fixtures.sync)
  })

  it('Should get conformed unspents of an address', function*() {
    var unspents = yield insight.getConfirmedUnspents(fixtures["conformed-unconformed"].address)
    expect(unspents).to.eql(fixtures["conformed-unconformed"]["expexted-utxo"])
  })

  it('Should get balance info of address', function*() {
    var address = yield insight.getAddress(fixtures.balance.address)
    expect(address).to.eql(fixtures.balance.value)
  })

  it('Should get confirmed balance at an address', function*() {
    var confirmedBalance = (yield insight.getAddress(fixtures.confirmedBalance.address)).confirmed
    expect(confirmedBalance).to.equal(fixtures.confirmedBalance.value)
  })

  it('Should get unconfirmed balance at an address', function*() {
    var unconfirmedBalance = (yield insight.getAddress(fixtures.netBalance.address)).balance
    expect(unconfirmedBalance).to.equal(fixtures.netBalance.value)
  })

  it('Should push transaction to network', function*() {
    var txresult = yield insight.sendTransaction(fixtures.send.rawtx)
    expect(txresult).to.eql(fixtures.send.result)
  })

  it('Should get transaction', function*() {
    var results = yield insight.getTransaction(fixtures.gettx.txid)
    expect(results).to.eql(fixtures.gettx.txbody)
  })

  it('Should call multiple apis', function*() {
    var results = yield insight.multi(insight.getAddress, fixtures.multi.address.source)
    expect(results).to.eql(fixtures.multi.address.value)
  })
})
