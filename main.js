/*
    name: Server-Side of Virus Notificator
    author: TonyHe
    link: https://www.ouorz.com
    last Update: 6-2-2020
*/

const express = require("express");
const request = require("request");
const mongo = require("mongodb").MongoClient;
const nodemailer = require("nodemailer");
const schedule = require("node-schedule");
const bodyParser = require("body-parser");
const Feed = require("feed").Feed;
const mailFunc = require("./mail");
var databaseUrl = process.env.MONGODB_URL;

//新建 Express 实例
var app = express();

//处理 POST 请求
app.use(
	bodyParser.urlencoded({
		extended: false,
	})
);

//控制台输出模板
var consoleMessage = function (title, type) {
	switch (type) {
		case "start":
			var sendDate = new Date();
			console.log("\n");
			console.log(
				"-----------" + sendDate.toLocaleTimeString() + "-----------"
			);
			console.log("----------" + title + "-----------");
			console.log("\n");
			break;
		case "end":
			var sendDate = new Date();
			console.log("\n");
			console.log(
				"-----------" + sendDate.toLocaleTimeString() + "-----------"
			);
			console.log("----------" + title + "-----------");
			console.log("\n");
			break;
	}
};

/*  
    name: 取得 PHP 爬取数据
*/
consoleMessage("开始请求最新数据", "start");
request("https://files.snapaper.com/virus", function (error, response, data) {
	if (!error && response.statusCode == 200) {
		global.dataObject = JSON.parse(data.toString()); //获取
		global.requestStatus = true;
		console.log("数据请求成功");
		global.feedData = getFeed();
	} else {
		global.requestStatus = false;
		console.log("数据请求失败");
	}
	consoleMessage("结束请求最新数据", "end");
});

var getFeed = function () {
	/* RSS Feed 生成 */
	const feed = new Feed({
		title: "COVID-19 疫情数据",
		description: "COVID-19 疫情数据实时更新推送",
		id: "https://ncov.ouorz.com/",
		link: "https://ncov.ouorz.com/",
		image: "https://i.loli.net/2020/02/05/b3adxQsVHX6voY4.jpg",
		favicon: "https://ncov.ouorz.com/favicon.ico",
		copyright: "All rights reserved 2019, TonyHe",
		feedLinks: {
			json: "https://node.ouorz.com/json",
			atom: "https://node.ouorz.com/atom",
		},
		author: {
			name: "TonyHe",
			email: "he@holptech.com",
			link: "https://www.ouorz.com",
		},
	});
	feed.addItem({
		title: "全国数据",
		id: "全国数据",
		link: "https://node.ouorz.com/api/all",
		description: "全国数据",
		author: [
			{
				name: "TonyHe",
				email: "he@holptech.com",
				link: "https://www.ouorz.com",
			},
		],
		contributor: [
			{
				name: "丁香园·丁香医生",
				email: "johancruyff@example.com",
				link: "https://ncov.dxy.cn/ncovh5/view/pneumonia",
			},
		],
		date: new Date(),
		image: "https://i.loli.net/2020/02/05/b3adxQsVHX6voY4.jpg",
		content:
			`<h3>全国数据</h3>
    <ul>
        <li>确诊:` +
			global.dataObject.total_confirmed +
			`</li>
        <li>死亡:` +
			global.dataObject.total_death +
			`</li>
        <li>治愈:` +
			global.dataObject.total_cured +
			`</li>
    </ul>`,
	});

	//添加省份
	Object.values(global.dataObject.provinces_data).forEach((pro) => {
		global.feedProvinceCities = ""; //城市数据，加入到省份内容中
		//添加城市
		Object.values(pro.citiesName).forEach((city) => {
			global.feedProvinceCities +=
				`<h3>` +
				city +
				`数据</h3>
                <ul>
                    <li>确诊:` +
				global.dataObject.cities_data[city].confirmed +
				`</li>
                    <li>死亡:` +
				global.dataObject.cities_data[city].death +
				`</li>
                    <li>治愈:` +
				global.dataObject.cities_data[city].cured +
				`</li>
                </ul>`;
		});
		feed.addItem({
			title: pro.provinceName + "数据",
			id: pro.provinceName + "数据",
			link: "https://node.ouorz.com/api/all",
			description: pro.provinceName + "数据",
			author: [
				{
					name: "TonyHe",
					email: "he@holptech.com",
					link: "https://www.ouorz.com",
				},
			],
			contributor: [
				{
					name: "丁香园·丁香医生",
					email: "johancruyff@example.com",
					link: "https://ncov.dxy.cn/ncovh5/view/pneumonia",
				},
			],
			date: new Date(),
			image: "https://i.loli.net/2020/02/05/b3adxQsVHX6voY4.jpg",
			content:
				`<h3>` +
				pro.provinceName +
				`数据</h3>
                <ul>
                    <li>总确诊:` +
				pro.confirmed +
				`</li>
                    <li>总死亡:` +
				pro.death +
				`</li>
                    <li>总治愈:` +
				pro.cured +
				`</li>
                </ul>` +
				global.feedProvinceCities,
		});
	});

	feed.addCategory("Data");

	feed.addContributor({
		name: "丁香园·丁香医生",
		email: "he@holptech.com",
		link: "https://ncov.dxy.cn/ncovh5/view/pneumonia",
	});
	/* RSS Feed 生成 */
	return feed;
};

/* RSS Feed 路由 */
app.get("/rss", function (req, res) {
	res.set("Content-Type", "text/xml");
	res.send(global.feedData.rss2());
});
/* RSS Feed 路由 */

/* 
    name: 跨域允许设置
*/
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Headers", "Content-Type");
	res.header("Cache-Control", "No-store");
	next();
});

/* 数据获取及 API Section */

/* 
    name: 全部数据获取
    route: /api/all
*/
app.get("/api/all", function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	let returnArray = {
		status: false,
		code: 0,
		data: [],
		msg: null,
	};
	if (global.requestStatus) {
		returnArray.code = 103;
		returnArray.data = global.dataObject;
		returnArray.status = true;
		res.json(returnArray);
	} else {
		returnArray.code = 100;
		returnArray.status = false;
		returnArray.msg = "Service is Unavailable";
		res.json(returnArray);
	}
});

/* 
    name: 省份数据获取
    route: /api/province/:province
*/
app.get("/api/province/:province", function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	//获取请求参数
	const params = req.params;
	//建立参数对象
	var paramsObject = {
		province: "四川",
	};
	//保存参数
	paramsObject.province = req.params.province;

	let returnArray = {
		status: false,
		code: 0,
		data: [],
		msg: null,
	};
	if (global.requestStatus) {
		returnArray.data = global.dataObject.provinces_data[paramsObject.province];
		returnArray.code = 101;
		returnArray.status = true;
		res.json(returnArray);
	} else {
		returnArray.code = 100;
		returnArray.status = false;
		returnArray.msg = "Service is Unavailable";
		res.json(returnArray);
	}
});

/* 
    name: 城市数据获取
    route: /api/city/:city
*/
app.get("/api/city/:city", function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	//获取请求参数
	const params = req.params;
	//建立参数对象
	var paramsObject = {
		city: "成都",
	};
	//保存参数
	paramsObject.city = req.params.city;
	let returnArray = {
		status: false,
		code: 0,
		data: [],
		msg: null,
	};
	if (global.requestStatus) {
		returnArray.data = global.dataObject.cities_data[paramsObject.city];
		returnArray.code = 102;
		returnArray.status = true;
		res.json(returnArray);
	} else {
		returnArray.code = 100;
		returnArray.status = false;
		returnArray.msg = "Service is Unavailable";
		res.json(returnArray);
	}
});
/* 数据获取及 API Section */

/* 用户订阅 Section */

/*
    name: 邮件发送模板
*/
var sendEmail = function (titleContent, textContent, htmlContent, receiver) {
	consoleMessage("准备开始发送欢迎邮件", "start");

	let mailer = nodemailer.createTransport({
		host: "smtp.163.com",
		port: 465,
		secure: true,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASSWORD,
		},
	});

	let message = {
		from: process.env.SMTP_USER,
		to: receiver,
		subject: titleContent,
		text: textContent,
		html: htmlContent,
	};

	mailer.sendMail(message, function (err, msg) {
		if (err) {
			console.log(err);
		} else {
			console.log("已接收到邮件: " + msg.accepted);
			consoleMessage("发送欢迎邮件任务结束", "end");
		}
	});
};

/* 
    name: 邮箱或短信订阅
    route: /subscribe/mail
    params: email
*/
app.post("/subscribe/mail", function (req, res) {
	res.header(
		"Access-Control-Allow-Origin",
		"https://virus-notificator-vue.onrender.com"
	);
	let returnArray = {
		status: false,
		code: 0,
		data: [],
		msg: null,
	};

	//获取请求参数
	const params = req.body;
	//建立参数对象
	var paramsObject = {
		email: "xxx@xxx.com",
	};
	//电子邮件地址验证
	var emailTest =
		/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/;
	if (emailTest.test(params.email)) {
		//保存参数
		paramsObject.email = params.email;
		if (global.requestStatus) {
			//连接 MongoDB 数据库
			mongo.connect(
				databaseUrl,
				{
					useNewUrlParser: true,
					useUnifiedTopology: true,
				},
				function (err, db) {
					if (err) {
						console.log(err);
						return;
					} else {
						var coll = db.db("notificator");
						//数据查重
						coll
							.collection("mail_users")
							.find({
								email: paramsObject.email,
							})
							.toArray(function (err, result) {
								if (err) {
									console.log(err);
								} else {
									if (result.length) {
										console.log("有重复数据");
										let returnArray = {
											status: false,
											code: 0,
											data: [],
											msg: null,
										};
										returnArray.code = 106;
										returnArray.msg = "邮箱地址已订阅";
										returnArray.status = false;
										res.json(returnArray);
										db.close();
									} else {
										coll
											.collection("mail_users")
											.insertOne(paramsObject, function (err, result) {
												if (err) {
													console.log(err);
												} else {
													let returnArray = {
														status: false,
														code: 0,
														data: [],
														msg: null,
													};
													console.log("没有重复数据");

													//发送欢迎邮件
													sendEmail(
														"关于新型冠状病毒疫情数据推送的订阅通知",
														"感谢你订阅新型冠状病毒疫情数据动态每日推送服务，你将在每天的23:00收到我们为您准备的包括全国数据与你所关注的省份/城市数据报表。湖北加油，中国加油。",
														`感谢你订阅新型冠状病毒疫情数据动态每日推送服务，你将在每天的 <b>23:00</b> 收到我们为您准备的包括 <b>全国数据</b> 与你所关注的 <b>省份/城市</b> 数据报表。<br/>湖北加油，中国加油。`,
														paramsObject.email
													);

													returnArray.code = 105;
													returnArray.msg = "邮件推送订阅成功";
													returnArray.status = true;
													res.json(returnArray);
													db.close();
												}
											});
									}
								}
							});
					}
				}
			);
		} else {
			returnArray.code = 100;
			returnArray.status = false;
			returnArray.msg = "服务器错误，请联系管理员";
			res.json(returnArray);
		}
	} else {
		returnArray.code = 104;
		returnArray.msg = "电子邮件地址错误";
		returnArray.status = false;
		console.log(global.dataObject.test_data);
		res.json(returnArray);
	}
});

/* 
    name: 取消订阅
    route: /unsubscribe/mail
    params: email
*/
app.post("/unsubscribe/mail", function (req, res) {
	res.header(
		"Access-Control-Allow-Origin",
		"https://virus-notificator-vue.onrender.com"
	);
	let returnArray = {
		status: false,
		code: 0,
		data: [],
		msg: null,
	};

	//获取请求参数
	const params = req.body;
	//建立参数对象
	var paramsObject = {
		email: "xxx@xxx.com",
	};
	//电子邮件地址验证
	var emailTest =
		/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/;
	if (emailTest.test(params.email)) {
		//保存参数
		paramsObject.email = params.email;
		if (global.requestStatus) {
			//连接 MongoDB 数据库
			mongo.connect(
				databaseUrl,
				{
					useNewUrlParser: true,
					useUnifiedTopology: true,
				},
				function (err, db) {
					if (err) {
						console.log(err);
						return;
					} else {
						var coll = db.db("notificator");
						//数据查重
						coll
							.collection("mail_users")
							.find({
								email: paramsObject.email,
							})
							.toArray(function (err, result) {
								if (err) {
									console.log(err);
								} else {
									if (result.length) {
										console.log("有重复数据");

										//删除数据
										coll.collection("mail_users").deleteOne(
											{
												email: paramsObject.email,
											},
											function (err) {
												if (err) {
													console.log(err);
												} else {
													let returnArray = {
														status: true,
														code: 0,
														data: [],
														msg: null,
													};
													returnArray.code = 105;
													returnArray.msg = "你已成功取消订阅";
													returnArray.status = true;
													res.json(returnArray);
													db.close();
												}
											}
										);
									} else {
										console.log("没有可以删除的数据");
										let returnArray = {
											status: false,
											code: 0,
											data: [],
											msg: null,
										};
										returnArray.code = 106;
										returnArray.msg = "邮箱地址未订阅";
										returnArray.status = false;
										res.json(returnArray);
										db.close();
									}
								}
							});
					}
				}
			);
		} else {
			returnArray.code = 100;
			returnArray.status = false;
			returnArray.msg = "服务器错误，请联系管理员";
			res.json(returnArray);
		}
	} else {
		returnArray.code = 104;
		returnArray.msg = "电子邮件地址错误";
		returnArray.status = false;
		console.log(global.dataObject.test_data);
		res.json(returnArray);
	}
});

/* 
    name: 邮箱订阅邮箱地址修改
    route: /subscribe/mail/edit
    params: original_email/current_email/province/city
*/
app.post("/subscribe/mail/edit", function (req, res) {
	res.header(
		"Access-Control-Allow-Origin",
		"https://virus-notificator-vue.onrender.com"
	);
	let returnArray = {
		status: false,
		code: 0,
		data: [],
		msg: null,
	};

	//获取请求参数
	const params = req.body;
	//建立参数对象
	var paramsObject = {
		currentEmail: "xxx@xxx.com",
		originEmail: "xxx@xxx.com",
	};

	//电子邮件地址验证
	var emailTest =
		/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/;
	if (
		emailTest.test(params.original_email) &&
		emailTest.test(params.current_email)
	) {
		//保存参数
		paramsObject.originEmail = params.original_email;
		paramsObject.currentEmail = params.current_email;

		if (global.requestStatus) {
			//连接 MongoDB 数据库
			mongo.connect(
				databaseUrl,
				{
					useNewUrlParser: true,
					useUnifiedTopology: true,
				},
				function (err, db) {
					if (err) {
						console.log(err);
						return;
					} else {
						var coll = db.db("notificator");
						//数据查重
						coll
							.collection("mail_users")
							.find({
								email: paramsObject.originEmail,
							})
							.toArray(function (err, result) {
								if (err) {
									console.log(err);
								} else {
									if (result.length) {
										//源邮箱存在记录
										coll
											.collection("mail_users")
											.find({
												email: paramsObject.currentEmail,
											})
											.toArray(function (err, result) {
												if (err) {
													console.log(err);
												} else {
													if (result.length) {
														//现邮箱存在记录
														console.log("修改后的邮箱已订阅");
														let returnArray = {
															status: false,
															code: 0,
															data: [],
															msg: null,
														};
														returnArray.code = 106;
														returnArray.msg = "无法修改至已订阅邮箱";
														returnArray.status = false;
														res.json(returnArray);
														db.close();
													} else {
														//更新数据
														coll.collection("mail_users").updateOne(
															{
																email: paramsObject.originEmail,
															},
															{
																$set: {
																	email: paramsObject.currentEmail,
																},
															},
															function (err) {
																if (err) {
																	console.log(err);
																} else {
																	let returnArray = {
																		status: false,
																		code: 0,
																		data: [],
																		msg: null,
																	};
																	returnArray.code = 105;
																	returnArray.msg = "邮件地址修改成功";
																	returnArray.status = true;
																	res.json(returnArray);
																	db.close();
																}
															}
														);
													}
												}
											});
									} else {
										console.log("邮件并未订阅");
										let returnArray = {
											status: false,
											code: 0,
											data: [],
											msg: null,
										};
										returnArray.code = 106;
										returnArray.msg = "原邮箱并未订阅";
										returnArray.status = false;
										res.json(returnArray);
										db.close();
									}
								}
							});
					}
				}
			);
		} else {
			returnArray.code = 100;
			returnArray.status = false;
			returnArray.msg = "服务器错误，请联系管理员";
			res.json(returnArray);
		}
	} else {
		returnArray.code = 104;
		returnArray.msg = "邮箱地址不正确";
		returnArray.status = false;
		res.json(returnArray);
	}
});

/* 
    name: 邮箱订阅省份城市修改
    route: /subscribe/mail/edit/info/
    params: email/province/city
*/
app.post("/subscribe/mail/edit/info", function (req, res) {
	res.header(
		"Access-Control-Allow-Origin",
		"https://virus-notificator-vue.onrender.com"
	);
	let returnArray = {
		status: false,
		code: 0,
		data: [],
		msg: null,
	};

	//获取请求参数
	const params = req.body;
	//建立参数对象
	var paramsObject = {
		email: "xxx@xxx.com",
		pro: "四川省",
		city: "成都",
	};
	//电子邮件地址验证
	var emailTest =
		/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/;
	if (emailTest.test(params.email)) {
		//保存参数
		paramsObject.email = params.email;
		paramsObject.pro = params.province;
		paramsObject.city = params.city;

		if (
			global.dataObject.provinces_data[paramsObject.pro.toString()] !==
				undefined &&
			(global.dataObject.cities_data[paramsObject.city.toString()] !==
				undefined ||
				paramsObject.city.toString() == "无城市")
		) {
			if (global.requestStatus) {
				//连接 MongoDB 数据库
				mongo.connect(
					databaseUrl,
					{
						useNewUrlParser: true,
						useUnifiedTopology: true,
					},
					function (err, db) {
						if (err) {
							console.log(err);
							return;
						} else {
							var coll = db.db("notificator");
							//数据查重
							coll
								.collection("mail_users")
								.find({
									email: paramsObject.email,
								})
								.toArray(function (err, result) {
									if (err) {
										console.log(err);
									} else {
										if (result.length) {
											//源邮箱存在记录
											//更新数据
											coll.collection("mail_users").updateOne(
												{
													email: paramsObject.email,
												},
												{
													$set: {
														pro: paramsObject.pro,
														city: paramsObject.city,
													},
												},
												function (err) {
													if (err) {
														console.log(err);
													} else {
														let returnArray = {
															status: false,
															code: 0,
															data: [],
															msg: null,
														};
														returnArray.code = 105;
														returnArray.msg = "数据源修改成功";
														returnArray.status = true;
														res.json(returnArray);
														db.close();
													}
												}
											);
										} else {
											console.log("没有存在邮箱数据");
											let returnArray = {
												status: false,
												code: 0,
												data: [],
												msg: null,
											};
											returnArray.code = 106;
											returnArray.msg = "邮箱并未订阅";
											returnArray.status = false;
											res.json(returnArray);
											db.close();
										}
									}
								});
						}
					}
				);
			} else {
				returnArray.code = 100;
				returnArray.status = false;
				returnArray.msg = "服务器错误，请联系管理员";
				res.json(returnArray);
			}
		} else {
			returnArray.code = 107;
			returnArray.msg = "省份或城市信息错误";
			returnArray.status = false;
			res.json(returnArray);
		}
	} else {
		returnArray.code = 104;
		returnArray.msg = "邮箱地址错误";
		returnArray.status = false;
		res.json(returnArray);
	}
});

/* 订阅判断 Section */
/* 
    name: 判断邮箱是否订阅
    route: /verify/mail/exist/:email
*/
app.get("/verify/mail/exist/:email", function (req, res) {
	res.header(
		"Access-Control-Allow-Origin",
		"https://virus-notificator-vue.onrender.com"
	);
	let returnArray = {
		status: false,
		code: 0,
		data: [],
		msg: null,
	};

	//获取请求参数
	const params = req.params;
	//建立参数对象
	var paramsObject = {
		email: "xxx@xxx.com",
	};
	//电子邮件地址验证
	var emailTest =
		/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/;
	if (emailTest.test(params.email)) {
		//保存参数
		paramsObject.email = params.email;
		//连接 MongoDB 数据库
		mongo.connect(
			databaseUrl,
			{
				useNewUrlParser: true,
				useUnifiedTopology: true,
			},
			function (err, db) {
				if (err) {
					console.log(err);
					return;
				} else {
					var coll = db.db("notificator");
					//数据查重
					coll
						.collection("mail_users")
						.find({
							email: paramsObject.email,
						})
						.toArray(function (err, result) {
							if (err) {
								console.log(err);
							} else {
								if (result.length) {
									//源邮箱存在记录

									let returnArray = {
										status: false,
										code: 0,
										data: {},
										msg: null,
									};
									returnArray.code = 105;
									returnArray.msg = "Subscriber";
									returnArray.status = true;
									returnArray.data = {
										email: result[0]["email"],
										province: result[0]["pro"],
										city: result[0]["city"],
									};
									res.json(returnArray);
									db.close();
								} else {
									console.log("没有存在邮箱数据");
									let returnArray = {
										status: false,
										code: 0,
										data: [],
										msg: null,
									};
									returnArray.code = 106;
									returnArray.msg = "Visitor";
									returnArray.status = false;
									res.json(returnArray);
									db.close();
								}
							}
						});
				}
			}
		);
	} else {
		returnArray.code = 104;
		returnArray.msg = "Email Address is Invalid";
		returnArray.status = false;
		res.json(returnArray);
	}
});
/* 订阅判断 Section */

/* 用户订阅 Section */

/* 服务部署 Section */

/* 定时作业 Section */
function scheduleTasks() {
	schedule.scheduleJob("* /1 * * * *", function () {
		mailFunc();
	});
	schedule.scheduleJob("30 * * * * *", function () {
		consoleMessage("开始请求最新数据", "start");
		request(
			"https://files.snapaper.com/virus",
			function (error, response, data) {
				if (!error && response.statusCode == 200) {
					global.dataObject = JSON.parse(data.toString()); //获取
					global.requestStatus = true;
					console.log("数据请求成功");
					global.feedData = getFeed();
				} else {
					global.requestStatus = false;
					console.log("数据请求失败");
				}
				consoleMessage("结束请求最新数据", "end");
			}
		);
	});
}
scheduleTasks();
/* 定时作业 Section */

app.listen(process.env.PORT || 2333, function () {
	console.log("app is listening at port 2333");
});
/* 服务部署 Section */
