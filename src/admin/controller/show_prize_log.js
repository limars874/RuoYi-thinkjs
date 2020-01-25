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
  async show_prize_log_listGET(getData) {
    const { page, limit } = getData;
    const where = {};
    const sort = 'id,DESC'
    const likeRuleList = await this.model('show_prize_log').adminpage(page, limit, where, sort);
    return {
      total: likeRuleList.totalElements,
      items: likeRuleList.content,
    }
  }

  /**
   * 详情
   * @param id
   * @returns {Promise<*>}
   */
  async get_show_prize_logGET({ id }) {
    return  await this.model('show_prize_log').where({ id }).find()

  }

  async show_prize_log_addPOST({},postData){
    const coverImg = this.saveBase64Image(postData.head_img, 'show_head')
    const addData = {
      nickname: postData.nickname,
      tel: postData.tel,
      money: postData.money,
      head_img: coverImg,
    }

    const add = await this.model('show_prize_log').add(addData);
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
  async show_prize_log_updatePOST({}, postData) {
    let coverImg = '';
    if (postData.form.head_img.slice(0, 10) == 'data:image') {
      coverImg = this.saveBase64Image(postData.form.head_img, 'show_head')
      // 删除原来的图片
      const row = await this.model('show_prize_log').where({ id: postData.id }).find();
      const delCover = row.head_img;
      if (row.head_img) {
        const delPath = path.join(think.config('uploadFileDIR'), delCover);
        try {
          fs.unlinkSync(delPath);
        } catch (err) {
          console.log('file delete error: ', err.code);
        }
      }
    } else {
      coverImg = postData.form.head_img;
    }
    const updateData = {
      head_img: coverImg,
      nickname: postData.form.nickname,
      tel: postData.form.tel,
      money: postData.form.money,
    }

    const update = await this.model('show_prize_log').where({ id: postData.id }).update(updateData)
    if (update) {
      return { status: 'ok' }
    } else {
      return { status: 'fail' }

    }
  }

  /**
   * 更新单条
   * @param id
   * @param content
   * @returns {Promise<{status: string}>}
   */
  async show_prize_log_update_oldPOST({}, { id, tel, nickname, money }) {
    if (!tel || !nickname || !money || !id) {
      return { status: 'fail' }
    }
    const update = await this.model('show_prize_log').where({ id }).update({
      tel, nickname, money
    })
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
  async show_prize_log_add_manyPOST({}, { contents }) {
    if (!contents) {
      return { status: 'fail' }
    }
    const lines = contents.split(/[\n]/);
    const addData = lines.map(i=>{
      const item = i.split(',')
      return { nickname:item[0], tel: item[1], money: item[2] }
    })
    if (addData.length > 0) {
      await this.model('show_prize_log').addMany(addData)
      return { status: 'ok' }
    }
    return { status: 'fail' }
  }

  /**
   * 批量追加
   * @returns {Promise<*>}
   */
  async show_prize_log_add_manyBAKPOST({}, { contents }) {
    if (!contents) {
      return { status: 'fail' }
    }
    const addData = contents.split(/[\n]/);
    if (addData.length > 0) {
      await this.model('show_prize_log').addMany(addData.map(i => {
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
  async show_prize_log_replace_allPOST({}, { contents }) {
    if (!contents) {
      return { status: 'fail' }
    }
    const addData = contents.split(/[\n]/);
    if (addData.length > 0) {
      await this.model('show_prize_log').delete();
      await this.model('show_prize_log').addMany(addData.map(i => {
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
  async show_prize_log_deletePOST({}, { id }) {
    const del = await this.model('show_prize_log').where({ id }).delete();
    if (del) {
      return { status: 'ok' }
    } else {
      return { status: 'fail' }
    }
  }


  /**
   * 是否生效
   * @returns {Promise<*>}
   */
  async valid_statusGET() {
    const set = await this.model('admin_setup').where({ key: 'IS_SHOW_PRIZE' }).find();
    if (set && set.value == '1') {
      return { status: 'ok', data: { isValid: true } }
    } else {
      return { status: 'ok', data: { isValid: false } }
    }
  }

  /**
   * 修改生效状态
   * @returns {Promise<*>}
   */
  async save_valid_statusPOST({}, { isValid }) {
    const update = await this.model('admin_setup').where({ key: 'IS_SHOW_PRIZE' }).update({
      value: isValid ? '1' : '0'
    });
    think.cache('setup', null)
    const webconfig = await this.model('admin_setup').getSet()
    if (Object.keys(webconfig).length !== 0) {
      think.config('setup', webconfig);
    }
    if (update) {
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
