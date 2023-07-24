var sra = { 
	settings : { 
		"select_language" : false,
		"start_with_chrome" : false,
		"start_in_background" : false,
		"submit_search_fields" : false,
		"pause_for_audio" : false, /* should we pause speech recognition if audio is playing in a tab? */
		"sr_audio_pause" : false, /* is speech recognition paused because of audio playing in a tab */
		"virtual_assistant_mode" : false,
		"use_wakeup_phrase" : false,
		"wakeup_phrase" : false,
		"use_wakeup_timeout" : false,
		"wakeup_timeout" : false, 
		"wakeup_beep" : false,
		"wakeup_low_beep" : false,
		"end_beep" : false,
		"prevent_display_sleep" : false,
		"prevent_system_sleep" : false,
		"disable_interim" : false,
		"disable_speech2text" : false,
		"disable_commands" : false,
		"disable_autofocus" : false,
		"auto_punctuation" : false,
		"remove_auto_capitalize" : false,
		"select_voice" : false,
		"tts_pitch" : false,
		"tts_rate" : false,
		"tts_highlight" : false,
		"tts_scroll" : false,
		"tts_simple" : false, /* Version 1.2.3 - turn off reading of ARIA roles and tag names */
		"tts_speaking" : false, /* Version 1.2.0 - is tts screen reader speaking */
		"chrome_windows" : false, /* Version 1.2.0 - Allow SR in other chrome windows */
		"click_to_close" : false, /* Version 1.2.0 - Click icon 2nd time to close */
		"status" : false, /* Version 1.4.0 - Paypal subscription or other order status */
		"order_id" : false, /* Version 1.4.0 - Paypal subscription or other order id */
		"disable_auto_gain_control" : false, /* Version 1.4.2h */
		"always_lowercase" : false, /* Version 1.5.2 */
		"use_keypresses" : false, /* Version 1.7.7 */
		"disable_edge_auto_punctuation" : false, /* Version 1.6.2 */
		"disable_continuous_recognition" : false, /* Version 1.6.3 */
	},
	"license" : "FREE TRIAL", // Version 1.5.2 - Because Uncaught TypeError: Cannot read property 'match' of undefined at update_title (sr.js:73)
}

var uri = window.location.hostname; // www.seabreezecomputers.com
var still_saving = false; // Needed for save_to_storage otherwise if called twice in a row we get the previous object before it is saved with local.set
var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property
var storage_ready = false; // It takes a while for chrome.storage.local.get to get the storage object


function get_from_storage(top_key)
{
	/* set top_key to null to get an object with all the storage values */
	chrome.storage.local.get(top_key, function(obj)
	{
	 	//if (typeof obj[top_key] == "undefined") return false; // key does not exist so return
	 	// or we could do
	 	//if (obj.hasOwnProperty(top_key) == false) return false; // key does not exist so return
	 	if (chrome.runtime.lastError) console.error(chrome.runtime.lastError); // Version 1.0.7
	    
		if (test_mode) console.log("Get from local storage: "+JSON.stringify(obj));
	    /*
	    if (obj[top_key].hasOwnProperty("font_times"))
	    	change_fontsize(parseFloat(obj[top_key]["font_times"])); // turn into number
	    if (obj[top_key].hasOwnProperty("color"))
	    	change_fontcolor("color", obj[top_key]["color"]);
	    if (obj[top_key].hasOwnProperty("background-color"))
	    	change_fontcolor("background-color", obj[top_key]["background-color"]);
	    */
		// Merge with settings object
		mergeObject(sra, obj); 
		
		/*chrome.storage.sync.get(top_key, function(sync_obj) { // Version 1.4.0 Get from sync in case they install SRA on new PC
			if (test_mode) console.log("Get from sync storage: "+JSON.stringify(sync_obj));
			mergeObject(sra, sync_obj); 
			 
		});*/
		
		storage_ready = true; // Version 1.4.5 - Not going to get sync because then Settings are not saved when closing SRA tab
		 
	});
} // end function get_from_storage()


function save_to_storage(obj)
{		
	// Save to chrome.storage
	chrome.storage.local.set(obj, function() 
	{
	  	still_saving = false;
		if (test_mode) console.log("Saved to local storage: "+JSON.stringify(obj));
	  	
		if(chrome.runtime.lastError)
	    {
	        console.log(chrome.runtime.lastError.message);
	        return;
	    } 
	});
} // end function save_to_storage(option_obj)


function save_to_sync(obj)
{		
	// Save to chrome.storage
	chrome.storage.sync.set(obj, function() 
	{
	  	still_saving = false;
		if (test_mode) console.log("Saved to sync storage: "+JSON.stringify(obj));
	  	
		if(chrome.runtime.lastError)
	    {
	        console.log(chrome.runtime.lastError.message);
	        return;
	    } 
	});
} // end function save_to_storage(option_obj)


chrome.storage.onChanged.addListener(function(changes, namespace) {
	// The namespace is "sync", "local" or "managed"
	if (test_mode) console.log("Changes to "+namespace+" storage: "+JSON.stringify(changes)); // Version 1.4.0 - Added "+namespace+"
	for (key in changes) {
		var storageChange = changes[key];
 	 	/*console.log('Storage key "%s" in namespace "%s" changed. ' +
	              'Old value was "%s", new value is "%s".',
	              key,
	              namespace,
	              storageChange.oldValue,
	              storageChange.newValue); */
	    sra[key] = changes[key].newValue;
	    //if (test_mode) console.log("sra object: "+JSON.stringify(sra));
		// When deleted: Storage key "toggle" in namespace "local" changed. Old value was "Object", new value is "undefined".
		// When created: Storage key "toggle" in namespace "local" changed. Old value was "undefined", new value is "Object".
		/* NOTE: A new cookie only has newValue and no oldValue property
			NOTE: A deleted cookie only has an oldValue and no newValue property */
	}
	if (typeof processObject === "function") processObject(changes);
});	

/* mergeObject(old_object, new_object) */
function mergeObject (o, ob) 
{
    for (var z in ob) 
	{ 
	  	if (ob.hasOwnProperty(z)) 
		{ 
			if (o[z] && typeof o[z] == 'object' && typeof ob[z] == 'object') 
				o[z] = mergeObject(o[z], ob[z]); 
			else 
				o[z] = ob[z]; 
		} 
	}	
    return o;
} // end function mergeObject (o, ob) 

// Version 1.4.0 - Listen for paddle event in content script
window.addEventListener("paddle", function(e) { 
	if (test_mode) console.log(e.detail); 
	if (test_mode) console.log(window.location.hostname);
	if (!window.location.hostname.match(/seabreezecomputers.com/i)) return; // Don't listen if not from website
	var products_array = [640346, 642123]; // SRA plan_ids
	if (e.detail.hasOwnProperty("order")) {
		if (test_mode) console.log(JSON.stringify(e.detail));
		var product_id = e.detail.order.product_id || e.detail.lockers[0].product_id || ""; // Version 1.4.2g
		if (products_array.indexOf(product_id) > -1) { // Version 1.4.2g - Changed e.detail.order["product_id"] to product_id
			var obj = {};
			// obj["order_id"] = e.detail.order.subscription_id || e.detail.order.order_id;
			obj["order_id"] = e.detail.order.order_id; // It appears that the order_id should always be used with paddle
			obj["license"] = "FULL";
			obj["kind"] = "paddle";
			obj["is_subscription"] = e.detail.order.is_subscription || "";	// Version 1.6.7 - Added || ""
			var cd2 = new Date(); cd2.setDate(cd2.getDate()-10); // Version 1.6.5 - Subtract 10 days from cd2 so next time they restart it will check for license
			obj["cd2"] = cd2.getTime(); // Version 1.6.12 - Added .getTime() because it was object instead of number
			//save_to_sync(obj); // Save to sync in case they install SRA on new PC // Version 1.4.3 - Removed
			// chrome.storage.sync.set(obj, function() { // Version 1.4.3 // Version 1.4.5 - Removing sync because it messes up settings
				sra.settings.order_id = obj['order_id'];
				sra.settings.status = e.detail.state || ""; // Version 1.6.7 - Added || ""
				obj.settings = sra.settings; // Add status and order_id to settings
				//save_to_storage(obj); // Version 1.4.3 - Removed
				chrome.storage.local.set(obj, function() { // Version 1.4.3 - Added , function() instead of setTimeout below
					// Now we have to send a message to background (sr) script to run setup_forms(); and update_title();  ??
					//mergeObject(sra, obj); // Version 1.4.1 - Previously the below "command" would run too fast before save_to_storage finished
					setTimeout(function() { 
						// send_to_background({"command": "getLicense2020", "option": 1});  // Version 1.4.2g - Added setTimeout
						chrome.runtime.sendMessage({"getLicense": obj.order_id}, function(response) { // Version 1.4.4b - Because send_to_backgroud only worked if sr.html was open
							if (test_mode) console.log(response.farewell);
						});
					}, 1000); // Version 1.7.0 - From 2000 to 1000
				});
			// }); // Version 1.4.5 - Removing sync because it messes up settings
		}
	}
});

//window.onload = get_from_storage;	
//chrome.storage.local.clear(); // Uncomment this to clear all of the local storage
get_from_storage(null);  // put null to see all objects saved


