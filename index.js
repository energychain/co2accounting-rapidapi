'use strict';

const axios = require("axios");

const co2accounting = function(rapidAPIkey) {

  let parent = this;
  this.EVENTRELOAD = 900000;

  this._forceEventReload = new Date().getTime() + this.EVENTRELOAD;

  this._getAllDBEvents = function() {
    return new Promise(function (resolve, reject) {
      if(typeof window !== 'undefined') {
            const request = window.indexedDB.open("co2events", 1);
            request.onupgradeneeded = function(event) {
              const db = event.target.result;
              const objectStore = db.createObjectStore("events", { keyPath: "event"});
            }
            request.onsuccess= function(event) {
              try {
                const db = event.target.result;
                const txn = db.transaction('events', "readonly");
                 const objectStore = txn.objectStore('events');
                 let events = [];

                 objectStore.openCursor().onsuccess = (event) => {
                     let cursor = event.target.result;
                     if (cursor) {
                         let dbevent = cursor.value;
                         events.push(dbevent);
                         cursor.continue();
                     }
                 };
                 txn.oncomplete = function () {
                     db.close();
                     resolve(events);
                 };
               } catch(e) {
                 resolve([]);
               };
             };
      } else {
          const level = require("level");
          let events = [];

          level('co2events', { createIfMissing: true }, function (err, db) {
            db.createReadStream({})
            .on('data', function(data) {
              events.push(data.value);
            })
            .on('close',function() {
              // resolve(events);
            })
            .on('end',function() {
              resolve(events);
            })
          });
      }
    });
  }

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
          parent._forceEventReload = 0;
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
        parent._forceEventReload = 0;
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
            let requireFetch = true;
            let data = [];
            let fetchedData = [];

            let reqoptions = {};


            try {
                data = await parent._getAllDBEvents();
                let newestEventTime = 0;
                for(let i=0;i<data.length;i++) {
                  if(data[i].timestamp > newestEventTime) newestEventTime = data[i].timestamp;
                }
                if((parent._forceEventReload > new Date().getTime()) && (data.length >0)) {
                  requireFetch = false;
                } else {
                  reqoptions.timestamp = newestEventTime * 1;
                }
            } catch (e) {

            }

            if(requireFetch) {
                const responds = await axios({
                      "method":"GET",
                      "url":"https://co2-offset.p.rapidapi.com/co2/listEvents",
                      "headers":{
                      "content-type":"application/octet-stream",
                      "x-rapidapi-host":"co2-offset.p.rapidapi.com",
                      "x-rapidapi-key":rapidAPIkey,
                      "useQueryString":true
                    },"params":reqoptions
                  });
                fetchedData = responds.data;
                parent._forceEventReload = new Date().getTime() + parent.EVENTRELOAD;
              try {
                if((typeof window !== 'undefined')&&(window.indexedDB)) {
                  const request = window.indexedDB.open("co2events", 1);
                  request.onupgradeneeded = function(event) {
                  	const db = event.target.result;
                  	const objectStore = db.createObjectStore("events", { keyPath: "event"});
                  }
                  request.onsuccess= function(event) {
                    const db = event.target.result;
                    let transaction = db.transaction("events", "readwrite");
                    const store = transaction.objectStore("events");
                    for(let i=0;i<fetchedData.length;i++) {
                      store.add(fetchedData[i]);
                    }
                  }
                } else {
                  const level = require("level");
                  level('co2events', { createIfMissing: true }, async function (err, db) {
                    for(let i=0;i<fetchedData.length;i++) {
                      db.put(fetchedData[i].event,fetchedData[i]);
                    }
                  });
                }
              } catch(e) {}
          }
          // merge data and fetchedData
          data =  data.concat(fetchedData);
          if(typeof options.scope !== 'undefined') {
              let ndata = [];
              for(let i=0;i<data.length;i++) {
                if(data[i].scope == options.scope) ndata.push(data[i]);
              }
              data = ndata;
          }
          return data;
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
          parent._forceEventReload = 0;
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
          parent._forceEventReload = 0;
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
