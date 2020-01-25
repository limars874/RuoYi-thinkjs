'use strict';

import Base from './baseRest.js';

const jwt = require('jsonwebtoken');

export default class extends Base {



  /**
   * admin数据
   * @param id
   * @returns {*}
   */
  async infoGET({ token }) {
    const decoded = jwt.decode(token, { complete: true });
    const admin = await this.model('admin_user').where({ id: decoded.payload.uid }).find();
    let adminInfo;
    if (admin.status == 0) {
      this.json({ code: 50000, message: '帐号无法使用' })
      return this.end();
    }

    admin.user_type = admin.type === 0 ? ['admin'] : [this.makeRoleString(parseInt(admin.role))];
    if (admin) {
      adminInfo = {
        role: admin.user_type,
        token: token,
        introduction: '我是' + admin.name,
        avatar: 'http://res.yuntap.com/user.png',
        name: admin.account,
        uid: admin.id
      }
    }
    return adminInfo;
  }

  makeRoleString(n) {
    return '000000'
        .substr(0, '000000'.length - Number(n).toString(2).length)
        .concat(Number(n).toString(2))
  }


  /**
   * 获取管理员信息列表
   * @param getData
   * @returns {{}}
   */
  async admin_listGET(getData) {
    // console.log('adminlist', getData)
    const { page, limit, username } = getData;
    const where = {};
    if (username) {
      where.name = username;
    }
    const adminList = await this.model('admin_user').adminpage(page, limit, where);
    const data = {
      total: adminList.totalElements,
      items: adminList.content,
      roles: adminList.type
    }
    return { code: 20000, data }
  }

  /**
   * 添加管理员信息
   * @param getData
   * @param PostData
   * @returns {{}}
   */
  async admin_addPOST(getData, PostData) {
    // console.log('addadmin', PostData)
    const addData = await this.model('admin_user').addNewAdmin(PostData);
    if (addData) {
      return { code: 20000, data: { status: 'ok' } }
    } else {
      return { code: 20000, data: { status: 'fail' } }
    }
  }

  /**
   * 更新管理员信息
   * @param getData
   * @param postData {update,key},key为user id
   * @returns {{}}
   */
  async admin_updatePOST(getData, postData) {
    console.log('updateadmin', postData)
    const updateData = await this.model('admin_user').updateAdmin(postData)
    if (updateData) {
      return { code: 20000, data: { status: 'ok' } }
    } else {
      return { code: 20000, data: { status: 'fail' } }
    }
  }

  /**
   * 删除管理员信息
   * @param getData
   * @param postData
   * @returns {{}}
   */
  async admin_deletePOST(getData, postData) {
    // console.log('delete admin', postData)
    const deleteData = await this.model('admin_user').deleteAdmin(postData.id);
    if (deleteData) {
      return { code: 20000, data: { status: 'ok' } }
    } else {
      return { code: 20000, data: { status: 'fail' } }
    }
  }


}
