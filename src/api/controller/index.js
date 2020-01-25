'use strict';
import Base from './baseRest.js';
import fs from 'fs'
import path from 'path'
import Promise from 'bluebird'

export default class extends Base {
  /*
   * js签名
   */
  async indexGET({ aid }) {
    let WxService = think.service("wechat")
    let wechat = new WxService()
    let jsapi = ["onMenuShareTimeline", "onMenuShareAppMessage", "onMenuShareQQ", "onMenuShareWeibo", "onMenuShareQZone",
      "startRecord", "stopRecord",
      "onVoiceRecordEnd", "playVoice", "pauseVoice", "stopVoice",
      "uploadVoice", "downloadVoice", "chooseImage", "previewImage", "uploadImage", "downloadImage",
      "translateVoice"
    ]
    let wechatInfo = await wechat.jsSingture(this.header("x-page-href"), jsapi)

    //处理区域
    return {
      wechatConfig: wechatInfo,
      user: this.userinfo,
    }
  }



  /**
   * 保存64格式的图片，返回url
   * @param img
   * @returns {string}
   */
  async saveBase64Image(img) {
    let base64Data = img.replace(/^data:image\/\w+;base64,/, "");
    let dir = think.config('uploadFileDir')
    let randomName = Date.now() + Math.floor(Math.random() * 1000 + 1000)
    let saveDir = path.join(dir, "upload", randomName + ".png")
    let dataBuffer = new Buffer(base64Data, 'base64');
    fs.writeFileSync(saveDir, dataBuffer);
    return '/upload/' + randomName + ".png"
  }

  /**
   * 上传图片，并另存为其他文件
   */
  async filesuploadPOST(getdata, postdata) {
    console.log(this.file());
    console.log(postdata.imgorder);
    console.log(postdata.imgname);
    const file = this.file();
    const filename = postdata.imgname;
    let pre = postdata.imgname;
    if (postdata.imgorder) {
      pre = pre + '_' + postdata.imgorder;
    }

    const url = await this.rename_save_img(file, filename, pre)
    return url

  }

  /**
   * 重命名并保存图片文件
   * @returns {{url: string}} 返回url
   */
  async rename_save_img(file, filename, pre) {
    const fsP = Promise.promisifyAll(fs);
    const fileName = file[filename].originalFilename;
    const fileExt = this.GetFileExt(fileName);

    let oldPath = file[filename].path;
    let newPtahDir = think.config('uploadFileDir');
    let newRandomName = Date.now() + Math.floor(Math.random() * 1000 + 1000)
    if (pre) {
      newRandomName = pre + '_' + newRandomName;
    }
    let newPath = path.join(newPtahDir + '/upload/', newRandomName + fileExt);
    await fsP.renameAsync(oldPath, newPath);
    return { url: '/upload/' + newRandomName + fileExt };
  }

  /**
   * 上传封面文件，并另存为其他文件（已废弃）
   */
  async fileuploadPOST() {
    console.log(this.file())
    const fsP = Promise.promisifyAll(fs);
    let allpost = this.post();
    console.log(allpost)
    let file = this.file()
    const fileName = file.cover.originalFilename;
    const fileExt = this.GetFileExt(fileName);

    let oldPath = file.cover.path;
    let newPtahDir = think.config('uploadFileDir');
    let newRandomName = Date.now() + Math.floor(Math.random() * 1000 + 1000)
    let newPath = path.join(newPtahDir + '/upload/', newRandomName + fileExt);
    await fsP.renameAsync(oldPath, newPath);
    return { url: '/upload/' + newRandomName + '.jpg' };

  }

  /**
   * 抽奖请求
   */
  async lotteryPOST() {
    const AwardList = await this.model('prize').where({ store: ['>', '0'] }).select();

    const lottery = this.getrand(AwardList);
    return lottery;
  }


  /**
   * 获取随机抽奖数
   * @param min
   * @param max
   * @returns {{randkey: *}}
   */
  async getrand(AwardList) {
    //数组是模拟数据，正常是应该从后台配置文件或者数据库获取
    //let AwardList = [
    //	{'id':1,'prize':'平板电脑','probability':1},
    //	{'id':2,'prize':'数码相机','probability':5},
    //	{'id':3,'prize':'MP3播放器','probability':10},
    //	{'id':4,'prize':'4G有个盘','probability':12},
    //	{'id':5,'prize':'10Q币','probability':22},
    //	{'id':6,'prize':'谢谢参与','probability':50},
    //]


    let AwardListProbability = [];
    for (let i = 0, len = AwardList.length; i < len; i++) {
      AwardListProbability[i] = AwardList[i].probability;
    }
    let AwardNum = this.getRandomAwardNum(AwardListProbability);
    return AwardList[AwardNum];


    //let randkey = this.getRandomIntInclusive(1,2);
    //return {randkey:randkey};

  }

  /**
   * 返回奖品序号
   * @param ProbabilityArr 奖品中奖概率的整数数组
   */
  getRandomAwardNum(ProbabilityArr) {
    let result;
    let sumArr = ProbabilityArr.reduce((acc, val) => acc + val);
    for (let i = 0, len = ProbabilityArr.length; i < len; i++) {
      let randNum = this.getRandomIntInclusive(1, sumArr);
      if (randNum <= ProbabilityArr[i]) {
        result = i;
        break;
      } else {
        sumArr = sumArr - ProbabilityArr[i];
      }
    }
    return result;
  }

  /**
   * 获取任意整数范围内的随机数，包括min和max
   * 不包括
   * @param min
   * @param max
   * @returns {*}
   */
  getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }


  async postchanganuserPOST({}, userinfo) {
    const isDuplicate = await this.model('user').is_duplicate(userinfo.tel);
    if (isDuplicate) {
      return { msg: 'duplicate' }
    }
    const addrow = await this.model('user').add(userinfo);
    if (addrow) {
      console.log(addrow)
      return { msg: 'ok' };
    } else {
      return { msg: 'wrong' }
    }
  }

  //取文件后缀名
  GetFileExt(filepath) {
    if (filepath != "") {
      var pos = "." + filepath.replace(/.+\./, "");
      return pos;
    }
  }


}
