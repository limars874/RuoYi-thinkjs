'use strict';
/**
 * model
 */
import Base from './relation.js';

export default class extends Base {

  init(...args) {
    super.init(...args);
  }

  async getSet() {
    return await think.cache("seckill", () => {
      return this.lists();
    }, { timeout: 365 * 24 * 3600 });
  }

  async setCacheToRedis() {
    const list = await this.lists();
    const keys = Object.keys(list)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const value = list[key]
      await GRedis.set(key, value);
    }
    return list
  }

  async lists() {
    let list = await this.where('1=1').select();
    let obj = {}
    list.forEach(v => {
      obj[v.key] = v.value;
    })
    return obj;
  }


}
