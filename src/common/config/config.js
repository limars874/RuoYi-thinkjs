'use strict';
/**
 * config
 */
export default {

  port: 9876, // 端口号
  route_on: true, // 开启路由模式
  USER_LOGIN_KEY: 'LOGIN_KEY', // 用户登录key，用于session
  USER_ID_HASH_SALT: 'USER_ID_HASH_SALT', // 用户userId hash加密
  redisConfig: {
    port: 6379,
    host: '192.168.50.219',
    extend: {}
  },
  CAPTCHA_CODE_KEY: 'captcha_codes:', // 验证码 redis key
  CAPTCHA_EXPIRATION: 120, // 验证码有效期（秒）

  LOGIN_TOKEN_KEY: 'login_tokens:',
  LOGIN_USER_KEY: 'login_user_key',
  token: {
    tokenHeader: 'Authorization', // 令牌自定义标识
    tokenSecret: 'abcdefghijklmnopqrstuvwxyz', // 令牌秘钥
    tokenExpireTime: 30 // token有效期，分钟，默认30分钟
  },


  _DEBUG_: false, // 是否开启微信调试模式，可线下模拟用户
  wechat_from_sql: false, // 是否从数据库获取微信公众号信息,如果false，那么以下面wechat属性的配置为公众号信息
  setup_from_sql: false, // 是否从数据库获取项目设置信息
  app_from_sql: false, // 是否从数据获取app信息
  white_actions: [
    'api/authwechat/GET',
  ], // 白名单, 给授权使用


  log_error: false, //是否打印错误日志
  log_request: true, //是否打印请求的日志

  staticRootDIR: '/data/wwwroot/website', // 前端文件根目录
  preUploadDIR: '', // 用于存储于数据的图片地址拼接使用
  uploadFileDIR: '/data/wwwroot/website', // 处理上传文件绝对目录

  wechat: {
    APPID: 'APPID', // 微信服务号appId
    APPSECRET: 'APPSECRET', // 微信服务号密钥appSecret
    OAUTH_URL: 'OAUTH_URL', // 微信授权回调完整网址包括http://...
    IS_BASE: false,// 是否静默授权
    HAVE_PAY: 0, // 是否有微信支付，0或false表示没有
    MCH_ID: '', // 微信支付的商户id
    PARTNER_KEY: '', // 微信支付的商户key
    CERT_FILE_PATH: '', // 微信支付证书cert格式路径，例：/apiclient_cert.pem
    KEY_FILE_PATH: '', // 微信支付证书key格式路径，例：/apiclient_key.pem
    PFX_FILE_PATH: '', // 微信支付证书pfx格式路径，例：/apiclient_cert.p12
  }


};
