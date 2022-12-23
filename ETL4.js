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
        var query = `INSERT INTO metadata VALUES `;
        arr.forEach((characteristic) => {
          client.query(`SELECT name, product_id FROM characteristics WHERE id=${characteristic.characteristic_id}`)
            .then(data => {
              if (data[0].name === 'Quality' || data[0].name === '"Quality"' || data[0].name === "'Quality'" ) {

              }
              resolve()

            })
          query += `()`
          // for (var key in review) {
          //   if (key === 'date') {
          //     const date = new Date(parseInt(review[key]) * 1000).toISOString();
          //     query += `'${date}'`;
          //   } else {
          //     if (typeof review[key] === 'string' && isNaN(review[key]) && review[key] !== 'null' && review[key] !== 'true' && review[key] !== 'false') {
          //       query += `'${review[key].replaceAll("'","''")}', `
          //     } else if (review[key] === 'null'){
          //       query += `null, `
          //     } else if (review[key] === 'true') {
          //       query += `true, `
          //     } else {
          //       query += `${review[key]}, `;
          //     }
          //   }
          // }
          query += `), `
        })
        query = query.slice(0, query.length - 2) + ';'
        client.query(query)
          .then(data => {resolve()})
          .catch(err => {console.log('FAIL', err, 'THIS WAS THE QUERY', query); reject()})
      })
    }

  })

