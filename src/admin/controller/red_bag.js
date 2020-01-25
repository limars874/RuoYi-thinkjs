'use strict'

import Base from './baseRest.js'
import fs from 'fs';
import path from 'path';

export default class extends Base {

  /**
   * 列表
   * @param getData
   * @returns {Promise<{total: *, roles: *, items: *}>}
   */
  async red_bag_listGET({ page, limit, filter }) {
    const where = {};
    try {
      const objFilter = JSON.parse(filter)
      if (objFilter.tel) {
        const user = await this.model('user').where({ tel: objFilter.tel }).find()
        if (user.id) {
          where.app_user_id = ['=', user.app_user_id];
        }
      }
      if (objFilter.type) {
        where.type = ['=', objFilter.type];
      }
      if (objFilter.is_pay) {
        where.is_pay = ['=', objFilter.is_pay];
      }
    } catch (err) {
      console.log('survey no filter request')
    }

    const sort = 'id,DESC'
    const likeRuleList = await this.model('red_bag_log').adminpage(page, limit, where, sort);
    return {
      total: likeRuleList.totalElements,
      items: likeRuleList.content,
    }
  }

  /**
   * 统计概要
   * @returns {Promise<{payImmediateNumber: number, payMoney: number, payBigNumber: number, totalMoney: number}>}
   */
  async get_statusGET() {
    const totalMoney = await this.model('red_bag_log').where('1=1').sum('money');
    const payMoney = await this.model('red_bag_log').where({ is_pay: 1 }).sum('money');
    const payBigNumber = await this.model('big_bag_log').where('level = 1 or level = 2').count('id');
    const payImmediateNumber = await this.model('red_bag_log').where({
      is_pay: 1, type: 4
    }).count('id');
    return {
      totalMoney: totalMoney ? totalMoney : 0,
      payMoney: payMoney ? payMoney : 0,
      payBigNumber: payBigNumber ? payBigNumber : 0,
      payImmediateNumber: payImmediateNumber ? payImmediateNumber : 0
    }

  }

  /**
   * 详情
   * @param id
   * @returns {Promise<*>}
   */
  async get_red_bagGET({ id }) {
    if (!id) {
      return {}
    }
    return await this.model('red_bag_log').where({ id }).find()
  }

  async red_bag_addPOST({}, postData) {
    const coverImg = this.saveBase64Image(postData.icon, 'share_icon')
    const addData = {
      title: postData.title,
      desc: postData.desc,
      type: postData.type,
      icon: coverImg,
    }

    const add = await this.model('red_bag_log').add(addData);
    if (add) {
      return { status: 'ok' }
    } else {
      return { status: 'fail' }
    }
  }


  /**
   * 更新单条
   * @param id
   * @param postData
   * @returns {Promise<{status: string}>}
   */
  async red_bag_updatePOST({}, postData) {
    let coverImg = '';
    if (postData.form.icon.slice(0, 10) == 'data:image') {
      coverImg = this.saveBase64Image(postData.form.icon, 'share_icon')
      // 删除原来的图片
      const row = await this.model('red_bag_log').where({ id: postData.id }).find();
      const delCover = row.icon;
      if (row.icon) {
        const delPath = path.join(think.config('uploadFileDIR'), delCover);
        try {
          fs.unlinkSync(delPath);
        } catch (err) {
          console.log('file delete error: ', err.code);
        }
      }
    } else {
      coverImg = postData.form.icon;
    }
    const updateData = {
      icon: coverImg,
      title: postData.form.title,
      desc: postData.form.desc,
      type: postData.form.type
    }

    const update = await this.model('red_bag_log').where({ id: postData.id }).update(updateData)
    if (update) {
      return { status: 'ok' }
    } else {
      return { status: 'fail' }

    }
  }

  /**
   * 批量追加
   * @returns {Promise<*>}
   */
  async red_bag_add_manyPOST({}, { contents }) {
    if (!contents) {
      return { status: 'fail' }
    }
    const addData = contents.split(/[\n]/);
    if (addData.length > 0) {
      await this.model('red_bag_log').addMany(addData.map(i => {
        return { content: i }
      }))
      return { status: 'ok' }
    }
    return { status: 'fail' }
  }

  /**
   * 全部替换
   * @returns {Promise<*>}
   */
  async red_bag_replace_allPOST({}, { contents }) {
    if (!contents) {
      return { status: 'fail' }
    }
    const addData = contents.split(/[\n]/);
    if (addData.length > 0) {
      await this.model('red_bag_log').delete();
      await this.model('red_bag_log').addMany(addData.map(i => {
        return { content: i }
      }))
      return { status: 'ok' }
    }
    return { status: 'fail' }
  }


  /**
   * 删除单条
   * @param id
   * @returns {Promise<void>}
   */
  async red_bag_deletePOST({}, { id }) {
    const del = await this.model('red_bag_log').where({ id }).delete();
    if (del) {
      return { status: 'ok' }
    } else {
      return { status: 'fail' }
    }
  }


  /**
   * 处理编辑器上传图片，返回图片url
   * @param getdata
   * @param postdata
   * @returns {{msg: string}}
   */
  async upload_imgPOST(getdata, postdata) {
    const uploadImg = this.file();
    let prefixName = '';
    if (postdata.postToken) {
      prefixName = postdata.postToken;
    }
    const imgurl = await this.saveImageFile(uploadImg, prefixName)
    return { url: imgurl };
  }

  /**
   * 保存文件格式图片，返回url
   * @param file
   * @param prefixName
   * @returns {string}
   */
  async saveImageFile(file, prefixName) {
    let dir = think.config('uploadFileDIR');
    let randomName = Date.now() + Math.floor(Math.random() * 1000 + 1000);
    if (prefixName) {
      randomName = prefixName + '_' + randomName
    }
    const fileName = file.file.originalFilename;
    const fileExt = this.GetFileExt(fileName);
    let saveDir = path.join(dir, "upload", randomName, fileExt)
    await this.streamWriteToFile(file.file.path, saveDir)
    return think.config('preUploadDIR') + '/upload/' + randomName + "." + fileExt
  }

  /**
   *
   * @param path
   * @param saveDir
   */
  streamWriteToFile(path, saveDir) {
    return new Promise((resolve, reject) => {
      let file = fs.createReadStream(path);
      let write = fs.createWriteStream(saveDir)
      file.pipe(write);
      write.on('finish', () => {
        resolve();
      });
    })
  }


  /**
   * 保存64格式的图片，返回url
   * @param img
   * @returns {string}
   */
  saveBase64Image(img, prefixName) {
    const reg = /^data:image\/(\w+);base64,/;
    const regExec = reg.exec(img);
    let extName = regExec[1];
    if (extName == 'jpeg') {
      extName = 'jpg'
    }
    let base64Data = img.replace(/^data:image\/\w+;base64,/, "");
    let dir = think.config('uploadFileDIR');
    let randomName = Date.now() + Math.floor(Math.random() * 1000 + 1000)
    if (prefixName) {
      randomName = prefixName + '_' + randomName
    }
    let saveDir = path.join(dir, "upload", randomName + "." + extName)
    let dataBuffer = new Buffer(base64Data, 'base64');
    fs.writeFileSync(saveDir, dataBuffer);
    return think.config('preUploadDIR') + '/upload/' + randomName + "." + extName
  }

  //取文件后缀名
  GetFileExt(filepath) {
    if (filepath != "") {
      return "." + filepath.replace(/.+\./, "");
    }
    return ''
  }

  /**
   * 取正则括号捕获的内容1，返回数组
   * @param str
   * @param regx
   * @constructor
   */
  GetRegex(str, regx) {
    let i = 0;
    let result = [];
    let ele;
    while ((ele = regx.exec(str)) != null) {
      result[i] = ele[1];
      i++;
    }
    return result;
  }


}
