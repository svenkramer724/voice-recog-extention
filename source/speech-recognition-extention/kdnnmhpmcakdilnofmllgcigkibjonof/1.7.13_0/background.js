/* 	Version 1.7.0
	Manifest V3 migration https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/
	Migrating from background to service workers: https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/
	
	1. We can only use global variables that are static. So either put each variable in each 
	chrome addListener function or create a globals() function to be called 
	by each addListener function. (Ex: $GLOBALS = globals();)
	
	2. Before we could specify multiple background scripts in manifest.json. 
	We can only specify one service worker in manifest V3 so in background.js
	we have to use importScripts() inside addListener functions
	https://stackoverflow.com/questions/66406672/chrome-extension-mv3-modularize-service-worker-js-file
	Old: "background": {
  		"scripts": ["storage.js", "background.js", "license.js", "license2020.js"]
	},
	We should probably add a storage listener in background.js so we don't have to import storage.js.
	We do this with getAllStorageSyncData() function.
	
	3. Audio: Since service workers have no DOM or window elements we can't use new Audio()
	either. So we have to play the audio again in sr.js. But it doesn't play the first time.
	So we should play the beep as soon as sr.html is opened but silently. See:
	https://stackoverflow.com/questions/54047606/allow-audio-play-on-safari-for-chat-app
	Or use:
	chrome.windows.create({'url': 'audio.mp3', 'focused': false, 'state': 'minimized', 'width': 1, 'height': 1, } , 
	function(window) {
		
	});

	
	4. 	manifest.json --> "browser_action" is now "action".
		background.js --> "browserAction is now "action".
		manifest.json --> The _execute_action (Manifest V3), _execute_browser_action (Manifest V2)
		
	5. 	tabs.executeScript() is replaced with scripting.executeScript()
		manifest.json must have: "permissions": ["scripting"],
		https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions/9517879#9517879
		
	6. Workers no longer provide XMLHttpRequest, but instead support the more modern fetch()
	so we have to change the way the license is retrieved.
	

	*/
/*var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property
var running_script = "background";
var tab_id = false; // Will be id of Speech Recognition tab window when it is open
var tab_url = false; // Will be url of Speech Recognition tab window
var window_id = false; // Version 1.2.0 - Will be window id of Speech Recognition tab
var last_active_tab = false;
var beep = new Audio("audio/beep.mp3");
var low_beep = new Audio("audio/lowbeep.mp3");
*/

// Version 1.7.0 - From https://stackoverflow.com/questions/66406672/chrome-extension-mv3-modularize-service-worker-js-file
// To import a script later in onMessage we have to import it in oninstall for some odd reason!
self.oninstall = () => {
  // The imported script shouldn't do anything, but only declare a global function
  // (someComplexScriptAsyncHandler) or use an analog of require() to register a module
  importScripts("license2020.js");
  
  // Version 1.7.0 - Inject content in all tabs oninstall
  chrome.tabs.query({}, function(tabs) {
    	for(var i = 0; i < tabs.length; i++)
	    {
			//if (!tabs[0].url.match(/^(chrome:\/\/newtab|https:\/\/www.google.com\/_\/chrome\/newtab)/i))
				chrome.scripting.executeScript(
				{ // Version 1.7.0 - Manifest V3
			
				  target: {tabId: tabs[i].id, allFrames: true},
				  files: ['storage.js', 'content.js', "keypress.js", "googleDocsUtil.js"],
				}, function() {
					if (chrome.runtime.lastError) {
						console.log(chrome.runtime.lastError.message);
					}
				});

		}
	});
};

// Listen to message from content or sr.js script
chrome.runtime.onMessage.addListener(
	function listen_to_content(obj, sender, sendResponse) {
		//tab_id = sender.tab.id; // Get id of sender
    	//if (test_mode) console.log(tab_id);
		console.log(obj);
    	
    	if (obj.hasOwnProperty("beep"))
		{
			beep.playbackRate = 1;
			beep.play();
		}
		if (obj.hasOwnProperty("low_beep"))
		{
			low_beep.play();
		}
		if (obj.hasOwnProperty("end_beep"))
		{
			//beep.playbackRate = 1.75;
			//beep.play(); 
    		chrome.windows.getCurrent(function(winCurrent){
				// try window type: popup or normal. 
				var audio_url = 'audio.html?src=audio/beep.mp3&playbackRate=1.5&preservesPitch=false';
				chrome.windows.create({url: audio_url, type: 'popup', focused: false, width: 1, height: 1, top:5000, left:5000} , 
				function(window) {
					console.log(window);
					//chrome.windows.update(winCurrent.id, {focused: true}); // Focus back on previous window
					// Close audio window in one second
					setTimeout(() => {
					  chrome.windows.remove(window.id, function ignore_error() { void chrome.runtime.lastError; });
					}, 2000);
				});
			 });
		}
		if (obj.hasOwnProperty("getLicense")) { // Version 1.7.0 - Importing script into service worker
			sra = {};
			importScripts("license2020.js");
			chrome.storage.local.get(null, (obj) => {    
				sra = obj;
				getLicense2020(obj["getLicense"]);
			});
		}
		//send_to_content(obj);
    	
      	if (obj.hasOwnProperty("getLicense")) // Version 1.7.0b - So we don't interrupt other sendRepsonses
			sendResponse({farewell: "From background: I got the object."});
  });


/* 	Version 1.7.0 - Manifest V3 doesn't work with global variables
	So we create a globals function that is called by each chrome addListener function.
	(Ex: $GLOBALS = globals();)
*/
async function globals() {
	var $GLOBALS = {};
	$GLOBALS.test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property
	$GLOBALS.running_script = "background";
	$GLOBALS.tab_id = false; // Will be id of Speech Recognition tab window when it is open
	$GLOBALS.tab_url = false; // Will be url of Speech Recognition tab window
	$GLOBALS.window_id = false; // Version 1.2.0 - Will be window id of Speech Recognition tab
	$GLOBALS.last_active_tab = false;
	
	// Get sr.html tab if it exists
	//var re = new RegExp("^chrome-extension:(.*?)\/sr.html$" 'i');
	//var re = new RegExp("^chrome-extension:\/\/"+chrome.runtime.id+"\/sr.html$" 'i');
	var re = RegExp(chrome.runtime.getURL("sr.html"), "i");
	var tabs = await chrome.tabs.query({}); // https://stackoverflow.com/a/68787047/4307527
	tabs.forEach(function (tab) {
		// if (tab.url.match(/^chrome-extension:(.*?)\/sr.html$/i)) {
		if (tab.url.match(re)) {
			$GLOBALS.tab_id = tab.id;
			$GLOBALS.tab_url = tab.url;
			$GLOBALS.window_id = tab.windowId; // Version 1.7.0
		}
	});
	
	
	// Get all chrome.storage.local
	$GLOBALS.sra = await getAllStorageSyncData(null);
	//$GLOBALS = me($GLOBALS);
	return $GLOBALS; // return global variables object
}


// Version 1.7.0 - Manifest V3 - asynchronous local storage: https://developer.chrome.com/docs/extensions/reference/storage/#asynchronous-preload-from-storage
function getAllStorageSyncData(top_key) {
  // Immediately return a promise and start asynchronous work
  return new Promise((resolve, reject) => {
    // Asynchronously fetch all data from storage.sync.
    chrome.storage.local.get(top_key, (items) => {
      // Pass any observed errors down the promise chain.
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      // Pass the data retrieved from storage down the promise chain.
      resolve(items);
    });
  });
}

/* Open a new tab using chrome.tabs
	chrome.tabs can only be used by background.js
*/
// Called when a user clicks on the action icon in the toolbar
chrome.action.onClicked.addListener(function(tab) {
	globals().then(function ($GLOBALS) { // Version 1.7.0
		//chrome.tabs.create({"url": "http://seabreezecomputers.com/rater"});
		if ($GLOBALS.tab_id == false)
			open_sr_page(); // Open speech recognition page if it is not open
		else if ($GLOBALS.sra && $GLOBALS.sra.settings && $GLOBALS.sra.settings['click_to_close']) // Version 1.2.0 // Version 1.5.7 - Added sra && sra.settings && in case chrome.storage.sync.clear() or chrome.storage.local.clear()
			chrome.tabs.remove($GLOBALS.tab_id);
		else
		{
			//var active_toggle = sra.settings['start_in_background'] ? false : true;
			chrome.tabs.update($GLOBALS.tab_id, {active: true}); // Focus on the page if it is not focused
			chrome.windows.update($GLOBALS.window_id, {focused: true}); // Version 1.2.0 - Focus on the window
		}
		//console.log("clicked");
	});
}); 


function open_sr_page() {
	globals().then(function ($GLOBALS) { // Version 1.7.0
		var active_toggle = ($GLOBALS.sra && $GLOBALS.sra.settings && $GLOBALS.sra.settings['start_in_background']) ? false : true; // Version 1.5.7 - Added sra && sra.settings && 
		// Found out I don't really need chrome.extension.getURL. It understands relative paths
		//chrome.tabs.create({"url":chrome.extension.getURL("sr.html"),"selected":true}, function(tab){
		chrome.tabs.create({"url":"sr.html","active":active_toggle}, function(tab){ // Version 1.7.2 - From selected to active because selected deprecated
			if ($GLOBALS.test_mode) // Version 1.7.0
				console.log(tab); // Version 1.3.2 test
			$GLOBALS.tab_id = tab.id;
			$GLOBALS.tab_url = tab.pendingUrl || tab.url; // Version 1.3.2 - Chrome 79 added PendingUrl on 12/17/2019 - https://developer.chrome.com/extensions/tabs
			$GLOBALS.window_id = tab.windowId; // Version 1.2.0
			//updateBadge(); // Version 1.1.8 - Removed
			chrome.action.setBadgeText({text: "..."}); // Version 1.1.8 - Initializing...
			chrome.action.setBadgeBackgroundColor({"color": [255, 0, 0, 100]}); 
		});
	});
}



// get the currently active tab
/*chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
  console.log(tabs[0]);
}); */

// Find out if any tab is removed
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	updateBadge();
	/*var $GLOBALS = globals(); // Version 1.7.0
	if (tabId == $GLOBALS.tab_id) // sr.html tab has been closed
    {
    	$GLOBALS.tab_id = false;
    	updateBadge();
    }*/
	//console.log(tabId);
});

// Find out if any tab has been updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    updateBadge();
	/*var $GLOBALS = globals(); // Version 1.7.0
	if (tabId == $GLOBALS.tab_id) // sr.html tab has been updated
    if (tab.url != $GLOBALS.tab_url) // And they changed the url of sr.html to another page!
    {
    	$GLOBALS.tab_id = false;
    	updateBadge();
    }*/
	//chrome.action.setBadgeText({text: newText, tabId: tab.id});
});

// Find out when a tab has been activated 
// So this is called when a tab is switched to 
chrome.tabs.onActivated.addListener(function(activeInfo) {
  	updateBadge(activeInfo.tabId);
	//$GLOBALS.last_active_tab = activeInfo.tabId;
  	// how to fetch tab url using activeInfo.tabid
  	/*chrome.tabs.get(activeInfo.tabId, function(tab){ // Version 1.5.0 - Removed - Console error: Unchecked runtime.lastError: Tabs cannot be edited right now (user may be dragging a tab).
     	//console.log(tab.url);
  });*/
}); 


// Find out if a tab has been created
chrome.tabs.onCreated.addListener(function(activeInfo) {
	updateBadge(activeInfo.tabId);
	//$GLOBALS.last_active_tab = activeInfo.tabId;
    //chrome.action.setBadgeText({text: newText, tabId: tab.id});
});


function updateBadge(tabId)
{
	//var $GLOBALS = globals(); // Version 1.7.0
	globals().then(function ($GLOBALS) { // Version 1.7.0
		//if ($GLOBALS.test_mode) // Version 1.7.0
		//	console.log($GLOBALS);
		if ($GLOBALS.tab_id != false) // if speech recognition window is open
		{
			//chrome.action.setBadgeText({text: "On", tabId: tabId});
			chrome.action.setBadgeText({text: "On"}); // Removed tabID to affect every tab
			chrome.action.setBadgeBackgroundColor({"color": [255, 0, 0, 100]}); 
			
			if ($GLOBALS.sra && $GLOBALS.sra.settings) { // Verison 1.5.7 - Added in case chrome storage deleted
			
				if ($GLOBALS.sra.settings.use_wakeup_phrase && !$GLOBALS.sra.settings.wakeup_timeout) // Listening for wakeup phrase
				{	
					chrome.action.setBadgeText({text: 'On'}); // Removed tabID to affect every tab
					chrome.action.setBadgeBackgroundColor({"color": [200, 200, 0, 200]}); // yellow, transparency
				}	
				else if ($GLOBALS.sra.settings.use_wakeup_phrase) // Detected wakeup phrase
				{
					chrome.action.setBadgeText({text: 'On'}); // Removed tabID to affect every tab
					chrome.action.setBadgeBackgroundColor({"color": [255, 0, 0, 100]}); // red, transparency	
				}
				
				if ($GLOBALS.sra.settings.sr_audio_pause) // pausing because of audio being played in a tab
				{	
					chrome.action.setBadgeText({text: 'Off'}); // Removed tabID to affect every tab
					chrome.action.setBadgeBackgroundColor({"color": [200, 200, 0, 200]}); // yellow, transparency
				}
				
				if ($GLOBALS.sra.settings.prevent_display_sleep)
					chrome.power.requestKeepAwake("display"); 
				else if ($GLOBALS.sra.settings.prevent_system_sleep)
					chrome.power.requestKeepAwake("system"); 
				else
					chrome.power.releaseKeepAwake(); // Allow system to sleep again	
			}		
		}
		else // if speech recognition window is closed 
		{
			chrome.action.setBadgeText({text: ""});	// Remove "On" badge
			
			if ($GLOBALS.sra && $GLOBALS.sra.settings) // Version 1.5.7 
			if ($GLOBALS.sra.settings.prevent_system_sleep || $GLOBALS.sra.settings.prevent_display_sleep)
				chrome.power.releaseKeepAwake(); // Allow system to sleep again
		}
	});
	
}


function processObject(obj)
{
	// Called from storage.js
	for (var key in obj)
	{
		if (obj.hasOwnProperty(key))
		{
			if (typeof(obj[key])=="object")
			{ 
				processObject(obj[key]);
			}
			else
			{
				if (key.match(/^use_wakeup_phrase/i)) // this will match if it is true or false .oldValue .newValue
					updateBadge();	
				if (key.match(/^prevent_display_sleep/i)) // this will match if it is true or false .oldValue .newValue	
					updateBadge();
				if (key.match(/^prevent_system_sleep/i)) // this will match if it is true or false .oldValue .newValue	
					updateBadge();
			}
		}
	}
}


// Version 1.0.4 - Check whether new version is installed and display notification
chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        console.log("This is a first install!");
        //alert(JSON.stringify(details));
    }else if(details.reason == "update"){
        var thisVersion = chrome.runtime.getManifest().version;
        var extName = chrome.runtime.getManifest().name;
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
        //alert(JSON.stringify(details));
        var string = "Updated from " + details.previousVersion + " to " + thisVersion + ".\n"+
        			"FEATURES:\n"+
        			"* Export/Import custom commands.\n"+
        			"* (Play (song)) is no longer in commands, but is only in custom commands.\n"+
					"";
        if (thisVersion == "1.0.5") alert(string);
		if (thisVersion == "1.4.2") save_to_storage({cd:1611123111111}); // Version 1.4.2i - To run getLicense() on update
    }
});


function start_all() {
	// if we haven't got chrome.storage yet then call this function later
	if (!storage_ready)
	{
		setTimeout(function()
		{
			start_all();
		} , 200);
		return;
	}
	
	if (sra && sra.settings && sra.settings['start_with_chrome']) // Version 1.5.7 - Added sra && sra.settings && 
		open_sr_page();
}

/* If we closed Chrome with the Speech Recognition Anywhere tab left open
	then when we start Chrome again the badge is left to "On". So we need
	to call update badge when background is first loaded to turn it off
*/
updateBadge();

// Version 1.7.0 - onStartup should fire when Chrome starts
chrome.runtime.onStartup.addListener(function() {
	updateBadge(); // Turn off "on" badge when Chrome starts
	globals().then(function ($GLOBALS) { // Version 1.7.0
		if ($GLOBALS.sra && $GLOBALS.sra.settings && $GLOBALS.sra.settings['start_with_chrome']) // Version 1.5.7 - Added sra && sra.settings && 
			open_sr_page();
	});
})

// window.onload = start_all; // Version 1.7.0 - Can't use window with Manifest V3 in service worker

// Version 1.7.0b - Listen to requests to remove Content Security Policy from websites
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) // Version 1.7.1
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
	function(obj) {
		console.log(obj);
	}
);