/**
 * token管理器
 */
'use strict';

import jwt from 'jsonwebtoken';
import Uuid from 'uuid'
import camelcaseKeys from 'camelcase-keys'
import uaParser from 'ua-parser-js';

export default class extends think.service.base {

  init(...args) {
    super.init(...args);
  }

  /**
   *    获取用户身份信息
   * @param controller
   * @returns {Promise<*>}
   */
  async getLoginUser(controller) {
    let token = this.getToken(controller)
    if (token) {
      const decode = jwt.decode(token, { complete: true });
      const uuid = decode['payload'][think.config('LOGIN_USER_KEY')]
      const userKey = this.getTokenKey(uuid)
      const userString = await GRedis.get(userKey)
      if (!userString) {
        return null
      }
      if (userString.indexOf('"permissions":Set') !== -1) {
        return JSON.parse(userString.replace(/Set\[(")(.*)(")],/, function () {
          return `"Set[\\"${arguments[2]}\\"]",`
        }))
      }
      return JSON.parse(userString)
    }
    return null
  }


  /**
   * 创建jwt的Token
   * @param loginUser
   * @param controller
   * @returns {Promise<*>}
   */
  async createToken(loginUser, controller) {
    const token = Uuid.v1();
    loginUser.token = token
    await this.setUserAgent(loginUser, controller)
    await this.refreshToken(loginUser)
    const payload = {}
    payload[think.config('LOGIN_USER_KEY')] = token
    return this.createJwtToken(payload)
  }

  async createJwtToken(payload) {
    return jwt.sign(payload, think.config('token.tokenSecret'));
  }

  /**
   * 验证令牌有效期，相差不足20分钟，自动刷新缓存
   * @param loginUser
   */
  async verifyToken(loginUser) {
    const expireTime = loginUser.expireTime;
    const now = (new Date()).getTime();
    if (expireTime - now <= 20 * 60 * 1000) {
      await this.refreshToken()
    }
  }

  /**
   * 刷新令牌有效期
   * @param loginUser
   * @returns {Promise<void>}
   */
  async refreshToken(loginUser) {
    loginUser.loginTime = (new Date()).getTime();
    loginUser.expireTime = loginUser.loginTime + parseInt(think.config('token.tokenExpireTime')) * 60 * 1000
    const userKey = this.getTokenKey(loginUser.token);
    const res = camelcaseKeys(loginUser, { deep: true })
    await GRedis.set(userKey, JSON.stringify(res), 'EX', parseInt(think.config('token.tokenExpireTime')) * 60,)
  }

  /**
   * 设置用户代理信息
   * @param loginUser
   * @param controller
   */
  async setUserAgent(loginUser, controller) {
    loginUser.ipaddr = controller.ip();
    const header = controller.header('user-agent')
    const ua = uaParser(header)
    if (loginUser.ipaddr === '127.0.0.1') {
      loginUser.loginLocation = '内网ip'
    } else {
      const iPService = new (think.service('IpKit'))
      const res = await iPService.getIpLocation(loginUser.ipaddr)
      if (res) {
        loginUser.loginLocation = res
      } else {
        loginUser.loginLocation = '未知地区'
      }
    }
    loginUser.browser = ua.browser.name ? ua.browser.name + ' ' + ua.browser.version : 'unknown'
    loginUser.os = ua.os.name ? ua.os.name + ' ' + ua.os.version : 'unknown'
  }

  /**
   * 获取header的token
   * @param controller
   * @returns {Promise<*>}
   */
  getToken(controller) {
    let token = controller.header('Authorization')
    if (token && token.indexOf('Bearer ') !== -1) {
      token = token.replace('Bearer ', "");
    }
    return token
  }

  /**
   * 设置用户信息缓存到redis
   * @param loginUser
   * @returns {Promise<void>}
   */
  async setLoginUser(loginUser) {
    if (loginUser && loginUser.token) {
      const userKey = this.getTokenKey(loginUser.token);
      await GRedis.set(userKey, JSON.stringify(loginUser))
    }

  }

  /**
   * 从redis删除用户缓存信息
   * @param token
   * @returns {Promise<void>}
   */
  async delLoginUser(token) {
    if (!token) {
      const userKey = this.getTokenKey(token);
      await GRedis.del(userKey);
    }
  }


  /**
   * 拼接redis的用户的tokenKey
   * @param uuid
   * @returns {string}
   */
  getTokenKey(uuid) {
    return `${think.config('LOGIN_TOKEN_KEY')}${uuid}`;
  }

}
