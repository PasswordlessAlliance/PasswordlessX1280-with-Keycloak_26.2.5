var AutoOTPSignIn = $("#AutoOTPSignIn").val();
var HomeURLnotRegistered = $("#HomeURLnotRegistered").val();
var AutoOTPEmailSent = $("#AutoOTPEmailSent").val();
var doTryAgain = $("#doTryAgain").val();
var FailedUnregister = $("#FailedUnregister").val();
var AutoOTPQRExpired = $("#AutoOTPQRExpired").val();
var RegistrationCompleted = $("#RegistrationCompleted").val();
var UnregistratedCompleted = $("#UnregistratedCompleted").val();
var AutoOTPAccountStopped = $("#AutoOTPAccountStopped").val();
var ContactYourAccountManager = $("#ContactYourAccountManager").val();
var ThisAccountNotRegistered = $("#ThisAccountNotRegistered").val();
var YourAutoOTPAccountNotRegistered = $("#YourAutoOTPAccountNotRegistered").val();
var RegisterAutoOTPAccountFirst = $("#RegisterAutoOTPAccountFirst").val();
var CancelAutoOTPSignIn = $("#CancelAutoOTPSignIn").val();
var AuthenticationDenied = $("#AuthenticationDenied").val();
var AreYouSureYouWantToUnregisterAutoOTP = $("#AreYouSureYouWantToUnregisterAutoOTP").val();
var SendAutootpSettingEmail = $("#SendAutootpSettingEmail").val();

// AutoOTP accept wait time (seconds)
MaxTime = 60
var autootp_2step_login = false;
var login_url = "";
var websocket_status = 0;  // 0:disconnected, 1:connected
var checkType = "";

var base_url = $("#base_url").val();
if(base_url !== undefined && base_url != null && base_url != "") {
	var len = base_url.length;
	if(base_url.substr(len-1, len) != "/" && base_url.substr(len-1, len) != "\\")
		base_url += "/";
}
else {
	base_url = "javascript:alert('" + HomeURLnotRegistered + "');";
}

var submit_url = $("#submit_url").val();
if(submit_url === undefined || submit_url == null)				submit_url = "";

var page_set = $("#page_set").val();
if(page_set === undefined || page_set == null)					page_set = "";

var login_step = $("#login_step").val();
var browser_flow_id = $("#browser_flow_id").val();

if(login_step === undefined || login_step == null)				login_step = "";
if(browser_flow_id === undefined || browser_flow_id == null)	browser_flow_id = "";

if(browser_flow_id.toUpperCase().indexOf("AUTOOTP") > -1 || browser_flow_id.toUpperCase().indexOf("PASSWORDLESS") > -1)
	$("#login_flow").val("AUTOOTP");

var login_flow = $("#login_flow").val();
if(login_flow === undefined || login_flow == null)				login_flow = "";

var autootp_millisec = 0;
var check_millisec = 0;
var autootp_term = 0;
var servicePassword = "";
var pushConnectorUrl = "";
var pushConnectorToken = "";
var sessionId = "";
var autootp_1step_pass = false;

var timeoutId1 = null;
var timeoutId2 = null;

$('form[name=kc-form-login]').submit(function(e) {
	var autootp_conf = window.localStorage.getItem('conf_autootp');
	if(autootp_conf === undefined || autootp_conf == null)
		autootp_conf = "";

	if(page_set != "login" || login_flow != "AUTOOTP" || login_step != "1step" || autootp_1step_pass == true || autootp_conf == "proc") {
		var form = $("#kc-form-login");
		form.attr("action", submit_url);
		$("#kc-login").attr("disabled", true);
		return true;
	}
	else {
		return false;
	}
});

function loginOk() {
	
	var username = $("#hidden_username").val();		// autootp-wait.ftl
	if(username === undefined || username == null)	username = "";
	
	var submit_url = $("#submit_url").val();
	if(submit_url === undefined || submit_url == null)
		submit_url = "";
	
	var autootp_conf = window.localStorage.getItem('conf_autootp');
	if(autootp_conf === undefined || autootp_conf == null)
		autootp_conf = "";
		
	var autootp_info = $("#autootp_info").val();
	if(autootp_info === undefined || autootp_info == null)
		autootp_info = "";

	// 1-factor
	if(login_flow == "AUTOOTP" && login_step == "1step") {
		if(page_set == "autootp") {
			var form = $("#frm");
			form.attr("method", "POST");
			form.attr("action", submit_url);
			form.submit();
			//form.empty();
		}
		else {
			window.localStorage.setItem('info_autootp', autootp_info);
			autootp_1step_pass = true;
			var form = $("#kc-form-login");
			form.attr("action", submit_url);
			form.submit();
			//form.empty();
		}
	}
	// 2-factor
	else if(page_set == "autootp" && login_flow == "AUTOOTP" && login_step == "2step" && username != "") {
		var form = $("#frm");
		form.attr("method", "POST");
		form.attr("action", submit_url);
		form.submit();
		//form.empty();
	}
}

function parseParams() {
	var tmp_login_url = window.localStorage.getItem('login_url');
	var urlParams = new URL(location.href).searchParams;
	
	if(tmp_login_url === undefined || tmp_login_url == null || tmp_login_url == "") {
		var redirect_uri = urlParams.get('redirect_uri');
		console.log("redirect_uri [" + redirect_uri + "]");
		
		if(redirect_uri != null && redirect_uri != "") {
			login_url = redirect_uri;
			window.localStorage.setItem('login_url', redirect_uri);
		}
	}
	else {
		login_url = tmp_login_url;
		window.localStorage.removeItem('login_url');
	}
	
	if(login_url == "")
		login_url = base_url;
}

function AutoOtpLoginRestAPI() {
	
	checkType = "LOGIN";
	
	parseParams();

	// Preset for AutoOTP Login & Configuration
	autootp_2step_login = false;
	
	var login_username = $("#username").val();		// login.ftl
	var username = $("#hidden_username").val();		// autootp-wait.ftl
	
	if(login_username === undefined || login_username == null)	login_username = "";
	if(username === undefined || username == null)				username = "";

	var autootp_conf = window.localStorage.getItem('conf_autootp');
	if(autootp_conf === undefined || autootp_conf == null)
		autootp_conf = "";
	window.localStorage.removeItem('conf_autootp');

	// 1-factor AutoOTP Auth
	if(login_flow == "AUTOOTP" && login_step == "1step") {
		if(username != "") {
			
			var tmp_autootp_info = $("#autootp_info").val();
			var autootp_info = window.localStorage.getItem('info_autootp');
			if(autootp_info !== undefined && autootp_info != null && autootp_info != "") {
				$("#autootp_info").val(autootp_info);
				window.localStorage.removeItem('info_autootp');
			}
			else {
				autootp_info = $("#autootp_info").val();
				if(autootp_info === undefined || autootp_info == null)
					autootp_info = "";
			}

			if(autootp_conf == "proc") {
				$("#txt_autootp_email").css("display", "block");
				setTimeout(() => sendAutoOTPRegEmail("F"), 100);
				setTimeout(() => $("#txt_autootp_email").html(AutoOTPEmailSent + "<br>&nbsp;"), 200);
			}
			else {
				if(autootp_info != ""){
					$("#loading").css("display", "block");
					loginOk();
				}
				else {
					moveBack();
				}
			}
		}
		else {
			window.localStorage.removeItem('info_autootp');
			$("#login_password").css("display", "none");
			$("#login_autootp").css("display", "block");
			$("#move_home_btn").css("display", "block");
			$("#link_autootp_email").css("display", "block");
		}
	}
	// 2-factor AutoOTP Auth
	else if(login_flow == "AUTOOTP" && login_step == "2step") {
		if(username == "") {
			$("#login_autootp").css("display", "none");
			$("#move_home_btn").css("display", "block");
		}
		else {
			$("#kc-form-wrapper").css("display", "block");
			$("#link_autootp_email").css("display", "block");
			var isReg = checkAutoOTPReg();
			//console.log("isReg = " + isReg);
			
			if(isReg == "T") {
				var token = getTokenForOneTime();
				
				if(token != "")
					loginAutoOTPStart(token);
			}
			else {
				LoginCancel("F");
				//console.log("Unregistered user");
				alert(YourAutoOTPAccountNotRegistered + "\n" + RegisterAutoOTPAccountFirst);
			}
		}
	}
	else {
		$("#kc-form-wrapper").css("display", "block");
		$("#login_autootp").css("display", "none");
	}
}

// 1-Factor
function loginAutoOTPconfigure() {
	sessionId = window.localStorage.getItem('session_id');
	if(sessionId !== undefined && sessionId != null && sessionId != "") {
		//console.log("loginAutoOTPconfigure --> sessionId [" + sessionId + "]");
		LoginCancel('T');
	}
	
	window.localStorage.removeItem('session_id');
	window.localStorage.setItem('conf_autootp', 'proc');
	
	$("#login_password").css("display", "block");
	$("#cancel_config_autootp").css("display", "block");
	$("#login_autootp").css("display", "none");
	$("#sign_section").css("display", "none");
	
	$("#kc-login").val(SendAutootpSettingEmail);
	$("#autootp_login_btn").val(AutoOTPSignIn);
	$("#password").val("");
}

// 1-Factor
function cancelLoginAutoOTPconfigure() {
	window.localStorage.removeItem('conf_autootp');
	moveBack();
}

// 1-Factor
function AutoOTPLogin() {
	checkType = "LOGIN";
	
	$("#autootp_login_btn").blur();
	sessionId = window.localStorage.getItem('session_id');

	if(sessionId !== undefined && sessionId != null && sessionId != "") {
		LoginCancel('T');
		window.localStorage.removeItem('session_id');
		$("#autootp_login_btn").val(AutoOTPSignIn);
		$("#autootp_num").html("--- ---");
	}
	else {
		var isReg = checkAutoOTPReg();
		//console.log("isReg = " + isReg);
		
		if(isReg == "T") {
			var token = getTokenForOneTime();
			var str_btn = CancelAutoOTPSignIn;
			$("#autootp_login_btn").val(str_btn);
			
			if(token != "")
				loginAutoOTPStart(token);
		}
		else {
			alert(ThisAccountNotRegistered + "\n" + RegisterAutoOTPAccountFirst);
		}
	}
}

// Check ID exists
function checkAutoOTPReg() {
	//console.log("----- checkAutoOTPReg() -----");
	
	var ret_val = "";
	var userId = $("#username").val();
	var data = {
		url: "isApUrl",
		params: "userId=" + userId
	}

	var result = callApi(data);
	var jsonResult = JSON.parse(result.result);
	var exist = false;

	var code = jsonResult.code;
	if(code == "000" || code == "000.0")
		exist = jsonResult.data.exist;
	
	if(exist)	ret_val = "T";
	else		ret_val = "F";
	
	return ret_val;
}

// Request onetime token
function getTokenForOneTime() {
	//console.log("----- getTokenForOneTime() -----");

	var ret_val = "";
	var userId = $("#username").val();
	var data = {
		url: "getTokenForOneTimeUrl",
		params: ""
	}
	
	var result = callApi(data);
	var jsonResult = JSON.parse(result.result);
	oneTimeToken = result.oneTimeToken;
	
	var code = jsonResult.code;
	if(code == "000" || code == "000.0") {
		ret_val = oneTimeToken;
		//console.log("oneTimeToken = " + ret_val);
	}

	return ret_val;
}

// Request service password
function loginAutoOTPStart(token) {
	//console.log("----- loginAutoOTPStart() -----");
	
	var userId = $("#username").val();
	var data = {
		url: "getSpUrl",
		params: "userId=" + userId + "&token=" + token
	}
	
	var result = callApi(data);
	var jsonResult = JSON.parse(result.result);
	
	var code = jsonResult.code;

	if(code == "000" || code == "000.0") {
		term = jsonResult.data.term;
		servicePassword = jsonResult.data.servicePassword;
		pushConnectorUrl = jsonResult.data.pushConnectorUrl;
		pushConnectorToken = jsonResult.data.pushConnectorToken;
		sessionId = result.sessionId;
		
		window.localStorage.setItem('session_id', sessionId);
		//console.log("### set sessionId = " + sessionId);
		
		var today = new Date();
		autootp_millisec = today.getTime();
		check_millisec = today.getTime();
		autootp_term = parseInt(term - 1);
		//console.log("term=" + term + ", servicePassword=" + servicePassword);
		
		connWebSocket();
		drawAutoOTP();
	}
	else if(code == "200.6") {
		sessionId = window.localStorage.getItem('session_id');
		//console.log("### get sessionId = " + sessionId);
		//console.log("Already request authentication --> send [cancel], sessionId=" + sessionId);
		
		if(sessionId !== undefined && sessionId != null && sessionId != "") {
			var userId = $("#username").val();
			var data = {
				url: "cancelUrl",
				params: "sessionId=" + sessionId
			}
			
			var result = callApi(data);
			jsonResult = JSON.parse(result.result);
			
			var code = jsonResult.code;
		
			if(code == "000" || code == "000.0") {
				window.localStorage.removeItem('session_id');
				setTimeout(() => loginAutoOTPStart(token), 500);
			}
			else {
				alert(doTryAgain);
				moveBack();
			}
		}
		else {
			alert(doTryAgain);
			moveBack();
		}
	}
	else if(code == "200.7") {
		alert(AutoOTPAccountStopped + "\n" + ContactYourAccountManager);
	}
}

// Request accept result
function loginAutoOTPResult() {
	//console.log("----- loginAutoOTPResult() -----");
	
	var userId = $("#username").val();
	var data = {
		url: "resultUrl",
		params: "userId=" + userId + "&sessionId=" + sessionId
	}
	
	var result = callApi(data);
	var jsonResult = JSON.parse(result.result);
	var autootpInfo = result.autootpInfo;
	
	$("#autootp_info").val(autootpInfo);
	
	var code = jsonResult.code;
	var auth = jsonResult.data.auth;
	
	if(code == "000" || code == "000.0") {
		
		if(auth == "Y") {
			clearTimeout(timeoutId1);
			clearTimeout(timeoutId2);
			window.localStorage.removeItem('session_id');
			//console.log("STOP ---> AutoOTP confirmed !!!");
			
			loginOk();
		}
		else if(auth == "N") {
			LoginCancel("F");
			clearTimeout(timeoutId1);
			clearTimeout(timeoutId2);
			window.localStorage.removeItem('session_id');
			//console.log("STOP ---> AutoOTP canceled !!!");
			
			alert(AuthenticationDenied);
			moveBack();
		}
	}
}

function drawAutoOTP() {
	var today = new Date();
	var now_millisec = today.getTime();
	var gap_millisec = now_millisec - autootp_millisec;
	
	var ratio = 100 - (gap_millisec / autootp_term / 1000) * 100 - 1;
	//console.log("ratio=" + ratio);
	
	if(ratio > 0) {
		var tmpPassword = servicePassword;
		if(tmpPassword.length == 6)
			tmpPassword = tmpPassword.substr(0, 3) + " " + tmpPassword.substr(3, 6);
		
		$("#autootp_bar").css("width", ratio + "%");
		$("#autootp_num").text(tmpPassword);

		if(websocket_status == 0) {
			if(now_millisec - check_millisec > 1500) {
				check_millisec = now_millisec;
				loginAutoOTPResult();
			}
		}
		
		timeoutId2 = setTimeout(drawAutoOTP, 100);
	}
	else {
		clearTimeout(timeoutId1);
		clearTimeout(timeoutId2);
		
		CancelLogin();
	}
}

function CancelLogin() {
	websocketClose();
	
	if(login_step == "2step" && autootp_2step_login) {
		// login after sending email
		$("#kc-login").val("Cancel Login");
		$("#kc-login").blur();
		AutoOtpLoginRestAPI();
		autootp_2step_login = false;
	}
	else {
		LoginCancel('T');
		window.localStorage.removeItem('session_id');
		moveBack();
	}
}

function LoginCancel(sendCancel) {
	
	//console.log("----- LoginCancel [" + sendCancel + "] -----");
	
	clearTimeout(timeoutId1);
	clearTimeout(timeoutId2);
	
	$("#autootp_bar").css("width", "100%");
	$("#autootp_num").text("--- ---");
	
	if(sendCancel == "T") {
		var userId = $("#userId").val();
		var data = {
			url: "cancelUrl",
			params: "sessionId=" + sessionId
		}
		
		var result = callApi(data);
	}
}

function callApi(data) {

	var api_url = "/auth/realms/" + $("#login_realm").val() + "/protocol/openid-connect/autootp";
	var ret_val = "";
	
	//console.log("---------- data -----------");
	//console.log(data);
	
	$.ajax({
		url: api_url,
		method: 'POST',
		dataType: 'json',
		data: data,
		async: false,
		success: function(data) {
			//console.log("[SUCCESS]");
			//console.log(data);
			
			ret_val = data;
		},
		error: function(xhr, status, error) {
			//console.log("[ERROR] code: " + xhr.status + ", message: " + xhr.responseText + ", status: " + status + ", ERROR: " + error);
			$("#search_result").html("검색결과가 없습니다.");
		},
		complete: function(data) {
			//console.log("[COMPLETE]");
		}
	});
	
	return ret_val;
}

function moveBack() {
	//history.back();
	//location.href = "http://localhost/myshop";
	location.href = login_url;
}

function moveHome() {
	sessionId = window.localStorage.getItem('session_id');
	if(sessionId !== undefined && sessionId != null && sessionId != "") {
		//console.log("loginAutoOTPconfigure --> sessionId [" + sessionId + "]");
		LoginCancel('T');
	}
	
	window.localStorage.removeItem('session_id');
	
	//history.back();
	//location.href = "http://localhost";
	location.href = base_url;
}

// -------------------------------------------------- AutoOTP Registration -------------------------------------------------

function regAutoOTP() {
	$("#autoOtpLogin").css("display", "none");
	$("#send_email").css("display", "block");
}

function regAutoOTPRepeat() {
	
	//console.log("----- regAutoOTPRepeat() -----");
	
	var today = new Date();
	var now_millisec = today.getTime();
	var gap_millisec = now_millisec - autootp_millisec;
	
	if(gap_millisec < autootp_term * 1000) {
		
		var isReg = checkAutoOTPReg();
		//console.log("isReg = " + isReg);
		
		if(isReg == "T") {
			clearTimeout(timeoutId1);
			clearTimeout(timeoutId2);
			
			alert(RegistrationCompleted);
			
			moveBack();
		}
		else {
			timeoutId1 = setTimeout(regAutoOTPRepeat, 1500);
		}
	}
}

function drawAutoOTPReg() {
	var today = new Date();
	var gap_second = Math.ceil((today.getTime() - autootp_millisec) / 1000);
	
	if(gap_second < autootp_term) {
	
		var tmp_min = parseInt((autootp_term - gap_second) / 60);
		var tmp_sec = parseInt((autootp_term - gap_second) % 60);
		
		if(tmp_min == 0 && tmp_sec == 1)
			tmp_sec = "00";
		else if(tmp_sec < 10)
			tmp_sec = "0" + tmp_sec;
			
		$("#rest_time").html(tmp_min + " : " + tmp_sec);
		
		if(websocket_status == 0)
			regAutoOTPRepeat();
		
		timeoutId2 = setTimeout(drawAutoOTPReg, 100);
	}
	else {
		clearTimeout(timeoutId1);
		clearTimeout(timeoutId2);
		
		$("#rest_time").html("0 : 00");
		
		setTimeout(() => alert(AutoOTPQRExpired), 100);
		setTimeout(() => moveBack(), 200);
	}
}

function regPasswordlessOK() {
	var isReg = checkAutoOTPReg();
	//console.log("isReg = " + isReg);
		
	if(isReg == "T") {
		clearTimeout(timeoutId1);
		clearTimeout(timeoutId2);
		
		alert(RegistrationCompleted);
		
		moveBack();
	}
}

// -------------------------------------------------- AutoOTP Unregistration -------------------------------------------------

// 1-factor
function withdrawAutoOTP() {
	$("#autoOtpLogin").css("display", "none");
	$("#kc-form-buttons").css("display", "none");
	$("#config").css("display", "block");
}

// 1-factor
function cancelWithdrawAutoOTP() {
	moveBack();
}

// 2-factor
function loginAutoOTPwithdrawal(loginFlag) {
	//console.log("----- loginAutoOTPwithdrawal() -----");
	
	if(loginFlag == "T")
		LoginCancel('T');
	
	if(confirm(AreYouSureYouWantToUnregisterAutoOTP)) {
		
		window.localStorage.removeItem('session_id');
		var username = $("#hidden_username").val();
		
		var data = {
			url: "withdrawalApUrl",
			params: "userId=" + username
		}
		
		var result = callApi(data);
		//console.log(result);
		var jsonResult = JSON.parse(result.result);
		
		var code = jsonResult.code;
		if(code == "000" || code == "000.0") {
			alert(UnregistratedCompleted);
			moveBack();
		}
		else {
			alert(FailedUnregister + "\n" + doTryAgain);
			moveBack();
		}
	}
	else {
		if(loginFlag == "T")
			AutoOtpLoginRestAPI();
	}
}

// -------------------------------------------------- AutoOTP Email -------------------------------------------------

// AutoOTP reg/unreg Email (T:Show mail-sending button, F:mail-sending completed)
function sendAutoOTPRegEmail(flag) {
	//console.log("----- sendAutoOTPRegEmail() -----");
	
	if(login_step == "2step" && flag == "T") {
		LoginCancel("T");
		$("#autoOtpLogin").css("display", "none");
		$("#link_autootp_email").css("display", "none");
	}

	var userId = $("#username").val();
	var login_clientId = $("#login_clientId").val();
	var data = {
		url: "sendEmail",
		params: "userId=" + userId + "&clientId=" + login_clientId + "&base_url=" + base_url
	}
	
	if(login_step == "1step" || flag == "F") {
		var result = JSON.stringify(callApi(data));
		//console.log(result);
		var jsonResult = JSON.parse(result);
		var msg = jsonResult.result.msg;
		var code = jsonResult.result.code;
		//console.log("msg=" + msg + ", code=" + code);
		
		if(code == "000")
			setTimeout(() => $("#txt_autootp_email").html(AutoOTPEmailSent + "<br>&nbsp;"), 300);
		else
			setTimeout(() => $("#txt_autootp_email").html("[" + code + "] " + msg + "<br>&nbsp;"), 300);
	}
	else if(login_step == "2step") {
		$("#txt_autootp_email").css("display", "block");
		setTimeout(() => sendAutoOTPRegEmail("F"), 100);
	}
}

// -------------------------------------------------- WebSocket -------------------------------------------------

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
					if(checkType == "LOGIN")
						loginAutoOTPResult();
					else if(checkType == "QR")
						regPasswordlessOK();
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
