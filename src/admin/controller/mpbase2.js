'use strict';

import Base from './base.js';
import API from 'wechat-api';
import http from 'http';
import fs from 'fs';
export default class extends Base {

    init(http) {
        this.api = new API('wxe8c1b5ac7db990b6', 'ebcd685e93715b3470444cf6b7e763e6');
        //this.api = new API('wxec8fffd0880eefbe', 'a084f19ebb6cc5dddd2988106e739a07');
        super.init(http);
    }

    /**
     * 新建素材默认首页
     */
    fodderAction() {
        this.assign({"navxs": true, "bg": "bg-dark"});
        return this.display();
    }

    //远程拿图片
    spiderImage(imgUrl, filePath) {
        let deferred = think.defer();
        http.get(imgUrl, function (res) {
            var imgData = "";
            res.setEncoding("binary");
            res.on("data", function (chunk) {
                imgData += chunk;
            });

            res.on("end", function () {
                fs.writeFileSync(filePath, imgData, "binary");
                deferred.resolve(filePath);
            });
        });
        return deferred.promise;
    }

    /**
     * 给微信上传临时素材 /图片 更新本地库
     */
    async wxuploadtmpAction() {
        //上传图片
        // this.end("暂不开发");
        let thumb_id = this.get('thumb_id');
        let model = this.model('picture');
        // let data = await model.where({id:thumb_id}).find();
        //获取图片
        let pic = await get_pic(thumb_id, 1, 900, 500);
        //判断是本地还是外地,如果是外地就抓回来
        let paths;
        let filePath = think.RESOURCE_PATH + '/upload/long/';
        if (pic.indexOf("http://") == 0) {
            think.mkdir(filePath)
            let name = await get_cover(thumb_id, "path");
            let longpic = await this.spiderImage(pic, filePath + name);
            paths = longpic;
        } else {
            paths = think.ROOT_PATH + '/www/' + pic;
        }
        //console.log(pic);
        //return false;
        let wx = function (api, data) {
            let deferred = think.defer();
            api.uploadMaterial(data, 'thumb', (err, result)=> {
                if (!think.isEmpty(result)) {
                    deferred.resolve(result);
                } else {
                    console.error(err);
                }
            });
            return deferred.promise;
        }

        let api = new API(this.setup.wx_AppID, this.setup.wx_AppSecret);
        let img_result = await wx(api, paths);
        if (img_result) {
            //删除远程文件
            fs.unlinkSync(paths);
            await model.where({id: thumb_id}).update({url: img_result.url, source_id: img_result.media_id});
            img_result.hs_image_src = pic;
            return this.json(img_result);
        } else {
            return this.json("");
        }
    }

    /**
     * 上传保存永久素材
     */
    async savefodderAction() {
        let self = this;
        let params = self.post("params");
        let edit_id = self.get("edit_id");
        let model = self.model('wx_material');
        let api = new API(this.setup.wx_AppID, this.setup.wx_AppSecret);
        if (edit_id) {
            let olddata = await model.where({id: edit_id}).find();
            let wxr = function (api, data) {
                let deferred = think.defer();
                api.removeMaterial(data, (err, result)=> {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(result);
                    }
                });
                return deferred.promise;
            }
            let wxrres = await wxr(api, olddata.media_id);
            let delrow = await model.where({id: edit_id}).delete();
        }
        try {
            var anews = JSON.parse(params);

            let wx = function (api, data) {
                let deferred = think.defer();
                api.uploadNewsMaterial(data, (err, result)=> {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(result);
                    }
                });
                return deferred.promise;
            }
            let wxres = await wx(api, anews);
            if (wxres) {
                let wxg = function (api, data) {
                    let deferred = think.defer();
                    api.getMaterial(data, (err, result)=> {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(result);
                        }
                    });
                    return deferred.promise;
                }
                let wx_news = await wxg(api, wxres.media_id);
                // let wx_news_str = JSON.stringify(wx_news);
                let time = new Date().getTime();
                let data = {
                    "media_id": wxres.media_id,
                    "material_content": params,
                    "material_wx_content": wx_news + '',
                    "web_token": 0,
                    "add_time": time
                }
                let effect = await model.add(data);
                if (effect) {
                    self.success({"name": "上传成功！", url: ""});
                }
            }
            self.fail("上传失败！");
        } catch (e) {
            self.fail("上传失败！");
        }
    }

    /**
     * 素材列表
     */
    async fodderlistAction() {
        let self = this;
        self.meta_title = "微信素材列表";
        self.assign({"navxs": true, "bg": "bg-dark"});
        let model = self.model("wx_material");
        let data = await model.page(this.get('page')).order('add_time DESC').countSelect();
        let Pages = think.adapter("pages", "page");
        let pages = new Pages();
        let page = pages.pages(data);
        self.assign('pagerData', page);
        self.assign('fodder_list', data.data);
        return this.display();
    }

    /**
     * 删除素材
     */
    async deletefodderAction() {
        let self = this;
        let id = self.get('id');
        //let ids = self.get('ids')
        //return self.end(ids);
        let model = self.model('wx_material');
        let olddata = await model.where({id: ['IN', id]}).getField('media_id', false);
        // return self.end(olddata);
        let wxremove = function (api, data) {
            let deferred = think.defer();
            api.removeMaterial(data, (err, result)=> {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(result);
                }
            });
            return deferred.promise;
        }
        if (!think.isEmpty(olddata)) {
            let wxres = await wxremove(self.api, olddata[0]);
            // let wxres = { errcode: 0 };
            // try{
            //     for(let midi in olddata){
            //         await wxremove(self.api, olddata[midi]);
            //     }
            // }catch(e){
            //     return self.fail('删除失败');
            // }
            //console.log(wxres);
            if (wxres.errcode == 0) {
                let res = await model.where({id: ['IN', id]}).delete();
                // let res = true;
                if (res) {
                    return self.success({name: '删除成功'});
                }
            }
        }
        return self.fail('删除失败');
    }

    async asyncfodderlistAction() {
        let self = this;
        let model = self.model("wx_material");
        let data = await model.page(this.get('page'), 20).order("add_time DESC").countSelect();
        return this.json(data);
    }

    /**
     * 编辑
     */
    async foddereditAction() {
        let id = this.get('id');
        //this.end(id)
        let model = this.model("wx_material");
        let data = await model.where({'id': id}).find();
        this.assign('data', JSON.stringify(data));
        //this.end(data);
        return this.display('fodder');
    }


    //-----------------------------------
    //自动回复
    async autoreplyAction() {
        let rule = await this.model('wx_keywords_rule').where({}).select();
        for (let i = 0; i < rule.length; i++) {
            let current = rule[i];
            let ks = await this.model('wx_keywords').where({id: ['IN', current.keywords_id]}).select();
            let rs = await this.model('wx_replylist').where({id: ['IN', current.reply_id]}).select();
            rule[i].ks = ks;
            rule[i].rs = rs;
        }
        this.assign('rulelist', rule);
        this.assign({"navxs": true, "bg": "bg-dark"});
        return this.display();
    }

    /**
     * 新建规则
     */
    async createkruleAction() {
        //let id = 1;
        let rule_name = this.get('rule_name');
        let model = this.model('wx_keywords_rule');
        let id = await model.add({'rule_name': rule_name, 'create_time': new Date().getTime()});
        if (id) {
            return this.success({name: "规则添加成功", ruleid: id});
        } else {
            return this.fail('添加规则失败');
        }
    }


    /**
     * 新建回复
     */
    async createrAction() {
        let self = this;
        let type = self.post('type');
        let ruleid = self.post('ruleid');
        if (!ruleid) {
            return self.fail('规则不存在');
        }
        let model = self.model('wx_replylist');
        let currtime = new Date().getTime();
        let currwebtoken = 0;
        let result = 0;
        await model.startTrans();
        switch (type) {
            case 'text':
                let content = self.post('content')
                result = await model.add({
                    'type': 'text',
                    'content': content,
                    'create_time': currtime,
                    'web_token': currwebtoken
                });
                break;
            case 'image':
                break;
            case 'audio':
                break;
            case 'video':
                break;
            case 'news':
                break;
        }

        if (result) {
            let rulemodel = self.model('wx_keywords_rule');
            let ruledata = await rulemodel.where({id: ruleid}).find();
            console.log(ruledata);
            let rs = ruledata.reply_id.split(',');
            rs.push(result);
            let r = await rulemodel.where({id: ruleid}).update({'reply_id': rs.join(','), 'create_time': currtime});
            if (r) {
                await model.commit();
                return self.success({name: '添加回复成功', rid: result});
            } else {
                await model.rollback();
                return self.fail('回复添加失败');
            }
        } else {
            await model.rollback();
            return self.fail('回复添加失败');
        }
    }

    /**
     * 删除回复
     */
    async deleterAction() {
        let self = this;
        let ruleid = self.post('ruleid');
        let rid = self.post('rid');
        let currtime = new Date().getTime();
        if (ruleid && rid) {
            let model = self.model('wx_replylist');
            await model.startTrans();
            let rr = await model.where({id: rid}).delete();
            if (rr) {
                let rulemodel = self.model('wx_keywords_rule');
                let ruledata = await rulemodel.where({id: ruleid}).find();
                let tmp = [];
                let rs = ruledata.reply_id.split(',');
                for (let i in rs) {
                    if (rs[i] != rid) {
                        tmp.push(rs[i]);
                    }
                }
                let r = await rulemodel.where({id: ruleid}).update({
                    'reply_id': tmp.join(','),
                    'create_time': currtime
                });
                if (r) {
                    await model.commit();
                    return self.success({name: '回复删除成功'});
                } else {
                    await model.rollback();
                    return self.fail('回复删除失败');
                }
            } else {
                await model.rollback();
                return self.fail('删除失败');
            }
        } else {
            return self.fail('提交参数错误');
        }
    }

    /**
     *  编辑回复
     */
    async editreplyAction() {
        let self = this;
        let type = self.post('type');
        let rid = self.post('ruleid');
        let model = self.model('wx_replylist');
        let currtime = new Date().getTime();
        let currwebtoken = 0;
        let result = 0;
        switch (type) {
            case 'text':
                let content = self.post('content')
                result = await model.where({id: rid}).update({
                    'content': content,
                    'create_time': currtime,
                    'web_token': currwebtoken
                });
                break;
            case 'image':
                break;
            case 'audio':
                break;
            case 'video':
                break;
            case 'news':
                break;
        }

        if (result) {
            return self.success({name: '编辑成功'});
        } else {
            return self.fail('编辑失败');
        }

    }

    /**
     * 规则编辑 （关键字的添加和删除）
     */
    async ruleeditAction() {
        let self = this;
        let ruleid = self.post('ruleid');
        let rulemodel = self.model('wx_keywords_rule');
        let ruledata = await rulemodel.where({id: ruleid}).find();
        let currtime = new Date().getTime();
        let currwebtoken = 0;
        let edittype = self.post('edittype'); //判断是编辑关键字 1，还是回复内容 2
        if (edittype == 1 && ruleid) {
            //关键字操作
            let kmodel = self.model('wx_keywords');
            let kid = self.post('kid'); //如果带有kid表示该操作为删除，否则为添加
            if (kid) {
                let r = await kmodel.where({id: kid}).delete();
                if (r) {
                    let tmp = []
                    let ks = ruledata.keywords_id.split(',');
                    for (let v in ks) {
                        if (ks[v] != kid) {
                            tmp.push(ks[v]);
                        }
                    }
                    await rulemodel.where({id: ruleid}).update({'keywords_id': tmp.join(','), 'create_time': currtime});
                }
                return self.json(r);
            } else {
                //新建关键字
                let kname = self.post('name');
                let ktype = self.post('type');
                let r = 0;
                try {
                    r = await kmodel.add({
                        'keyword_name': kname,
                        'match_type': ktype,
                        'rule_id': ruleid,
                        'create_time': currtime,
                        'web_token': currwebtoken
                    });
                } catch (e) {
                    return self.json(-1);
                }
                if (r) {
                    let ks = ruledata.keywords_id.split(',');
                    ks.push(r);
                    await rulemodel.where({id: ruleid}).update({'keywords_id': ks.join(','), 'create_time': currtime});
                }
                return self.json(r);
            }
        } else if (edittype == 2 && ruleid) {
            //回复操作
        } else {
        }
    }

    /**
     * 删除规则
     */
    async ruledeleteAction() {
        let self = this;
        let ruleid = self.post('ruleid');
        let rulemodel = self.model('wx_keywords_rule');
        await rulemodel.startTrans();
        let currentrule = await rulemodel.where({id: ruleid}).find();
        let kids = currentrule.keywords_id;
        let rids = currentrule.reply_id;
        let kmodel = self.model('wx_keywords');
        let rmodel = self.model('wx_replylist');
        let kres = await kmodel.where({id: ['IN', kids]}).delete();
        let rres = await rmodel.where({id: ['IN', rids]}).delete();
        let rulres = await rulemodel.where({id: ruleid}).delete();
        if (rulres) {
            await rulemodel.commit();
            return self.success({name: '规则删除成功'});
        } else {
            await rulemodel.rollback();
            return self.fail('规则删除失败');
        }
    }

    /**
     * 编辑规则名称
     */
    async ruleeditnameAction() {
        let self = this;
        let ruleid = self.post('ruleid');
        let rulename = self.post('rulename');
        let rulemodel = self.model('wx_keywords_rule');
        let res = await rulemodel.where({id: ruleid}).update({rule_name: rulename});
        if (res) {
            return self.success({name: '编辑成功'});
        }
        return self.fail('编辑失败');
    }

    /**
     * 关注自动回复
     */
    async followAction() {
        let model = this.model('wx_replylist');
        //首次访问检查数据库有没有数据,如果没有就添加
        // 'news','music','video','voice','image','text'
        let data = [{type: "text", reply_type: 1}, {type: "news", reply_type: 1}, {
            type: "image",
            reply_type: 1
        }, {type: "music", reply_type: 1}, {type: "video", reply_type: 1}, {type: "voice", reply_type: 1}]
        for (let v of data) {
            await model.where(v).thenAdd(v)
        }
        let info = await model.where({reply_type: 1}).order("create_time DESC").select();
        this.assign('list', info);
        //初始化
        let initinfo = info[0];
        this.assign({"initinfo": initinfo});
        this.assign({"navxs": true, "bg": "bg-dark"});
        this.meta_title = "关注自动回复"
        this.active = "admin/mpbase2/autoreply"
        return this.display();
    }

    /**
     * 消息自动回复
     */
    async messageAction() {
        let model = this.model('wx_replylist');
        //初始化数据
        let data = [
            {type: "text", reply_type: 2},
            {type: "news", reply_type: 2},
            {type: "image", reply_type: 2},
            {type: "music", reply_type: 2},
            {type: "video", reply_type: 2},
            {type: "voice", reply_type: 2}
        ]
        for(let v of data){
            await model.where(v).thenAdd(v);
        }
        let info = await model.where({reply_type: 2}).order("create_time DESC").select();
        this.assign('list', info);
        //初始化
        let initinfo = info[0];
        this.assign("initinfo",initinfo);
        this.assign({"navxs": true, "bg": "bg-dark"});
        this.meta_title = "消息自动回复";
        this.active = "admin/mpbase2/autoreply";
        return this.display();
    }

    /**
     * 保存回复数据
     */
    async saveinfoAction() {
        let model = this.model('wx_replylist');
        let media_model = this.model('wx_material');
        let reply_type = this.post('reply_type');
        let send_type = this.post('send_type');
        let editor_content = this.post('editor_content');
        let me_id = this.post('me_id') == "" ? null : this.post('me_id');
        //this.end(reply_type+send_type+editor_content);
        let data = {};
        //消息回复
        /*if(reply_type == 2){
         data.content = editor_content;
         }else if(reply_type == 1){
         //关注回复

         }*/
        //this.end(send_type);
        if (send_type == 'textArea') {
            data.type = 'text';
            data.content = editor_content;
        } else if (send_type == 'newsArea') {
            console.log(!think.isEmpty(me_id));
            if (!think.isEmpty(me_id)) {
                let wx_content = await media_model.where({'id': me_id}).find();
                //this.end('aaa'+wx_content['material_content']);
                let material_content = wx_content['material_content'];
                material_content = JSON.parse(material_content);
                let targetArr = [];
                let articles = material_content.articles;
                let host = `http://${this.http.host}`
                for (let key in articles) {
                    let tmpobj = {};
                    tmpobj.title = articles[key]['title'];
                    tmpobj.description = articles[key]['digest'];
                    if (articles[key]['hs_image_src'].indexOf("http://") == 0) {
                        tmpobj.picurl = articles[key]['hs_image_src'];
                    } else {
                        tmpobj.picurl = host + articles[key]['hs_image_src'];
                    }

                    tmpobj.url = articles[key]['content_source_url'];
                    targetArr.push(tmpobj);
                }
                data.content = JSON.stringify(targetArr);
            } else {
                data.content = null;
            }
            data.type = 'news';
            data.media_id = me_id;
        }
        data.reply_type = reply_type;
        data.create_time = new Date().getTime();
        data.id = this.post("id");
        //this.end(data);
        console.log(data);
        // return false;
        //查询该类型下是否有保存的回复信息
        let isAdd = '';
        isAdd = await model.update(data);
        if (isAdd) {
            if (reply_type == 2) {
                return this.success({name: "修改成功!", url: "/admin/mpbase2/message"})
            } else if (reply_type == 1) {
                return this.success({name: "修改成功!", url: "/admin/mpbase2/follow"})

            }
        }


    }


    /**
     * 打开自定义菜单
     */
    async custommenuAction() {
        let data = {
            version: 20120000,
            button: [
                {
                    name: '1个福彩蛋',
                    type: 1,
                    act_list: [],
                    sub_button: [
                        {
                            name: '投资赚钱吧',
                            type: 1,
                            act_list: [{type: 2, value: 'http://www.baidu.com'}],
                            sub_button: []
                        }
                    ]
                }
            ]
        }

        let self = this;
        let model = self.model('wx_custom_menu');
        let ddata = await model.where({personality: null}).find();
        self.assign('data', ddata.custom_menu);
        self.assign('menuid', ddata.id);
        self.meta_title = "微信自定义菜单";
        self.assign({"navxs": true, "bg": "bg-dark"});
        return this.display();
    }

    /**
     * 保存自定义菜单
     */
    async savecustommenuAction() {
        let self = this;
        let newv = self.post('newv');
        let menuid = self.post('menuid');//菜单ID
        let currwebtoken = 0;
        console.log(newv);
        //return false;
        try {
            // return self.end(newv);
            if (!newv) {
                return self.fail('参数错误');
            }
            //newv = JSON.parse(newv);
            let currtime = new Date().getTime();
            let model = self.model('wx_custom_menu');
            let res;
            if (think.isEmpty(menuid)) {
                res = await model.add({
                    create_time: currtime,
                    custom_menu: newv,
                    web_token: currwebtoken
                });
            } else {
                res = await model.update({
                    id: menuid,
                    create_time: currtime,
                    custom_menu: newv,
                    web_token: currwebtoken
                });
            }

            if (res) {
                return self.success({name: '菜单保存成功'});
            } else {
                return self.fail('菜单保存失败');
            }
        } catch (e) {
            return self.fail('参数错误');
        }
    }

    /**
     * 生成微信菜单
     */
    async asyncwxmenuAction() {
        let self = this;
        let model = self.model('wx_custom_menu');
        let data = await model.where({}).find();

        let wxsubmit = function (api, data) {
            let deferred = think.defer();
            api.createMenu(data, (err, result)=> {
                if (err) {
                    deferred.reject(false);
                } else {
                    deferred.resolve(result);
                }
            });
            return deferred.promise;
        }

        console.log(data);

        let dataObj = JSON.parse(data.custom_menu);
        let final = {button: []};
        // for(let i = 0; i < dataObj.button.length; i++){
        //     let btn = dataObj.button[i];
        //     let tmpbtn = { /*name:'', type:'', key:'', sub_button:''*/ };
        //
        //     tmpbtn.name = btn.name;
        //     if(btn.sub_button.length > 0){
        //         tmpbtn.sub_button = [];
        //         for(let j = 0; j < btn.sub_button.length; j++){
        //             let sub = btn.sub_button[i];
        //             let tmpsub = { /*name:'', type:'', key:'', sub_button:''*/ };
        //             tmpsub.name = sub.name;
        //             tmpsub.type = 'view';
        //             tmpsub.url = sub.act_list[i].value;
        //
        //             tmpbtn.sub_button.push(tmpsub);
        //         }
        //     }else if(!btn.hasOwnProperty('key')){
        //         btn.key = (new Date().getTime())+"KEY";
        //     }else{
        //     }
        //
        //     final.button.push( tmpbtn );
        // }
        for (let a of dataObj.button) {
            let tmpbtn = {};
            tmpbtn.name = a.name;
            //console.log(a);
            if (think.isEmpty(a.sub_button)) {
                //console.log(a.type);
                switch (a.type) {
                    case '1':
                        tmpbtn.type="click";
                        tmpbtn.key=a.act_list[0].value;
                        break;
                    case '2':
                        tmpbtn.type = "view";
                        tmpbtn.url = a.act_list[0].value;
                        break;
                }
            } else {
                tmpbtn.sub_button = [];
                for (let b of a.sub_button) {
                    let tmpsub = {};
                    tmpsub.name = b.name;
                    //console.log(b.type);
                    switch (b.type) {
                        case '1':
                            tmpsub.type="click";
                            tmpsub.key=b.act_list[0].value;
                            break;
                        case '2':
                            tmpsub.type = "view";
                            tmpsub.url = b.act_list[0].value;
                            break;
                    }
                    tmpbtn.sub_button.push(tmpsub);
                }
            }
            final.button.push(tmpbtn);
            console.log(tmpbtn);
        }
        think.log(final)
        //return false;
        let api = new API(this.setup.wx_AppID, this.setup.wx_AppSecret);
        let res = await wxsubmit(api, final);
        // let res = true;
        console.log(res);
        if (res) {
            return self.success({name: '微信菜单生成成功'});
        } else {
            return self.fail('微信菜单生成失败');
        }
    }

}