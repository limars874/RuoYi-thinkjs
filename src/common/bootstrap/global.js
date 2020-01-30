/**
 * this file will be loaded before server started
 * you can define global functions used in controllers, models, templates
 */

/**
 * use global.xxx to define global functions
 *
 * global.fn1 = function(){
 *
 * }
 */

import colors from 'colors'
import crontab from 'node-crontab'
import Redis from 'ioredis'
import lodash from 'lodash'

var http = require('http')

/**
 * black
 red
 green
 yellow
 blue
 magenta
 cyan
 white
 gray
 grey
 * @param {Object} msg
 * @param {Object} color
 */
think.debugLog = function (msg, color) {
  const isDebug = think.config('setup.IS_DEBUG') === '1' || false
  if (think.env !== 'development' && !isDebug) {
    return
  }
  if (!typeof msg === 'string') {
    return
  }
  color = color || 'yellow'
  think.log(msg[color], "DEBUG");
}

think.errorLog = function (msg, color) {
  if (!typeof msg === 'string') {
    return
  }
  color = color || 'red'
  think.log(msg[color], "ERROR");
}

think.infoLog = function (msg, color) {
  if (!typeof msg === 'string') {
    return
  }
  color = color || 'green'
  think.log(msg[color], "INFO");
}

global.showErrooByCode = function (code) {
  let result = think.config('error', undefined, 'api')[code]
  return result ? result : think.config('error', undefined, 'api')[10000]
}

global.showErrorByEnum = function (enumCode) {
  let enumConfig = think.config('resEnum', undefined, 'home')
  return enumConfig['property'][enumCode]['msg'] || '未知错误'
}


const redisConfig = think.config('redisConfig')
global.GRedis = new Redis(redisConfig.port, redisConfig.host, redisConfig.extend)


// 定时任务 每天查询过期时间，批量更新状态 handleExpire
let cronTask = async () => {
  //定时任务具体逻辑
  //调用一个 Action
  let instance = think.controller('cron', http, 'api');
  instance.doSomething()
}


/**
 * 把返回的数据集转换成Tree
 * @param array data 要转换的数据集
 * @param string pid parent标记字段
 * @return array
 */
/* global arr_to_tree */
global.arr_to_tree = function (data, pid) {
  let result = [], temp;
  let length = data.length;
  for (let i = 0; i < length; i++) {
    if (data[i].pid == pid) {
      result.push(data[i]);
      temp = arr_to_tree(data, data[i].id);
      if (temp.length > 0) {
        data[i].children = temp;
        data[i].chnum = data[i].children.length;
      }
    }
  }
  return result;
};


/**
 * escape string
 * @param  {String} str []
 * @return {String}     []
 */
global.escapeString = function (str) {
  if (!str) {
    return '';
  }
  if (typeof (str) === "number") {
    return str
  }
  return str.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, s => {
    switch (s) {
      case '\0':
        return '\\0';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\b':
        return '\\b';
      case '\t':
        return '\\t';
      case '\x1a':
        return '\\Z';
      default:
        return '\\' + s;
    }
  });
}

global.generateRandomCode = function (num) {
  const zero = new Array(num).join("0");
  return (zero + (Math.floor(Math.random() * Math.pow(36, num))).toString(36)).slice(-num).toUpperCase();
}

global.generateRandomCharCode = function (num) {
  const charset = "abcdefghijklmnopqrstuvwxyz";
  let result = '';
  for (let i = 0; i < num; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result
}

global._ = lodash
