'use strict';
import Base from './baseRest.js';
import Uuid from "uuid";
import captcha from 'trek-captcha'
import sharp from 'sharp'
import bcrypt from "bcryptjs"


export default class extends Base {

  /**
   * 登录请求
   * @returns {Promise<void>}
   */
  async loginPOST({ username, password, code, uuid }) {
    const token = await this.login(username, password, code, uuid)
    this.res({ token })

  }

  async login(username, password, code, uuid) {
    const verifyKey = `${think.config('CAPTCHA_CODE_KEY')}${uuid}`
    const captcha = await GRedis.get(verifyKey)
    // todo 恢复
    // await GRedis.del(verifyKey)
    if (!captcha) {
      // todo 记录登录日志到sys_logininfor
      this.fail(500, '验证码已失效')
      return
    }
    think.debugLog(`code是${code.toLowerCase()},captcha是${captcha.toLowerCase()}`)
    if (`"${code.toLowerCase()}"` !== captcha.toLowerCase()) {
      // todo 记录登录日志到sys_logininfor
      this.fail(500, '验证码错误')
      return
    }
    // 用户验证
    const user = await this.model('sys_user').where({ user_name: username }).find();
    if (!user.user_id) {
      this.fail(500, `登录用户：${username}不存在`)
    }
    if (user.del_flag === 2) {
      this.fail(500, `对不起，您的账号：${user.user_name}已被删除`)
    }
    if (user.status === 1) {
      this.fail(500, `对不起，您的账号：${user.user_name}已被停用`)
    }
    const isRightPass = await bcrypt.compare(password, user.password);
    if (!isRightPass) {
      this.fail(500, `用户不存在/密码错误`)
    }
    // todo 记录登录日志到sys_logininfor
    // todo 生成jwt token
    const tokenService = new (think.service('Token'))
    const token = await tokenService.createToken({ user })
    this.res({ token })


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
    const verifyCode = `"${token}"`
    // 唯一标识
    const uuid = Uuid.v1().replace(/\-/g, '');
    const verifyKey = `${think.config('CAPTCHA_CODE_KEY')}${uuid}`
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
