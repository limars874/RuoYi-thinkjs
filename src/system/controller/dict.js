'use strict';
import Base from './baseRest.js';
import resEnum from '../config/resEnum'

import camelcaseKeys from 'camelcase-keys'


export default class extends Base {

  async typeGET({ type }) {
    if (!type) {
      throw resEnum.paramError
    }

    const where = { status: '0', dict_type: type }
    const data = await this.model('sys_dict_data').where(where).select();
    const dataFmt = data.map(i => {
      i.create_time = think.datetime(i.create_time)
      i.update_time = think.datetime(i.update_time)
      return camelcaseKeys(i)
    })

    this.res({ data: dataFmt })
  }

}
