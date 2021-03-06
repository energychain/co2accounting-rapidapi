/***************************************************
* Only suitable for Germany                        *
***************************************************/

const assert = require('assert');
const CO2accounting = require("../index.js");
require('dotenv').config();

describe('CO2 Accounting - Electricity Germany', function() {
  let instance = {};

  before(async () => {
    if(typeof process.env.RAPIDAPIKEY !== 'undefined') {
       RAPIDAPIKEY = process.env.RAPIDAPIKEY;
    }
    instance = new CO2accounting(RAPIDAPIKEY);
  });

  describe('Environment/Runtime Setup', function() {
    it('In order to run tests a .env needs to have RAPIDAPIKEY="YOURKEY";', function() {
      assert.equal(typeof RAPIDAPIKEY == 'string', true);
    });
  });

  describe('#disaggregationElectricity("10117",200,"eco")', function() {
    it('Retrieve Results for Berlin and validate Disaggregation', async function() {
      let result = await instance.disaggregationElectricity('10117',200,'eco');
      assert.equal(typeof result.co2eq !== 'undefined', true);
      assert.equal(typeof result.compliance !== 'undefined', true);
      assert.equal(typeof result.presafing !== 'undefined', true);
      assert.equal(typeof result.generation !== 'undefined', true);
      assert.equal(typeof result.signature !== 'undefined', true);
    });
  });
});
