'use strict';
import Base from './baseRest.js';
import Uuid from "uuid";
import captcha from 'trek-captcha'
import sharp from 'sharp'
import bcrypt from "bcryptjs"
import uaParser from "ua-parser-js"
import snakecaseKeys from 'snakecase-keys'
import resEnum from '../config/resEnum'

export default class extends Base {

  /**
   * 请求-登录
   * @returns {Promise<void>}
   */
  async loginPOST({}, { username, password, code, uuid }) {
    const token = await this.login(username, password, code, uuid)
    this.res({ token })

  }


  /**
   * 请求-登录验证码
   * @returns {Promise<void>}
   */
  async captchaImageGET() {
    // 生成验证码图片和对应字母
    const { token, buffer } = await captcha({ size: 4, style: -1 })
    const img = await sharp(buffer).resize(111, 36).toBuffer();
    // 随机字串 4位
    const verifyCode = `"${token}"`
    console.log(verifyCode, 'verifyCode')
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


  /**
   * 获取用户信息、权限信息、角色信息
   * @returns {Promise<void>}
   */
  async getInfoGET() {
    const tokenService = new (think.service('Token'))
    const redisInfoCache = await tokenService.getLoginUser(this)
    // user
    const user = redisInfoCache ? redisInfoCache.user : {}
    // roles
    const roles = ["admin"]
    // permissions
    const permissions = ["*:*:*"]
    this.json({
      code: 200,
      msg: "操作成功", permissions, roles, user
    })

  }


  /**
   * 获取路由信息
   * @returns {Promise<void>}
   */
  async getRoutersGET() {
    // return { state: 'getRouters' }
    this.json({
      "msg": "操作成功", "code": 200,
      "data": [{
        "name": "System",
        "path": "/system",
        "hidden": false,
        "redirect": "noRedirect",
        "component": "Layout",
        "alwaysShow": true,
        "meta": { "title": "系统管理", "icon": "system" },
        "children": [{
          "name": "User",
          "path": "user",
          "hidden": false,
          "component": "system/user/index",
          "meta": { "title": "用户管理", "icon": "user" }
        }, {
          "name": "Role",
          "path": "role",
          "hidden": false,
          "component": "system/role/index",
          "meta": { "title": "角色管理", "icon": "peoples" }
        }, {
          "name": "Menu",
          "path": "menu",
          "hidden": false,
          "component": "system/menu/index",
          "meta": { "title": "菜单管理", "icon": "tree-table" }
        }, {
          "name": "Dept",
          "path": "dept",
          "hidden": false,
          "component": "system/dept/index",
          "meta": { "title": "部门管理", "icon": "tree" }
        }, {
          "name": "Post",
          "path": "post",
          "hidden": false,
          "component": "system/post/index",
          "meta": { "title": "岗位管理", "icon": "post" }
        }, {
          "name": "Dict",
          "path": "dict",
          "hidden": false,
          "component": "system/dict/index",
          "meta": { "title": "字典管理", "icon": "dict" }
        }, {
          "name": "Config",
          "path": "config",
          "hidden": false,
          "component": "system/config/index",
          "meta": { "title": "参数设置", "icon": "edit" }
        }, {
          "name": "Notice",
          "path": "notice",
          "hidden": false,
          "component": "system/notice/index",
          "meta": { "title": "通知公告", "icon": "message" }
        }, {
          "name": "Log",
          "path": "log",
          "hidden": false,
          "redirect": "noRedirect",
          "component": "system/log/index",
          "alwaysShow": true,
          "meta": { "title": "日志管理", "icon": "log" },
          "children": [{
            "name": "Operlog",
            "path": "operlog",
            "hidden": false,
            "component": "monitor/operlog/index",
            "meta": { "title": "操作日志", "icon": "form" }
          }, {
            "name": "Logininfor",
            "path": "logininfor",
            "hidden": false,
            "component": "monitor/logininfor/index",
            "meta": { "title": "登录日志", "icon": "logininfor" }
          }]
        }]
      }, {
        "name": "Monitor",
        "path": "/monitor",
        "hidden": false,
        "redirect": "noRedirect",
        "component": "Layout",
        "alwaysShow": true,
        "meta": { "title": "系统监控", "icon": "monitor" },
        "children": [{
          "name": "Online",
          "path": "online",
          "hidden": false,
          "component": "monitor/online/index",
          "meta": { "title": "在线用户", "icon": "online" }
        }, {
          "name": "Job",
          "path": "job",
          "hidden": false,
          "component": "monitor/job/index",
          "meta": { "title": "定时任务", "icon": "job" }
        }, {
          "name": "Druid",
          "path": "druid",
          "hidden": false,
          "component": "monitor/druid/index",
          "meta": { "title": "数据监控", "icon": "druid" }
        }, {
          "name": "Server",
          "path": "server",
          "hidden": false,
          "component": "monitor/server/index",
          "meta": { "title": "服务监控", "icon": "server" }
        }]
      }, {
        "name": "Tool",
        "path": "/tool",
        "hidden": false,
        "redirect": "noRedirect",
        "component": "Layout",
        "alwaysShow": true,
        "meta": { "title": "系统工具", "icon": "tool" },
        "children": [{
          "name": "Build",
          "path": "build",
          "hidden": false,
          "component": "tool/build/index",
          "meta": { "title": "表单构建", "icon": "build" }
        }, {
          "name": "Gen",
          "path": "gen",
          "hidden": false,
          "component": "tool/gen/index",
          "meta": { "title": "代码生成", "icon": "code" }
        }, {
          "name": "Swagger",
          "path": "swagger",
          "hidden": false,
          "component": "tool/swagger/index",
          "meta": { "title": "系统接口", "icon": "swagger" }
        }]
      }, {
        "name": "Http://ruoyi.vip",
        "path": "http://ruoyi.vip",
        "hidden": false,
        "component": "Layout",
        "meta": { "title": "若依官网", "icon": "guide" }
      }]
    })
  }


  /**
   * 登录返回token
   * @param username
   * @param password
   * @param code
   * @param uuid
   * @returns {Promise<void>}
   */
  async login(username, password, code, uuid) {
    const verifyKey = `${think.config('CAPTCHA_CODE_KEY')}${uuid}`
    const captcha = await GRedis.get(verifyKey)
    await GRedis.del(verifyKey)
    // if (!captcha) {
    //   this.saveLoginInfo(username, this, false, '验证码已失效').then()
    //   throw resEnum.userCaptchaExpire
    // }
    // think.debugLog(`code是${code.toLowerCase()},captcha是${captcha.toLowerCase()}`)
    // if (`"${code.toLowerCase()}"` !== captcha.toLowerCase()) {
    //   this.saveLoginInfo(username, this, false, '验证码错误').then()
    //   throw resEnum.userCaptchaError
    // }
    // 用户验证
    const user = await this.model('sys_user').selectUserByUserName(username)
    if (!user.user_id) {
      this.saveLoginInfo(username, this, false, `登录用户：${username}不存在`).then()
      throw `登录用户：${username}不存在`
    }
    if (user.del_flag === 2) {
      this.saveLoginInfo(username, this, false, `对不起，您的账号：${username}已被删除`).then()
      throw `对不起，您的账号：${username}已被删除`
    }
    if (user.status === 1) {
      this.saveLoginInfo(username, this, false, `对不起，您的账号：${username}已被停用`).then()
      throw `对不起，您的账号：${username}已被停用`
    }
    const isRightPass = await bcrypt.compare(password, user.password);
    if (!isRightPass) {
      this.saveLoginInfo(username, this, false, '用户不存在/密码错误').then()
      throw resEnum.userPasswordNotMatch
    }
    this.saveLoginInfo(username, this, true, '登录成功').then()
    const tokenService = new (think.service('Token'))
    // todo user详情 包含dept和roles
    const token = await tokenService.createToken({ user }, this)
    this.res({ token })
  }


  /**
   * 记录登录日志
   * @param userName
   * @param controller
   * @param isSuccess
   * @param msg
   * @returns {Promise<void>}
   */
  async saveLoginInfo(userName, controller, isSuccess, msg) {
    const ipaddr = controller.ip();
    const header = controller.header('user-agent')
    const ua = uaParser(header)
    let loginLocation
    if (ipaddr === '127.0.0.1') {
      loginLocation = '内网ip'
    } else {
      const iPService = new (think.service('IpKit'))
      const res = await iPService.getIpLocation(ipaddr)
      if (res) {
        loginLocation = res
      } else {
        loginLocation = '未知地区'
      }
    }
    const browser = ua.browser.name ? ua.browser.name + ' ' + ua.browser.version : 'unknown'
    const os = ua.os.name ? ua.os.name + ' ' + ua.os.version : 'unknown'
    const data = snakecaseKeys({
      userName,
      ipaddr,
      loginLocation,
      browser,
      os,
      status: isSuccess ? 0 : 1,
      msg,
      login_time: think.datetime(new Date())
    })
    await this.model('sys_logininfor').add(data)
  }


}
