'use strict'
/**
 * db config
 * @type {Object}
 */
export default {
  type: 'mysql',
  connectionLimit: 10,
  adapter: {
    mysql: {
      connectionLimit: 10,
      host: '127.0.0.1',
      port: '3306',
      database: 'q_2019xseven_test',
      user: 'root',
      password: 'os!@#QWEasd',
      prefix: '',
      encoding: 'UTF8MB4_GENERAL_CI',
      log_sql:false
    },
    mongo: {}
  }
}
