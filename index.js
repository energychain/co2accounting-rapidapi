'use strict';

const axios = require("axios");

const co2accounting = function(rapidAPIkey) {

  let baseURL = 'https://co2-offset.p.rapidapi.com/';

  let headers = {
        "content-type":"application/json",
        "x-rapidapi-host":"co2-offset.p.rapidapi.com",
        "x-rapidapi-key":rapidAPIkey,
        "useQueryString":true
  };

  if(rapidAPIkey.length !== 50) {
      headers = {
          "content-type":"application/json",
          "x-account": rapidAPIkey
      }
      baseURL = 'https://api.corrently.io/v2.0/';
  }

  let parent = this;
  this.EVENTRELOAD = 900000;

  this._forceEventReload = new Date().getTime() + this.EVENTRELOAD;
  this._forceCertificateReload = new Date().getTime() + this.EVENTRELOAD;
  this._forceBalanceReload = new Date().getTime() + this.EVENTRELOAD;

  if(typeof window !== 'undefined') {
    let nextReload = window.localStorage.getItem("nextEventReload");
    if((typeof nextReload !== 'undefined')&&(nextReload !== null)) {
      this._forceEventReload = nextReload;
    }
  }

  this._getAllDBEvents = function() {
    return new Promise(function (resolve) {
      if(typeof window !== 'undefined') {
            const request = window.indexedDB.open("co2events", 1);
            request.onupgradeneeded = function(event) {
              const db = event.target.result;
              db.createObjectStore("events", { keyPath: "event"});
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
               }
             };
      } else {
          const level = require("level");
          let events = [];

          level('co2events', { createIfMissing: true }, function (err, db) {
            db.createReadStream({})
            .on('data', function(data) {
              events.push(JSON.parse(data.value));
            })
            .on('close',function() {

            })
            .on('end',function() {
              db.close();
              resolve(events);

            })
          });
      }

    });
  }

  this._getAllCertificates = function() {
    return new Promise(function (resolve) {
      if(typeof window !== 'undefined') {
            const request = window.indexedDB.open("co2certificates", 1);
            request.onupgradeneeded = function(event) {
              const db = event.target.result;
              db.createObjectStore("certificates", { keyPath: "compensation"});
            }
            request.onsuccess= function(event) {
              try {
                const db = event.target.result;
                const txn = db.transaction('certificates', "readonly");
                 const objectStore = txn.objectStore('certificates');
                 let events = [];

                 objectStore.openCursor().onsuccess = (event) => {
                     let cursor = event.target.result;
                     if (cursor) {
                         let dbevent = cursor.value;
                         events.push(dbevent);
                         cursor.continue();
                     }
                 }
                 txn.oncomplete = function () {
                     db.close();
                     resolve(events);
                 };
               } catch(e) {
                 resolve([]);
               }
             }
      } else {
          const level = require("level");
          let events = [];

          level('co2certificates', { createIfMissing: true }, function (err, db) {
            db.createReadStream({})
            .on('data', function(data) {
                events.push(JSON.parse(data.value));
            })
            .on('close',function() {
            })
            .on('end',function() {
              db.close();
              resolve(events);
            })
          });
      }
    });
  }

  this._compensate = async function(gramsCO2,event) {
          let settings = {
                "method":"GET",
                "url":baseURL+"rapidapi/compensate",
                "headers":headers,
                "params":{
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
                  "url":baseURL+"co2/identity",
                  "headers":headers,
                  "params":{
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
                "url":baseURL+"rapidapi/forgetEvent",
                "headers":headers,
                "params":{
                  "event":event
                }
        });
        parent._forceEventReload = 0;
        return responds.data;
  };

  this.keyValue = async function(data) {
      if(data == null) data = {};
      const responds = await axios({
          "method":"POST",
              "url":baseURL+"rapidapi/kv",
              "headers":headers,
              "data":data
      });
      parent._forceEventReload = 0;
      return responds.data;
  };

  this.eventModify = async function(_event,data) {
      const responds = await axios({
          "method":"POST",
              "url":baseURL+"co2/updateEvent?event="+_event,
              "headers":headers,
              "data":data
      });
      parent._forceEventReload = 0;
      return responds.data;
  };

  this.identityLookup = async function(account) {
          return await parent._identityLookup(account);
  };

  this.createViewAccount = async function() {
      const responds = await axios({
          "method":"POST",
              "url":baseURL+"co2/createViewAccount",
              "headers":headers,
              "data":{}
      });
      return responds.data;
  };

  this.searchFootprint = async function(query) {
            const responds = await axios({
                  "method":"GET",
                  "url":baseURL+"co2/activity/search",
                  "headers":headers,
                  "params":{
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
            } catch (e) {console.debug(e);}

            if(requireFetch) {
                const responds = await axios({
                      "method":"GET",
                      "url":baseURL+"co2/listEvents",
                      "headers":headers,
                      "params":reqoptions
                  });
                fetchedData = responds.data;
                parent._forceEventReload = new Date().getTime() + parent.EVENTRELOAD;

              try {
                if((typeof window !== 'undefined')&&(window.indexedDB)) {
                  const request = window.indexedDB.open("co2events", 1);
                  request.onupgradeneeded = function(event) {
                    const db = event.target.result;
                    db.createObjectStore("events", { keyPath: "event"});
                  }
                  request.onsuccess= function(event) {
                    const db = event.target.result;
                    let transaction = db.transaction("events", "readwrite");
                    const store = transaction.objectStore("events");
                    for(let i=0;i<fetchedData.length;i++) {
                      store.add(fetchedData[i]);
                    }
                  }
                  window.localStorage.setItem("nextEventReload",parent._forceEventReload);
                } else {
                  const level = require("level");
                  level('co2events', { createIfMissing: true }, async function (err, db) {
                    for(let i=0;i<fetchedData.length;i++) {
                      await db.put(fetchedData[i].event,JSON.stringify(fetchedData[i]));
                    }
                    await db.close();
                  });
                }
              } catch(e) {console.log(e);}
              data = await parent._getAllDBEvents();
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
            if((typeof meta !== 'undefined') && (meta !== null)) {
              for (const [key, value] of Object.entries(meta)) {
                queryString += '&' + key + '=' + encodeURIComponent(value);
              }
            }

            const responds = await axios({
                  "method":"GET",
                  "url": baseURL+"rapidapi/dispatchcert?zip="+zip+"&wh="+wh+"&product="+product+queryString,
                  "headers":headers
          });
          return responds.data;
  };

  this.balance = async function(options) {
         if((typeof options == 'undefined')||(options == null)) { options = {}; }
          let balance = null;
          if(typeof window !== 'undefined') {
            balance = window.localStorage.getItem("co2balance");
            if(balance !== null) {
              try {
                balance = JSON.parse(balance);
              } catch(e) {console.debug(e);}
            }
          } else {
            const fs = require("fs");
            try {
              let responds = JSON.parse(fs.readFileSync(".co2account.json"));
              if(typeof responds.balance !== 'undefined') {
                balance = responds.balance;
              }
            } catch(e) {
              balance = null;
            }
          }
          if((typeof options.forceReload !== 'undefined')||(balance==null)) {
            let nonece = new Date().getTime() + "_" + Math.random();
            const responds = await axios({
                    "method":"GET",
                    "url":baseURL+"rapidapi/balanceOf?nonece="+nonece,
                    "headers":headers,"params":options
            });
            parent._forceBalanceReload = new Date().getTime() + parent.EVENTRELOAD;
            balance = responds.data;
            if(typeof window !== 'undefined') {
              window.localStorage.setItem("co2balance",JSON.stringify(balance));
            } else {
              // not implemented for CLI usage!
            }
          }
          return balance;
  };

  this.settleEvent = async function(settlement) {
          const responds = await axios({
                  "method":"POST",
                  "url":baseURL+"rapidapi/co2event",
                  "headers":headers,"data":settlement
          });
          parent._forceEventReload = 0;
          return responds.data;
  };
  this.updateMeter = async function(meterdata) {
          const responds = await axios({
                  "method":"POST",
                  "url":baseURL+"rapidapi/updateMeter",
                  "headers":headers,"data":meterdata
          });
          parent._forceEventReload = 0;
          return responds.data;
  };
  this.creditVoucher = async function(code) {
          const responds = await axios({
                  "method":"POST",
                  "url":baseURL+"rapidapi/voucher",
                  "headers":headers,"data":{code:code}
          });
          parent._forceEventReload = 0;
          return responds.data;
  };
  this.certificates = async function() {

      let requireFetch = true;
      let data = [];
      let fetchedData = [];

      let reqoptions = {};

      try {
          data = await parent._getAllCertificates();
          let newestCertificateTime = 0;
          for(let i=0;i<data.length;i++) {
            if(data[i].timeStamp > newestCertificateTime) newestCertificateTime = data[i].timeStamp;
          }
          if((parent._forceEventReload > new Date().getTime()) && (data.length >0)) {
            requireFetch = false;
          } else {
            reqoptions.timestamp = newestCertificateTime * 1;
          }
      } catch (e) {
          console.log("Certificate Cache Error",e);
      }

      if(requireFetch) {
          const responds = await axios({
                    "method":"GET",
                    "url":baseURL+"rapidapi/certificates",
                    "headers":headers
          });
          fetchedData = responds.data;
          parent._forceCertificateReload = new Date().getTime() + parent.EVENTRELOAD;

        try {
          if((typeof window !== 'undefined')&&(window.indexedDB)) {
            const request = window.indexedDB.open("co2certificates", 1);
            request.onupgradeneeded = function(event) {
              const db = event.target.result;
              db.createObjectStore("certificates", { keyPath: "compensation"});
            }
            request.onsuccess= function(event) {
              const db = event.target.result;
              let transaction = db.transaction("certificates", "readwrite");
              const store = transaction.objectStore("certificates");
              for(let i=0;i<fetchedData.length;i++) {
                store.add(fetchedData[i]);
              }
            }
            window.localStorage.setItem("nextCertificateReload",parent._forceCertificateReload);
          } else {
            const level = require("level");
            level('co2certificates', { createIfMissing: true }, async function (err, db) {
              for(let i=0;i<fetchedData.length;i++) {
                db.put(fetchedData[i].compensation,JSON.stringify(fetchedData[i]));
              }
            });
          }
        } catch(e) {console.debug(e);}
        data = await parent._getAllCertificates();
    }

    return data;
  }

  this.allow = async function(sender,allow) {
          const responds = await axios({
              "method":"POST",
                  "url":baseURL+"rapidapi/allowSender",
                  "headers":headers,
                  "data":{
                    "sender":sender,
                    "allow":allow
                    }
          });
          return responds.data;
  };

  this.transfer = async function(_event,to) {
          const responds = await axios({
              "method":"POST",
                  "url":baseURL+"rapidapi/transfer",
                  "headers":headers,
                  "data":{
                    "event":_event,
                    "to":to
                    }
          });
          parent._forceEventReload = 0;
          return responds.data;
  };

  this.whoami = async function() {
        if(typeof parent._iam == 'undefined') {
          let account = '';
          try {
            if(typeof window !== 'undefined') {
              account = window.localStorage.getItem("co2account");
            } else {
              try {
                const fs = require("fs");
                let responds = JSON.parse(fs.readFileSync(".co2account.json"));
                if(typeof responds.account !== 'undefined') {
                    account = responds.account;
                }
              } catch(e) {
                account = null;
              }
            }
            if((typeof account == 'undefined')||(account == null)||(account.length < 2)) {
              const responds = await axios({
                      "method":"GET",
                      "url":baseURL+"rapidapi/whoami",
                      "headers":headers
              });
              account = responds.data.account;
              if(typeof window !== 'undefined') {
                 window.localStorage.setItem("co2account",account);
              } else {
                const fs = require("fs");
                try {
                  fs.writeFileSync(".co2account.json",JSON.stringify({account:account}));
                } catch(e) {console.debug(e);}
              }
            }
            parent._iam = account;
            return account;

          } catch(e) {console.debug(e);}

        } else {
          return parent._iam;
        }
  }
}

module.exports = co2accounting;
