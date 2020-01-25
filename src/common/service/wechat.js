'use strict';
import WechatOauth from 'wechat-oauth'
import WechatAPI from 'wechat-api'
import WechatCash from 'wechat-cash'
import WechatPay from 'wx-payment'
import fs from 'fs'

const WECHAT_TOKEN_CACHE = 'wxtoken'
const WECHAT_TOKENTICKET_CACHE = 'wxtoken_jsticket'
const WECHAT_OAUTH_URL = 'wxoauth_url'


export default class extends think.service.base {
  /**
   * init
   * @return {}         []
   */
  init(...args) {
    super.init(...args);
    let appId,appSecret,mch_id,partner_key,certFileKey,certFileCert,CertFileCert,CertFileKey,pfxFile,PfxFile,config;
    //if (think.config("hasPay") == true) {
    //  ({appId,appSecret,mch_id,partner_key,certFileKey,certFileCert,pfxFile} = think.config("wechatpay")) //发红包用这句
    //  console.log('..............'+think.APP_PATH+certFileCert);
    //  CertFileCert = fs.readFileSync(think.APP_PATH + certFileKey)   //支付证书
    //  CertFileKey = fs.readFileSync(think.APP_PATH + certFileCert)    //支付证书
    //  PfxFile = fs.readFileSync(think.APP_PATH + pfxFile)
    //  config = {
    //    appId: appId,
    //    mchId: mch_id,
    //    partnerKey: partner_key,
    //    logger: false,  //打开日志
    //    //key: CertFileKey,
    //    //cert: CertFileCert
    //    pfx:PfxFile
    //  }
    //} else {
    //  ({appId,appSecret} = think.config("wechat")) //不发红包用这句
    //    config = {
    //    appId: appId,
    //    logger: true,  //打开日志
    //  }
    //}

    //企业支付初始化
    ({appId,appSecret,mch_id,partner_key,certFileKey,certFileCert,pfxFile} = think.config("wechatpay"))
    let paymentConfig = {
     appid:appId,
     mch_id:mch_id,
     apiKey:partner_key, // 微信商户平台API密钥
     pfx:fs.readFileSync(think.APP_PATH + pfxFile) //微信商户平台证书 (optional，部分API需要使用)
    }
    this.wxPayment = WechatPay;
    this.wxPayment.init(paymentConfig);



    this.oauthClient = new WechatOauth(appId,appSecret)
    //this.cash = new WechatCash(config)
    this.wxapi = new WechatAPI(appId, appSecret, (callback)=> {
      think.cache(WECHAT_TOKEN_CACHE).then((data)=> {
        if (data) {
          callback(null, data)
        } else {
          callback()
        }
      })

    }, (token, callback)=> {
      think.cache(WECHAT_TOKEN_CACHE, token).then((data)=> {
        callback(null, token)
      })
    });

    //获取授权信息
    this.getAccessToken = think.promisify(this.oauthClient.getAccessToken, this.oauthClient)
    this.getUser = think.promisify(this.oauthClient.getUser, this.oauthClient)
  }

  /**
   * js签名
   * @param  {[type]} url [description]
   * @return {[type]}     [description]
   */
  async jsSingture(url, jsApiList) {
    // let result = await this.getTicket()
    let getJsConfig = think.promisify(this.wxapi.getJsConfig, this.wxapi)
    return getJsConfig({
      url: url,
      jsApiList: jsApiList
    })

  }


  /**
   * 授权链接生成
   * @param redirectUrl 跳转链接
   * @return {[type]} [description]
   */
  async oauthUrl(redirectUrl) {
    let state = this.randomKey ()
    await think.cache(WECHAT_OAUTH_URL + state, redirectUrl)
    let {oauthCallback} = think.config('wechat')
    return this.oauthClient.getAuthorizeURL(oauthCallback, state, 'snsapi_userinfo');
  }

  /**
   *真实跳转
   */
  getRealRedirectUrl(state) {
    return think.cache(WECHAT_OAUTH_URL + state)
  }

  randomKey() {
    let a = Math.floor(Math.random() * 1000 + 9900)
    return Date.now() + a
  }


  /**
   * 根据code获取用户授权信息
   * @param  {[type]} code [description]
   * @return {[userinfo]}      [用户信息，如果获取失败，则为null]
   */
  async userInfo(code) {
    let result = await this.getAccessToken(code)
    let openid = result.data.openid
    let userInfo = await this.getUser(openid)
    userInfo.head_img = userInfo.headimgurl
    return userInfo
  }

  /**
   * 保存图片-音频，得到二进制
   */
  async saveImage(imgId) {
    let getMaterial = think.promisify(this.wxapi.getMedia, this.wxapi)
//		getMaterial
    console.log('getMaterial', getMaterial)
    return getMaterial(imgId)
  }

  /**
   * 上传语音-得到media
   */
  async uploadVoiceFile(filepath) {
    let uploadMaterial = think.promisify(this.wxapi.uploadMedia, this.wxapi)
    return uploadMaterial(filepath, "voice")
  }

//	async uploadVoiceFile(filepath){
//		let uploadMaterial = think.promisify(this.wxapi.uploadVoiceMaterial,this.wxapi)
//		return uploadMaterial(filepath)
//	}

  /**
   * 发红包
   */
  sendRedbag(orderid, openid, amount, wishing = '恭喜发财', memo = '恭喜中奖了', send_name = '秋山问道') {
    let sendRedpack = think.promisify(this.cash.sendRedpack, this.cash)
    let {appId,appSecret,mch_id,partner_key,certFileKey,certFileCert} = think.config("wechatpay")
    let data = {
      'send_name': send_name,
      'mch_billno': orderid,
      'wxappid': appId,
      're_openid': openid,
      'total_amount': parseInt(amount * 100), //RMB100
      'total_num': 1,
      'wishing': wishing,
      'client_ip': '127.0.0.1',
      'act_name': '奖金发放',
      'remark': memo
    }
    // console.log('redbag data ',data)
    return sendRedpack(data)
  }
  /**
   * 企业付款
   */
  PayToWx(orderid, openid, amount, wishing = '恭喜发财支付测试' ) {
    let sendRedpack = think.promisify(this.wxPayment.transfers, this.wxPayment)
    let {appId,appSecret,mch_id,partner_key,certFileKey,certFileCert,oauthCallback} = think.config("wechatpay")
    let data = {
      partner_trade_no: orderid, //商户订单号，需保持唯一性
      openid: openid,
      check_name: 'NO_CHECK',
      re_user_name: '',
      amount: parseInt(amount*100),
      desc: '企业支付',
      spbill_create_ip: '127.0.0.1'
    }
    return sendRedpack(data)
  }


}
