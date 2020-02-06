/*
    name: Server-Side Mailing Function of Virus Notificator
    author: TonyHe
    link: https://www.ouorz.com
    last Update: 6-2-2020
*/

const request = require('request');
const mongo = require('mongodb').MongoClient;
const nodemailer = require("nodemailer");
var databaseUrl = 'mongodb://localhost:27017';


/*
        name: 邮件发送模板
    */
async function sendEmail(titleContent, textContent, htmlContent, receiver) {
    let mailer = nodemailer.createTransport({
        host: "smtpdm.aliyun.com",
        port: 465,
        secure: true, // upgrade later with STARTTLS
        auth: {
            user: "noreply@eugrade.com",
            pass: "xxx"
        }
    });

    let message = {
        from: "noreply@eugrade.com",
        to: receiver,
        subject: titleContent,
        text: textContent,
        html: htmlContent
    };

    let result = await new Promise(function (resolve, reject) {
        setTimeout(() => mailer.sendMail(message, function (err, msg) {
            if (err) {
                return reject({
                    msg: {
                        response: err.response,
                        code: err.responseCode
                    }
                })
            } else {
                return resolve({
                    msg: "已接收到每日推送邮件: " + msg.accepted
                })
            }
        }), 1000)
    })

    console.log(result.msg);
}



/*  
    name: 取得 PHP 爬取数据
*/
async function mailDaily() {
    global.dataObject = await new Promise((resolve, reject) => {
        request('https://www.snapaper.com/vue/virus', function (error, response, data) {
            if (!error && response.statusCode == 200) {
                let dataObject = JSON.parse(data.toString()); //获取
                return resolve(dataObject);
            } else {
                let dataObject = {};
                return reject(dataObject);
            }
        })
    })

    //连接 MongoDB 数据库
    mongo.connect(databaseUrl, {
        useUnifiedTopology: true
    }, function (err, db) {
        if (err) {
            console.log(err);
            return;
        } else {
            var coll = db.db("notificator");
            //获取数据
            coll.collection("mail_users").find().toArray(function (err, result) {
                if (err) {
                    console.log(err);
                } else {
                    if (result.length) {
                        for (var i = 0; i < result.length; ++i) {

                            //订阅用户信息结构
                            let receiverData = {
                                email: null,
                                province: null,
                                city: null,
                                data: {
                                    country: {
                                        name: '中国',
                                        confirm: 0,
                                        death: 0,
                                        cured: 0
                                    },
                                    province: {
                                        name: null,
                                        confirm: 0,
                                        death: 0,
                                        cured: 0
                                    },
                                    city: {
                                        name: null,
                                        confirm: 0,
                                        death: 0,
                                        cured: 0
                                    }
                                }
                            };

                            //基础信息
                            receiverData.email = result[i]['email'].toString();
                            receiverData.province = result[i]['pro'];
                            receiverData.city = result[i]['city'];

                            //数据获取状态
                            var dataStatus = {
                                total: false,
                                country: false,
                                province: false,
                                city: false
                            };

                            if (typeof (global.dataObject) !== undefined) { //获取到总数据
                                let dataNow = global.dataObject;

                                //全国信息获取
                                if (dataNow.total_confirmed !== 0) { //获取到全国数据
                                    receiverData.data.country = { //得到全国数据对象
                                        confirm: parseInt(dataNow.total_confirmed),
                                        death: parseInt(dataNow.total_death),
                                        cured: parseInt(dataNow.total_cured)
                                    }
                                    dataStatus.country = true;
                                } else { //未获取到全国数据
                                    dataStatus.country = false;
                                }

                                //省份信息获取
                                if (receiverData.province !== undefined && typeof (dataNow.provinces_data[receiverData.province]) !== undefined) { //获取到省份数据
                                    let dataNowTemp = dataNow.provinces_data[receiverData.province];
                                    receiverData.data.province = { //得到省份数据对象
                                        name: receiverData.province,
                                        confirm: parseInt(dataNowTemp.confirmed),
                                        death: parseInt(dataNowTemp.death),
                                        cured: parseInt(dataNowTemp.cured)
                                    }
                                    dataStatus.province = true;
                                } else { //未获取到省份数据
                                    dataStatus.province = false;
                                }

                                //城市信息获取
                                if (receiverData.city !== undefined && typeof (dataNow.cities_data[receiverData.city]) !== undefined) { //获取到省份数据
                                    let dataNowTemp = dataNow.cities_data[receiverData.city];
                                    if (receiverData.city !== '无城市') {
                                        receiverData.data.city = { //得到省份数据对象
                                            name: receiverData.city,
                                            confirm: parseInt(dataNowTemp.confirmed),
                                            death: parseInt(dataNowTemp.death),
                                            cured: parseInt(dataNowTemp.cured)
                                        }
                                        dataStatus.city = true;
                                    } else {
                                        dataStatus.city = false;
                                    }
                                } else { //未获取到省份数据
                                    dataStatus.city = false;
                                }

                                if (dataStatus.city && dataStatus.province && dataStatus.country) {
                                    var htmlContent = `<div style="width:100%;padding-bottom:50px"><div style="border:1px solid #eee;margin-bottom:40px;width:80%;margin:40px auto;border-radius:10px;box-shadow:0 1px 5px 0 rgba(0,0,0,.12)"><img src="https://i.loli.net/2020/02/05/b3adxQsVHX6voY4.jpg" style="max-width:100%;height:auto"></div><div><div style="border:1px solid #eee;width:80%;margin:0 auto;border-radius:10px"><h3 style="text-align:center;background:#f1f2f3;font-size:1.4rem;font-weight:500;color:#666;padding:5px 0 8px 0;letter-spacing:1px;margin-top: 0px;">全国数据</h3><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#f5a623;border-radius:5px">确诊人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.country.confirm + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#ff0100;border-radius:5px">死亡人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.country.death + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#006ff4;border-radius:5px">治愈人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.country.cured + ` 人</p></div><div style="border:1px solid #eee;width:80%;margin:0 auto;border-radius:10px;margin-top:20px"><h3 style="text-align:center;background:#f1f2f3;font-size:1.4rem;font-weight:500;color:#666;padding:5px 0 8px 0;letter-spacing:1px;margin-top: 0px;">` + receiverData.province + `数据</h3><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#f5a623;border-radius:5px">确诊人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` +
                                        receiverData.data.province.confirm + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#ff0100;border-radius:5px">死亡人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.province.death + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#006ff4;border-radius:5px">治愈人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.province.cured + ` 人</p></div><div style="border:1px solid #eee;width:80%;margin:0 auto;border-radius:10px;margin-top:20px"><h3 style="text-align:center;background:#f1f2f3;font-size:1.4rem;font-weight:500;color:#666;padding:5px 0 8px 0;letter-spacing:1px;margin-top: 0px;">` + receiverData.city + `数据</h3><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#f5a623;border-radius:5px">确诊人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.city.confirm + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#ff0100;border-radius:5px">死亡人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.city.death + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#006ff4;border-radius:5px">治愈人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.city.cured + ` 人</p></div></div></div>`;
                                    sendEmail('推送测试邮件', '这是测试', htmlContent, receiverData.email)
                                } else if (dataStatus.province && dataStatus.country) {
                                    var htmlContent = `<div style="width:100%;padding-bottom:50px"><div style="border:1px solid #eee;margin-bottom:40px;width:80%;margin:40px auto;border-radius:10px;box-shadow:0 1px 5px 0 rgba(0,0,0,.12)"><img src="https://i.loli.net/2020/02/05/b3adxQsVHX6voY4.jpg" style="max-width:100%;height:auto"></div><div><div style="border:1px solid #eee;width:80%;margin:0 auto;border-radius:10px"><h3 style="text-align:center;background:#f1f2f3;font-size:1.4rem;font-weight:500;color:#666;padding:5px 0 8px 0;letter-spacing:1px;margin-top: 0px;">全国数据</h3><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#f5a623;border-radius:5px">确诊人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.country.confirm + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#ff0100;border-radius:5px">死亡人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.country.death + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#006ff4;border-radius:5px">治愈人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.country.cured + ` 人</p></div><div style="border:1px solid #eee;width:80%;margin:0 auto;border-radius:10px;margin-top:20px"><h3 style="text-align:center;background:#f1f2f3;font-size:1.4rem;font-weight:500;color:#666;padding:5px 0 8px 0;letter-spacing:1px;margin-top: 0px;">` + receiverData.province + `数据</h3><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#f5a623;border-radius:5px">确诊人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` +
                                        receiverData.data.province.confirm + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#ff0100;border-radius:5px">死亡人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.province.death + ` 人</p><p style="text-align:center;color:#666;font-size:1.2rem"><b style="color:#006ff4;border-radius:5px">治愈人数</b><em style="color:#999">&nbsp;&nbsp;|</em>&nbsp;&nbsp;` + receiverData.data.province.cured + ` 人</p></div></div></div>`;
                                    sendEmail('推送测试邮件', '这是测试', htmlContent, receiverData.email)
                                } else {
                                    console.log('未发送:' + receiverData.email);
                                }

                            } else {
                                dataStatus.total = false;
                            }
                        }
                    } else {
                        console.log('无人订阅，停止推送');
                    }
                }
            });
        }
    });
}

module.exports = mailDaily;