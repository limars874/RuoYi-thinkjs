'use strict';

import Base from './baseRest.js';


export default class extends Base {


  /**
   * 统计概要
   * @param startDate
   * @param endDate
   * @constructor
   */
  async summary_statisticPOST({}, { startDate, endDate }) {
    let start, end;
    const res = {}
    console.log(startDate, endDate)
    end = think.datetime(new Date(startDate))
    start = new Date(endDate)
    // start.setDate(start.getDate() + 1)
    start = think.datetime(start)
    const sql = `
      SELECT '新注册人数' as title ,count( like_user_id ) as ct FROM \`like_log\` WHERE\tis_new_like_user = 1 AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '成功登录人数' as title, count( like_user_id ) as ct  FROM \`like_log\` WHERE\tis_new_like_user = 1 and is_like_user_login = 1 AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '下订X7点击量' as title, count( id ) FROM \`visit_log\` WHERE\tvisit_type_id = 8 AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '红包总金额' as title, sum( money ) FROM \`red_bag_log\` WHERE 1=1 AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '已提现金额' as title, sum( money ) FROM \`red_bag_pay_log\` WHERE have_pay = 1 AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '签到次数' as title, count(id) FROM \`sign\` WHERE 1 = 1 AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '签到人数' as title, count( DISTINCT app_user_id ) FROM \`sign\` WHERE 1 = 1 AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '活动分享人数' as title, count( DISTINCT app_user_id ) FROM \`visit_log\` WHERE\t(visit_type_id = 2 or visit_type_id = 7 or visit_type_id=12 or visit_type_id=14 or visit_type_id=17) AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '活动分享次数' as title, count(  id ) FROM \`visit_log\` WHERE\t(visit_type_id = 2 or visit_type_id = 7 or visit_type_id=12 or visit_type_id=14 or visit_type_id=17) AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '活动分享被开打次数' as title, count( id ) FROM \`visit_log\` WHERE\t(visit_type_id = 3 or visit_type_id = 13 or visit_type_id=15 or visit_type_id=18 or visit_type_id=19)  AND create_date <=  '${start}' AND create_date >= '${end}'
UNION SELECT '邀请助力人数' as title, count(id) FROM \`like_log\` WHERE 1 = 1 AND create_date <=  '${start}' AND create_date >= '${end}'
      `
    res.summary = await this.model('like_log').query(sql)
    // res.summary = res.summary[0]
    this.json(res)
  }



}
