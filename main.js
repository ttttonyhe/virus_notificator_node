TODO: 前端设计

const express = require('express');
const request = require('request');
const mongo = require('mongodb').MongoClient;
const nodemailer = require("nodemailer");
const schedule = require('node-schedule');
var databaseUrl = 'mongodb://localhost:27017';


//新建 Express 实例
var app = express();

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
    name: 跨域允许设置
*/
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Cache-Control', 'No-store');
    next();
});


/*  
    name: 取得 PHP 爬取数据
*/
request('https://www.snapaper.com/vue/virus', function (error, response, data) {
    if (!error && response.statusCode == 200) {
        global.dataObject = JSON.parse(data.toString()); //获取
        global.requestStatus = true;
    } else {
        global.requestStatus = false;
    }
})

schedule.scheduleJob('30 * * * * *', function () {
    request('https://www.snapaper.com/vue/virus', function (error, response, data) {
    if (!error && response.statusCode == 200) {
        global.dataObject = JSON.parse(data.toString()); //获取
        global.requestStatus = true;
    } else {
        global.requestStatus = false;
    }
})
});


/* 数据获取 Section */
/* 
    name: 全部数据获取
    route: /api/all
*/
app.get('/api/all', function (req, res) {
    let returnArray = {
        status: false,
        code: 0,
        data: [],
        msg: null
    };
    if (global.requestStatus) {
        returnArray.code = 103;
        returnArray.data = global.dataObject;
        returnArray.status = true;
        res.json(returnArray);
    } else {
        returnArray.code = 100;
        returnArray.status = false;
        returnArray.msg = 'Service is Unavailable';
        res.json(returnArray);
    }
});


/* 
    name: 省份数据获取
    route: /api/province/:province
*/
app.get('/api/province/:province', function (req, res) {
    //获取请求参数
    const params = req.params;
    //建立参数对象
    var paramsObject = {
        province: '四川'
    }
    //保存参数
    paramsObject.province = req.params.province;

    let returnArray = {
        status: false,
        code: 0,
        data: [],
        msg: null
    };
    if (global.requestStatus) {
        returnArray.data = global.dataObject.provinces_data[paramsObject.province];
        returnArray.code = 101;
        returnArray.status = true;
        res.json(returnArray);
    } else {
        returnArray.code = 100;
        returnArray.status = false;
        returnArray.msg = 'Service is Unavailable';
        res.json(returnArray);
    }
});


/* 
    name: 城市数据获取
    route: /api/city/:city
*/
app.get('/api/city/:city', function (req, res) {
    //获取请求参数
    const params = req.params;
    //建立参数对象
    var paramsObject = {
        city: '成都'
    }
    //保存参数
    paramsObject.city = req.params.city;
    let returnArray = {
        status: false,
        code: 0,
        data: [],
        msg: null
    };
    if (global.requestStatus) {
        returnArray.data = global.dataObject.cities_data[paramsObject.city];
        returnArray.code = 102;
        returnArray.status = true;
        res.json(returnArray);
    } else {
        returnArray.code = 100;
        returnArray.status = false;
        returnArray.msg = 'Service is Unavailable';
        res.json(returnArray);
    }
});
/* 数据获取 Section */


/* 用户订阅 Section */

/*
    name: 邮件发送模板
*/
var sendEmail = function (titleContent, textContent, htmlContent, receiver) {
    consoleMessage('准备开始发送邮件','start');

    let mailer = nodemailer.createTransport({
        host: "smtp.163.com",
        port: 465,
        secure: true, // upgrade later with STARTTLS
        auth: {
            user: "18080850614@163.com",
            pass: "Goodhlp616877"
        }
    });

    var message = {
        from: "18080850614@163.com",
        to: receiver,
        subject: titleContent,
        text: textContent,
        html: htmlContent
    };

    mailer.sendMail(message, function (err, msg) {
        if (err) {
            console.log(err);
        } else {
            console.log("已接收到邮件: " + msg.accepted)
            consoleMessage('发送邮件任务结束','end');
        }
    });
}

/* 
    name: 邮箱或短信订阅
    route: /subscribe/mail/:email/:province/:city
*/
app.get('/subscribe/mail/:email/:province/:city', function (req, res) {

    consoleMessage('准备开始处理订阅','start');
    //获取请求参数
    const params = req.params;
    //建立参数对象
    var paramsObject = {
        email: 'xxx@xxx.com',
        pro: '四川省',
        city: '成都'
    }
    //电子邮件地址验证
    var emailTest = /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/;
    if (emailTest.test(req.params.email)) {

        //保存参数
        paramsObject.email = params.email;
        paramsObject.pro = params.province;
        paramsObject.city = params.city;

        let returnArray = {
            status: false,
            code: 0,
            data: [],
            msg: null
        };
        if (global.requestStatus) {

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
                    //数据查重
                    coll.collection("mail_users").find(paramsObject).toArray(function (err, result) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (result.length) {
                                console.log("有重复数据");
                                let returnArray = {
                                    status: false,
                                    code: 0,
                                    data: [],
                                    msg: null
                                };
                                returnArray.code = 106;
                                returnArray.msg = 'Already subscribed';
                                returnArray.status = false;
                                res.json(returnArray);
                                db.close();
                            } else {
                                coll.collection("mail_users").insertOne({'email':paramsObject.email}, function (err, result) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        let returnArray = {
                                            status: false,
                                            code: 0,
                                            data: [],
                                            msg: null
                                        };
                                        console.log("没有重复数据");

                                        //发送欢迎邮件
                                        sendEmail('2019-nCov Virus Tracking Subscription Test', 'Hi there, 感谢你订阅新型冠状病毒疫情动态每日推送。你将在本日或明日内晚些时候收到我们为您准备的数据报表，武汉加油！', `Hi there<br/>感谢你订阅新型冠状动态每日推送。你将在本日或明日内晚些时候收到我们为您准备的数据报表，武汉加油`, paramsObject.email);

                                        returnArray.code = 105;
                                        returnArray.msg = 'Subscription was a Success';
                                        returnArray.status = true;
                                        res.json(returnArray);
                                        db.close();
                                        consoleMessage('结束处理订阅','end');
                                    }
                                });
                            }
                        }
                    });
                }
            });

        } else {
            returnArray.code = 100;
            returnArray.status = false;
            returnArray.msg = 'Service is Unavailable';
            res.json(returnArray);
        }
    } else {
        returnArray.code = 104;
        returnArray.msg = 'Email Address is Invalid';
        returnArray.status = false;
    }
})
/* 用户订阅 Section */


/* 服务部署 Section */
app.listen(3000, function () {
    console.log('app is listening at port 3000');
});
/* 服务部署 Section */