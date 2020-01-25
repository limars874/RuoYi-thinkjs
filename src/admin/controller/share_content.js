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
  async share_content_listGET(getData) {
    const { page, limit } = getData;
    const where = {};
    const sort = 'id,DESC'
    const likeRuleList = await this.model('share_content').adminpage(page, limit, where, sort);
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
  async get_share_contentGET({ id }) {
    if(!id){
      return {}
    }
    return await this.model('share_content').where({ id }).find()
  }

  async share_content_addPOST({},postData){
    const coverImg = this.saveBase64Image(postData.icon, 'share_icon')
    const addData = {
      title: postData.title,
      desc: postData.desc,
      type: postData.type,
      icon: coverImg,
    }

    const add = await this.model('share_content').add(addData);
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
  async share_content_updatePOST({}, postData) {
    let coverImg = '';
    if (postData.form.icon.slice(0, 10) == 'data:image') {
      coverImg = this.saveBase64Image(postData.form.icon, 'share_icon')
      // 删除原来的图片
      const row = await this.model('share_content').where({ id: postData.id }).find();
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

    const update = await this.model('share_content').where({ id: postData.id }).update(updateData)
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
  async share_content_add_manyPOST({}, { contents }) {
    if (!contents) {
      return { status: 'fail' }
    }
    const addData = contents.split(/[\n]/);
    if (addData.length > 0) {
      await this.model('share_content').addMany(addData.map(i => {
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
  async share_content_replace_allPOST({}, { contents }) {
    if (!contents) {
      return { status: 'fail' }
    }
    const addData = contents.split(/[\n]/);
    if (addData.length > 0) {
      await this.model('share_content').delete();
      await this.model('share_content').addMany(addData.map(i => {
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
  async share_content_deletePOST({}, { id }) {
    const del = await this.model('share_content').where({ id }).delete();
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
