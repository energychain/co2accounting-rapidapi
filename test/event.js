const assert = require('assert');
const CO2accounting = require("../index.js");
const env = require("../.env");

describe('CO2 Accounting - Event/Transactions', function() {
  let instance = {};
  const searchTerm = 'Train';
  let searchResults = {};
  let selectedActivity = {};
  let settlementInput = {};
  let settlement = {};
  let eventID = {};
  let compensation = {};
  let compensationID = {};
  let ownerID = {};
  let gscID = {};
  let events = [];
  let startBalance = {};
  let endBalance = {};

  before(async () => {
    instance = new CO2accounting(RAPIDAPIKEY);
    startBalance = await instance.balance();
  });

  describe('Environment/Runtime Setup', function() {
    it('In order to run tests a .env needs to have RAPIDAPIKEY="YOURKEY";', function() {
      assert.equal(typeof RAPIDAPIKEY == 'string', true);
    });
  });

  describe('#searchFootprint(SEARCHTERM)', async function() {
    it('Validate results:', async function() {
      searchResults = await instance.searchFootprint(searchTerm);
      assert.equal(searchResults.length > 0, true);
    });
    it('Use first Result for Event:', async function() {
      assert.equal(typeof searchResults[0]._source !== 'undefined', true);
      assert.equal(typeof searchResults[0]._source.activity !== 'undefined', true);
      assert.equal(typeof searchResults[0]._source.co2eq !== 'undefined', true);
      assert.equal(typeof searchResults[0]._source.unit !== 'undefined', true);
      assert.equal(typeof searchResults[0]._source.title !== 'undefined', true);
      assert.equal(typeof searchResults[0]._source.description !== 'undefined', true);
      selectedActivity = searchResults[0];
    });
  });

  describe('#settleEvent(SETTLEMENT)', async function() {
    it('Build Settlement of Activity', async function() {
      let qty = Math.floor(Math.random()*10) + 1;

      settlementInput = {
          title: 'Unit Test '+selectedActivity._source.title,
          qty: qty,
          unit:selectedActivity._source.unit,
          activity:selectedActivity.activity,
          factor:selectedActivity._source.co2eq
      };

      settlement = await instance.settleEvent(settlementInput);
      assert.equal(typeof settlement.event !== 'undefined', true);
      assert.equal(typeof settlement.qty !== 'undefined', true);
      assert.equal(typeof settlement.co2eq !== 'undefined', true);
      assert.equal(settlement.qty, qty);
      assert.equal(settlement.co2eq, Math.round(qty * selectedActivity._source.co2eq));
    });
  });

  describe('#identityLookup(EVENTID) - Settlement Identity', async function() {
    it('Validate IDs from Settlement', async function() {
      eventID = await instance.identityLookup(settlement.event);
      // type validation
      assert.equal(eventID.event.title, 'Unit Test '+selectedActivity._source.title);
      assert.equal(eventID.nature, 'CO2 Commodity Event');
      assert.equal(eventID.event.factor,selectedActivity._source.co2eq);
    });
  });

  describe('#eventCompensate(EVENTID) - Settlement Identity', async function() {
    it('Compensate all CO2 from event', async function() {
      compensation = await instance.eventCompensate(settlement.event);
      assert.equal(compensation.certificate.meta.settlement, settlement.event);
      assert.equal(compensation.certificate.co2requested,settlement.co2eq);
    });
    it('Validate IDs from Compensation', async function() {
      compensationID = await instance.identityLookup(compensation.certificate.compensation);
      ownerID = await instance.identityLookup(compensation.owner.account);
      gscID = await instance.identityLookup(compensation.certificate.gsc.tx.from);

      // type validation
      assert.equal(compensationID.nature == 'CO2 Offset Certificate', true);
      assert.equal(ownerID.nature == 'User (RapidAPI)', true);
      assert.equal(gscID.nature == 'Gold Standard Credit - VER', true);
    });
    it('Validate Compensation result at Settlement', async function() {
      // NOTE: We use the internal function to avoid cached results!
      eventID = await instance._identityLookup(settlement.event,false);

      assert.equal(eventID.event.title, 'Unit Test '+selectedActivity._source.title);
      assert.equal(eventID.nature, 'CO2 Commodity Event');
      assert.equal(eventID.event.factor,selectedActivity._source.co2eq);
      assert.equal(eventID.event.co2eq,eventID.event.offset); // All compensated ?
      assert.equal(eventID.event.offset,compensation.certificate.co2requested);
      assert.equal(eventID.event.offset,settlement.co2eq);
    });
  });

  describe('#listEvents() - Check existing settlements for account', async function() {
    it('retrieve fresh created event', async function() {
      events = await instance.listEvents();
      let found=false;
      let result = {};
      for(let i=0;i<events.length;i++) {
        if(events[i].event == settlement.event) {
          found = true;
          result = events[i];
        }
      }
      assert.equal(found,true);
      assert.equal(result.qty,settlement.qty);
      assert.equal(result.co2eq,settlement.co2eq);
    });
  });

  describe('#balance() - Check Balance change of account', async function() {
    it('retrieve final balance', async function() {
      endBalance = await instance.balance();
      assert.equal(endBalance.timestamp > startBalance.timestamp,true);
      assert.equal(typeof endBalance.assets !== 'undefined',true);
    });
    it('Validate Bookkeeping', async function() {
      assert.equal(startBalance.balance,endBalance.balance);
      assert.equal(startBalance.openEvents.length,endBalance.openEvents.length);
    });
  });
});
