'use strict';

export default {
  // port: 8437,
  db: {
    connectionLimit: 10,
    type: 'mysql',
    adapter: {
      mysql: {
        host: '192.168.50.219',
        port: '3306',
        database: 'ry-vue',
        user: 'root',
        password: 'limars874',
        prefix: '',
        encoding: 'UTF8MB4_GENERAL_CI',
        log_sql: true,
        connectionLimit: 10,
      },
      mongo: {}
    }
  },
  redisConfig: {
    port: 6379,
    host: '192.168.50.219',
    extend: {}
  },
  staticRootDIR: 'e:\\me\\yewu\\temp\\image', // 前端文件根目录
  preUploadDIR: '', // 用于存储于数据的图片地址拼接使用
  uploadFileDIR: 'e:\\me\\yewu\\temp\\image', // 处理上传文件绝对目录
  _DEBUG_: true

};
