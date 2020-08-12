'use strict';
import Base from './baseRest.js';
import camelcaseKeys from 'camelcase-keys'
import resEnum from "../../home/config/resEnum"


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

  /**
   * 根据id获取role信息
   * @returns {Promise<void>}
   */
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


  /**
   * 根据id删除role
   * @returns {Promise<void>}
   */
  async restDELETE() {
    if (!this.id || !parseInt(this.id)) {
      throw this.errorText().paramError
    }

    const ids = this.id.split('-').map(i => parseInt(i, 10))
    const userRoleCount = await this.model('sys_user_role').where({ role_id: ['in', ids] }).count();
    if (userRoleCount > 0) {
      throw '有角色已分配用户，不能删除，请先删除对应用户'
    }

    const roleDataSql = `select distinct r.role_id, r.role_name, r.role_key, r.role_sort, r.data_scope, r.status, 
     r.del_flag, r.create_time, r.remark from sys_role r left join sys_user_role ur on ur.role_id = r.role_id 
      left join sys_user u on u.user_id = ur.user_id left join sys_dept d on u.dept_id = d.dept_id where r.role_id in (${ids.join(',')})`
    const roleData = await this.model('sys_role').query(roleDataSql)

    const roleDataIdList = roleData.map(i => i.role_id)
    await this.model('sys_role').where({ role_id: ['in', roleDataIdList] }).update({ del_flag: 2 })
    this.res()
  }


  /**
   * 添加role
   * @param deptIds
   * @param menuIds
   * @param remark
   * @param roleKey
   * @param roleName
   * @param roleSort
   * @param status
   * @returns {Promise<void>}
   */
  async indexPOST({}, { deptIds, menuIds, remark, roleKey, roleName, roleSort, status }) {
    // check
    await this.checkRoleNameUnique(roleName)
    await this.checkRoleKeyUnique(roleKey)

    // userInfo
    const tokenService = new (think.service('Token'))
    const redisInfoCache = await tokenService.getLoginUser(this)
    // user
    const user = redisInfoCache ? redisInfoCache.user : {}
    const userName = user.userName || 'noName'
    const addData = {
      role_name: roleName,
      role_key: roleKey,
      role_sort: roleSort,
      status: status,
      remark: remark,
      create_by: userName,
      create_time: think.datetime(new Date())
    }
    const addRole = await this.model('sys_role').add(addData)
    if (menuIds && menuIds.length > 0) {
      const roleMenuData = menuIds.map(i => {
        return { role_id: addRole, menu_id: i }
      })
      await this.model('sys_role_menu').addMany(roleMenuData)
    }


    this.res()
  }


  async indexPUT({}, { deptIds, menuIds, remark, roleKey, roleName, roleSort, status, dataScope, roleId }) {
    if (!roleId) {
      throw resEnum.paramError
    }
    // check
    const role = await this.checkRole(roleId)
    if (role.role_name !== roleName) {
      await this.checkRoleNameUnique(roleName)
    }
    if (role.role_key !== roleKey) {
      await this.checkRoleKeyUnique(roleKey)
    }

    // sys_role
    const tokenService = new (think.service('Token'))
    const redisInfoCache = await tokenService.getLoginUser(this)
    const user = redisInfoCache ? redisInfoCache.user : {}
    const userName = user.userName || 'noName'
    const updateData = {
      role_name: roleName,
      role_key: roleKey,
      role_sort: roleSort,
      status: status,
      remark: remark,
      update_by: userName,
      update_time: think.datetime(new Date())
    }
    const update = await this.model('sys_role').where({ role_id: roleId }).update(updateData)

    // sys_role_menu
    await this.model('sys_role_menu').where({ role_id: roleId }).delete()
    if (menuIds && menuIds.length > 0) {
      const roleMenuData = menuIds.map(i => {
        return { role_id: roleId, menu_id: i }
      })
      await this.model('sys_role_menu').addMany(roleMenuData)
    }

    this.res()
  }

  /**
   * 检测role
   * @param roleId
   * @returns {Promise<{role_id}|*>}
   */
  async checkRole(roleId) {
    const role = await this.model('sys_role').where({ role_id: roleId }).find();
    if (role.role_id) {
      return role
    } else {
      throw resEnum.paramError
    }
  }

  /**
   * 检测角色名称重复
   * @param roleName
   * @returns {Promise<void>}
   */
  async checkRoleNameUnique(roleName) {
    if (!roleName) {
      throw '角色名称或未填写'
    }
    const role = await this.model('sys_role').where({ role_name: roleName }).find();
    if (role.role_id) {
      throw '角色名称已存在，不能添加该角色'
    }
  }

  /**
   * 检测角色权限字符重复
   * @param roleKey
   * @returns {Promise<void>}
   */
  async checkRoleKeyUnique(roleKey) {
    if (!roleKey) {
      throw '权限字符或未填写'
    }
    const role = await this.model('sys_role').where({ role_key: roleKey }).find();
    if (role.role_id) {
      throw '角色权限字符已存在，不能添加该角色'
    }
  }


}
