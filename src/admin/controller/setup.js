'use strict';
import Base from './baseRest.js';
import path from 'path';
import fse from 'fs-extra';


export default class extends Base {
  /**
   * 查询项目配置
   * @return {Promise.<void>}
   */
  async get_setupGET() {
    const setup = await this.model('admin_setup').where('1=1').select()
    this.json(setup)
  }

  /**
   * 修改项目配置
   * @return {Promise.<void>}
   */
  async update_setupPOST(getdata, postdata) {
    const update = await this.model('admin_setup').updateMany(postdata.data)
    think.cache('setup', null)
    const webconfig = await this.model('admin_setup').getSet()
    if (Object.keys(webconfig).length !== 0) {
      think.config('setup', webconfig);
    }
    if (update) {
      return { status: 'success' }
    } else {
      return { status: 'fail' }
    }
  }

  /**
   * 删除session数据
   * @return {Promise<*>}
   */

  async clear_sessionPOST(){
    const sessionPath = path.join(think.ROOT_PATH,'runtime','session');
    try {
      await fse.emptyDir(sessionPath)
      return { status: 'success' }
    } catch (err) {
      return { status: 'fail' }
    }
  }

  /**
   * 删除分享表数据
   * @return {Promise<*>}
   */
  async clear_share_logPOST() {
    const sqlStr = 'truncate table share_log_unique'
    await this.model('user').execute(sqlStr)
    return { status: 'success' }
  }


  /**
   * 删除用户表数据
   * @return {Promise<*>}
   */
  async clear_usersPOST() {
    const sqlStr = 'truncate table user'
    await this.model('user').execute(sqlStr)
    return { status: 'success' }
  }


}
