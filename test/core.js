const assert = require('assert');
const CO2accounting = require("../index.js");
require('dotenv').config();

describe('CO2 Accounting - Core', function() {
  let instance = {};
  let compensation = {}
  const grams = 1;
  let compensationID = {};
  let ownerID = {};
  let gscID = {};

  before(async () => {
    if(typeof process.env.RAPIDAPIKEY !== 'undefined') {
       RAPIDAPIKEY = process.env.RAPIDAPIKEY;
    }
    instance = new CO2accounting(RAPIDAPIKEY);
    compensation = await instance.directCompensate(grams);
  });

  describe('Environment/Runtime Setup', function() {
    it('In order to run tests a .env needs to have RAPIDAPIKEY="YOURKEY";', function() {
      assert.equal(typeof RAPIDAPIKEY == 'string', true);
    });
  });

  describe('#directCompensate(GRAMS)', async function() {
    it('Ownership', async function() {
        assert.equal(typeof compensation.owner !== 'undefined', true);
    });
    it('Certificate', async function() {
        assert.equal(typeof compensation.certificate !== 'undefined', true);
        assert.equal(typeof compensation.certificate.compensation !== 'undefined', true);
        assert.equal(typeof compensation.certificate.certificate !== 'undefined', true);
        assert.equal(typeof compensation.certificate.cleared !== 'undefined', true);
        assert.equal(compensation.certificate.cleared, true);
        assert.equal(typeof compensation.certificate.co2 !== 'undefined', true);
        assert.equal(typeof compensation.certificate.co2requested !== 'undefined', true);
        assert.equal(compensation.certificate.co2requested, grams);
        assert.equal(typeof compensation.certificate.gsc !== 'undefined', true);
        assert.equal(typeof compensation.certificate.gsc.allocated !== 'undefined', true);
        assert.equal(compensation.certificate.gsc.allocated == true , true);
    });
    it('Clearance', async function() {
        assert.equal(typeof compensation.clearance !== 'undefined', true);
        assert.equal(typeof compensation.clearance.tree !== 'undefined', true);
        assert.equal(typeof compensation.clearance.issueDate !== 'undefined', true);
        assert.equal(typeof compensation.clearance.treecompensation !== 'undefined', true);
        assert.equal(typeof compensation.clearance.treecompensation.actualSincePlanted !== 'undefined', true);
    });
  });

  describe('#identityLookup() - Basic with Direct Compensation', async function() {
    it('Validate IDs from Compensation";', async function() {
      compensationID = await instance.identityLookup(compensation.certificate.compensation);
      ownerID = await instance.identityLookup(compensation.owner.account);
      gscID = await instance.identityLookup(compensation.certificate.gsc.tx.from);

      // type validation
      assert.equal(compensationID.nature == 'CO2 Offset Certificate', true);
      assert.equal(ownerID.nature == 'User (RapidAPI)', true);
      assert.equal(gscID.nature == 'Gold Standard Credit - VER', true);
    });
  });
});
