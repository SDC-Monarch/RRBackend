const Papa = require('papaparse');
const fs = require('fs');
const { resolve } = require('path');
const file = fs.createReadStream('reviews.csv');
const { Pool, Client } = require('pg')
const pool = new Pool({
  user: 'brandonvega',
  host: 'localhost',
  database: 'reviews',
  port: 5432
})
var timeToComplete = 0;
pool.connect()
  .then((client) => {
    Papa.parse(file, {
      header: true,
      beforeFirstChunk: () => {
        timeToComplete = new Date();
      },
      chunk: function (results, parser) {
        file.pause();
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
      return new Promise(async (resolve, reject) => {
        var query = `INSERT INTO reviews VALUES `;
        var updateDbMeta = (id, rating, recommend) => {
          return new Promise((res, rej) => {
            // insert new row for a product given it has at least one review
            client.query(`INSERT INTO metadata (product_id, rating_one, rating_two, rating_three, rating_four, rating_five, recommend_false, recommend_true) VALUES (${id}, 0, 0, 0, 0, 0, 0, 0) ON CONFLICT (product_id) DO NOTHING;`)
              .then(() => {
                //handle rating update
                return new Promise((res, rej) => {
                  if (rating !== undefined && !isNaN(rating)) {
                    if (rating === '1') {
                      client.query(`UPDATE metadata SET rating_one = rating_one + 1 WHERE product_id=${id}`).then(() => res())
                    } else if (rating === '2') {
                      client.query(`UPDATE metadata SET rating_two = rating_two + 1 WHERE product_id=${id}`).then(() => res())
                    } else if (rating === '3') {
                      client.query(`UPDATE metadata SET rating_three = rating_three + 1 WHERE product_id=${id}`).then(() => res())
                    } else if (rating === '4') {
                      client.query(`UPDATE metadata SET rating_four = rating_four + 1 WHERE product_id=${id}`).then(() => res())
                    } else if (rating === '5') {
                      client.query(`UPDATE metadata SET rating_five = rating_five + 1 WHERE product_id=${id}`).then(() => res())
                    }
                  }

                })
              })
              .then(() => {
                // handle recommend update
                return new Promise((res, rej) => {
                  if (recommend === 'false' || recommend === false) {
                    client.query(`UPDATE metadata SET recommend_false = recommend_false + 1 WHERE product_id=${id}`)
                    .then(() => {res()})
                  } else if (recommend === 'true' || recommend === true) {
                    client.query(`UPDATE metadata SET recommend_true = recommend_true + 1 WHERE product_id=${id}`)
                    .then(() => {res()})
                  }
                })
              })
              .then(() => {res()})
              .catch(err => {console.log(err)})

          })
        }
        var constructQuery = () => {
          return new Promise((resol, rejec) => {
            arr.forEach(async (review, index) => {
              updateDbMeta(review.product_id, review.rating, review.recommend).then(() => {
                query += `(`
                for (var key in review) {
                  if (key === 'date') {
                    const date = new Date(parseInt(review[key])).toISOString();
                    query += `'${date}', `;
                  } else {
                    if (typeof review[key] === 'string' && isNaN(review[key]) && review[key] !== 'null' && review[key] !== 'true' && review[key] !== 'false') {
                      query += `'${review[key].replaceAll("'","''")}', `
                    } else if (review[key] === 'null'){
                      query += `null, `
                    } else if (review[key] === 'true') {
                      query += `true, `
                    } else {
                      query += `${review[key]}, `;
                    }
                  }
                }
                query += `), `
                query = query.replaceAll(', )', ')').slice(0, query.length - 2)
                if (index === arr.length - 1) {
                  resol();
                }
              })
            })
          })
        }

        // bulk insertion into
        constructQuery().then(() => {
          query = query.replaceAll(', )', ')').slice(0, query.length - 2) + `;`
          client.query(query)
            .then(data => {resolve()})
            .catch(err => { reject()})
        })

      })
    }

  })

