'use strict';
import Base from './baseRest.js';
import Uuid from "uuid";
import captcha from 'trek-captcha'
import sharp from 'sharp'


export default class extends Base {

  /**
   * 登录请求
   * @returns {Promise<void>}
   */
  async loginGET() {
    this.res({ token: 123 })

  }

  /**
   * 登录验证码
   * @returns {Promise<void>}
   */
  async captchaImageGET() {
    // 生成验证码图片和对应字母
    const { token, buffer } = await captcha({ size: 4, style: -1 })
    const img = await sharp(buffer).resize(111, 36).toBuffer();
    // 随机字串 4位
    const verifyCode = token
    // 唯一标识
    const uuid = Uuid.v1().replace(/\-/g, '');
    const verifyKey = `${think.config('CAPTCHA_CODE_KEY')}:${uuid}`
    // 设置redis
    await GRedis.set(verifyKey, verifyCode, 'EX', think.config('CAPTCHA_EXPIRATION'))

    const data = {
      uuid: uuid,
      img: img.toString('base64')
    }
    this.res(data)
  }

  async getInfoGET() {
    return { state: 'getInfo' }
  }

  async getRoutersGET() {
    return { state: 'getRouters' }
  }


}
