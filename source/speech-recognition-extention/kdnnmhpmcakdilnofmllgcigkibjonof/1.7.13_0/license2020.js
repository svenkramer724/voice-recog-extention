/* 	license2020.js - This is needed because of Chrome Web Store payments deprecation
	mentioned at: https://developer.chrome.com/webstore/cws-payments-deprecation
	So now I have to process license using another service such as Paypal. But to keep
	track of when a user installed the extension I need to have my own createdTime
	variable and therefore I'll have to create a database on my server. I also need
	to use my server to periodically check that their subscription status is ACTIVE.
*/
var product_id = "sra"; // Version 1.4.2
var product_name = chrome.i18n.getMessage("appName"); // Version 1.4.2
var product_description = chrome.i18n.getMessage("shortName"); // Version 1.4.2
if (typeof document === "undefined") // Version 1.7.0
	var document = {}; // Service workers don't have document so to avoid errors add it
var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // Version 1.7.0 - If loaded from Web Store instead of local folder than getManifest has update_url property

function init2020() {
	if (!storage_ready) // Version 1.3.4
	{
		setTimeout(function()
		{
			init2020();
		} , 200);
		return;
	}
	create_license();
	if (check2020()) // Version 1.3.4
		getLicense2020();
}


function create_license() {
	/* Jeff if a user never signs in to Chrome then we need to have free trial expired somehow??
		Make sra.createdTime if it doesn't exist
	*/
	if (test_mode) console.log(sra);
	if (test_mode) console.log(sra.createdTime);
	var licenseStatusText = "FREE TRIAL"; 
	var TRIAL_PERIOD_DAYS = 30; 
	if (!sra.hasOwnProperty('createdTime') || typeof sra.createdTime == 'undefined') { // Version 1.4.1 - Added || typeof sra.createdTime == 'undefined' because Chrome might return no accessLevel and no createdTime
		var createdTime = parseInt(new Date().getTime()); // UNIX timestamp in seconds
		sra.createdTime = createdTime;		
	}
	
	if (typeof sra.license === "undefined" || sra.license.match(/free|none/i)) {
		var daysAgoLicenseIssued = Date.now() - parseInt(sra.createdTime, 10);
		daysAgoLicenseIssued = daysAgoLicenseIssued / 1000 / 60 / 60 / 24;
		if (daysAgoLicenseIssued <= TRIAL_PERIOD_DAYS) {
			var daysLeft = Math.round(TRIAL_PERIOD_DAYS - daysAgoLicenseIssued); // Version 1.0
			licenseStatusText = "FREE TRIAL ("+daysLeft+" days left)";
		} else {
			console.log("Free trial, trial period expired.");
			licenseStatusText = "FREE TRIAL EXPIRED";
		}
		sra.license = licenseStatusText;
		var obj = { "license" : licenseStatusText, "createdTime": sra.createdTime  };
		//save_to_storage(obj); // Version 1.4.3 - shouldn't call this because it may not get saved until after the call to getLicense2020()
	}
	
}


function ajax(url, data, callback) { // Cross browser ajax request
	// To use with JSON object: ajax(url, JSON.stringify(obj), callback);
	try {
		var x = new(this.XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
		x.open(data ? 'POST' : 'GET', url, true); // If data is empty then GET is used. Ex:(url = https://example.com?hi=1)
		x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		x.onreadystatechange = function () {
			if (x.status == 200) {
				if (x.readyState > 3)
				{
					if (callback) callback(x.responseText, x);
				}
			}
			else
				console.log("There is a problem communicating with the server. Status: "+x.status)
		};
		x.send(data);
	} catch (e) {
		window.console && console.log(e);
	}
};


// Version 1.7.0 - Jeff try this ajax_fetch() function in place of ajax()
// since service workers in Manifest V3 do not support XMLHttpRequest but use fetch instead
function ajax_fetch(url, data, callback) {
	var method = (data) ? 'POST' : 'GET'; // If data is empty then GET is used. Ex:(url = https://example.com?hi=1)
	fetch(url, {
			method: method,
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: data,
		}).then(result => result.text()) // Or result.json() to already have it as JSON
		.then(data=>{ callback(data) })
		.catch(function(error) {
			console.log('Request failed', error);
		});
}


function reviver(key, value)
{
	/* This JSON reviver function just changes a string of numbers "656" into a number 656 */
	/* It also works with negative values */
	if (typeof value === 'string') {
		var re = /^[\d,]*$/; // New 3/21/2020 - Remove commas if it is just numbers (digits) and commas
		if (value.match(re))  
			value = value.replace(",", ""); // Remove all commas from number
		if (value == "") value = value // Version 1.4.0 - It was converting "" to 0. Also added else below
		else if (!isNaN(value)) // if ! is Not a Number (NaN)
		{
			// Ok, it is a number so process it
			value = Number(value);
		}	
	}
	return value;
} // end function reviver(key, value)


function ajax_callback(data, x) {
	if (test_mode) console.log(data);
	try {
		var obj = JSON.parse(data, reviver);
		if (test_mode) console.log(obj);
	}
	catch (error) {
		console.log("Ajax response is not JSON. Error: "+error);
		console.log(data);
		return;
	}
	if (obj.hasOwnProperty('status') && obj.status != "") {
		sra.settings.status = obj['status'];
		//if (running_script == "sr") 
		if (document && document.settings_form) // Version 1.7.0
			document.settings_form.status.value = sra.settings.status;
	}
	if (obj.hasOwnProperty('order_id') && obj.order_id != "") {
		sra.settings.order_id = obj['order_id'];
		//if (running_script == "sr") 
		if (document && document.settings_form) // Version 1.7.0
			document.settings_form.order_id.value = sra.settings.order_id;	
	}
	if (obj.hasOwnProperty('createdTime') && obj.createdTime) {
		if (parseInt(obj.createdTime) > sra.createdTime) {
			obj.createdTime = sra.createdTime;
			//if (!obj.license.match(/full/i))
			//	obj.license = sra.license;
		}
	}
	console.log(obj); // { "status": "ACTIVE", "createdTime": "1606324738689", "license": "FREE TRIAL", "kind": "paypal", "order_id": "I-234234234"}
	if (sra.kind && sra["kind"].match(/chromewebstore/i) && sra.license == "FULL") { // Version 1.4.1 - from sra.hasOwnProperty("kind") to sra.kind
		obj.kind = sra.kind; obj.license = sra.license; // Version 1.4.2 - Added obj.kind = sra.kind; 
	}
	if (obj.hasOwnProperty('license')) {
		sra.license = obj.license;
	}
	// save_to_sync(obj); // Save to sync in case they install SRA on new PC // Version 1.4.3 - Removed
	//chrome.storage.sync.set(obj, function() { // Version 1.4.5 - Removing sync because it messes up settings
		obj.settings = sra.settings; // Add status and order_id to settings
		// save_to_storage(obj); Version 1.4.3 - Removed
		chrome.storage.local.set(obj, function() { // Version 1.4.3 - Added , function() instead of setTimeout below // Version 1.4.5 - Accidentally had sync here instead of local
			//if (running_script == "sr") {
			if (typeof setup_forms === "function") { // Version 1.7.0
					setup_forms();
				if (typeof update_title === "function") // Version 1.7.0
					update_title();
			}
			else { // Version 1.4.2b - Tell popup or sr.html to run update_title
				// Send to popup if open (Also sends to background and therefore sr.html)
				chrome.runtime.sendMessage({"update_title": sra.license}, function(response) { 
					if (chrome.runtime.lastError) console.log("To popup: "+chrome.runtime.lastError.message);
					else if (test_mode) console.log(response.farewell);
				});
				// Send to sr.html is open
				/* chrome.tabs.query({url: "chrome-extension://"+chrome.runtime.id+"/*"}, function(tabs) {
					if (test_mode && tabs.length == 0) 
						console.log("No chrome-extension://"+chrome.runtime.id+"/ tabs open");
					for (var i=0; i<tabs.length; ++i)
						chrome.tabs.sendMessage(tabs[i].id, {"update_title": sra.license}, function(response) {
						console.log(response);
				  });
				});*/
			}
		});
	// }); // Version 1.4.5 - Removing sync because it messes up settings
}


function getLicense2020(bit) {
	bit = bit || false; // Version 1.4.2g
	chrome.identity.getProfileUserInfo(null, function(userInfo) {
		console.log(userInfo); // {email: "name@gmail.com", id: "123456789012345678901"}
		// email and id are empty if the user is not signed in or identity.email permission is not set in manifest
		userInfo.order_id = (typeof sra.order_id !== "undefined" && sra.order_id != "") ? sra.order_id : "";
		//if (running_script == "sr" && !bit) // Version 1.4.2g - Added && !bit
		if (document && document.settings_form && !bit) // Version 1.70
			if (document.settings_form.order_id.value != "")
				userInfo.order_id = document.settings_form.order_id.value;
		userInfo.google_id = (userInfo.hasOwnProperty('id')) ? userInfo.id : "";
		if (typeof sra.kind !== "undefined" && sra.kind != "") userInfo.kind = sra.kind; // chromewebstore or paypal_sub
		if (typeof sra.license !== "undefined" && sra.license != "") userInfo.license = sra.license;
		if (typeof sra.createdTime !== "undefined" && sra.createdTime != "") userInfo.createdTime = sra.createdTime;
		if (sra.error) userInfo.error = sra.error; // Version 1.4.3
		userInfo.product_id = product_id; // Version 1.4.2 - Changed from "sra" to product_id
		userInfo.product_name = product_name || ""; // Version 1.4.2
		userInfo.product_description = product_description || ""; // Version 1.4.2
		if (userInfo.email != "" || userInfo.id != "" || userInfo.order_id != "") {
			// Version 1.7.0 - From ajax to ajax_fetch below
			ajax_fetch("https://www.seabreezecomputers.com/speech/license/license.php", JSON.stringify(userInfo), ajax_callback);
		}
		/*if (userInfo.order_id != "") {
			ajax("https://www.seabreezecomputers.com/speech/subscription/paddle.php", JSON.stringify(userInfo), ajax_callback);
		}*/
		else { // If person never signed in to Chrome
			var obj = { "license" : sra.license, "createdTime": sra.createdTime  };
			save_to_storage(obj); // Version 1.4.3 	- Save what we made in create_license
			var status = chrome.i18n.getMessage("signin") || "Sign in to browser or enter Order Number."; // Version 1.4.1
			if (document.settings_form && document.settings_form.status) // Version 1.5.9 - background script was getting Uncaught TypeError: Cannot read properties of undefined (reading 'status')
				document.settings_form.status.value = status; // Version 1.4.1
		}
	});

}

// Version 1.3.4
function check2020() {
	var cd2 = new Date().getTime();
	var ch = true;
	var days = 5; // Version 1.4.0 - Changed from 3 to 5
	
	if (typeof sra.cd2 === "undefined" || typeof sra.cd2 !== "number") { // Version 1.6.12 - Fix cd2 bug from Version 1.6.5 in storage.js by adding || typeof sra.cd2 !== "number"
		sra.cd2 = cd2;
		var obj = { "cd2": sra.cd2 }; 
		//save_to_storage(obj); // Version 1.4.2 - Removed not needed.
		days = 0;
	}
	else if (typeof sra.license === "undefined" || sra.license.match(/free|none/i)) {
		days = 3; 
	}
	
	var date1 = new Date();
	var date2 = new Date(parseInt(sra.cd2));
	var diffTime = Math.abs(date2 - date1);
	var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
	console.log(diffDays);
	if (diffDays >= days) { 
		ch = true;
		var obj = { "cd2": cd2 }; 
		save_to_storage(obj);
	}
	else 
		ch = false;
	
	return ch;
}

//if (running_script == "background") // Version 1.7.0 - Removed because background is a service worker now
if (location.pathname == "/sr.html") // Version 1.7.0 - Going to let sr.html check the license now on open
	setTimeout(function(){ 
		if (typeof getLicense !== 'function' // Version 1.4.2b - If license.js is installed then it will run getLicense2020()
		|| !chrome.runtime.getManifest().oauth2 // Version 1.4.2i - In case I accidentally leave license.js in sr.html for 365 edition		
		|| (window.navigator.userAgent.toLowerCase().indexOf("edg/") > -1)) // Version 1.6.2 - Edge should use init2020() not init()	
			init2020(); 
		else
			init(); // Version 1.4.4b - Run init() from license.js
	}, 3000); // Version 1.4.1 - Added setTimeout because we need license.js to run first to check for chromewebstore full license
//if (running_script == "sr") {
if (document && document.settings_form) { // Version 1.7.0
	document.settings_form.check_order.addEventListener('click', function() { 
		if (document.settings_form.status)
			document.settings_form.status.value = "Checking...";
		if (typeof getLicense !== 'function' // Version 1.4.2b
		|| !chrome.runtime.getManifest().oauth2 // Version 1.4.2i
		|| (window.navigator.userAgent.toLowerCase().indexOf("edg/") > -1)) // Version 1.6.2 - Edge should use init2020() not init() // Version 1.6.3 - Fixed parentheses
		
			getLicense2020(); 
		else
			getLicense(); // Version 1.4.2b - license.js will call getLicense2020()
	}, false);
}

chrome.storage.local.get(null, function(obj) {
	if (obj.error) { // Version 1.4.4b - Moved down here from init2020();
	if (document && document.getElementById && document.getElementById('error')) // Version 1.7.0b - Added document && document.getElementById && 
		document.getElementById('error').innerHTML = "Note: "+ obj.error +
		" <a href = 'https://www.seabreezecomputers.com/speech/support/' target='_blank'>"+
		"See Help</a>";
	}
});

chrome.runtime.onMessage.addListener( function(obj, sender, sendResponse) { // Version 1.4.4b
	if (test_mode) console.log(JSON.stringify(obj));	
			
	if (obj.hasOwnProperty("getLicense")) {
		//if (location.pathname == "/_generated_background_page.html") // Only let background script run this not sr.js
		//if (location.pathname.match(/background/i)) // Version 1.7.0 - Service worker displays the filename like /background.js
		//	getLicense2020(obj["getLicense"]); // obj["getLicense"] has order_id in it Version 1.7.0 - Now in background.js
	}
	if (obj.hasOwnProperty("update_title")) // Version 1.4.4b
	{
		console.log("yipee");
		if (typeof setup_forms === "function") setup_forms();
		if (typeof update_title === "function") update_title();
	}
	sendResponse({farewell: "From license2020: I got the object."});	
});