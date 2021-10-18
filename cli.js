#!/usr/bin/env node

require('dotenv').config();
const CO2Accounting = require('./index.js');

const { program } = require('commander');

program.version('1.0.0');

const getAPIKey = function(options) {
  let rapidAPIkey = '';

  if(typeof options.rapidapi !== 'undefined') {
    rapidAPIkey = options.rapidapi;
  }

  if(typeof process.env.RAPIDAPIKEY !== 'undefined') {
     rapidAPIkey = process.env.RAPIDAPIKEY.substr(1,50);
  }

  if(rapidAPIkey.length < 30) {
      console.error("Invalid key. Please check your RapidAPI Key in parameter -k or in .env file.\n");
      console.error("Get a new one at https://rapidapi.com/stromdao-stromdao-default/api/co2-offset \n");
      process.exit(2);
  }

  return rapidAPIkey;
}

program
  .command('whoami')
  .description('Gives your Account Id')
  .option('-k,--rapidapi <key>', 'RapidAPI Key')
  .option('-v,--verbose', 'more verbose output')
  .option('-j,--json', 'Output JSON')
  .action(async (options) => {
    const instance = new CO2Accounting(getAPIKey(options));
    let result = await instance.whoami();
    if(typeof options.verbose !== 'undefined') console.log("Your Account/Identity Key:",result); else
    if(typeof options.json !== 'undefined') console.log(JSON.stringify({account:result})); else
    console.log(result);
 });

 program
   .command('compensate <grams>')
   .description('Direct compensate given number grams or CO2')
   .option('-k,--rapidapi <key>', 'RapidAPI Key')
   .option('-v,--verbose', 'more verbose output')
   .option('-j,--json', 'Output JSON')
   .action(async (grams,options) => {
     const instance = new CO2Accounting(getAPIKey(options));
     let result = await instance.directCompensate(grams);
     if(typeof options.verbose !== 'undefined') {
       let table = {};
       table.certificate = result.certificate.compensation;
       table.co2 = result.certificate.co2requested;
       table.gsc =result.certificate.gsc.note;
       table.tree = result.certificate.tree;
       console.table(table);
     } else
     if(typeof options.json !== 'undefined') console.log(result); else {
        console.log(result.certificate.compensation);
     }
  });

  program
    .command('compensateEvent <eventId>')
    .description('Compensate remaing emission of an event')
    .option('-k,--rapidapi <key>', 'RapidAPI Key')
    .option('-v,--verbose', 'more verbose output')
    .option('-j,--json', 'Output JSON')
    .action(async (eventId,options) => {
      const instance = new CO2Accounting(getAPIKey(options));
      let result = await instance.eventCompensate(eventId);
      if(typeof options.verbose !== 'undefined') {
        let table = {};
        table.certificate = result.certificate.compensation;
        table.co2 = result.certificate.co2requested;
        table.gsc =result.certificate.gsc.note;
        table.tree = result.certificate.tree;
        console.table(table);
      } else
      if(typeof options.json !== 'undefined') console.log(result); else {
         console.log(result.certificate.compensation);
      }
   });

  program
    .command('emission <grams>')
    .description('Add emission to account.')
    .option('-k,--rapidapi <key>', 'RapidAPI Key')
    .option('-v,--verbose', 'more verbose output')
    .option('-j,--json', 'Output JSON')
    .option('-t,--title <EventTitle>', 'Set human readable title for emission event')
    .action(async (grams,options) => {
      const instance = new CO2Accounting(getAPIKey(options));
      let eventDetails = {
        co2: grams * 1
      };
      eventDetails.title = 'CLI Event';
      if(typeof options.title !== 'undefined') {
          eventDetails.title = options.title;
      }
      let result = await instance.settleEvent(eventDetails);
      if(typeof options.verbose !== 'undefined') {
        let row = {};
        row.event = result.event;
        row.liabilitiy = result.co2eq;
        row.asset = result.offset;
        row.balance = row.asset  - row.liabilitiy;
        console.table([row]);
      } else
      if(typeof options.json !== 'undefined') console.log(result); else {
         console.log(result.event);
      }
   });

   program
     .command('footprint <searchTerm>')
     .description('Searches in Footprint database')
     .option('-k,--rapidapi <key>', 'RapidAPI Key')
     .option('-v,--verbose', 'more verbose output')
     .option('-j,--json', 'Output JSON')
     .action(async (searchTerm,options) => {
       const instance = new CO2Accounting(getAPIKey(options));
       let result = await instance.searchFootprint(searchTerm);
       if(typeof options.verbose !== 'undefined') {
         let table = [];
         for(let i=0;i<result.length;i++) {
           let row = {};
           row.activity = result[i]._source.activity;
           row.title = result[i]._source.en.title;
           row.co2 = result[i]._source.co2eq;
           row.unit = result[i]._source.unit;
           table.push(row);
         }
         console.table(table);
       } else
       if(typeof options.json !== 'undefined') {
         console.log(result);
       }else {
         console.log(result[0]._source.co2eq);
       }
    });

  program
    .command('balance')
    .description('Retrieves CO2 Accounting Balance')
    .option('-k,--rapidapi <key>', 'RapidAPI Key')
    .option('-v,--verbose', 'more verbose output')
    .option('-j,--json', 'Output JSON')
    .action(async (options) => {
      const instance = new CO2Accounting(getAPIKey(options));
      let result = await instance.balance();
      if(typeof options.verbose !== 'undefined') {
        let row = {};
        row.assets = result.assets;
        row.liabilities = result.liabilities;
        row.balance =result.balance;
        console.table([row]);
      } else
      if(typeof options.json !== 'undefined') {
        console.log(result);
      }else {
        console.log(result.balance);
      }
   });

   program
     .command('events')
     .description('Retrieves emission events')
     .option('-k,--rapidapi <key>', 'RapidAPI Key')
     .option('-v,--verbose', 'more verbose output')
     .option('-j,--json', 'Output JSON')
     .option('-f,--filter', 'Filter Open events')
     .action(async (options) => {
       const instance = new CO2Accounting(getAPIKey(options));
       let result = await instance.listEvents();
       if(typeof options.filter !== 'undefined') {
          let result_new = [];
          for(let i=0;i<result.length;i++) {
            if((typeof result[i].co2eq !== 'undefined') && (result[i].co2eq - result[i].offset > 0)) {
              result_new.push(result[i]);
            }
          }
          result = result_new;
       }
       if(typeof options.verbose !== 'undefined') {
         let table = [];
         for(let i=0;i<result.length;i++) {
            let row = {};
            row.title = result[i].title
            row.event = result[i].event;
            row.liabilitiy = result[i].co2eq;
            row.asset = result[i].offset;
            row.balance = row.asset  - row.liabilitiy;
            table.push(row);
         }
         console.table(table);
       } else
       if(typeof options.json !== 'undefined') {
         console.log(result);
       }else {
         for(let i=0;i<result.length;i++) {
           console.log(result[i].event)
         }
       }
    });

    program
      .command('identity <account>')
      .description('Retrieves CO2 Accounting Balance')
      .option('-k,--rapidapi <key>', 'RapidAPI Key')
      .option('-v,--verbose', 'more verbose output')
      .option('-j,--json', 'Output JSON')
      .action(async (account,options) => {
        const instance = new CO2Accounting(getAPIKey(options));
        let result = await instance.identityLookup(account);
        if(typeof options.verbose !== 'undefined') {
          let row = {};
          row.account = result.account;
          row.nature = result.nature;
          console.table([row]);
        } else
        if(typeof options.json !== 'undefined') {
          console.log(result);
        }else {
          console.log(result.nature);
        }
     });

    program
      .command('disaggregationElectricity <zipcode> <wh> <product>')
      .description('Disaggregation for Electricity (only available for Germany). Product:eco or standard')
      .option('-k,--rapidapi <key>', 'RapidAPI Key')
      .option('-v,--verbose', 'more verbose output')
      .option('-j,--json', 'Output JSON')
      .action(async (zipcode,wh,product,options) => {
        const instance = new CO2Accounting(getAPIKey(options));
        let result = await instance.disaggregationElectricity(zipcode,wh,product);
        if(typeof options.verbose !== 'undefined') {
          console.table([
            {
              co2:result.co2.totalEmission,
              presafing:result.presafing,
              settlement:result.signature
            }
          ]);
          let table = [];
          for(let i=0;i<result.generation.mix.length;i++) {
            let row = result.generation.mix[i];
            table.push(row);
          }
          console.table(table);
        } else
        if(typeof options.json !== 'undefined') {
          console.log(result);
        }else {
          console.log(result.co2.totalEmission);
        }
     });

/*

*/
program.parse(process.argv);
