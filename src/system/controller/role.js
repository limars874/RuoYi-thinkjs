'use strict';
import Base from './baseRest.js';
import camelcaseKeys from 'camelcase-keys'


export default class extends Base {




  /**
   * list 列表
   * @param pageNum
   * @param pageSize
   * @param roleName
   * @param roleKey
   * @param endTime
   * @param beginTime
   * @param status
   * @returns {Promise<void>}
   */
  async listGET({ pageNum, pageSize, roleName, roleKey, endTime, beginTime, status }, {}) {
    pageNum = parseInt(pageNum) ? parseInt(pageNum) : 1
    pageSize = parseInt(pageSize) ? parseInt(pageSize) : 10
    const where = _.omitBy({
      del_flag: 0,
      role_name: roleName,
      role_key: roleKey,
      status
    }, i => _.isUndefined(i) || i === '')

    if (beginTime && endTime) {
      beginTime = beginTime + ' 00:00:00'
      endTime = endTime + ' 23:59:59'
      where.create_time = { '>=': beginTime, '<=': endTime }
    }
    const sort = ['role_sort,asc']
    const data = await this.model('sys_role').list(pageNum, pageSize, where, sort)

    const total = data.totalElements
    const rows = data.content.map(i => {
      i.create_time = think.datetime(i.create_time, 'YYYY-MM-DD HH:mm:ss')
      return camelcaseKeys(i)
    })
    this.res({ total, rows })
  }

  async restGET({}, {}) {
    const where = { role_id: this.id }
    const data = await this.model('sys_role').where(where).find();
    let res
    if (data.role_id) {
      data.create_time = think.datetime(data.create_time)
      data.update_time = think.datetime(data.update_time)
      res = camelcaseKeys(data)
    }
    this.res({ data: res })
  }


  async restDELETE() {
    if (!this.id || !parseInt(this.id)) {
      throw this.errorText().paramError
    }
    const userRoleCount = await this.model('sys_user_role').where({ role_id: this.id }).count();
    if (userRoleCount > 0) {
      throw '角色已分配，不能删除，请先删除对应用户'
    }

    const roleDataSql = `select distinct r.role_id, r.role_name, r.role_key, r.role_sort, r.data_scope, r.status, 
     r.del_flag, r.create_time, r.remark from sys_role r left join sys_user_role ur on ur.role_id = r.role_id 
      left join sys_user u on u.user_id = ur.user_id left join sys_dept d on u.dept_id = d.dept_id where r.role_id = ${this.id}`
    const roleData = await this.model('sys_role').query(roleDataSql)


    const roleDataIdList = roleData.map(i => i.role_id)
    await this.model('sys_role').where({ role_id: ['in', roleDataIdList] }).update({ del_flag: 2 })
    this.res()
  }

}
