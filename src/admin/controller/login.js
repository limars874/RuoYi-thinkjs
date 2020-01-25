'use strict';
import Base from './baseRest.js';
const jwt = require('jsonwebtoken');

export default class extends Base {
    async loginbyemailPOST(getdata, postdata) {
      const admin = await this.model('admin_user').isAdmin(postdata.email, postdata.password);
      if (admin.name) {
        // 发个token
        const token = jwt.sign({
          uid: admin.id
        }, 'qwertyuiop', { expiresIn: '8h' });

        admin.user_type = admin.type === 0 ? ['admin'] : ['editor'];

        const adminInfo = {
          role: admin.user_type,
          token: token,
          introduction: '我是' + admin.name,
          avatar: 'http://oivwn7sjt.bkt.clouddn.com/user.png',
          name: admin.account
        }
        return adminInfo;
      } else {
        return { code: 50000, message: '帐号密码输入错误，请核对后输入' };

      }
    }
}
