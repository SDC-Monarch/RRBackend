const { Pool } = require('pg')
const pool = new Pool({
  user: 'brandonvega',
  host: 'localhost',
  database: 'reviews',
  port: 5432,
  max: 70
})


module.exports = async (req, res, next) => {
  req.psqlClient = await pool.connect()
  next()
}

