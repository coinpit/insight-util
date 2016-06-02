var expect   = require('expect.js')
var sinon    = require('sinon')
var mocksock = require('./MockSocketIOClient')
var insight  = require('../src/insight')("insightUri", "testnet", {})
var btctuner = require('../src/btctuner')("insightUri", "testnet", insight,{}, mocksock)
var bluebird = require('bluebird')
var fixtures = require('fixtures.js')(__filename)
require('mocha-generators').install()

function stubGetAddress(index) {
  if (insight.getAddress.restore) insight.getAddress.restore()
  sinon.stub(insight, "getAddress", function (address) {
    return asPromise(fixtures.blockchainapi.addresses[address][index])
  })
}

function asPromise(value) {
  return new bluebird(function (resolve, reject) {
    resolve(value)
  })
}

describe('Test notifications on address activity', function () {
  beforeEach(function () {
    sinon.stub(insight, "getTransaction", function (txid) {
      return asPromise(fixtures.blockchainapi.transactions[txid])
    })
  })
  afterEach(function () {
    btctuner.unsubscribe(fixtures.btctuner.address)
    btctuner.unsubscribe(fixtures.btctuner.inaddress)
    insight.getTransaction.restore()
    insight.getAddress.restore()
  })
  it('should notify when balance goes into my address', function (done) {
    var callback = sinon.spy() //function(x) { console.log('I was called with', x)}
    // var spy = sinon.spy(callback)
    var address = fixtures.btctuner.address
    callback    = function (x) {
      try {
        expect(x).to.equal(fixtures.blockchainapi.addresses[address][0]);
        done()
      } catch (e) {
        done(e)
      }
    }
    btctuner.subscribe(address, callback)
    stubGetAddress(0)
    mocksock.trigger('tx', fixtures.btctuner.tx1)
    // console.log('SPY', callback.called)
    // expect(callback.callsArgAsync(0).calledWith(fixtures.btctuner.newvalue)).to.be(true)
  })

  it('should notify out and in addresses when in address is present in transaction of out address', function (done) {
    var address   = fixtures.btctuner.address
    var inaddress = fixtures.btctuner.inaddress
    var counter   = 0
    var callback  = function (x) {
      if (++counter === 2) done()
    }
    btctuner.subscribe(address, callback)
    btctuner.subscribe(inaddress, callback)
    stubGetAddress(0)
    mocksock.trigger('tx', fixtures.btctuner.tx1)
    // console.log('SPY', callback.called)
    // expect(callback.callsArgAsync(0).calledWith(fixtures.btctuner.newvalue)).to.be(true)
  })

  it('should notify one address activity until address has no unconfirmed balance', function (done) {
    var state
    var address  = fixtures.btctuner.address
    var callback = function (x) {
      //console.log(state, x)
      try {
        switch (state) {
          case "tx-recieved":
            expect(x).to.equal(fixtures.blockchainapi.addresses[address][0]);
            state = "block-recieved-no-confirm"
            mocksock.trigger('block', fixtures.btctuner.block)
            break;
          case "block-recieved-no-confirm":
            expect(x).to.equal(fixtures.blockchainapi.addresses[address][0]);
            state = "block-recieved-confirm"
            stubGetAddress(1)
            mocksock.trigger('block', fixtures.btctuner.block)
            break;
          case "block-recieved-confirm":
            expect(x).to.equal(fixtures.blockchainapi.addresses[address][1]);
            done()
            break;
          default:
            expect().fail(`chek out for this message. not good ${x}`)
        }
      } catch (e) {
        done(e)
      }
    }
    btctuner.subscribe(address, callback)
    stubGetAddress(0)
    state = "tx-recieved"
    mocksock.trigger('tx', fixtures.btctuner.tx1)
  })

  it("should check for addresses even after server restarted", function (done) {
    var address  = fixtures.btctuner.address
    var callback = function (x) {
      expect(x).to.equal(fixtures.blockchainapi.addresses[address][0]);
      done()
    }
    stubGetAddress(0)
    btctuner.subscribe(address, callback)
    mocksock.trigger('block', fixtures.btctuner.block)
  })

})
