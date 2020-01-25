'use strict';
const rp = require('request-promise');
import * as crypto from "crypto";
import path from 'path';
import fse from 'fs-extra';

export default class extends think.service.base {
  /**
   * init
   * @return {}         []
   */
  init(...args) {
    super.init(...args);
  }

  /**
   * 发送验证码
   * @param tel
   * @returns {Promise<*>}
   */
  async sendLoginCode(tel) {
    const url = '/thirdparty/userauth/sendLoginCodeThird'
    const data = { mobile: tel }
    return await this.appRequest(url, data);
  }

  /**
   * 登录
   * @param tel
   * @param dynamicPassword
   * @param channel
   * @returns {Promise<*>}
   */
  async login(tel, dynamicPassword, channel = 4) {
    const url = '/thirdparty/userauth/loginThird'
    const data = { phone: tel, dynamicPassword, channel }
    return await this.appRequest(url, data);
  }

  /**
   * 根据token获取用户信息
   * @param token
   * @returns {Promise<*>}
   */
  async getUserInfo(token) {
    const url = '/thirdparty/userauth/getUserInfo'
    const data = { token }
    return await this.appRequest(url, data);
  }

  /**
   * 根据userId获取用户信息
   * @param userId
   * @returns {Promise<*>}
   */
  async getUserInfoByUserId(userId) {
    const url = '/thirdparty/userauth/getUserInfoByUserId'
    const data = { userId }
    return await this.appRequest(url, data);
  }

  /**
   * 查看是否已签到
   * @param userId
   * @param lastTime yyyy-MM-dd HH:mm:ss
   * @returns {Promise<*>}
   */
  async isUserSignIn(userId, lastTime) {
    const url = '/thirdparty/userauth/isUserSignIn'
    const data = { userId, lastTime }
    return await this.appRequest(url, data);
  }

  /**
   * 发送短信通知
   * @param mobile
   * @param content {"键（模板自定义的键）":"值（对应的内容）"},
   * @param templateCode
   * @returns {Promise<*>}
   */
  async sendNoticesOne(mobile, content, templateCode) {
    const url = '/thirdparty/common/sendNoticesOne'
    const data = { mobile, content, templateCode }
    return await this.appRequest(url, data);
  }

  /**
   * 根据手机号码用户发送通知
   * @param phone
   * @param code 模板唯一标识
   * @param title
   * @param jumpType 跳转类型( 0:不跳转,3:跳转H5)
   * @param url 传跳转H5链接
   * @param param 字符串数组，与模板填充部分一致
   * @returns {Promise<*>}
   */
  async pushNotice(phone, code, title, jumpType, url, param) {
    const app_url = '/thirdparty/common/sendNoticesOne'
    const data = { phone, code, title, jumpType, url, param }
    return await this.appRequest(app_url, data);
  }

  /**
   * 发红包
   * @param userId
   * @param nonceStr 随机字符串
   * @param partnerTradeNo 订单号
   * @param amount 单位分
   * @param desc 备注
   * @param spbillCreateIp 请求ip
   * @param channel 商户区分传（ 华源 1 长安 2） 默认用华源
   * @returns {Promise<*>}
   */
  async enterprisePay(userId, nonceStr, partnerTradeNo, amount,
                      desc, spbillCreateIp, channel, distinguish) {
    const app_url = '/thirdparty/common/enterprisePay'
    const data = { userId, nonceStr, partnerTradeNo, amount, desc, spbillCreateIp, channel, distinguish }
    return await this.appRequest(app_url, data);
  }

  /**
   * 查询用户收货地址信息
   * @param userId
   * @param addressId
   * @param isDefault 1:默认, 是否默认地址
   * @returns {Promise<*>}
   */
  async getUserAddress(userId, addressId, isDefault) {
    const app_url = '/thirdparty/common/getUserAddress'
    const data = { userId, addressId }
    return await this.appRequest(app_url, data);
  }

  /**
   * 查看x7预定情况
   * @param userId
   * @returns {Promise<*>}
   */
  async getReserveSituation(userId) {
    const app_url = '/thirdparty/user/getReserveSituation'
    const data = { userId }
    return await this.appRequest(app_url, data);
  }

  /**
   * 查询userId们是否有签到
   * @param userIds 逗号分隔字符串
   * @returns {Promise<*>}
   */
  async getSign(userIds) {
    const app_url = '/thirdparty/user/getSign'
    const data = { userIds }
    return await this.appRequest(app_url, data);
  }

  /**
   * 查询是否已经绑定小程序
   * @returns {Promise<*>}
   */
  async getHasBind(userId, type = 2) {
    const app_url = '/thirdparty/user/getHasBind'
    const data = { userId, type }
    return await this.appRequest(app_url, data);
  }

  /**
   * 查询次数
   * new 3接口之1 /sk/queryUserSeckillCount
   * @returns {Promise<*>}
   */
  async queryUserSeckillCount(userId) {
    const app_url = '/sk/queryUserSeckillCount'
    const data = { userId}
    return await this.appRequest(app_url, data);
  }

  /**
   * 添加次数
   * new 3接口之2 /sk/modifyUserSeckillCount
   * @returns {Promise<*>}
   */
  async modifyUserSeckillCount(userId,count) {
    const app_url = '/sk/modifyUserSeckillCount'
    const data = { userId, count}
    return await this.appRequest(app_url, data);
  }

  /**
   * 查询秒杀时间
   * new 3接口之3   sk/findNextSeckill
   * @returns {Promise<*>}
   */
  async findNextSeckill() {
    const app_url = '/sk/findNextSeckill'
    const data = {}
    return await this.appRequest(app_url, data);
  }




  /**
   * 上传文件
   * @param filePath
   * @returns {Promise<{msg: string, state: string}|*>}
   */
  async uploadFile(filePath) {
    const app_url = '/common/fileUp'
    const exists = await fse.pathExists(filePath)
    if (exists) {
      // const dataBuffer = await fse.readFile(filePath);
      const dataBuffer = await fse.createReadStream(filePath);
      // console.log(dataBuffer)
      return await this.appRequest(app_url, { file: dataBuffer }, true);
    } else {
      return { state: 'fail', msg: 'NO_FILE' }
    }

  }

  async appRequest(url, data, isFile = false) {
    const baseUrl = think.config('app.BASE_URL');
    const fileBaseUrl = think.config('app.FILE_BASE_URL');
    const timestamp13 = new Date().getTime() - 1000 * 3;
    const appId = think.config('app.APPID');
    const appSecret = think.config('app.APPSECRET');
    let sign
    if (isFile) {
      sign = this.makeAppSign('', appSecret, timestamp13)
    } else {
      sign = this.makeAppSign(JSON.stringify(data), appSecret, timestamp13)
    }
    const headers = {
      sign,
      appId,
      timestamp: timestamp13
    }
    // console.log(headers)

    const postUrl = isFile ? fileBaseUrl  + url : baseUrl + url
    const options = {
      method: 'POST',
      // proxy:'http://localhost:8888',
      url: postUrl,
      body: data,
      headers,
      json: true // Automatically parses the JSON string in the response
    };
    return await rp(options);
  }

  /**
   * 加密header
   * @param json
   * @param appSecret
   * @param timeStamp
   * @returns {String}
   */
  makeAppSign(json, appSecret, timeStamp) {
    const appSecretMd5 = this.md5(appSecret).toUpperCase()
    const all = json + appSecretMd5 + timeStamp
    return this.md5(all).toUpperCase();
  }

  /**
   * md5加密，看情况要不要update(“中文”,'utf8')
   * @param text
   * @returns {never|PromiseLike<ArrayBuffer>}
   */
  md5(text) {
    return crypto.createHash('md5').update(text, 'utf8').digest('hex');
  }


}
