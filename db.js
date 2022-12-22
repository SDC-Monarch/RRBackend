const fs = require("fs");
const fastcsv = require("fast-csv");
const Pool = require("pg").Pool;
const csv = require("@fast-csv/parse");
const { nextTick } = require("process");


const loadRecords = () => {
  let stream = fs.createReadStream("reviews.csv");
  let data = [];
  csv.parseStream(stream)
    .on('data', (record) => {
      data.push(record);
      if (data.length % 10000 === 0) {
        console.log('length hit', data.length)
      }
      if (data.length % 50000 === 0) {
        console.log('CALLED PAUSE')
        stream.pause()
      }
    })
    .on('pause', (data) => {
      console.log('STOPPED AT ', data.length)
      console.log('PAUSED FOR A 30 sec, GOING TO RESUME')
      stream.resume()
    })
    .on('end', () => {
      return console.log('DONE', data.length);
    })
    .on('error', (err) => {
      return console.log(err)
    })
}
loadRecords();