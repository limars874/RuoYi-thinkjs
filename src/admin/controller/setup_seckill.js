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
    const setup = await this.model('admin_seckill').where('1=1').select()
    this.json(setup)
  }

  /**
   * 修改项目配置
   * @return {Promise.<void>}
   */
  async update_setupPOST(getdata, postdata) {
    const update = await this.model('admin_seckill').updateMany(postdata.data)
    const webconfig =  await this.model('admin_seckill').setCacheToRedis()
    if (Object.keys(webconfig).length !== 0) {
      think.config('seckill', webconfig);
    }
    if (update) {
      return { status: 'success' }
    } else {
      return { status: 'fail' }
    }
  }


}
