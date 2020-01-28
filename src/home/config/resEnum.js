/**
 * 1-> 数据校验
 *
 * 3->权限相关
 *
 * 4->支付相关
 *
 * 6->业务逻辑
 *
 * 9->系统错误
 */

export default {
  userCaptchaError: 1,
  userCaptchaExpire: 2,
  userPasswordNotMatch: 3,
  userPasswordDelete: 4,
  property: {
    1: { msg: '验证码错误' },
    2: { msg: '验证码已失效' },
    3: { msg: '用户不存在/密码错误' },
    4: { msg: '对不起，您的账号已被删除' },
  }
}




