// autootp_regist.js

var RegistrationCompleted = $("#RegistrationCompleted").val();
var HomeURLIsNotRegistered = $("#HomeURLIsNotRegistered").val();
var PleaseTryAgainLater = $("#PleaseTryAgainLater").val();
var AutoOTPQRExpired = $("#AutoOTPQRExpired").val();
var AreYouSureYouWantToUnregisterAutoOTP = $("#AreYouSureYouWantToUnregisterAutoOTP").val();
var RegistrationHasBeenCanceled = $("#RegistrationHasBeenCanceled").val();

var link = $("#link").val();
if(link === undefined || link == null)				link = "";

var websocket_status = 0;  // 0:disconnected, 1:connected

var gapMinute = 0;
var check_millisec = 0;
var expirationInMinutes = 0;

var strGapMinute = $("#gapMinute").val();
var strExpirationInMinutes = $("#expirationInMinutes").val();

if(strGapMinute !== undefined && strGapMinute != null && strGapMinute != "")
	gapMinute = parseInt(strGapMinute.replace(/,/g , ''));
if(strExpirationInMinutes !== undefined && strExpirationInMinutes != null && strExpirationInMinutes != "")
	expirationInMinutes = parseInt(strExpirationInMinutes.replace(/,/g , ''));

var username = $("#username").val();
var authDomain = $("#authDomain").val();
var baseUrl = $("#baseUrl").val();
var movehome = $("#movehome").val();

var clientId = $("#clientId").val();
var clientClientId = $("#clientClientId").val();

if(username === undefined || username == null)				username = "";
if(authDomain === undefined || authDomain == null)			authDomain = "";
if(baseUrl === undefined || baseUrl == null)				baseUrl = "";
if(baseUrl == "")
	baseUrl = "javascript:alert('" + HomeURLIsNotRegistered + "');";
if(movehome === undefined || movehome == null)				movehome = "";

if(clientId === undefined || clientId == null)				clientId = "";
if(clientClientId === undefined || clientClientId == null)	clientClientId = "";

var autootp_terms = 0;
var autootp_millisec = 0;
var timeoutId1 = null;
var timeoutId2 = null;
var pushConnectorUrl = "";
var pushConnectorToken = "";

function AutoOTPRegist() {
	if(gapMinute > expirationInMinutes) {
		$("#autootp_expiration").css("display", "block");
	}
	else if(username == "") {
		$("#userinfo_empty").css("display", "block");
	}
	else {
		$("#autootp_content").css("display", "block");
		AutoOtpManageRestAPI();
	}
}

function verifyEmail() {
	location.href = link;
}

function AutoOtpManageRestAPI() {
	var isReg = checkAutoOTPReg("");
	if(isReg == "T") {
		$("#autootp_content").css("height", "200px");
		$("#cancel_qr").css("display", "block");
		$("#verify_email").css("display", "none");
		if(movehome == "F") {
			$("#verify_email").css("display", "block");
		}
	}
	else {
		$("#reg_qr").css("display", "block");
		loginAutoOTPJoinStart();
	}
}

// Check user regstered
function checkAutoOTPReg(QRReg) {
	var ret_val = "";
	var data = {
		url: "isApUrl",
		params: "userId=" + username + "&QRReg=" + QRReg
	}
	
	var result = callApi(data);
	jsonResult = JSON.parse(result);
	var exist = false;

	var code = jsonResult.code;
	if(code == "000" || code == "000.0")
		exist = jsonResult.data.exist;
	
	if(exist)	ret_val = "T";
	else		ret_val = "F";
	
	return ret_val;
}

function moveHome() {
	location.href = baseUrl;
}

// Request unregister
function loginAutoOTPwithdrawal() {
	if(confirm(AreYouSureYouWantToUnregisterAutoOTP)) {
		var data = {
			url: "withdrawalApUrl",
			params: "userId=" + username + "&clientId=" + clientId + "&clientClientId=" + clientClientId
		}
		
		var result = callApi(data);
		jsonResult = JSON.parse(result);
		
		var code = jsonResult.code;
		if(code == "000" || code == "000.0") {
			alert(RegistrationHasBeenCanceled);
			
			if(link == "" || movehome == "T")
				moveHome();
			else
				location.href = link;
		}
		else {
			alert(PleaseTryAgainLater);
			moveHome();
		}
	}
}

// Request register
function loginAutoOTPJoinStart() {
	var data = {
		url: "joinApUrl",
		params: "userId=" + username + "&name=&email=" + "&clientId=" + clientId + "&clientClientId=" + clientClientId
	}
	
	var result = callApi(data);
	jsonResult = JSON.parse(result);
	
	var code = jsonResult.code;
	if(code == "000" || code == "000.0") {
		var data = jsonResult.data;
		var qr = data.qr;
		var corpId = data.corpId;
		var registerKey = data.registerKey;
		var terms = data.terms;
		var serverUrl = data.serverUrl;
		var userId = data.userId;
		
		pushConnectorUrl = data.pushConnectorUrl;
		pushConnectorToken = data.pushConnectorToken;
		
		$("#qr").prop("src", qr);
		$("#server_url").html(serverUrl);
		$("#corp_id").html(corpId);
		$("#user_id").html(userId);
		
		var today = new Date();
		autootp_millisec = today.getTime();
		check_millisec = today.getTime();
		autootp_terms = parseInt(terms - 1);
		
		qrSocket = null;
		connWebSocket();
		drawAutoOTP();
	}
	else {
		alert(PleaseTryAgainLater);
		moveHome();
	}
}

function drawAutoOTP() {
	var today = new Date();
	var now_millisec = today.getTime();
	var gap_second = Math.ceil((now_millisec - autootp_millisec) / 1000);
	
	if(gap_second < autootp_terms) {
	
		var tmp_min = parseInt((autootp_terms - gap_second) / 60);
		var tmp_sec = parseInt((autootp_terms - gap_second) % 60);
		
		if(tmp_sec < 10)
			tmp_sec = "0" + tmp_sec;
			
		$("#rest_time").html(tmp_min + " : " + tmp_sec);
		
		if(websocket_status == 0) {
			if(now_millisec - check_millisec > 1500) {
				check_millisec = now_millisec;
				regAutoOTPResult();
			}
		}
		
		timeoutId2 = setTimeout(drawAutoOTP, 100);
	}
	else {
		clearTimeout(timeoutId1);
		clearTimeout(timeoutId2);
		
		$("#rest_time").html("0 : 00");
		
		setTimeout(() => alert(AutoOTPQRExpired), 100);
		setTimeout(() => moveHome(), 200);
	}
}

// Check existing user
function regAutoOTPResult() {
	var today = new Date();
	var now_millisec = today.getTime();
	var gap_millisec = now_millisec - autootp_millisec;
	var isReg = checkAutoOTPReg("T");
	
	if(isReg == "T") {
		clearTimeout(timeoutId1);
		clearTimeout(timeoutId2);
		
		alert(RegistrationCompleted);
		
		if(link == "" || movehome == "T")
			moveHome();
		else
			location.href = link;
	}
}

function callApi(data) {
	var api_url = "/auth/realms/" + $("#realmName").val() + "/protocol/openid-connect/autootp";
	var ret_val = "";
	
	$.ajax({
		url: api_url,
		method: 'POST',
		dataType: 'json',
		data: data,
		async: false,
		success: function(data) {
			ret_val = data.result;
		},
		error: function(xhr, status, error) {
			alert(NoResultsWereFound);
		},
		complete: function(data) {
		}
	});
	
	return ret_val;
}

//-------------------------------------------------- WebSocket -------------------------------------------------

/*
	- WebSocket readyState
	  0 CONNECTING
	  1 OPEN
	  2 CLOSING
	  3 CLOSED
*/

var socketConn = null;
var socketResult = null;

function websocketConnect() {
	websocket_status = 1;
}

function websocketClose() {
	websocket_status = 0;
	
	if(socketConn != null)
		socketConn.close();
}

function connWebSocket() {

	socketConn = new WebSocket(pushConnectorUrl);

	socketConn.onopen = function(e) {
		console.log("######## WebSocket Connected ########");
		var send_msg = '{"type":"hand","pushConnectorToken":"' + pushConnectorToken + '"}';
		console.log("url [" + pushConnectorUrl + "]");
		console.log("send [" + send_msg + "]");
		socketConn.send(send_msg);

		websocketConnect();
	}

	socketConn.onmessage = async function (event) {
		console.log("######## WebSocket Data received [" + socketConn.readyState + "] ########");
		
		try {
			if (event !== null && event !== undefined) {
				socketResult = await JSON.parse(event.data);
				console.log("result [" + event.data + "]");
				if(socketResult.type == "result") {
					regAutoOTPResult();
				}
			}
		} catch (err) {
			console.log(err);
		}
	}

	socketConn.conclose = function(event) {
		if(event.wasClean)
			console.log("######## WebSocket Disconnected - OK !!! [" + socketConn.readyState + "] ########");
		else
			console.log("######## WebSocket Disconnected - Error !!! [" + socketConn.readyState + "] ########");

		console.log("=================================================");
		console.log(event);
		console.log("=================================================");

		websocketClose();
	}

	socketConn.onerror = function(error) {
		console.log("######## WebSocket Error !!! [" + socketConn.readyState + "] ########");
		console.log("=================================================");
		console.log(error);
		console.log("=================================================");

		$("#login_mobile_check").show();
		$("#reg_mobile_check").show();

		websocketClose();
	}
}
