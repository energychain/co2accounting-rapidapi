'use strict';

const axios = require("axios");

const co2accounting = function(rapidAPIkey) {

  let parent = this;

  this._compensate = async function(gramsCO2,event) {
          let settings = {
                "method":"GET",
                "url":"https://co2-offset.p.rapidapi.com/rapidapi/compensate",
                "headers":{
                "content-type":"application/octet-stream",
                "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                "x-rapidapi-key":rapidAPIkey,
                "useQueryString":true
                },"params":{
                "gram":gramsCO2
                }
          };

          if((typeof event !== 'undefined') && (event !== null)) {
            settings.params.settlement = event;
          }

          const responds = await axios(settings);
          return responds.data;
  };

  this._identityLookup = async function(account,caching) {
          let settings = {
                  "method":"GET",
                  "url":"https://co2-offset.p.rapidapi.com/co2/identity",
                  "headers":{
                  "content-type":"application/octet-stream",
                  "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                  "x-rapidapi-key":rapidAPIkey,
                  "useQueryString":true
                  },"params":{
                    "account":account
                  }
          }

          if((typeof caching !== 'undefined') && (caching !== null)) {
            settings.params.nonece = new Date().getTime() + "_" + Math.random();
          }

          const responds = await axios(settings);
          return responds.data;
  };

  this.directCompensate = async function(gramsCO2) {
          return await parent._compensate(gramsCO2);
  };

  this.eventCompensate = async function(event) {
          let eventData = await parent.identityLookup(event);
          return await parent._compensate(eventData.event.co2eq - eventData.event.offset,event);
  };

  this.eventDelete = async function(event) {
          const responds = await axios({
                "method":"GET",
                "url":"https://co2-offset.p.rapidapi.com/rapidapi/forgetEvent",
                "headers":{
                "content-type":"application/octet-stream",
                "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                "x-rapidapi-key":rapidAPIkey,
                "useQueryString":true
                },"params":{
                  "event":event
                }
        });
        return responds.data;
  };

  this.identityLookup = async function(account) {
          return await parent._identityLookup(account);
  };

  this.searchFootprint = async function(query) {
            const responds = await axios({
                  "method":"GET",
                  "url":"https://co2-offset.p.rapidapi.com/co2/activity/search",
                  "headers":{
                  "content-type":"application/octet-stream",
                  "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                  "x-rapidapi-key":rapidAPIkey,
                  "useQueryString":true
                  },"params":{
                    "q":query
                  }
          });
          return responds.data;
  };

  this.listEvents = async function(options) {
            if((typeof options == 'undefined')||(options == null)) { options = {}; }
            if((typeof options.account == 'undefined') || (options.account == null)) {
                  options.account = await parent.whoami();
            }

            const responds = await axios({
                  "method":"GET",
                  "url":"https://co2-offset.p.rapidapi.com/co2/listEvents",
                  "headers":{
                  "content-type":"application/octet-stream",
                  "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                  "x-rapidapi-key":rapidAPIkey,
                  "useQueryString":true
                },"params":options
          });
          return responds.data;
  };

  this.disaggregationElectricity  = async function(zip,wh,product,meta) {
            let queryString = '';
            if((typeof meta !== 'undefined') || (meta !== null)) {
              for (const [key, value] of Object.entries(meta)) {
                queryString += '&' + key + '=' + encodeURIComponent(value);
              }
            }

            const responds = await axios({
                  "method":"GET",
                  "url": "https://co2-offset.p.rapidapi.com/rapidapi/dispatchcert?zip="+zip+"&wh="+wh+"&product="+product+queryString,
                  "headers":{
                  "content-type":"application/octet-stream",
                  "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                  "x-rapidapi-key":rapidAPIkey,
                  "useQueryString":true
                  }
          });
          return responds.data;
  };

  this.balance = async function(options) {
         if((typeof options == 'undefined')||(options == null)) { options = {}; }
          let nonece = new Date().getTime() + "_" + Math.random();

          const responds = await axios({
                  "method":"GET",
                  "url":"https://co2-offset.p.rapidapi.com/rapidapi/balanceOf?nonece"+nonece,
                  "headers":{
                  "content-type":"application/octet-stream",
                  "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                  "x-rapidapi-key":rapidAPIkey,
                  "useQueryString":true
                },"params":options
          });
          return responds.data;
  };

  this.settleEvent = async function(settlement) {
          const responds = await axios({
                  "method":"POST",
                  "url":"https://co2-offset.p.rapidapi.com/rapidapi/co2event",
                  "headers":{
                  "content-type":"application/json",
                  "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                  "x-rapidapi-key":rapidAPIkey,
                  "useQueryString":true
                  },"data":settlement
          });
          return responds.data;
  };

  this.certificates = async function() {
        const responds = await axios({
                "method":"GET",
                "url":"https://co2-offset.p.rapidapi.com/rapidapi/certificates",
                "headers":{
                "content-type":"application/json",
                "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                "x-rapidapi-key":rapidAPIkey,
                "useQueryString":true
                }
        });
        return responds.data;
  }

  this.allow = async function(sender,allow) {
          const responds = await axios({
              "method":"POST",
                  "url":"https://co2-offset.p.rapidapi.com/rapidapi/allowSender",
                  "headers":{
                  "content-type":"application/json",
                  "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                  "x-rapidapi-key":rapidAPIkey,
                  "useQueryString":true
                  },"data":{
                    "sender":sender,
                    "allow":allow
                    }
          });
          return responds.data;
  };

  this.transfer = async function(_event,to) {
          const responds = await axios({
              "method":"POST",
                  "url":"https://co2-offset.p.rapidapi.com/rapidapi/transfer",
                  "headers":{
                  "content-type":"application/json",
                  "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                  "x-rapidapi-key":rapidAPIkey,
                  "useQueryString":true
                  },"data":{
                    "event":_event,
                    "to":to
                    }
          });
          return responds.data;
  };

  this.whoami = async function() {
        const responds = await axios({
                "method":"GET",
                "url":"https://co2-offset.p.rapidapi.com/rapidapi/whoami",
                "headers":{
                "content-type":"application/json",
                "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                "x-rapidapi-key":rapidAPIkey,
                "useQueryString":true
                }
        });
        return responds.data.account;
  }
}

module.exports = co2accounting;
