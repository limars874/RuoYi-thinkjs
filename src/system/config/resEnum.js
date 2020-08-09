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
  paramError: 1,
  CanNotDeleteRole: 2,
  userPasswordNotMatch: 3,
  userPasswordDelete: 4,
  property: {
    1: { msg: '参数错误' },
    2: { msg: '已分配,不能删除' },
    3: { msg: '用户不存在/密码错误' },
    4: { msg: '对不起，您的账号已被删除' },
  }
}




