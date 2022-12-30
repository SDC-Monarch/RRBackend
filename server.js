const express = require('express');
const app = express();
const db = require('./db.js');

app.use(db)
app.use(express.json())

app.get('/reviews/', (req, res) => {
  // params: product_id r, page d1, count d5, sort by
  var page = req.query.page || 0;
  var count = req.query.count || 5;
  var product = req.query.product_id || -1;
  var sort = req.query.sort || 'relevant';
  var returnObject = {
    "product": product.toString(),
    page,
    count,
    results: []
  }
  var monthInUnix = 2592000000;

  if (product === -1) {
    res.sendStatus(401);
  } else {
    req.psqlClient.query(`SELECT id, rating, summary, recommend, response, body, date, reviewer_name, helpfulness
    FROM reviews
    WHERE product_id=${product}
    ${sort === 'newest' ? `ORDER BY date DESC LIMIT ${count};` : sort === 'helpfulness' ?`ORDER BY helpfulness DESC LIMIT ${count};` : `LIMIT ${count};`}`)
    .then(data => {
      var relevantObjs = [];
      data.rows.forEach(row => {
        if (sort === 'helpfulness' || sort === 'newest') {
          row.review_id = row.id;
          delete row.id;
          returnObject.results.push(row)
        } else if (sort === 'relevant') {
          row.review_id = row.id;
          delete row.id;
          row.relevance = new Date(new Date(row.date).getTime() + monthInUnix * row.helpfulness).getTime();
          relevantObjs.push(row)
        }
      })
      if (sort === 'relevant') {
        relevantObjs.sort((a, b) => parseInt(b.relevance) - parseInt(a.relevance));
        relevantObjs.forEach(obj => delete obj.relevance);
        relevantObjs.forEach(obj => returnObject.results.push(obj))
      }
      res.send(returnObject)
    })
    .catch(err => res.send(err));
  }

});

app.get('/reviews/meta', (req, res) => {
  var product = req.query.product_id || -1;
  var returnObj = {
    "product_id": product,
    "ratings": {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
    "recommended": {
      "false": 0,
      "true": 0,
    },
    "characteristics": {},
  }


  if (product === -1) {
    res.sendStatus(401);
  } else {
    // retrieve all the metadata besides the characteristic information
    req.psqlClient.query(`SELECT rating_one, rating_two, rating_three, rating_four, rating_five, recommend_false, recommend_true FROM metadata WHERE product_id=${product}`)
      .then(data => {
        data.rows.forEach(row => {
          returnObj.ratings[1] += row.rating_one;
          returnObj.ratings[2] += row.rating_two;
          returnObj.ratings[3] += row.rating_three;
          returnObj.ratings[4] += row.rating_four;
          returnObj.ratings[5] += row.rating_five;
          returnObj.recommended.false += row.recommend_false;
          returnObj.recommended.true += row.recommend_true;
        })

        // format to string to copy the api
        returnObj.ratings[1] = returnObj.ratings[1].toString()
        returnObj.ratings[2] = returnObj.ratings[2].toString()
        returnObj.ratings[3] = returnObj.ratings[3].toString()
        returnObj.ratings[4] = returnObj.ratings[4].toString()
        returnObj.ratings[5] = returnObj.ratings[5].toString()
        returnObj.recommended.false = returnObj.recommended.false.toString();
        returnObj.recommended.true = returnObj.recommended.true.toString();

        // return information relevant to the characteristics
        return req.psqlClient.query(`SELECT id, name FROM characteristics WHERE product_id=${product}`)
      })
      .then(data => {
        return new Promise((res, rej) => {
        data.rows.forEach((row, rowIndex) => {
          // store ID from each result in the characteristics object
          returnObj.characteristics[row.name] = {
            id: row.id,
            value: []
          }
            req.psqlClient.query(`SELECT * FROM characteristic_reviews WHERE characteristic_id=${row.id}`)
            .then(characteristic => {
              characteristic.rows.forEach((char, index) => {
                returnObj.characteristics[row.name].value.push(char.value)
                if (index === characteristic.rows.length - 1 && rowIndex === data.rows.length - 1) {
                  res(returnObj)
                  console.log('GOING TO RESOLVE, this is the return object', JSON.stringify(returnObj))
                }
              })
            })
          })
        })
      })
      .then((returnObj) => {
        // get average of characteristics
        // and format ratings to strings as the API would



        // avg calculation for each characteristic
        var average = 0;
        for (var key in returnObj.characteristics) {
          average = 0;
          returnObj.characteristics[key].value.forEach(num => {
            average += num;
          })
          average = average / returnObj.characteristics[key].value.length
          returnObj.characteristics[key].value = average.toString();
        }
        res.send(returnObj)
      })
  }

})

app.listen(3000, () => {
  console.log('listening on 3000')
});