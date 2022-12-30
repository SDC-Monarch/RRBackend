const Papa = require('papaparse');
const fs = require('fs');
const { resolve } = require('path');
const file = fs.createReadStream('characteristic_reviews.csv');
const { Pool, Client } = require('pg')
const pool = new Pool({
  user: 'brandonvega',
  host: 'localhost',
  database: 'reviews',
  port: 5432
})
pool.connect()
  .then((client) => {
    Papa.parse(file, {
      header: true,
      fastMode: true,
      chunk: function (results, parser) {
        file.pause()
        parser.pause();
        checkData(results.data)
          .then(() => {
            file.resume()
            parser.resume() })
      },
      complete: () => {
        pool.end();
      }
    })
    var checkData = (arr) => {
      return new Promise((resolve, reject) => {
        var query = `INSERT INTO characteristic_reviews VALUES `;
        arr.forEach((characteristic) => {
          query += `(${characteristic.id}, ${characteristic.characteristic_id}, ${characteristic.review_id}, ${characteristic.value}`
          query += `), `
        })
        query = query.slice(0, query.length - 2) + ';'
        client.query(query)
          .then(data => {resolve()})
          .catch(err => {console.log('FAIL', err, 'THIS WAS THE QUERY', query); reject()})
      })
    }

  })

