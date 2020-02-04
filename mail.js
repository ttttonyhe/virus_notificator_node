const request = require('request');
const mongo = require('mongodb').MongoClient;
const nodemailer = require("nodemailer");
const schedule = require('node-schedule');
var databaseUrl = 'mongodb://localhost:27017';

var consoleMessage = function (title, type) {
    switch (type) {
        case 'start':
            var sendDate = new Date();
            console.log('\n');
            console.log('-----------' + sendDate.toLocaleTimeString() + '-----------');
            console.log('----------' + title + '-----------');
            console.log('\n');
            break;
        case 'end':
            var sendDate = new Date();
            console.log('\n');
            console.log('-----------' + sendDate.toLocaleTimeString() + '-----------');
            console.log('----------' + title + '-----------');
            console.log('\n');
            break;
    }
}


/*  
    name: 取得 PHP 爬取数据
*/
request('https://www.snapaper.com/vue/virus', function (error, response, data) {
    if (!error && response.statusCode == 200) {
        global.dataObject = JSON.parse(data.toString()); //获取
        global.requestStatus = true;


        /*
            name: 邮件发送模板
        */
        var sendEmail = function (titleContent, textContent, htmlContent, receiver) {
            let mailer = nodemailer.createTransport({
                host: "smtpdm.aliyun.com",
                port: 465,
                secure: true, // upgrade later with STARTTLS
                auth: {
                    user: "noreply@eugrade.com",
                    pass: "j945dz7LAHGywdA"
                }
            });

            var message = {
                from: "noreply@eugrade.com",
                to: receiver,
                subject: titleContent,
                text: textContent,
                html: htmlContent
            };

            mailer.sendMail(message, function (err, msg) {
                if (err) {
                    console.log({
                        response: err.response,
                        code: err.responseCode
                    });
                } else {
                    console.log("已接收到邮件: " + msg.accepted)
                }
            });
        }

        consoleMessage('每日发送邮件任务准备开始', 'start');
        //连接 MongoDB 数据库
        mongo.connect(databaseUrl, {
            useUnifiedTopology: true
        }, function (err, db) {
            if (err) {
                console.log(err);
                return;
            } else {
                console.log("连接数据库!");
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
                                receiverData.province = result[i]['pro'].toString();
                                receiverData.city = result[i]['city'].toString();

                                //数据获取状态
                                var dataStatus = {
                                    total: false,
                                    country: false,
                                    province: false,
                                    city: false
                                };

                                if (global.requestStatus) { //未获取到总数据
                                    let dataNow = global.dataObject;

                                    //全国信息获取
                                    if (dataNow.total_confirmed !== 0) { //获取到全国数据
                                        receiverData.data.country = { //得到全国数据对象
                                            confirm: parseInt(dataNow.total_confirmed),
                                            death: parseInt(dataNow.total_death),
                                            cured: parseInt(dataNow.total_cured)
                                        }
                                        dataStatus.coutry = true;
                                    } else { //未获取到全国数据
                                        dataStatus.country = false;
                                    }

                                    //省份信息获取
                                    if (typeof(dataNow.provinces_data[receiverData.province.toString()]) !== undefined) { //获取到省份数据
                                        let dataNowTemp = dataNow.provinces_data[receiverData.province.toString()];
                                        receiverData.data.province = { //得到省份数据对象
                                            name: receiverData.province.toString(),
                                            confirm: parseInt(dataNowTemp.confirmed),
                                            death: parseInt(dataNowTemp.death),
                                            cured: parseInt(dataNowTemp.cured)
                                        }
                                        dataStatus.province = true;
                                        console.log(11);
                                    } else { //未获取到省份数据
                                        console.log(12);
                                        dataStatus.province = false;
                                    }

                                    //城市信息获取
                                    if (typeof(dataNow.cities_data[receiverData.city.toString()]) !== undefined) { //获取到省份数据
                                        let dataNowTemp = dataNow.cities_data[receiverData.city.toString()];
                                        receiverData.data.city = { //得到省份数据对象
                                            name: receiverData.city.toString(),
                                            confirm: parseInt(dataNowTemp.confirmed),
                                            death: parseInt(dataNowTemp.death),
                                            cured: parseInt(dataNowTemp.cured)
                                        }
                                        dataStatus.city = true;
                                        console.log(21);
                                    } else { //未获取到省份数据
                                        dataStatus.city = false;
                                        console.log(22);
                                    }

                                    TODO: 邮件格式排版设计
                                    sendEmail('推送测试邮件', '这是测试', `
                            <h3>全国数据</h3>
                            <ul>
                                <li>确诊:` + receiverData.data.country.confirm + `</li>
                                <li>死亡:` + receiverData.data.country.death + `</li>
                                <li>治愈:` + receiverData.data.country.cured + `</li>
                            </ul>
                            `, receiverData.email);

                                    consoleMessage('每日发送邮件任务结束', 'end');
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

    } else {
        global.requestStatus = false;
    }
})

TODO: 定时作业配置
function scheduleTask() {
    schedule.scheduleJob('0 0 1 1-31 1-12 0-7', function () {
        bigFunction();
    });
}

//scheduleTask();