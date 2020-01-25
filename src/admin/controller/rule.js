'use strict'

import Base from './baseRest.js'


export default class extends Base {

  /**
   * 规则列表
   * @param getData
   * @returns {Promise<{total: *, roles: *, items: *}>}
   */
  async rule_listGET(getData) {
    const { page, limit } = getData;
    const where = {};
    const likeRuleList = await this.model('like_rule').adminpage(page, limit, where);
    return {
      total: likeRuleList.totalElements,
      items: likeRuleList.content,
      roles: likeRuleList.type
    }
  }

  /**
   * 规则详情
   * @param id
   * @returns {Promise<*>}
   */
  async get_ruleGET({ id }) {
    const rule = await this.model('like_rule').where({ id }).find();
    const ruleTimeList = await this.model('like_time_rule').where({ like_rule_id: id }).select();
    return { rule, ruleTimeList }

  }

  async rule_updatePOST({}, { id, rule, otherRule }) {
    const level = rule.level;
    const first_money = Math.round(parseFloat(rule.first_money) * 100);
    const other_money = Math.round(parseFloat(rule.otherMoney) * 100);
    const moreRuleArray = otherRule.map(i => Math.round(parseFloat(i.like_money) * 100))
    const other_rule = JSON.stringify({ other: other_money, moreRule: moreRuleArray })
    const update = await this.model('like_rule').where({ id }).update({ level, first_money, other_rule })
    think.cache('likeRule', null)
    if(update){
      return { status: 'ok' }
    } else {
      return { status: 'fail' }
    }
  }

}
