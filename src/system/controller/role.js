'use strict';
import Base from './baseRest.js';
import camelcaseKeys from 'camelcase-keys'


export default class extends Base {

  /**
   * list
   * @returns {Promise<void>}
   */
  async listGET({ pageNum, pageSize, roleName, roleKey, endTime, beginTime }, {}) {
    pageNum = parseInt(pageNum) ? parseInt(pageNum) : 1
    pageSize = parseInt(pageSize) ? parseInt(pageSize) : 10
    console.log(roleName, typeof roleName)
    const where = _.omitBy({
      del_flag: 0,
      role_name: roleName,
      role_key: roleKey
    }, i => _.isUndefined(i) || i === '')

    if(beginTime && endTime){
      beginTime = beginTime + ' 00:00:00'
      endTime = endTime + ' 23:59:59'
      where.create_time = {'>=': beginTime, '<=': endTime}
    }
    // date_format(r.create_time,'%y%m%d') >= date_format(?,'%y%m%d') and date_format(r.create_time,'%y%m%d') <= date_format(?,'%y%m%d')

    const sort = ['role_sort,asc']
    const data = await this.model('sys_role').list(pageNum, pageSize, where, sort)

    const total = data.totalElements
    const rows = data.content.map(i => {
      i.create_time = think.datetime(i.create_time, 'YYYY-MM-DD HH:mm:ss')
      return camelcaseKeys(i)
    })
    // [{
    //         "searchValue": null,
    //         "createBy": null,
    //         "createTime": "2020-08-04 15:16:42",
    //         "updateBy": null,
    //         "updateTime": null,
    //         "remark": "1",
    //         "params": {},
    //         "roleId": 101,
    //         "roleName": "1",
    //         "roleKey": "1",
    //         "roleSort": "0",
    //         "dataScope": "1",
    //         "status": "0",
    //         "delFlag": "0",
    //         "flag": false,
    //         "menuIds": null,
    //         "deptIds": null,
    //         "admin": false
    //       }, {
    this.res({ total, rows })
  }

}
