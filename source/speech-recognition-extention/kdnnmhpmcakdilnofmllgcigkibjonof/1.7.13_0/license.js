/* Jeff Note: chrome.identity only works in background scripts.
    	Also need "permissions": ["identity"] in manifest.json 
  
  This is also crazy.  You also need the to put key: in manifest.json
  which you can get from Developer dashboard and "More Info" on the right
  of your app or, going to the folder of your packaged app when you install
  it from the web store and look at manifest.json. 
  See: https://developer.chrome.com/apps/app_identity 
  https://developer.chrome.com/webstore/one_time_payments#update-manifest
  If you haven't already, enable the Chrome Web Store API in the Google APIs Console at
	https://console.developers.google.com/cloud-resource-manager
	1. Create Project then click on Menu on top left and choose API's and Services > Library.
	-> Search for -> Chrome Web Store API -> Enable -> Create Credentials.
	It will give you an API Key.
	2. Click on Credentials -> Create Oauth Client ID -> Chrome App -> Name it -> Done.
	It will give you a Client-id to put in manifest.json
	3. Click on Oauth Consent Screen -> Add Scope -> Chrome Web Store APIs
	If "Chrome Web Store API" is not listed as a Scope then click on "manually paste" link at the bottom
	and paste in: https://www.googleapis.com/auth/chromewebstore and click "Add". I swear that I tried
	this and it didn't work until I received an email from Developer support. Then it worked. Don't add an
	icon or a domain or you will have to "Verify with Google" which will take 3 weeks.
	Can't do step 3 anymore without verifying your website on the consent screen which takes 6 weeks?!?!
	https://support.google.com/chrome_webstore/contact/developer_support <-- Contact Chrome Web Store Developer Support
	4. Click on Oauth Consent Screen -> Publish App.
	5. Note a user can revoke their Oauth permissions to an extension at:
	https://myaccount.google.com/permissions
    	
*/
var CWS_LICENSE_API_URL = 'https://www.googleapis.com/chromewebstore/v1.1/userlicenses/';
var TRIAL_PERIOD_DAYS = 30; // Version 1.0 - Was 180 
var statusDiv;

function init() {
	if (!storage_ready) // Version 1.3.4
	{
		setTimeout(function()
		{
			init();
		} , 200);
		return;
	}
	statusDiv = document.getElementById('sr_msg');
	if (check()) // Version 1.3.4
		getLicense();
}

/*****************************************************************************
* Call to license server to request the license
*****************************************************************************/

function getLicense() {
  xhrWithAuth('GET', CWS_LICENSE_API_URL + chrome.runtime.id, true, onLicenseFetched);
}

function onLicenseFetched(error, status, response) {
  console.log(error, status, response);
  //statusDiv.text("Parsing license...");
  if (error && error.message) {
	  console.log(error.message); // Version 1.4.2b "The user did not approve access." or "OAuth2 not granted or revoked." or "The user turned off browser signin"
	  sra.error = error.message; // Version 1.4.3
	  /* if (location.pathname == "/_generated_background_page.html")  // Version 1.4.3 // Version 1.4.4b - Removed if
			init2020(); // Version 1.4.2b - So go ahead and run license2020.js
		else */
		if (document.getElementById('error')) // Version 1.4.4b
			document.getElementById('error').innerHTML = "Note: "+sra.error +
			" <a href = 'https://www.seabreezecomputers.com/speech/support/' target='_blank'>"+
			"See Help</a>";
		chrome.storage.local.set({"error":sra.error}, function() { 	// Version 1.4.4b
			getLicense2020(); // Version 1.4.3
		});
			
	return; // Version 1.4.3
  }
  if (status === 200) {
	sra.error = ""; // Version 1.4.4
	if (document.getElementById('error')) // Version 1.4.4b
		document.getElementById('error').innerHTML = "";
			
    response = JSON.parse(response);
	//$("#license_info").text(JSON.stringify(response, null, 2));
	parseLicense(response);
  } else { // Version 1.4.2h - Removed if (status)
	status = status || ""; // Version 1.4.2h
	sra.error = "Status: "+status+". The server did not respond."; // Version 1.4.3
    console.log("Status: "+status+". The server did not respond."); // Version 1.4.2b
	/*if (location.pathname == "/_generated_background_page.html")  // Version 1.4.3 // Version 1.4.4b - Removed if
			init2020(); // Version 1.4.2b - So go ahead and run license2020.js
		else */
		chrome.storage.local.set({"error":sra.error}, function() { 	// Version 1.4.4b
			getLicense2020(); // Version 1.4.3
		});
	/*$("#dateCreated").text("N/A");
    $("#licenseState").addClass("alert-danger");
    $("#licenseStatus").text("Error");
    statusDiv.html("Error reading license server.");*/
  }
}

/*****************************************************************************
* Parse the license and determine if the user should get a free trial
*  - if license.accessLevel == "FULL", they've paid for the app
*  - if license.accessLevel == "FREE_TRIAL" they haven't paid
*    - If they've used the app for less than TRIAL_PERIOD_DAYS days, free trial
*    - Otherwise, the free trial has expired 
*****************************************************************************/

function parseLicense(license) {
  var licenseStatus;
  var licenseStatusText = "FREE TRIAL"; // Version 1.0.0 // Version 1.0.3 - From: "FREE_TRIAL" to "FREE TRIAL" because Google does not translate with underscore between words
  console.log(license);
  if (license.result && license.accessLevel == "FULL") {
    console.log("Fully paid & properly licensed.");
    licenseStatusText = "FULL";
    licenseStatus = "alert-success";
  } else if (license.result && license.accessLevel == "FREE_TRIAL") {
    var daysAgoLicenseIssued = Date.now() - parseInt(license.createdTime, 10);
    daysAgoLicenseIssued = daysAgoLicenseIssued / 1000 / 60 / 60 / 24;
    if (daysAgoLicenseIssued <= TRIAL_PERIOD_DAYS) {
      console.log("Free trial, still within trial period");
      var daysLeft = Math.round(TRIAL_PERIOD_DAYS - daysAgoLicenseIssued); // Version 1.0
      licenseStatusText = "FREE TRIAL ("+daysLeft+" days left)"; // Version 1.0 // Version 1.0.3 - From: "FREE_TRIAL" to "FREE TRIAL"
      licenseStatus = "alert-info";
    } else {
      console.log("Free trial, trial period expired.");
      licenseStatusText = "FREE TRIAL EXPIRED"; // Version 1.0.3 - From: "FREE_TRIAL_EXPIRED" to "FREE TRIAL EXPIRED"
      licenseStatus = "alert-warning";
    }
  } else {
    console.log("No license ever issued.");
	sra.error = "CWS license never issued."; // Version 1.4.3
    licenseStatusText = "FREE TRIAL"; // Version 1.0.3 - From: "NONE" to "FREE TRIAL"
    licenseStatus = "alert-danger";
  }
  /*$("#dateCreated").text(moment(parseInt(license.createdTime, 10)).format("llll"));
  $("#licenseState").addClass(licenseStatus);
  $("#licenseStatus").text(licenseStatusText);
  statusDiv.html("&nbsp;");*/
  var previous_license = sra.license || ""; // Version 1.4.2g
  if (licenseStatusText == "FULL")
	  var obj = { "license" : licenseStatusText, "kind": license.kind, "createdTime": license.createdTime }; // Version 1.4.0 - Added  "kind": license.kind, "createdTime": license.createdTime
  else
	  var obj = { "license" : licenseStatusText, "createdTime": license.createdTime }; // Version 1.0 - Was license.accessLevel // Version 1.4.0 - Added "createdTime": license.createdTime
  if (sra.hasOwnProperty("kind") && sra["kind"].match(/paddle|paypal/i) && sra.license == "FULL")
	  obj["license"] = "FULL";
  //save_to_storage(obj); // Version 1.4.3 - Removed both saves
  //save_to_sync(obj); // Version 1.4.2 - Save to sync in case they install SRA on new PC
  chrome.storage.local.set(obj, function() { // Version 1.4.3 - Added , function() instead of setTimeout below
	//chrome.storage.sync.set(obj, function() { // Version 1.4.3 - Added , function() instead of setTimeout below // Version 1.4.5 - Removing sync because it messes up settings
		// Version 1.4.4 - Removed below because check2020() would just return true or false and never run getLicense2020()
		/* if (location.pathname == "/_generated_background_page.html") { // Version 1.4.2b
			if (previous_license != obj.license) // Version 1.4.2g - Always do getLicense2020 if previous license is different
				getLicense2020();
			else
				check2020(); // Version 1.4.2b - Now check for license2020 // Version 1.4.4 - BUG! check2020 returns true or false. It never calls getLicense2020()
		}
		else */
			getLicense2020(); // Version 1.4.2b - Because they pressed the "Check" button  
	//}); // Version 1.4.5 - Removing sync because it messes up settings
  });
  
  /*setTimeout(function(){ 
	if (location.pathname == "/_generated_background_page.html") { // Version 1.4.2b
		if (previous_license != obj.license) // Version 1.4.2g - Always do getLicense2020 if previous license is different
			getLicense2020();
		else
			check2020(); // Version 1.4.2b - Now check for license2020 // Version 1.4.4 - BUG! check2020 returns true or false. It never calls getLicense2020()
	}
	else
		getLicense2020(); // Version 1.4.2b - Because they pressed the "Check" button
  }, 2000); // Version 1.4.2b
  */
}

/*****************************************************************************
* Helper method for making authenticated requests
*****************************************************************************/

// Helper Util for making authenticated XHRs
function xhrWithAuth(method, url, interactive, callback) {
  var retry = true;
  getToken();

  function getToken() {
    //statusDiv.text("Getting auth token...");
    console.log("Calling chrome.identity.getAuthToken", interactive);
    /* Jeff Note: chrome.identity only works in background scripts.
    	Also need "permissions": ["identity"] in manifest.json */
    chrome.identity.getAuthToken({ interactive: interactive }, function(token) {
      if (chrome.runtime.lastError) {
        callback(chrome.runtime.lastError);
        return;
      }
      console.log("chrome.identity.getAuthToken returned a token", token);
      access_token = token;
      requestStartFetch(); // Version 1.7.0 - From requestStart() to requestStartFetch()
    });
  }

  function requestStart() {
    //statusDiv.text("Starting authenticated XHR...");
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.onload = requestComplete;
    xhr.send();
  }
  
	// Version 1.7.0 - Jeff try this requestStartFetch() function in place of requestStart()
	// since service workers in Manifest V3 do not support XMLHttpRequest but use fetch instead
	function requestStartFetch() {
	  fetch(url, {
			method: 'GET',
			withCredentials: true,
			credentials: 'include',
			headers: {
				'Authorization': 'Bearer ' + access_token
			}
		}).then(response => {
			response.text().then(data => { // or response.json() to parse it as json
				// Now we can access response.status and data
				// We will bypass requestComplete with below:
				if (response.status == 401 && retry) {
				  retry = false;
				  chrome.identity.removeCachedAuthToken({ token: access_token },
														getToken);
				} else {
				  callback(null, response.status, data);
				}
			})
        })
		.catch(function(error) {
			console.log('Request failed', error);
		});
	}

  function requestComplete() {
    //statusDiv.text("Authenticated XHR completed.");
    if (this.status == 401 && retry) {
      retry = false;
      chrome.identity.removeCachedAuthToken({ token: access_token },
                                            getToken);
    } else {
      callback(null, this.status, this.response);
    }
  }
}

// Version 1.3.4
function check() {
	var cd = new Date().getTime();
	var ch = true;
	var days = 5; // Version 1.4.1
	
	if (typeof sra.cd === "undefined") {
		sra.cd = cd;
		days = 0;		
	}
	else if (!sra.kind || typeof sra.license === "undefined" || sra.license.match(/free|none/i)) { // Version 1.4.1 - Added || !sra.kind
		sra.license = sra.license || "FREE TRIAL"; // Version 1.4.2g - Changed "FREE TRIAL" to sra.license || "FREE TRIAL"
		var obj = { "license": sra.license, "cd": cd }; // Version 1.4.2g - Changed "FREE TRIAL" to sra.license
		// save_to_storage(obj); // 1.4.3 - Shouldn't save here because it might not save before getLicense()
		days = 1; // Version 1.4.1 // Version 1.70b - From 0 to 1 otherwise it runs every time sr.html is open
	}
	
	// Version 1.4.1 - Removed else if (typeof sra.cd !== "undefined") {
	var date1 = new Date();
	var date2 = new Date(parseInt(sra.cd));
	var diffTime = Math.abs(date2 - date1);
	var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
	console.log(diffDays);
	if (diffDays >= days) { // Version 1.4.1 // From 3 to days
		ch = true;
		var obj = { "cd": cd }; 
		save_to_storage(obj);
	}
	else 
		ch = false;

	
	return ch;
}

//if (running_script == "background") // Version 1.4.2b // Version 1.4.4b - Removed - Now running from license2020.js
//	setTimeout(function(){ init(); }, 2000); // Version 1.4.4 - Added setTimeout because maybe we are running this too fast before license2020.js is loaded and that is why chrome.i18n.getMessage("appName") is sometimes empty?!?

