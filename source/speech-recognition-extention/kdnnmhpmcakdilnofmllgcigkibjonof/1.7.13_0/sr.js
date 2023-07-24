
/* 	Google Web Speech API
	1. When you call .start() Chrome asks you for permission to use microphone
	2. When it stops hearing your voice for about 30 seconds it turns off the mic
		even if .continuous = true; To start it again we call .start() inside
		of the .onend = function () {}
	3. But if you are using a http connection then chrome asks to permission
		to use the microphone again.
	4. So what will happen in a Chrome Extension?
	
From: http://commondatastorage.googleapis.com/io-2013/presentations/4057%20Web%20Speech%20API%20creates%20Interactive%20Experiences%20-%20Google%20I-O%202013%20Codelab.pdf
Spoken punctuation currently works only for English, and currently
supports the following:
? Period
? Question mark
? Exclamation point (or exclamation mark)
? Comma
? New line (inserts \n into resulting string)
? New paragraph (inserts \n\n into resulting string)

Jeff also found:
Smiley Face :-)
Frowny Face :-(
Sad Face :-(
kissy face :-*
wink wink ;-)
	
From: https://groups.google.com/a/chromium.org/forum/#!topic/chromium-html5/wHhkRzshYzw
"The SpeechGrammarList is currently not implemented in the speech recognizer for Chrome."
*/ 
var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property
var running_script = "sr";
var the_title = ""; // Used to keep track of title when changing title of window for errors
var sr_msg = (document.getElementById('sr_msg')) ? document.getElementById('sr_msg') : false ;
var sr_init = (document.getElementById('sr_init')) ? document.getElementById('sr_init') : false ; // Version 1.5.9
//var current_tab_id = ""; // Current tab we are sending to
// Detect if browser supports speech-recognition
var sr = ('webkitSpeechRecognition' in window) ? true : false;
/*var speechstart_timer = false;
var speech_timer = { // Version 1.6.2 - Replaces var speechstart_timer
	timeout_id : false,
	start : function() {
		this.stop();
		this.timeout_id = setTimeout(function() {
			// If the web speech API detects speech but then pauses for a few seconds without receiving
			//	a result then we are going to get a network error in about a minute or two. So to try to stop
			//	the network error let's stop and start recognition
			//
			recognition.stop(); 
			 if (test_mode) console.log(new Date().toISOString()+' Stopped recognition to prevent network error');
			// Apparently I don't need to call recognition.start() here because even though
			//	I manually stopped recognition recognition.onend is still called and the function
			//	there restarts recognition.
			//
			return;
		} , 4000);
	},
	stop : function() {
		clearTimeout(this.timeout_id); 
	},
}*/

/* Version 1.7.0 - Manifest V3 - Audio has to be in sr.js not in background script (service worker)
	https://stackoverflow.com/questions/54047606/allow-audio-play-on-safari-for-chat-app
	Previously the beep would sometimes not play the first time so to overcome that we will
	try to play the audio as soon as the window opens, but silently by playing and then quickly pausing
	and then resetting the time to the beginning.
*/
function playAudio(obj) {
	// Ex: playAudio({src: "audio/beep.mp3", volume: 0, muted: true}); 
	window['audioplayer'] = window['audioplayer'] || new Audio();
	var save_defaults = {};
	clearTimeout(window['audioplayer'].timer); // timer is a custom property for this function
	
	function restore_defaults() {
		for (var i in save_defaults) { 
			window['audioplayer'][i] = save_defaults[i]; // Restore default property values for Audio	
		}
	}
	
	for (var i in obj) { // Save defaults
		if (i != "src")
			save_defaults[i] = window['audioplayer'][i]; // Save the default value for Audio unless src
		window['audioplayer'][i] = obj[i]; // Set Audio to what is specified in obj	
	}
	
	window['audioplayer'].onended = function() {
		if (test_mode) console.log("Audio play ended");
		restore_defaults();
	}
	
	var playPromise = window['audioplayer'].play(); // Try to play the audio file
	if (playPromise !== undefined) {
		playPromise.then(function() {
			// Automatic playback started!
			// Since it played we don't need to open a background popup to play the audio
			if (test_mode) console.log("Audio play started");
			clearTimeout(window['audioplayer'].timer);
		}).catch(function(error) {
			// Automatic playback failed.
			if (test_mode) console.log(error);
			restore_defaults();
		});
	} 
	window['audioplayer'].timer = setTimeout(function() {
		// Audio is not playing within specified time because the tab was not focused.
		clearTimeout(window['audioplayer'].timer);
		window['audioplayer'].pause(); // Pause playing of audio so it doesn't play as soon as tab is focused
		window['audioplayer'].currentTime = 0;
		if (window['audioplayer'].volume && !window['audioplayer'].muted) { // Don't send to background if volume == 0 or muted
			//send_to_background({ "end_beep" : true }); // So we will play the beep in background.js instead 
			chrome.windows.getCurrent(function(winCurrent){
				//var audio_url = 'audio.html?src=audio/beep.mp3&playbackRate=1.5&preservesPitch=false';
				var audio_url = 'audio.html?';
				for (var i in obj) { // Build url parameters from obj
					audio_url += i + "=" + obj[i] + "&";
				}
				// try window type: popup or normal.
				chrome.windows.create({url: audio_url, type: 'popup', focused: false, width: 1, height: 1, top:5000, left:5000} , 
				function(window) {
					console.log(window);
					//chrome.windows.update(winCurrent.id, {focused: true}); // Focus back on previous window
					// Close audio window in two seconds
					setTimeout(() => {
					  chrome.windows.remove(window.id, function ignore_error() { void chrome.runtime.lastError; });
					}, 2000);
				});
			 });
			if (test_mode) console.log ("Audio play sent to background.");
			restore_defaults();
		}
	}, 100);
}

playAudio({src: "audio/beep.mp3", volume: 0, muted: true}); // Play audio the first time muted

/*beep.volume = 0;
beep.play().then (function() { beep.pause(); beep.volume = 1; beep.currentTime = 0; });
var low_beep = new Audio("audio/lowbeep.mp3");
low_beep.volume = 0;
low_beep.play(); 
low_beep.play().then (function() { low_beep.pause(); low_beep.volume = 1; low_beep.currentTime = 0; });
*/

function timer(callback, ms) {  // Version 1.6.3
	this.callback = callback; 
	this.ms = ms || 4000; // Default ms to 4000 if none provided
	this.start = function(ms) { // Can specify new ms when calling start()
		ms = ms || this.ms; 
		this.stop();
		this.id = setTimeout(function() { 
			callback();  
		}, ms);
	}
	this.stop = function() {
		clearTimeout(this.id); 
	}
}
var speech_timer = new timer(function() { 
	// console.log(speech_timer.id);
	/* If the web speech API detects speech but then pauses for a few seconds without receiving
		a result then we are going to get a network error in about a minute or two. So to try to stop
		the network error let's stop and start recognition
	*/
	recognition.stop(); 
	 if (test_mode) console.log(new Date().toISOString()+' Stopped recognition to prevent network error');
	/* Apparently I don't need to call recognition.start() here because even though
		I manually stopped recognition recognition.onend is still called and the function
		there restarts recognition.
	*/
	/* Version 1.7.6 - if recognition.interimResults is true then sometimes Chrome's speech recognition
		will have an interim and pause and wait without giving an isFinal true result for many seconds.
		To stop a network error this speech_timer function is called and the interim just sits there
		until the user speaks again. So now we create an event with isFinal to complete the interim.
	*/
	var speech_iframe = document.getElementById("speech_iframe").contentDocument;
	if (speech_iframe.getElementById("interim_span")) 
	if (speech_iframe.getElementById("interim_span").innerHTML != "") {
		var interim = speech_iframe.getElementById("interim_span").innerHTML;
		var event_obj = {
			resultIndex : 0,
			type : "result",
			results : { 
				0 : {
					0 : {transcript: interim, confidence: 0.9696948528289795},	
					isFinal : true,
					length : 1,
					},
					length : 1
				}
		};
		window["final_interim_timer"] = setTimeout(function () { // Version 1.7.7 - Some languages like Thai were printing each statement twice.
			sr_result(event_obj);
		}, 200);
	}		
	return;
}); 

var beeped = false; // keep track if we already beeped for this wakeup phrase
var net_err_timer; // Version 1.1.2
var err_timer; // Version 1.3.5
var err_blank_timer; // Version 1.6.1
var err_num = 0; // Version 1.3.5
var last_error = ""; // Version 1.5.4g - So we don't repeat the same error message to the user over and over
var isEdge = (window.navigator.userAgent.toLowerCase().indexOf("edg/") > -1) ? true : false; // Version 1.6.2
var max_level = 0; // Version 1.6.2 - Testing the max of the sound level
var recognizing = false; // Version 1.6.4 - Was in start_sr()

function update_title(new_title)
{
	// Get all the info from the manifest file in an object
	var manifest = chrome.runtime.getManifest();
	var license = (typeof sra.license === "undefined") ? "Free" : sra.license; 
	if (test_mode) console.log(license);
	var license_parts = license.split(" ("); // Version 1.1.8 - Accidentally removed "FREE TRIAL (x days left)" in v. 1.1.3
	license = chrome.i18n.getMessage(license_parts[0].replace(/ /g,"_")); // Version 1.1.3 - Free, FREE_TRIAL, FREE_TRIAL_EXPIRED, FULL in diff languages
	if (license_parts.length > 1) license_parts[1] = license_parts[1].replace(/days left/i, chrome.i18n.getMessage("days_left")); // Version 1.5.6
	if (license_parts.length > 1) license = license + " (" + license_parts[1]; // Version 1.1.8
	if (test_mode) console.log(license);
	//console.log(manifest.version);
	new_title = (typeof new_title === 'undefined') ? manifest.name : new_title;
	document.title = new_title + " " + license; // Only the title in the tab will ever change with new_title
	// the other places will keep the title from manifest.json
	document.getElementById("license_msg").innerHTML = license; // Version 1.5.6
	var titles = document.getElementsByClassName("title");
	for (var i = 0; i < titles.length; i++)
	{
		/*if (i == 0) // Version 1.5.6 - Removed because license_msg is now separate from title
			titles[i].innerHTML = manifest.name + " " + license;
		else */
			titles[i].innerHTML = manifest.name;	
		// If this is the Basic version then replace the word Basic with nothing in the title
		if (document.getElementById('settings_div').contains(titles[i]))
		{
			//console.log(titles[i].innerHTML);
			titles[i].innerHTML = titles[i].innerHTML.replace(/ Basic/i, "");
		}
	}
	var display = (sra.license.match(/full/i)) ? "none" : "inline-block"; // Version 1.4.0b - Was: if (sra.license.match(/full/i)) 
	{ // Version 1.4.0 - Moved out of for loop at match(/full/i) below // 1.4.0b used to be in setup_forms()
		// Don't display upgrade to full version message
		var elems = document.getElementsByClassName('free_trial_msg');
		for (var e = 0; e < elems.length; e++) 
			elems[e].style.display = display;
		// Version 1.6.5 - Add license & type parameter to sra_news_iframe
		document.getElementById("sra_news_iframe").src = document.getElementById("sra_news_iframe").src + 
			"?lic="+encodeURIComponent(sra.license)+
			"&type="+encodeURIComponent(chrome.i18n.getMessage("shortName"));
		// Version 1.7.2 - iFrame wasn't reloading so it was asking for user to review without it being FULL version...
		document.getElementById("sra_news_iframe").src += ""; // ...So force it to reload with this
		
	}
	document.getElementById("icon").src = chrome.i18n.getMessage("icon"); // Version 1.4.0b
	var anchors = document.getElementsByClassName("cws_link"); // Version 1.4.9 - Change CWS link for 365 or regular
	for (var a = 0; a < anchors.length; a++) {
		if (chrome.i18n.getMessage("cws_link"))
			anchors[a].href = chrome.i18n.getMessage("cws_link");
	}
}

var recognition = new webkitSpeechRecognition(); // Version 0.98.1

function start_sr()
{

	setTimeout(function() { // Version 1.1.6 - Added setTimeout to see if Initializing is still happening 1 minute later
		//if (sr_msg && sr_msg.innerHTML.match(/^Initializing/i)) { // Version 1.5.9 - Removed
		if (sr_init && sr_init.style.display != "none") { // Version 1.5.9 - Added
			var error = ". Initializing error. "; // Version 1.5.4g - Added
			error += chrome.i18n.getMessage("network_error"); // Version 1.1.6 // https://support.google.com/chrome/answer/3296214
	  		if (last_error != error) { // Version 1.5.4g
				document.getElementById('error').innerHTML += error;
				last_error = error; // Version 1.5.4g
			}
		}
	} , 60000); 
	
	if (sr) // If speech recognition is available (Chrome only??)
	{
		// create_analyser(); // Version 1.6.5 - Now called in start_all && stream_success_callback() calls start_sr();
		var sr_sound_level = (document.getElementById('sr_sound_level')) ? document.getElementById('sr_sound_level') : false ;
		// var recognizing = false; // Version 1.6.4 - Removed from here and put in global
		var final_transcript = ""; 
		var final_transcript2 = ""; // Version 1.0.1 - Needed to display auto_punctuation in sr.html without sending it to commands
		//var recognition = new webkitSpeechRecognition();
	  	if (sra.settings.disable_continuous_recognition) // Version 1.6.3
			recognition.continuous = false; // Version 1.6.3 - Some German users were taking 30 seconds for results with continuous true in Chrome!!!
		else
			recognition.continuous = true; // Version 0.98.4 - Changed to false // Version 1.6.2 - Edge works better with continuous
		recognition.interimResults = true;
		recognition.lang = document.settings_form.select_language.value; // Version 0.98.1
		//recognition.start(); // Version 1.6.5 - Trying to move below to fix Edge "Allow" microphone not working on most first installs of the extension
		
		recognition.onstart = function() {
			//create_analyser(); // Version 1.6.4 - put in recogntion.onstart because Edge stops if we don't get allow mic from users in time. // Removed because Lucian Andries youtube error "Audio renderer error. Please restart your computer."
			 if (test_mode) console.log(new Date().toISOString()+" Started Recognizing");
			recognition.lang = document.settings_form.select_language.value; // Version 0.98.1
			if (isEdge && document.settings_form.select_language.selectedIndex == 0) // Version 1.6.2
				recognition.lang = window.navigator.language; // Version 1.6.2 - In Edge recognition.lang does not automatically default to the browser language so we have to specify it since selectedIndex 0 (Default) has no lang code value.
			if (test_mode) console.log(recognition.lang);
		    recognizing = true;
		    if (document.getElementById("error") && document.getElementById("error").innerHTML.match(/network/i)) { // Version 1.1.6 - Was matching more than "network"
		    	clearTimeout(net_err_timer); // Verison 1.1.2
				net_err_timer = setTimeout(function() { // Version 1.1.2 - Added setTimeout
					document.getElementById("error").innerHTML = ""; // Version 1.1.0 - Erase network error msg because speech is working again. 
				} , 2500); // Version 1.1.3 - Changed from 500 to 2500
		    }
			//clearTimeout(speechstart_timer); // Version 1.6.2 - This timer should have been stopped here before.
			speech_timer.stop(); // Version 1.6.2 - Replaces clearTimeout(speechstart_timer);
	  	};
	  	
	  	recognition.onend = function() {
			recognizing = false;
			 if (test_mode) console.log(new Date().toISOString()+" Stopped Recognizing");
			if (!document.getElementById("error").innerHTML.match(/not-allowed/i)) // Version 1.5.4g - Don't restart if not allowed
				recognition.start();
			/*setTimeout(function()
			{
				recognition.start(); 
				return;
			} , 1);*/
			
		};
		
		recognition.start(); // Version 1.6.5 - Moved below recognition.onend to try and fix Edge bug of "Allow" mic not continuing with speech recognition afterward. Didn't work. Same bug in Edge
		
		recognition.onaudiostart = function() {
			if (sra.settings.sr_audio_pause) recognition.stop(); /* Version 1.0.8 */  
			if (test_mode) console.log(new Date().toISOString()+' Audio capturing started'); 
			if (sr_init && sr_init.style.display != "none") { // Version 1.5.9 - From sr_msg.innerHTML.match(/^Initializing/i) to sr_init.style.display != "none"
				sr_init.style.display = "none"; // Version 1.5.9 - From sr_msg to sr_init. From innerHTML = "" to style.display = none
				updateBadge(); 
			} 
			//if (isEdge) // Version 1.6.3 - Removed - Will this work better in Chrome for German users?
				speech_timer.start(); // Version 1.6.2 - Help Edge recognition.continuous not pause the browser for 11 seconds
		}
		recognition.onsoundstart = function() {
			if (sra.settings.sr_audio_pause) recognition.stop(); /* Version 1.0.8 */  
			if (test_mode) console.log(new Date().toISOString()+' Some sound is being received');
			//if (isEdge) // Version 1.6.3 - Removed - Will this work better in Chrome for German users?
				speech_timer.start(); // Version 1.6.2 - Help Edge recognition.continuous not pause the browser for 11 seconds
		}
		recognition.onspeechstart = function() {
			 if (test_mode) console.log(new Date().toISOString()+' Speech has been detected');
			if (sra.settings.sr_audio_pause) recognition.stop(); // Version 1.0.8
			//clearTimeout(speechstart_timer);
			speech_timer.stop(); // Version 1.6.2 - Replaces clearTimeout(speechstart_timer);
			speech_timer.start(); // Version 1.6.2 - New timer method to prevent network error
		}
		recognition.onspeechend = function() { 
			if (test_mode) console.log(new Date().toISOString()+' Speech has stopped being detected');
			speech_timer.stop(); // Version 1.6.2
		}	
		recognition.onsoundend = function() { 
			if (test_mode) console.log(new Date().toISOString()+' Sound has stopped being received');
			speech_timer.stop(); // Version 1.6.2
		}
		recognition.onaudioend = function() { 
			if (test_mode) console.log(new Date().toISOString()+' Audio capturing ended');
			// Version 1.6.2 - Edge pauses the browser here for about 11 seconds so what if we stop the recognition??
			//recognition.stop(); // Version 1.6.2 - Fix Edge pausing the entire browser. Did not work!!
			speech_timer.stop(); // Version 1.6.2
		}	
		
		recognition.onnomatch = function() { if (test_mode) console.log('Speech not recognised');}		
		
		recognition.onerror = function(event) {
			var error = chrome.i18n.getMessage("speech_recognition_error") + event.error + ". "; // Version 1.1.6 - Added + ". "
	  		if (!error.match(/no-speech/i))	// Version 1.5.6
				console.log(new Date().toISOString()+" "+error);
	  		//if (test_mode) final_span.innerHTML += event.error;
	  		if (event.error.match(/network/i))
	  		{
	  			error += chrome.i18n.getMessage("network_error"); // Version 1.1.3 // https://support.google.com/chrome/answer/3296214
	  		}
			if (document.getElementById('error')) // Version 1.5.4g - Otherwise error: Uncaught TypeError: Cannot set properties of null (setting 'innerHTML')
			if (!error.match(/no-speech/i))	
				if (last_error != error) { // Version 1.5.4g
					document.getElementById('error').innerHTML += error; // Version 1.5.4g - Removed from if (event.error.match(/network/i)) block // Version 1.5.4h - From = to +=
					last_error = error; // Version 1.5.4g
				}
		}
	    
		
		
		window["sr_result"] = function(event) {
		    var interim_transcript = '';
			if (test_mode) console.log(new Date().toISOString(), event);
		    //clearTimeout(speechstart_timer);
			//speech_timer.stop(); // Version 1.6.2 - Replaces clearTimeout(speechstart_timer);
			speech_timer.start(2000); // Version 1.6.3b - Is this good for German users with continuous true? // Version 1.6.5 - From 3000 to 2000
		    for (var i = event.resultIndex; i < event.results.length; ++i) {
		    	if (event.results[i].isFinal) {
					if (event.isTrusted == true) // Version 1.7.7 - Some languages like Thai were printing each statement twice. 
						clearTimeout(window["final_interim_timer"]); // Version 1.7.7 - So here we cancel the made up final event obj from above if we get a real isFinal result
					//speech_timer.stop(); // Version 1.6.3b
					speech_timer.start(); // Version 1.7.6 - If we stop the timer above then it waits for 15 seconds for speech which can cause network error for some? So we should start the time again instead? Good idea or bad?
		        	final_transcript += event.results[i][0].transcript;
		        	if (test_mode) console.log(new Date().toISOString() +" Final_transcript: "+event.results[i][0].transcript);
		        	//send_to_content({ "speech" : event.results[i][0].transcript });
		      	} else {
		        	interim_transcript += event.results[i][0].transcript;
		      	}
		    }
		    if (interim_transcript.length > 0)
		    {
				interim_transcript = replace_mistakes(interim_transcript);
				var re = new RegExp("^(?: *?)"+sra.settings.wakeup_phrase,'i'); // match at beginning with optional spaces in front
				if ( (sra.settings.use_wakeup_phrase && interim_transcript.match(re)) || (sra.settings.wakeup_timeout && !sra.settings.sr_audio_pause))
				{
					if (!beeped && sra.settings.wakeup_beep)
					{
						beeped = true;
						//new Audio("audio/beep.mp3").play(); // Audio plays here, but does not do it the first time unless sr.html tab is the active tab
						//send_to_background({ "beep" : true }); // So we will play the beep in background.js instead
						//beep.play(); // Version 1.7.0
						playAudio({src:"audio/beep.mp3"}); // Version 1.7.0
					}
					updateBadge();
					
					if (sra.settings.use_wakeup_timeout)
						var seconds = 20000; // 20 seconds
					else
						var seconds = 3000; // 2 seconds // 2/27/2017 - Version 0.98.5 - 3 seconds 
						
					// Only require wakeup phrase again in 20 seconds
					clearTimeout(sra.settings.wakeup_timeout);
					sra.settings.wakeup_timeout = setTimeout(function()
					{
						sra.settings.wakeup_timeout = false;
						var obj = { settings : sra.settings };
						if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
						save_to_storage(obj);
						updateBadge();
						beeped = false;	
						if (sra.settings.wakeup_low_beep) 
							//send_to_background({ "low_beep" : true }); // So we will play the beep in background.js instead
							//low_beep.play(); // Version 1.7.0
							playAudio({src:"audio/lowbeep.mp3"}); // Version 1.7.0
					} , seconds); 
					
					var obj = { settings : sra.settings }; // Save sra.settings.wakeup_timeout to storage
					if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
					save_to_storage(obj);	
						
				}
				if (!sra.settings.disable_interim 
				&& (!window.speechSynthesis.speaking || tts_paused)
				&& !sra.settings.sr_audio_pause) { // Version 1.7.8 - Added && !sra.settings.sr_audio_pause
					send_to_content({ "interim" : interim_transcript });
				}
				if (!sra.settings.sr_audio_pause)
					interim_box(interim_transcript); // Version 1.7.6
			}
			else { // Version 1.7.6 - if (interim_transcript.length == 0) then remove interim_span
				if (!sra.settings.disable_interim && (!window.speechSynthesis.speaking || tts_paused)) 
					send_to_content({ "interim" : interim_transcript });
				var speech_iframe = document.getElementById("speech_iframe").contentDocument;
				if (speech_iframe.getElementById("interim_span")) 
					speech_iframe.getElementById("interim_span").remove();
			}
		    if (final_transcript.length > 0 && !sra.settings.sr_audio_pause)
			{	
				if (sra.settings.disable_edge_auto_punctuation) { // Version 1.6.2 - For Edge Chromium Browser
					final_transcript = remove_auto_caps(final_transcript); // Remove all capitalization
					final_transcript = final_transcript.replace(/^¿|[.,?](?!\S)|[。？、，]/g, ""); // Remove all periods, commas and question marks if not followed by a non-whitespace character (for websites like goolge.com). [。？、] are Japanese and Chinese and do not have a space after
					//var period_re = /(?<! (a|short|long|brief|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth))(^| )period\b(?! of)/gi;
					var period_re = /(?<! (a|a short|a long|a brief|(.*?)-hour|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth))(^| )period\b(?! of| in history)/gi; // Version 1.6.11
					final_transcript = final_transcript.replace(period_re, "."); // Convert " period" to "."
				}
				if (!isEdge) { // Version 1.6.11 - Chrome is not converting "period" or "full stop" to "." for some users
					var full_stop_re = /(?<! a)(^| )full stop\b/gi; // Version 1.6.11 - For users like Alex Goodall where "period" and "full stop" is not converting to "."
					final_transcript = final_transcript.replace(full_stop_re, "."); // Version 1.6.11 - Convert " full stop" to "." 
					var period_re = /(?<! (a|a short|a long|a brief|a later|(.*?)-(hour|year|month)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|the))(^| )period\b(?! of time| in history|[.])/gi; // Version 1.6.11 // Version 1.7.2 - Added |1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th // Version 1.7.3 - Added |the and changed of| to of time|
					final_transcript = final_transcript.replace(period_re, "."); // Version 1.6.11 - Convert " period" to "." for users like Alex Goodall
					//var dot_re = /(?<= (?:a|a short|a long|a brief|(.*?)-hour|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|the))[.]( [A-Z])?|[.]( of| in history)|[.](?=[.])/gi; // Version 1.7.2 - Users such as Tony A ONE are noticing that Google is changing the word period to "." almost every time before it even reaches the period_re regex https://regex101.com/r/D9Pnve/3
					var dot_re = /(?<=\b(?:a|a short|a long|a brief|a later|-(hour|month|year)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|the))[.]( [A-Z])?|[.]( of time| in history)|[.](?=[.])/gi; // Version 1.7.3 - Too many sentences begin with Of - https://regex101.com/r/dDK6yT/3
					final_transcript = final_transcript.replace(dot_re, function(match, p1, p2, p3) { 
						console.log(match, p1, p2, p3); 
						if (typeof p2 !== 'undefined') return " period"+p2.toLowerCase(); // lowercase "a brief. Of" or "a. With fun things."
						if (typeof p3 !== 'undefined') return " period"+p3.toLowerCase(); // lowercase ". Of" or ". In history"
						else return " period"; 
					});
				}
				//check_spans(); // Version 0.99.9 // Version 1.7.6 - Removed
				final_transcript = replace_mistakes(final_transcript);
				if (document.getElementById('info_box')) // Version 1.5.2
					document.getElementById('info_box').innerHTML = "<b>Speech: </b>"+final_transcript;
				if (sra.settings.remove_auto_capitalize) final_transcript = remove_auto_caps(final_transcript); // Version 1.1.8
				final_transcript = final_transcript.replace(/([\!\?\.\n]\s+|\n)([a-z])/g, function(m, $1, $2) { // Version 1.7.6 - Added \n because was not capitalizing after New paragraph // Version 1.7.6b - Added |\n because was not capitalizing after New Line because of the \s+
					return $1+$2.toUpperCase(); // Version 1.2.2 - Capitalize first letter after .?! Google was not if you started speech with "period are you there"
				});
				if (sra.settings.always_lowercase)  // Version 1.5.2
					final_transcript = final_transcript.toLowerCase();
				var re = new RegExp("^(?: *?)"+sra.settings.wakeup_phrase,'i'); // match wakeup_phrase at beginning with optional spaces in front
				if (isEdge)
					var re = new RegExp("^(?: *?)"+sra.settings.wakeup_phrase+"[.,]?",'i'); // Version 1.6.7 - Added +"[.,]?" to match optional period or comma at end for Edge
				if ( (sra.settings.use_wakeup_phrase && final_transcript.match(re)) || !sra.settings.use_wakeup_phrase || sra.settings.wakeup_timeout)
				{		
					if (sra.settings.use_wakeup_phrase)
					{
						final_transcript = final_transcript.replace(re , ""); // Remove wakeup phrase from final_transcript	
					}	
					
					var custom_command_found = custom_command_search(final_transcript); // Version 1.0.4 // Version 1.0.6 - Moved lines below wakeup phrase
					if (custom_command_found && custom_command_found != true) // Version 1.0.4 - Allow word replace in sr.html text box
						final_transcript = custom_command_found;
					else if (custom_command_found == true) // Version 1.7.0b
						final_transcript = ""; // Don't print anything. Let the command print using textbox() function if it wants
						
					if (final_transcript.length > 0) {
						var command_found = command_search(final_transcript); // Version 1.7.6
						if (command_found)
							final_transcript = ""; // Version 1.7.6 - Don't print anything. 
						if (!custom_command_found && !command_found && !virtual_assistant_search(final_transcript) && !sra.settings.disable_speech2text)
							send_to_content({ "speech" : auto_punctuation(final_transcript), "date" : new Date().getTime() });
						else if (sra.settings.disable_speech2text && (!window.speechSynthesis.speaking || tts_paused))
							send_to_content({ "interim" : chrome.i18n.getMessage("disable_speech2text_msg") }); // Version 0.99.7 // Version 1.7.6 - From "Speech-To-Text is disabled in Settings." To chrome.i18n.getMessage("disable_speech2text_msg")
						else if (!sra.settings.disable_interim && (!window.speechSynthesis.speaking || tts_paused))
							send_to_content({ "interim" : final_transcript });
						
						if (sra.settings.end_beep) { // Version 1.1.2
							//send_to_background({ "end_beep" : true }); // So we will play the beep in background.js instead 
							//beep.playbackRate = 2; // Version 1.7.0
							//beep.play(); // Version 1.7.0
							//setTimeout(function(){ beep.playbackRate = 1.0}, 1000); // Version 1.7.0
							playAudio({src:"audio/beep.mp3", playbackRate:1.5, preservesPitch:false});
						}
					}
				}
				else if ( (sra.settings.use_wakeup_phrase && !final_transcript.match(re)) )
				{
					if (!sra.settings.disable_interim) // Version 1.2.8 - Don't send if they disabled the yellow speech bubble
						send_to_content({ "interim" : chrome.i18n.getMessage("wakeup_phrase_msg")+sra.settings.wakeup_phrase }); 
				}
				// Print in textbox on sr.js
				//if (final_transcript.length > 0) // Version 1.7.6 - Removed - Now using iframe.html content.js in send_to_content
				//	textbox(final_transcript); // Version 1.7.6
				/*if (document.activeElement == document.getElementById('speech_div') && final_span.innerHTML != "") { // Version 0.99.9 - final_span is contenteditable
		    		final_transcript2 = capitalize(document.getElementById('speech_div'), auto_punctuation(final_transcript));
					if (sra.settings.always_lowercase) // Version 1.5.2
						final_transcript2 = final_transcript2.toLowerCase();
					final_transcript2 = final_transcript2.replace(/ ?\n ?/g, '\n\u200c'); // Version 1.7.6 - linebreak for insertText
					document.execCommand("insertText", false, final_transcript2); // so insert final_transcript at cursor // Version 1.7.6 - From insertHTML to insertText
				}
				else {
					if (document.activeElement == document.getElementById('speech_div')) document.getElementById('speech_div').blur();
					final_transcript2 = capitalize2(final_span.innerText, auto_punctuation(final_transcript)); 
					if (sra.settings.always_lowercase) // Version 1.5.2
						final_transcript2 = final_transcript2.toLowerCase();
					final_span.innerHTML += linebreak(final_transcript2);
				}*/
			}
			//check_spans(); // Version 0.99.9 // Version 1.7.6 - Removed
			
			//interim_span.innerHTML = linebreak(interim_transcript);
		    // scroll speech div to bottom
		    //document.getElementById('speech_div').scrollTop = document.getElementById('speech_div').scrollHeight;
		    //console.log(interim_transcript);
			//console.log(final_transcript);
			final_transcript = "";
		
			if (!sra.settings.sr_audio_pause)
			if ( (sra.settings.use_wakeup_phrase && interim_transcript.match(re)) || !sra.settings.use_wakeup_phrase || sra.settings.wakeup_timeout)
			{	
				chrome.power.requestKeepAwake("display"); // Request to wake up screen
				chrome.power.releaseKeepAwake(); // Allow screen to sleep again
				if (sra.settings.prevent_display_sleep)
					chrome.power.requestKeepAwake("display"); 
				else if (sra.settings.prevent_system_sleep)
					chrome.power.requestKeepAwake("system");  
			}
	    };
	  
		recognition.onresult = window["sr_result"]; // Version 1.6.7 - Created window["sr_result"] function
	 	/*var two_line = /\n\n/g;
		var one_line = /\n/g;
		 function linebreak(s) {
	  		//return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
			return s.replace(/\n/g, '<br>'); // Version 1.4.9 because it was not capitalizing after new paragraph replace above
		}*/
	
		/*var first_char = /\S/;
		function capitalize(s) {
	  		return s.replace(first_char, function(m) { return m.toUpperCase(); });
		}*/
		
	
	}

}


function linebreak(s) { // Version 1.7.0b - Moved out of bottom of start_sr() function above
	//var two_line = /\n\n/g;
	//var one_line = /\n/g;
	//return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
	return s.replace(/\n/g, '<br>'); // Version 1.4.9 because it was not capitalizing after new paragraph replace above
}


function check_spans() { 
	// Version 0.99.9 - Since speech_div is contenteditable now the user can accidentally erase
	// final_span and interim_span. So we need to recreate them if that happens
	if (!document.getElementById('final_span')) {
		var final_span = document.createElement('span');
		final_span.id = "final_span";
		document.getElementById('speech_div').appendChild(final_span);
	}
	if (!document.getElementById('interim_span')) {
		var interim_span = document.createElement('span');
		interim_span.id = "interim_span";
		interim_span.style.color = "#666666";
		document.getElementById('speech_div').appendChild(interim_span);
	}
	
}


// Version 1.7.0b - Let content script send returned text from script command into final_span
function textbox(final_transcript, date) {	
	date = date || new Date().getTime(); // Version 1.7.0c 
	if (date == window["textbox_date"]) 
		return;
	window["textbox_date"] = date;
	// Print in textbox on sr.js
	var final_transcript2 = "";
	var speech_iframe = document.getElementById("speech_iframe").contentDocument; // Version 1.7.6
	var speech_div = speech_iframe.getElementById("speech_div"); // Version 1.7.6
	// Delete interim_span if it exists so the text doesn't insert in it
	if (speech_iframe.getElementById("interim_span")) 
		speech_iframe.getElementById("interim_span").remove();
	
	final_transcript2 = speech_iframe.defaultView.capitalize(speech_div, auto_punctuation(final_transcript)); // Version 1.7.6 - From capitalize to speech_iframe.defaultView.capitalize (Using the function in content.js)
	final_transcript2 = final_transcript2.replace(/ ?\n ?/g, '\n\u200c'); // Version 1.7.6 - linebreak for insertText
	if (sra.settings.always_lowercase) // Version 1.5.2
		final_transcript2 = final_transcript2.toLowerCase();

	// Insert final_transcript
	/*
	// Try inserting a textNode. Doesn't work with new lines
	var final_speech_node = speech_iframe.createTextNode(final_transcript2);
	var range = speech_iframe.getSelection().getRangeAt(0);
	range.insertNode(final_speech_node);
	range.collapse(false); // Collapse range to the end
	*/
	var sent = speech_iframe.execCommand("insertText", false, final_transcript2); // so insert final_transcript at cursor // Version 1.7.6 - From insertHTML to insertText
	if (!sent) { // If SRA starts in the background for some reason it doesn't autofocus on the contentEditable element
		if (speech_iframe.activeElement != speech_div)
			speech_div.focus(); // Version 1.7.6 - Focus on speech_div if it is not focused	
		speech_iframe.execCommand("insertText", false, final_transcript2); // Try insertText again
	}
	// Scroll to cursor
	speech_iframe.defaultView.scrollToCursor(speech_div); // Version 1.7.6 - Call function in iframe
	/*if (document.activeElement == document.getElementById('speech_div') && final_span.innerHTML != "") { // Version 0.99.9 - final_span is contenteditable
		var final_transcript2 = capitalize(document.getElementById('speech_div'), auto_punctuation(final_transcript));
		if (sra.settings.always_lowercase) // Version 1.5.2
			final_transcript2 = final_transcript2.toLowerCase();
		document.execCommand("InsertHTML", false, final_transcript2); // so insert final_transcript at cursor
	}
	else {
		if (document.activeElement == document.getElementById('speech_div')) document.getElementById('speech_div').blur();
		var final_transcript2 = capitalize2(final_span.innerText, auto_punctuation(final_transcript)); 
		if (sra.settings.always_lowercase) // Version 1.5.2
			final_transcript2 = final_transcript2.toLowerCase();
		final_span.innerHTML += linebreak(final_transcript2);
	}*/
}


function interim_box(interim_transcript) { // Version 1.7.6
	var speech_iframe = document.getElementById("speech_iframe").contentDocument; // Version 1.7.6
	var speech_div = speech_iframe.getElementById("speech_div"); // Version 1.7.6
	
	if (!sra.settings.disable_speech2text) {
	
		if (speech_iframe.getElementById("interim_span"))
			var interim_span = speech_iframe.getElementById("interim_span");
		else {
			var interim_span = speech_iframe.createElement("span");
			interim_span.id = "interim_span";
			interim_span.style.color = "#666666";	
		}

		// Version 1.7.6 - Move interim_span to caret position
		if (speech_iframe.getSelection().rangeCount > 0) {
			var range = speech_iframe.getSelection().getRangeAt(0);
			var clone = range.cloneRange();  
			clone.insertNode(interim_span); // Add interim to span then it preserves CTRL+B and will replace selected text
		}
		// Write to interim
		interim_span.innerHTML = linebreak(interim_transcript);
	}
	else { // If speech to text is disabled then print in info box
		if (document.getElementById('info_box')) // Version 1.5.2
			document.getElementById('info_box').innerHTML = "<b>Speech: </b>"+
			"<span style='color:#666666;'>"+interim_transcript+"</span>";
	}
	// Scroll to interim just in speech_div
	if (!sra.settings.disable_speech2text) { // Don't scroll to interim if speech2text is disabled
		var el = interim_span;
		var elem = speech_div;
		var elRect = speech_div.getBoundingClientRect();
		var cursorRect = el.getBoundingClientRect();
		var bottom = elRect.bottom; 
		if (cursorRect.bottom > bottom && elRect.height > 0) // If cursor is below the current scroll of element // Version 1.5.3 - From elRect.bottom to bottom
			elem.scrollTop = elem.scrollTop + (cursorRect.bottom-bottom) + (elRect.height-el.clientHeight); // Version 1.5.3 - From elRect.bottom to bottom
		else if (cursorRect.top < (elRect.top+elem.scrollTop) && elRect.height > 0) // If cursor is above the current top of the element
			elem.scrollTop = elem.scrollTop - (elRect.top-cursorRect.top);
		// elRect.width = element width including scrollbar; el.clientWidth = element width without scrollbar
		if (elem != el.ownerDocument.scrollingElement) { // Version 1.5.4 - Don't scroll sideways on document.scrollingElement
			if (cursorRect.left > elRect.right) // If cursor is to the right of the current scroll of element // Version 1.5.3 - Changed from cursorRect.right to cursorRect.left
				elem.scrollLeft = elem.scrollLeft + (cursorRect.right-elRect.right) + (elRect.width-el.clientWidth);
			else if (cursorRect.left < elRect.left) // If cursor is to the left of the left side of the element
				elem.scrollLeft = elem.scrollLeft - (elRect.left-cursorRect.left);
		}
	}
	// Remove interim if it is empty
	if (interim_transcript == "")
		interim_span.remove();

	{ // Version 1.7.6 delete interim
		//if (speech_iframe.getElementById("interim_span"))
		//	speech_iframe.getElementById("interim_span").remove();
		
	}
}

function create_analyser() // https://jsfiddle.net/sh9v7fzm/2/
{
	// This function creates an audio analyser (volume meter)
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia; // Version 1.6.5 - Added navigator.getUserMedia ||
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	// https://addpipe.com/blog/audio-constraints-getusermedia/
	// In Chrome to turn autoGainControl off you have to set echoCancellation to false
	var autoGainControl = (sra.settings.disable_auto_gain_control) ? false : true;
	var constraints = { // Version 1.4.2h - Stop Chrome from changing Windows microphone volume
  		audio: {
    		echoCancellation: autoGainControl,
    		noiseSuppression: true,
    		autoGainControl: autoGainControl,
  		},
  		video: false
	};
	if (window['stream']) {
		var tracks = window['stream'].getTracks();
		if (tracks[0].readyState == 'live')
			tracks[0].stop();
	}
	
	//navigator.getUserMedia(constraints, stream_success_callback, stream_error_callback); // Version 1.6.5 - Moved success callback and error callback to separate functions
	navigator.mediaDevices.getUserMedia(constraints) // Version 1.6.5 - navigator.mediaDevices.getUserMedia because navigator.getUserMedia is being deprecated
	.then(stream_success_callback)
	.catch(stream_error_callback);
}	


function stream_success_callback(stream){ // Version 1.0.8 - Was navigator.webkitGetUserMedia
		start_sr(); // Version 1.6.5 - Added to here instead of start_all();
		window['stream'] = stream;
		if (test_mode) console.log(stream);
		var tracks = stream.getTracks();
		if (test_mode) console.log(tracks[0].getSettings());
		if (test_mode) console.log(tracks[0].getConstraints());
		audioContext = new AudioContext();
	    analyser = audioContext.createAnalyser();
	    microphone = audioContext.createMediaStreamSource(stream);
	    //javascriptNode = audioContext.createScriptProcessor(256, 1, 1); // Version 1.50 - Removed because console error: The ScriptProcessorNode is deprecated. Use AudioWorkletNode instead. (https://bit.ly/audio-worklet)
	
	    analyser.smoothingTimeConstant = 0.3;
	    analyser.fftSize = 2048;
	
	    microphone.connect(analyser);
	    // analyser.connect(javascriptNode); // Version 1.5.0 - Removed
	    // javascriptNode.connect(audioContext.destination); // Version 1.5.0 - Removed
	
	    /*canvasContext = document.getElementById("test");
	    canvasContext= canvasContext.getContext("2d");*/
	
	    // javascriptNode.onaudioprocess = function() { // Version 1.5.0 - Removed 
		function change_analyser() { // Version 1.5.0 - Added
	        var array =  new Uint8Array(analyser.frequencyBinCount);
	        analyser.getByteFrequencyData(array);
	        var values = 0;
	
	        var length = array.length;
	        for (var i = 0; i < length; i++) {
	            values += array[i];
	        }
	
	        var average = values / length;
	       	/* canvasContext.clearRect(0, 0, 60, 130);
	        canvasContext.fillStyle = '#00ff00';
	        canvasContext.fillRect(0,130-average,25,130); */
	        var sr_sound_level = (document.getElementById('sr_sound_level')) ? document.getElementById('sr_sound_level') : false ;
	        sr_sound_level.style.width = (average * 0.6) + "px"; // Version 1.6.5 - From average to (average * 0.6)
			if (test_mode && average > max_level) { // Version 1.6.2 - Testing max sound level. Went to 138
				max_level = average;
				console.log("Sound level: "+max_level);
			}
			window.requestAnimationFrame( change_analyser ); // Version 1.5.0
	    }
		change_analyser(); // Version 1.5.0
	
	} 
	
function stream_error_callback(error){
			console.log(new Date().toISOString()+" Error getting audio stream from getUserMedia: "+error);
			if (document.getElementById("error")) { // Version 1.5.4g - In case no microphone found
				console.log(error.message);
				if (error.message && error.message.match(/Requested device not found/i))
					error += ". Cannot find microphone. ";
				document.getElementById("error").innerHTML += " Error getting audio stream from getUserMedia: "+error;
			}
			
		}
	
	// ); // Version 1.6.5 - Moved success callback and error callback to separate functions


function send_to_background(obj)
{	
	chrome.runtime.sendMessage(obj, function(response) {
		if (test_mode) console.log(response.farewell);
	});
}

var wait_for_me = false; // Version 1.2.0

function send_to_content(obj)
{		
	if (sra.settings.sr_audio_pause) return;
	
	// get the currently active tab
	if (sra.settings.chrome_windows) var cur_tab_obj = { active: true, lastFocusedWindow: true}; // Version 1.2.0
	else var cur_tab_obj = { active: true, currentWindow: true}; // Version 1.2.0
	chrome.tabs.query(cur_tab_obj, function (tabs) {
		var active_tab = tabs[0].id;
		/* 	Version 1.7.3 - From url() function in commands.js:
			If focused is false and user has extra commands then 
			previously it would send the extra commands to SRA tab and do nothing.
			So let's make it have a background_tab for a few seconds that 
			send_to_content() can use.
		*/
		if (window["background_tab"]) {
			if (test_mode) console.log(window["background_tab"]);
			active_tab = window["background_tab"]; // Version 1.7.3
		}	
	/*	if (active_tab == current_tab_id) // if we are alreay sending to this tab
		{
			// wait until we are done sending current message
			setTimeout(function(){ 
				send_to_content(obj);
			}, 200);
		}*/
		if (test_mode) console.log(tabs[0].url);
		var newtab_urls = [ // Version 1.6.2 - Change google new tab and edge new tab to url that extensions will work on
			{ old_url : "chrome://newtab", new_url : "https://www.google.com" },
			{ old_url : "edge://newtab", new_url : "https://www.msn.com/" },
		]
		//if (tabs[0].url.match(/^chrome:\/\/newtab/i) || (tabs[0].url.match(/^https:\/\/www.google.com/i) && wait_for_me)) {// Version 0.99.8 - Redirect to Google newtab that allows content.js
		for (var i = 0; i < newtab_urls.length; i++) { // Version 1.6.2
			if (tabs[0].url.indexOf(newtab_urls[i].old_url) == 0 || 
				(tabs[0].url.indexOf(newtab_urls[i].new_url) == 0 && wait_for_me))
			{
				//if (tabs[0].url.match(/^https:\/\/www.google.com/i)) return; // Version 1.6.2
				if (tabs[0].url.indexOf(newtab_urls[i].new_url) == 0) return; // Version 1.6.2
				chrome.tabs.update(tabs[0].id, {"url": newtab_urls[i].new_url}, function (tab) { // Version 1.6.2 - From "https://www.google.com" to newtab_urls[i].new_url
					setTimeout(function(){ // Version 1.2.0
						wait_for_me = false;
						send_to_content(obj); // Then call send_to_content(obj) again after content.js injected
					}, 400);
				}); // Version 1.1.2 - Redirect to google.com
				wait_for_me = true;
				return; // Version 1.2.0
			}
		}
			//chrome.tabs.update(tabs[0].id, {"url": "https://www.google.com/_/chrome/newtab"}); // Version 1.1.2 - Chrome no longer allows content scripts in this newtab either - https://codereview.chromium.org/2978953002/
		
		if (tabs[0].url.match(/^chrome|^edge|\/\/microsoftedge.microsoft.com|\/webstore/i) && (tabs[0].url != window.location.href)) // if current tab is not the speech recognition tab // Version 1.6.2 - Added |^edge|\/\/microsoftedge.microsoft.com
		{	
			var error = chrome.i18n.getMessage("chrome_pages_error"); // Version 1.1.3
			/* if (last_error != error) { // Version 1.5.4g // Version 1.6.2 - Commented out
				document.getElementById('error').innerHTML +=  error; // Version 1.5.4h - From = to +=
				last_error = error; // Version 1.5.4g
			}*/
			flash_tab(error); // Version 1.6.2
			return; // Version 1.6.2
		}	
		// Version 0.98.9 - 8/17/2017 - Communicate with Google Docs
    /*	if (tabs[0].url.match(/docs.google/i) && obj.hasOwnProperty("speech")) {
    		var xhr = new XMLHttpRequest();
    		// https://script.google.com/macros/s/AKfycbwD5W8jfje3R_0QySa62lZQqW6hJpMJsXLeHX_r9JKxDaGDx2_J/exec
    		// https://script.google.com/macros/s/AKfycbwkCQDD61un0LhokS5AaP3zk_2ToG5EYPym_tU8RiMJZGRV99zH/exec
    		var my_app = "https://script.google.com/macros/s/AKfycbwD5W8jfje3R_0QySa62lZQqW6hJpMJsXLeHX_r9JKxDaGDx2_J/exec?speech="+obj.speech;
    		xhr.open("GET", my_app);
			xhr.onreadystatechange = function handleResponse() {
				if (xhr.readyState == 4) {
			    	var result = xhr.responseText;
			  	}
			}
			xhr.responseType = "text";
			xhr.send(null);
			return;
    	} */
		
		else if (window["background_tab"] || tabs[0].url != window.location.href) // if current tab is not the speech recognition tab // Version 1.7.3 - Added !window["background_tab"] ||
		chrome.tabs.sendMessage(active_tab, obj, function(response) {
			
		if (chrome.runtime.lastError) 
    	{
            console.log('ERROR: ' + chrome.runtime.lastError.message);
            
        /* Above gets "ERROR: Could not establish connection. Receiving end does not exist"
			if you run it on chrome://extensions/ page or if the extension is just installed
			and the page has not been refreshed */
			if (chrome.runtime.lastError.message.match(/Receiving end does not exist/i))
			{
			
				if (!tabs[0].url.match(/^chrome|\/webstore/i))
				{
					var error = chrome.runtime.lastError.message+ // Version 1.5.4h - From = to +=
						chrome.i18n.getMessage("chrome_runtime_error");
					/*if (last_error != error) { // Version 1.5.4g // Version 1.6.2 - Commented out
						document.getElementById('error').innerHTML += error;
						last_error = error;
					}*/
				}	
				/*  Inject content.js in active tab.
					Need "permissions": ["activeTab"] in manifest.json for this to work
				*/
				if (!tabs[0].url.match(/^(chrome:\/\/newtab|https:\/\/www.google.com\/_\/chrome\/newtab)/i))
				chrome.scripting.executeScript( // Version 1.7.0 - Manifest V3
					{
					  target: {tabId: active_tab, allFrames: true}, // Version 1.7.3 - From tabs[0].id to active_tab
					  files: ['storage.js', 'content.js', "keypress.js", "googleDocsUtil.js"],
					}, function() {
        				if (chrome.runtime.lastError) {
            				console.error(chrome.runtime.lastError.message);
							var error = chrome.runtime.lastError.message; // Version 1.7.3
							flash_tab(error); // Version 1.6.2
        				}
        				else
        				{
        					setTimeout(function(){ 
								send_to_content(obj); // Then call send_to_content(obj) again after content.js injected
							}, 300);
        				}
        			});
					/*chrome.tabs.executeScript(tabs[0].id, {file: "storage.js"}, function() {
					 if (chrome.runtime.lastError) 
            			console.error(chrome.runtime.lastError.message);
				 	chrome.tabs.executeScript(tabs[0].id, {file: "content.js"}, function() {
        				if (chrome.runtime.lastError) {
            				console.error(chrome.runtime.lastError.message);
							flash_tab(error); // Version 1.6.2
        				}
        				else
        				{
        					setTimeout(function(){ 
								send_to_content(obj); // Then call send_to_content(obj) again after content.js injected
							}, 300);
        				}
        			});
   				 });*/
				
			}
			else // Another error
			{
				var error = chrome.runtime.lastError.message; // Version 1.5.4h - From = to +=
				if (chrome.runtime.lastError.message.match(/The extensions gallery cannot be scripted/i)) // Version 1.6.2	
					error += chrome.i18n.getMessage("chrome_pages_error"); // Version 1.6.2
				else	
					error += chrome.i18n.getMessage("chrome_runtime_error"); // Version 1.1.3
				
				
				flash_tab(error); // Version 1.6.2
			
			}
		}
		else // No error
		{
			if (test_mode) console.log(JSON.stringify(response));
			// No error so wipe out error messages
			err_blank_timer = setTimeout(function(){ // Version 1.6.1 - Added err_blank_timer
				document.getElementById('error').innerHTML = "";
				last_error = ""; // Version 1.6.2 - Forgot to reset last_error before
			}, 15000); // Version 1.3.5 - Changed from 5000 to 10000 // Version 1.5.2g - Changed from 10000 to 15000
			
			if (response.hasOwnProperty("command"))
			{
				if (window[obj.command])
					window[obj.command](obj.option);
			}
			
			if (response.hasOwnProperty("color")) 
			{
				if (response["color"] == "reset")
					document.getElementById('fontcolor').value = "#FFEEDD";
				else	
					document.getElementById('fontcolor').value = response["color"];
			}
			if (response.hasOwnProperty("background-color")) 
			{
				if (response["background-color"] == "reset")
					document.getElementById('bgcolor').value = "#FFEEDD";
				else	
					document.getElementById('bgcolor').value = response["background-color"];
			}
		}
  	});
	else { // Version 1.7.6 - We are in sr.html tab so send the command to iframe.html
		var speech_iframe = document.getElementById("speech_iframe").contentDocument; // Version 1.7.6
		if (speech_iframe.defaultView.window['content_listener']) { // Version 1.7.6 - Call function in speech_iframe content.js
			if (!obj.interim) // Send every command but interim to content script
			speech_iframe.defaultView.window['content_listener'](obj, "sr.html");
		}
		
	}
  	//current_tab_id = false;
  	
	}); 

}


function flash_tab(error) { // Version 1.6.2 - Removed from sent_to_content and created callable function
	if (last_error != error || document.getElementById('error').innerHTML == "") { // Version 1.6.1 - Added || document.getElementById('error').innerHTML == ""
		document.getElementById('error').innerHTML += error;
		last_error = error;
	}
	// Highlight the speech recognition tab by first getting the current tab id
	/*chrome.tabs.getCurrent(function(tab) {
		chrome.tabs.update(tab.id, {highlighted: true, active: false}); // Version 1.3.5 - Try to stop it from switching to SRA tab on errors. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/update - active: false did not work
	});*/
	clearInterval(err_timer);
	err_timer = setInterval(function(){ // Flash document title 10X to get their attention
		if (err_num % 2) // num is odd
			document.title = chrome.i18n.getMessage("appName");
		else 
			document.title = "NOTICE"; // Version 1.6.2 - From ERROR to NOTICE
		err_num++;
		if (err_num >= 10) {
			document.title = chrome.i18n.getMessage("appName");
			clearInterval(err_timer);
			err_num = 0;
		}
	}, 500);
	
}


// Find out if any tab has been updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    //console.log(JSON.stringify(changeInfo));
    //console.log(JSON.stringify(tab));
    
    if (sra.settings.use_wakeup_phrase && !sra.settings.wakeup_timeout) {
		if (sr_msg && !sr_msg.innerHTML.match(escapeRegex(chrome.i18n.getMessage("wakeup_phrase_msg")))) // Listening for wakeup phrase
			sr_msg.innerHTML += chrome.i18n.getMessage("wakeup_phrase_msg")+sra.settings.wakeup_phrase+"."; // Version 1.7.6
    }
	else if (sr_msg)
		sr_msg.innerHTML = sr_msg.innerHTML.replace(chrome.i18n.getMessage("wakeup_phrase_msg")+sra.settings.wakeup_phrase+".",""); // Version 1.7.6 - Replaced "Listening for wake up phrase:" with chrome.i18n.getMessage("wakeup_phrase_msg")
	
	if ( (changeInfo.hasOwnProperty("mutedInfo") && changeInfo.mutedInfo.muted) ||
		 (changeInfo.hasOwnProperty("audible") && changeInfo.audible == false) )
	{
		// All of this is not needed. Because we are repeating it down below
		if (sr_msg) 
			sr_msg.innerHTML = sr_msg.innerHTML.replace(chrome.i18n.getMessage("pause_for_audio_msg"),""); // Version 1.7.6 replaced && sr_msg.innerHTML.match(/^Speech Recognition output is paused/i)) sr_msg.innerHTML = "";
		chrome.action.setBadgeText({text: "On"}); // Removed tabID to affect every tab
		chrome.action.setBadgeBackgroundColor({"color": [255, 0, 0, 100]}); 
		sra.settings.sr_audio_pause = false; // Change sra object
		var obj = { settings : sra.settings };
		if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
		save_to_storage(obj);
	}
   
	// See if any tabs are playing audio and are not muted
	chrome.tabs.query({ audible: true, muted: false }, function (tabs) {
		
		if (tabs.length > 0 && sra.settings.pause_for_audio) // We found some tabs that are playing audio
		{
			if (sr_msg && !sr_msg.innerHTML.match(escapeRegex(chrome.i18n.getMessage("pause_for_audio_msg"))))
				sr_msg.innerHTML += chrome.i18n.getMessage("pause_for_audio_msg"); // Version 1.7.6
			chrome.action.setBadgeText({text: 'Off'}); // Removed tabID to affect every tab
			chrome.action.setBadgeBackgroundColor({"color": [200, 200, 0, 200]}); // yellow, transparency
			sra.settings.sr_audio_pause = true; // Change sra object
			var obj = { settings : sra.settings };
			if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
			save_to_storage(obj);
    	}
    	else if (sra.settings.sr_audio_pause) // no tabs are playing audio
    	{
    		if (sr_msg) 
				sr_msg.innerHTML = sr_msg.innerHTML.replace(chrome.i18n.getMessage("pause_for_audio_msg"),""); // Version 1.7.6 replaced && sr_msg.innerHTML.match(/^Speech Recognition output is paused/i))
			chrome.action.setBadgeText({text: "On"}); // Removed tabID to affect every tab
			chrome.action.setBadgeBackgroundColor({"color": [255, 0, 0, 100]}); 
			sra.settings.sr_audio_pause = false; // Change sra object
			var obj = { settings : sra.settings };
			if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
			save_to_storage(obj);
    	}
    });
    
	//chrome.action.setBadgeText({text: newText, tabId: tab.id});
});

// Find out if any tab has been closed - Version 1.1.1
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	
	// See if any tabs are playing audio and are not muted
	chrome.tabs.query({ audible: true, muted: false }, function (tabs) {
		
		if (tabs.length > 0 && sra.settings.pause_for_audio) // We found some tabs that are playing audio
		{
			if (sr_msg && !sr_msg.innerHTML.match(escapeRegex(chrome.i18n.getMessage("pause_for_audio_msg"))))
				sr_msg.innerHTML += chrome.i18n.getMessage("pause_for_audio_msg"); // Version 1.7.6
			chrome.action.setBadgeText({text: 'Off'}); // Removed tabID to affect every tab
			chrome.action.setBadgeBackgroundColor({"color": [200, 200, 0, 200]}); // yellow, transparency
			sra.settings.sr_audio_pause = true; // Change sra object
			var obj = { settings : sra.settings };
			if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
			save_to_storage(obj);
    	}
    	else if (sra.settings.sr_audio_pause) // no tabs are playing audio
    	{
    		if (sr_msg) 
				sr_msg.innerHTML = sr_msg.innerHTML.replace(chrome.i18n.getMessage("pause_for_audio_msg"),""); // Version 1.7.6 replaced && sr_msg.innerHTML.match(/^Speech Recognition output is paused/i))
			chrome.action.setBadgeText({text: "On"}); // Removed tabID to affect every tab
			chrome.action.setBadgeBackgroundColor({"color": [255, 0, 0, 100]}); 
			sra.settings.sr_audio_pause = false; // Change sra object
			var obj = { settings : sra.settings };
			if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
			save_to_storage(obj);
    	}
    });
});


chrome.idle.onStateChanged.addListener(function(newState) {
	if (test_mode) console.log(new Date().toISOString()+" "+newState);
  	// if (test_mode) final_span.innerHTML += newState; // Verison 1.6.5 - Removed
  	if(newState == "idle") {
  		/* Chrome goes to idle even if we are using the web speech API, I suppose
  		because we are not using the mouse or keyboard. This causes web speech API "network" error.
		So how do we tell Chrome that we are using the web speech API so it should 
		not go to "idle"? */
  	}
	if(newState == "locked") {
   	 // Reset the state as you wish
   	
  	}
});


//chrome.power.requestKeepAwake("system");

chrome.runtime.onMessage.addListener(
	function(obj, sender, sendResponse) {
		if (test_mode) console.log(JSON.stringify(obj));	
			
		if (obj.hasOwnProperty("command"))
			{
				if (window[obj.command]) {
					if (obj.command == "say")
						window[obj.command](obj.option, sender);
					else
						window[obj.command](obj.option, obj.date);
				}
			}
		if (obj.hasOwnProperty("wakeup_timeout"))
		{
			wakeup_timeout = false;
			updateBadge();
		}
    	sendResponse({farewell: "From sr.js: I got the object."}); // Version 1.4.4b
    });


function updateBadge(tabId)
{	
	if (sra.settings.use_wakeup_phrase && !sra.settings.wakeup_timeout) // Listening for wakeup phrase
	{	
		chrome.action.setBadgeText({text: 'On'}); // Removed tabID to affect every tab
		chrome.action.setBadgeBackgroundColor({"color": [200, 200, 0, 200]}); // yellow, transparency
		if (sr_msg && !sr_msg.innerHTML.match(chrome.i18n.getMessage("wakeup_phrase_msg")+sra.settings.wakeup_phrase+"."))
			sr_msg.innerHTML += chrome.i18n.getMessage("wakeup_phrase_msg")+sra.settings.wakeup_phrase+"."; // Version 1.7.6		
	}	
	else // Detected wakeup phrase or not using wakeup phrase
	{
		chrome.action.setBadgeText({text: 'On'}); // Removed tabID to affect every tab
		chrome.action.setBadgeBackgroundColor({"color": [255, 0, 0, 100]}); // red, transparency
		if (sr_msg) 
			sr_msg.innerHTML = sr_msg.innerHTML.replace(chrome.i18n.getMessage("wakeup_phrase_msg")+sra.settings.wakeup_phrase+".",""); // Version 1.7.6 - Replaced "Listening for wake up phrase:" with chrome.i18n.getMessage("wakeup_phrase_msg")	
	}
	
	if (sra.settings.sr_audio_pause) // pausing because of audio being played in a tab
	{	
		chrome.action.setBadgeText({text: 'Off'}); // Removed tabID to affect every tab
		chrome.action.setBadgeBackgroundColor({"color": [200, 200, 0, 200]}); // yellow, transparency
		if (sr_msg && !sr_msg.innerHTML.match(escapeRegex(chrome.i18n.getMessage("pause_for_audio_msg"))))
			sr_msg.innerHTML += chrome.i18n.getMessage("pause_for_audio_msg"); // Version 1.7.6
	}
	
	if (sra.settings.disable_speech2text) { // Version 1.7.6
		if (sr_msg && !sr_msg.innerHTML.match(escapeRegex(chrome.i18n.getMessage("disable_speech2text_msg"))))
			sr_msg.innerHTML += chrome.i18n.getMessage("disable_speech2text_msg"); // Version 1.7.6
	}
	else if (sr_msg)
		sr_msg.innerHTML = sr_msg.innerHTML.replace(chrome.i18n.getMessage("disable_speech2text_msg"),"");
	
	if (sra.settings.disable_commands) { // Version 1.7.6
		if (sr_msg && !sr_msg.innerHTML.match(escapeRegex(chrome.i18n.getMessage("disable_commands_msg"))))
			sr_msg.innerHTML += chrome.i18n.getMessage("disable_commands_msg"); // Version 1.7.6
	}
	else if (sr_msg)
		sr_msg.innerHTML = sr_msg.innerHTML.replace(chrome.i18n.getMessage("disable_commands_msg"),"");
	
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
				if (key.match(/^(use_wakeup_phrase|disable_speech2text|disable_commands)/i)) // this will match if it is true or false .oldValue .newValue // Version 1.7.6 - Added |disable_speech2text|disable_commands
					updateBadge();	
			}
		}
	}
}

function activate_google_mic() { // Version 1.5.4f - Google Search by voice no longer works with url params unless you click microphone first
	send_to_content({ "command" : 
	//"document.querySelector('[aria-label=\"Search by voice\"]').click()",
	"click_keyword",
	"option" : ["search by voice"],
	"date" : new Date().getTime() }); 	
}


function virtual_assistant_search(speech)
{
	var new_tab = false;
	var url = "https://www.google.com/search?gs_ivs=1&inm=vs&q="+speech;
	if (sra.settings.virtual_assistant_mode == false) return false;
	
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		var active_tab = tabs[0];
		if (active_tab.url == window.location.href || active_tab.url.match(/https?:\/\/(www\.)?google\./i) || active_tab.url.match(/chrome:\/\/newtab/i)) // if current tab is sr.html or google.com
		{
			if (active_tab.url == window.location.href) // if current tab is the speech recognition tab
				new_tab = true;	
			
			if (new_tab)
			{	
				chrome.tabs.create({"url":url,"active":true}, function(tab){
			        /* tab_id = tab.id;
			        tab_url = tab.url;
			        updateBadge(); */
					/*chrome.tabs.onUpdated.addListener(function listener (tabId, info) { // Version 1.5.4f
						if (info.status === 'complete' && tabId === tab.id) {
							chrome.tabs.onUpdated.removeListener(listener);
							activate_google_mic(); // Version 1.5.4f - Click on search by voice 
							setTimeout(function() {
								chrome.tabs.update(tab.id, {"url": url}); // Version 1.5.4f - Then reload tab
							}, 2000);
						}
						return true;
					});*/
					// document.querySelector('[data-attrid="description"]').innerText;
					// document.querySelector('[class*="card-section"]').innerText;
					// document.getElementById("wob_tm").innerText; // Weather
			    });
			}
			else
			{
				// Change url of current tab
				chrome.tabs.update(active_tab.id, {"url": url});
				/*activate_google_mic(); // Version 1.5.4f
				setTimeout(function() {
					chrome.tabs.update(active_tab.id, {"url": url});
				}, 2000);	*/
			}
			return true;
		}
		else 
			return false;
	});
}


function replace_mistakes(speech)
{	
	
	
	for (var key in replace_words_obj)
	{
		//var re = new RegExp("\\b"+key+"\\b",'i'); // insensative case search: 'i'; beginning of string: ^
		try {	// Version 1.3.7 - Added try and catch
			var key_check = key;
			var start = (key_check.charAt(0) != "|") ? "(?:^| )" : ""; // Version 1.5.2k - For Chinese and Japanese we don't want any word boundaries // Version 1.6.2 - Added ?:
			if (key_check.charAt(0) == "|") key_check = key_check.substring(1); // Version 1.5.2k - remove first character
			var end = (key_check.charAt(key_check.length - 1) != "|") ? "(?:\\b| |$)" : ""; // Version 1.5.2k - For Chinese and Japanese we don't want any word boundaries
			if (key_check.charAt(key_check.length - 1) == "|") key_check = key_check.substring(0, key_check.length - 1); // Version 1.5.2k - remove last character // Version 1.6.2 - Added ?:
			var re = new RegExp(start+key_check+end,'ig'); // insensative case search: 'i'; beginning of string: ^ // Version 1.2.2 - Added 'g' // Version 1.5.2k - Added |$
		} catch(err) { 
			console.log(err);
			send_to_content({ "interim" : err.message });
			document.getElementById('error').innerHTML = "Custom command error: "+err.message;
		}
		// version 1.3.5 - if the exact replace word is in a custom_commands phrase then don't replace it so custom command will work
		var is_in_custom_commands = false;
		for (var i = 0; i < sra.custom_commands.length; i++) // loop through commands
		{
			if (sra.custom_commands[i].enable) {
				var phrase = sra.custom_commands[i].phrase;
				try {	// Version 1.3.7 - Added try and catch
					var re2 = new RegExp("^(" + phrase + ")$",'i'); // insensitive case search: 'i'; beginning of string: ^
				} catch(err) { 
					console.log(err);
					send_to_content({ "interim" : err.message });
					document.getElementById('error').innerHTML = "Custom command error: "+err.message;
				}
				if (key.match(re2) && !phrase.match(/^\(?\.\*\??\)?$/)) // Version 1.7.6 - Added !phrase.match(/^\(?\.\*\??\)?$/) so that custom commands with .*? would get punctuation converted
					is_in_custom_commands = true;	
			}
		}
		if (!is_in_custom_commands)
			speech = speech.replace(re, replace_words_obj[key]).replace('\\',''); // Version 1.4.9 - Added .replace('\\','') because German new line and new paragraph were printing \n and \n\n on the screen 
	}
	return speech;
}


function setup_menus()
{
	/*var submenu_btns = document.getElementsByClassName("submenu_btn"); // Version 1.5.6b - Removed because using summary and details tags now
	for (var i = 0; i < submenu_btns.length; i++)
	{
		submenu_btns[i].addEventListener('click', function() {submenu();}, false);
	}*/
	document.getElementById('shortcuts_url').onclick = event => { // Version 1.4.0 - Link for keyboard shortcuts
		chrome.tabs.create({url: 'chrome://extensions/shortcuts'}); // Version 1.4.1 - Changed from chrome://extensions/configureCommands to chrome://extensions/shortcuts because it works with Edge
		event.preventDefault();
	};
	chrome.commands.getAll(function(commands) {  // Version 1.4.0 - Display shortcut key for starting/stopping SRA
		if (test_mode) console.log(commands);
		var shortcuts_div = document.getElementById('shortcuts');
		var string = "";
		for (var i = 0; i < commands.length; i++) {
			//if (commands[i].name.match(/browser/i)) // Version 1.7.0c - Removed. It is not _execute_browser_action in Manifest V3. 
			// Version 1.7.0c - Also Manifest V3 does not show _execute_action in chrome.commands.getAll()
				string += " ("+commands[i].shortcut+")";
				//string += commands[i].description + " : " + commands[i].shortcut + "<br />"; 
		}
		shortcuts_div.innerHTML += string;
	});
}


function submenu()
{	
	var element = event.target;
	
	while (element.parentNode && element.nodeName != "BUTTON")
		element = element.parentNode;
		
	var submenu = document.getElementById(element.getAttribute("data-menu"));
	
	// First display the div or close the div
	if (submenu.style.display != "inline-block")
		submenu.style.display = "inline-block";
	else
		submenu.style.display = "none";
		
	// Second change the right arrow into a down arrow or vice-versa
	var string = event.target.innerHTML;

	for (var i = 0; i < string.length; i++)
	{
		if(string.charCodeAt(i) == "9654")
		{
			string = string.substr(0, i) + String.fromCharCode(9660) + string.substr(i+1);
		}
		else if(string.charCodeAt(i) == "9660")
		{
			string = string.substr(0, i) + String.fromCharCode(9654) + string.substr(i+1);	
		}
	} 
	event.target.innerHTML = string; 
}


function setup_forms()
{
	var all_forms = document.forms;

	for (var i = 0; i < all_forms.length; i++)
	{
	    if (all_forms[i].name == "settings_form" || all_forms[i].name == "custom_commands_form") 
	    	all_forms[i].onsubmit = function() { return false; };
	    
		for (var j = 0; j < all_forms[i].length; j++)
	    {
			if (all_forms[i][j].type.match(/^(checkbox|submit)$/i))
			{
				// If FREE_TRIAL then disable buttons
				if (typeof sra.license === "undefined" || sra.license.match(/free/i)) {
					if (all_forms[i][j].name != "check_order") // Version 1.4.0
						all_forms[i][j].disabled = true;
				}
				else if (sra.license.match(/full/i))
				{
					all_forms[i][j].disabled = false;		
				}
						 
				all_forms[i][j].addEventListener('click', formclick, false); // Version 1.4.0 - Was function() {formclick();}
				if (sra.settings.hasOwnProperty(all_forms[i][j].name))
				{
					all_forms[i][j].checked = sra.settings[all_forms[i][j].name];	
				}
			}
			else if (all_forms[i][j].type.match(/^(text|range)$/i))
			{
				all_forms[i][j].addEventListener('input', formclick, false); // Version 1.4.0 - Was function() {formclick();}
				if (sra.settings.hasOwnProperty(all_forms[i][j].name) && sra.settings[all_forms[i][j].name] != false)
				{
					all_forms[i][j].value = sra.settings[all_forms[i][j].name];
					if (all_forms[i][j].name.match(/^tts/)) { // Make sure tts_pitch and tts_rate display the variable
						var new_event = new Event('input'); // By firing an 'input' event on the element
						all_forms[i][j].dispatchEvent(new_event);	
					}	
				}
				
				// In custom_commands_form: Add references to sra.custom_commands objects
				if (all_forms[i].name == "custom_commands_form")
				{
					var num = all_forms[i][j].name.replace(/\D/g,''); // Replace everything that is not a digit in the name
					var name = all_forms[i][j].name.replace(/[\d_]/g,''); // Replace everything that is a digit or underscore in the name
					//all_forms[i][j].object_ref = sra_custom_commands[num]; // Did not work! Created a copy of the object instead of a reference
					sra.custom_commands[num].number = parseInt(num); 
				}
			}
			else if (all_forms[i][j].type.match(/^(select)/i)) // could be select-one or select-multiple
			{
				all_forms[i][j].addEventListener('change', formclick, false); // Version 1.4.0 - Was function() {formclick();}
				if (sra.settings.hasOwnProperty(all_forms[i][j].name) && sra.settings[all_forms[i][j].name] != false)
				{
					if (typeof sra.settings[all_forms[i][j].name] == 'number') { // Version 1.5.8 - So that languages in other languages can be in alphabetical order
						all_forms[i][j].selectedIndex = sra.settings[all_forms[i][j].name]; // Version 1.5.8 - If I do it this way then it will be the wrong language because the selectedIndex was from English alphabetical order
						if (all_forms[i][j].name.match(/^(select_language)$/i)) // Version 1.5.8
							all_forms[i][j].value = languages[sra.settings[all_forms[i][j].name]].Code; // Version 1.5.8
					}
					else // Version 1.5.8 - if 'string'
						all_forms[i][j].value = sra.settings[all_forms[i][j].name]; // Version 1.5.8 - So that languages in other languages can be in alphabetical order
					if (all_forms[i][j].name.match(/^(select_language)$/i))
					{
						recognition.stop();
						recognition.lang = document.settings_form.select_language.value; // Version 0.98.1	
					}
				}
			}
			
		}
	}	
}

function formclick(event) // Version 1.4.0 - Changed formclick() to formclick(event)
{
	var el = event.currentTarget; // Target element of click // Version 1.5.6 - Changed from target to currentTarget because of Google Translate adding a font tag around translated text and causing an error // Version 1.7.6 - Added var
	if (el.form.name == "settings_form") // if dealing with the settings form
	{
		if (sra.settings.hasOwnProperty(el.name)) // If the form elements name is also a key in settings object
		{
			if (el.type.match(/^(checkbox)$/i))
				sra.settings[el.name] = el.checked; // Change sra object
			else if (el.type.match(/^(text|range)$/i))
				sra.settings[el.name] = el.value; // Change sra object
			else if (el.type.match(/^(select)/i)) // could be select-one or select-multiple
				sra.settings[el.name] = el.value; // Change sra object // Version 1.5.8 - Changed selectedIndex to value so that languages in other languages can be in alphabetical order
			var obj = { settings : sra.settings };
			if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
			save_to_storage(obj);
		}
		if (el.name == "disable_auto_gain_control") create_analyser(); // Version 1.4.2h
		if (el.name == "disable_continuous_recognition") { // Version 1.6.3
			if (sra.settings.disable_continuous_recognition)
				recognition.continuous = false;
			else
				recognition.continuous = true;
			recognition.stop();
		}
	}
	else if (el.form.name == "custom_commands_form") // if dealing with the settings form
	{
		if (test_mode) console.log(el.value);
		if (el.name.match(/^add/i)) { add_custom_command(); return; }
		if (el.name.match(/^export/i)) { export_commands(); return; }
		if (el.name.match(/^import_btn/i)) { document.getElementById('import_div').style.display = 'block'; return; }
		if (el.name.match(/^import_start/i)) { import_commands(); return; }
		var num = parseInt(el.name.replace(/\D/g,'')); // Replace everything that is not a digit in the name
		var name = el.name.replace(/[\d_]/g,''); // Replace everything that is a digit or underscore in the name
		if (el.name.match(/^delete/i)) { document.getElementById('confirm_span_'+num).style.display = 'inline'; return; } // Version 1.1.5
		if (el.name.match(/^no_/i)) { document.getElementById('confirm_span_'+num).style.display = 'none'; return; } // Version 1.1.5
		//sra.custom_commands[num][name] = el.value; // Old way using array position (which makes deleting difficult)
		//el.object_ref[name] = el.value; // New way which uses an object reference. Did not work because object_ref is a copy
		for (var i = 0; i < sra.custom_commands.length; i++) // loop through commands
		{
			if (sra.custom_commands[i].number == num)
			{
				if (el.type.match(/^(checkbox)$/i))
					sra.custom_commands[i][name] = el.checked; // Change sra object
				else if (el.type.match(/^(text)$/i))
					sra.custom_commands[i][name] = el.value;
				else if (el.type.match(/^(submit)$/i)) { // Version 1.1.5 - The default type for buttons in Chrome is "submit"
					if (el.name.match(/^yes_/)) {
						el.parentNode.parentNode.style.display = 'none'; // Hide custom_commands_box from screen
						var removed = sra.custom_commands.splice(i, 1); // Delete/Remove 1 element from array
						console.log(removed); // Could be used to undo deletion with: sra_commands.splice(removed.number, 0, removed);
					}
				}
			}
		}
		var obj = { custom_commands : sra.custom_commands };
		if (test_mode) console.log("custom_commands object: "+JSON.stringify(obj));
		save_to_storage(obj);
	}

}


function print_commands(cmds_array)
{
	var cmds_div = document.getElementById("commands_div");
	var string = "<table>";
	
	for (var i = 0; i < cmds_array.length; i++) // loop through commands
	{
		if (cmds_array[i].heading)
			string += "<tr><th colspan='2'>"+cmds_array[i].heading+"</th></tr>";
		if (cmds_array[i].description)
			string += "<tr><td colspan='2'>"+cmds_array[i].description+"</td></tr>";
		if (cmds_array[i].speech)
		{
			string += "<tr><td>"+cmds_array[i].speech+"</td>";
			string += "<td>"+cmds_array[i].output+"</td></tr>";
		}	 		
	}
	
	string += "</table>";
	
	cmds_div.innerHTML = string;
}


function print_custom_commands()
{
	var cmds_div = document.getElementById("custom_commands_div2");
	var string = "";
			
	//string += "<form name='custom_commands_form'>"; // Version 1.1.3
	/*string += "<button name='add1' title='Add Custom Voice Command'>+ Add</button>";
	string += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
	string += "<button name='export' title='Export Custom Commands'>Export</button>";
	string += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
	string += "<button name='import_btn' title='Import Custom Commands'>Import</button>";
	string += "<div style='display:none' id='import_div'>";
	string += "<span><b>Step 1</b><br />";
	string += "<label><input type='radio' name='import_type' value='append' checked>Append to Custom Commands</label><br \>";
	string += "<label><input type='radio' name='import_type' value='overwrite'>Overwrite Custom Commands</label><br \>";
	string += "</span><span><b>Step 2</b><br />";
	string += "<input name='import_file' type='file' accept='text/plain'>";
	string += "<button name='import_start' title='Start Import'>Start Import</button> <span id='import_error'></span>";
	string += "</span></div>";*/
	
	for (var i = 0; i < sra.custom_commands.length; i++) // loop through commands
	{
		if (sra.custom_commands[i].phrase)
		{
			/*var input_el = document.createElement("input");
			input_el.type = "text";
			input_el.value = sra.custom_commands[i].phrase; */
			string += "<div class='custom_commands_box'>";
			string += "<b data-lang='phrase'>Phrase</b>: <input name='phrase_"+i+"' type='text' value='"+sra.custom_commands[i].phrase.replace(/'/g,"&apos;")+"'>";
			string += " <b data-lang='action'>Action</b>: <input name='action_"+i+"' type='text' value='"+sra.custom_commands[i].action.replace(/'/g,"&apos;")+"'><br>"; // Version 0.99.7 - Added replace
			string += "<b data-lang='description'>Description</b>: <input name='description_"+i+"' type='text' value='"+sra.custom_commands[i].description.replace(/'/g,"&apos;")+"'>"; // Version 0.99.7 - Added replace
			string += "<label title='Enable/Disable'> <b data-lang='enable'>Enable</b>: <input type='checkbox' name='enable_"+i+"'";
			if (sra.custom_commands[i].enable == true) string += ' checked';
			string += "></label>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
			string += "<button name='delete_"+i+"' title='Delete Custom Voice Command' data-lang='delete'>Delete</button>"; // Version 1.1.5
			string += "<span id='confirm_span_"+i+"' style='display:none;'> <span data-lang='confirm'>Are you sure? </span>"; // Version 1.1.5
			string += "<button name='yes_"+i+"' data-lang='yes'>Yes</button>&nbsp;&nbsp;&nbsp;&nbsp;";
			string += "<button name='no_"+i+"' data-lang='no'>No</button></span>"; // Version 1.1.5
			string += "</div>";
		}	 		
	}
	
	//string += "<form name='custom_commands_form'>"; // Version 1.1.3
	//string += "<button name='add' title='Add Custom Voice Command'>+ Add</button>"; // Version 1.1.3
	
	//string += "</form>"; // Version 1.1.3
	
	cmds_div.innerHTML = string;

}

function add_custom_command()
{
	var string = "";
	var num = sra.custom_commands[sra.custom_commands.length - 1].number; // Get the last number used
	num = parseInt(num) + 1;
	var command_obj = { phrase : "", action : "", description : "", enable: true, number : num };
	//sra.custom_commands.unshift(command_obj); // Add new command to front of custom_commands array of objects
	sra.custom_commands.push(command_obj); // Add new command to back of custom_commands array of objects
	
	var div = document.createElement("div");
	div.className = "custom_commands_box";
	string += "<b data-lang='phrase'>Phrase</b>: <input name='phrase_"+num+"' type='text'>"; 
	string += " <b data-lang='action'>Action</b>: <input name='action_"+num+"' type='text'><br>";
	string += "<b data-lang='description'>Description</b>: <input name='description_"+num+"' type='text'>";
	string += "<label title='Enable/Disable'> <b data-lang='enable'>Enable</b>: <input type='checkbox' name='enable_"+num+"' checked></label>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
	string += "<button name='delete_"+num+"' title='Delete Custom Voice Command' data-lang='delete'>Delete</button>"; // Version 1.1.5
	string += "<span id='confirm_span_"+num+"' style='display:none'> <span data-lang='confirm'>Are you sure? </span>"; // Version 1.1.5
	string += "<button name='yes_"+num+"' data-lang='yes'>Yes</button>&nbsp;&nbsp;&nbsp;&nbsp;";
	string += "<button name='no_"+num+"' data-lang='no'>No</button></span>"; // Version 1.1.5
	string += "</div>";
	div.innerHTML = string;
	document.custom_commands_form.add.parentNode.insertBefore(div,document.custom_commands_form.add);
	
	
	// Add eventListener to all 3 new inputs (skip 0 because it is the add button)
	var elems = document.custom_commands_form.elements;
	for (i = elems.length - 8; i < elems.length; i++) { // Version 1.1.7 - Was i = num; Changed because with deleting, num is sometimes bigger than the length of form elements
		if (elems[i].type.match(/^(text)$/i))
			elems[i].addEventListener('input', formclick, false); // Version 1.4.0 - Was function() {formclick();}
		if (elems[i].type.match(/^(checkbox|submit)$/i))
			elems[i].addEventListener('click', formclick, false); // Version 1.4.0 - Was function() {formclick();}
		if (elems[i].name.match(/^phrase/i) && i > (elems.length - 9))
			elems[i].focus(); 
			
	}
	set_lang_i18n(); // Version 1.5.6
}

// Version 0.99.9 - Taken from content.js
function lastLetter(el)
{	
	/* return the letter right before the caret
		in a textarea or other element */
	//var el = document.activeElement;
	
	// First check for input or textarea element
	// if ('selectionStart' in document.activeElement) // Version 1.7.6 - Should not be checking activeElement! Should check el.
	if (el.nodeName == "INPUT" || el.nodeName == "TEXTAREA") // Version 1.7.6
	{
		/* Chrome throws error on selectionStart for type email or number */
		try {
			var start = el.selectionStart;
			var end = el.selectionEnd;
			//console.log(start);
			return(el.value.charAt(start-1));
		} catch(err) {
			return "";
		}
	}
	else // Now Get cursor position of another type of element
	{
		var precedingChar = "", sel, range, precedingRange;
	    if (window.getSelection) {
	        // sel = window.getSelection(); // Version 1.7.6 - Removed
			sel = el.ownerDocument.getSelection(); // Version 1.7.6 - Added
	        if (sel.rangeCount > 0) {
				range = sel.getRangeAt(0).cloneRange();
	            range.collapse(true);
	            range.setStart(range.startContainer, 0); // Version 1.7.6 - From el to range.startContainer. It returns "" after linebreaks
	            precedingChar = range.toString().slice(-1);
	        }
	    } else if ( (sel = document.selection) && sel.type != "Control") {
	        range = sel.createRange();
	        precedingRange = range.duplicate();
	        precedingRange.moveToElementText(el);
	        precedingRange.setEndPoint("EndToStart", range);
	        precedingChar = precedingRange.text.slice(-1);
	    }
	    //if (test_mode) console.log(precedingChar);
	    return precedingChar;
	}
}

// Version 1.7.6 - capitalize() in sr.js is no longer being used. Now textbox() is using speech_iframe.defaultView.capitalize() from content.js
function capitalize(el, text) {
	
	var cap = false; // Should first letter be capitalized?
	var space = false; // Should a space be added to the beginning of the text
	var first_char = /\S/;
	
	/* Don't capitalize inputs with type email|search|password or
		name = "username|email|login" */
	if (el.nodeName == "INPUT")
	{ 
	 	/* Chrome will not use selectionStart on type email or number.
		We need to check for valid types before using it */
		var valid_type = el.type.match(/^(text|password|search|tel|url)$/);
		
		if (!el.type.match(/email|search|password|url/i)  // Version 1.7.6 - Added url
			&& !el.name.match(/username|email|login|url/i)) // Version 1.7.6 - Added url
			if ( (el.value.length == 0) || (valid_type && el.selectionStart == 0) )
			{
				cap = true;
				text = text.replace(/^ /, ""); // Remove space from beginning of text if it exists
			}
	}
	else if (el.nodeName == "TEXTAREA")
	{
		if (el.value.length == 0 || el.selectionStart == 0 || lastLetter(el).match(/[\n\.!\?]/))
		{
			cap = true;
			text = text.replace(/^ /, ""); // Remove space from beginning of text if it exists
		}
		else if (lastLetter(el) != " ")
			space = true;
	}
	else // Any contentEditable element
	{
		if (el.innerHTML.length == 0 || lastLetter(el) == "" || lastLetter(el).match(/[\n\.!\?\u200c]/)) // Version 1.7.6 - Added \u200c
		{
			cap = true;
			text = text.replace(/^ /, ""); // Remove space from beginning of text if it exists
		}
		else if (lastLetter(el) != " ")
			space = true;
	}
	
	// If last letter was a line feed or an end of sentence character .!?
	if (lastLetter(el).match(/[\n\.!\?]/))
		cap = true;
	if (lastLetter(el).match(/[\.!\?]/))
		space = true;
	
	if (cap == true)
		text = text.replace(first_char, function(m) { return m.toUpperCase(); }); // Capitalize first letter
		/* Note: Above we are capitalizing first letter found not first character because
		speech recognition may have returned /n or /n/n as the first characters */
	if (space == true && !text.match(/^[ \n\.!\?,]/)) // if there is not already a space or .!?, at beginning of string
		text = " "+text; // Add space to beginning of text
		
	
	return (text);
}


// Renamed function in Version 0.99.9 from capitalize to capitalize2
function capitalize2(surroundingText, text) {
 	// Version 0.98.9 - 8/17/2017 - Detect when to capitalize on SRA Tab
 	surroundingText = surroundingText.replace(/ $/, ""); // Remove space from end of surroundingText if it exists
	//console.log(surroundingText +","+text);
	var cap = false; // Should first letter be capitalized?
	var space = false; // Should a space be added to the beginning of the text
	var first_char = /\S/;
	var lastLetter = surroundingText.slice(-1);
 	
	if (lastLetter == "" || lastLetter.match(/[\n\.!\?\u200c]/)) { // Version 1.7.6 - Added \u200c
		cap = true;
		text = text.replace(/^ /, ""); // Remove space from beginning of text if it exists
	}
	
	if (surroundingText.length > 0 && (lastLetter != " " || lastLetter.match(/[\n\.!\?]/))) 
		space = true;
	
    if (cap == true)
		text = text.replace(first_char, function(m) { return m.toUpperCase(); }); // Capitalize first letter 
  
    if (space == true && !text.match(/^[ \n\.!\?,]/)) // if there is not already a space or .!?, at beginning of string
		text = " "+text; // Add space to beginning of text
	
	return(text);
}


setup_menus(); // Version 1.5.6 - Removed - Using details and summary tags now // Version 1.5.6b - Put back in because it does the shortcut keys
//document.getElementById('instructions_btn').click(); // Open instructions submenu // Version 1.5.6 - Removed
print_commands(sra.commands);
//print_custom_commands();


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
	if (sra.settings.tts_speaking) // Version 1.2.0 - Just in case they close sr.html while it is reading a page
		change_tts_speaking(false); 
	print_custom_commands();
	setup_languages(); // Version 1.5.8 - Moved from languages.js
	setup_forms();
	set_lang_i18n(); // Version 1.5.6
	update_title();
	change_language();
	//start_sr(); // Version 1.6.5 - Now called by stream_success_callback()
	create_analyser(); // Version 1.6.5 - Took out of start_sr() and put here
	//document.getElementById('speech_div').focus(); // Version 1.4.9
	//document.getElementById('final_span').focus(); // Version 1.4.9
}

// Version 1.5.6 - Added data-lang attribute to elements that will be translated with i18n
function create_lang() { 
	// Use this function after displaying website with Google translate
	// to create JSON variables that can be copied to a locales file
	var elems = document.querySelectorAll('[data-lang]');
	var obj = {};
	for (var i = 0; i < elems.length; i++) {
		var name = elems[i].getAttribute('data-lang');
		var message = elems[i].innerHTML;
		message = message.replace(/<font style="vertical-align: inherit;">|<\/font>/ig, ""); // Remove Google translate's strange font tags
		obj[name] = { "message" : message };
	}
	var elems = document.querySelectorAll('[data-lang-href]'); // Next create href attributes of links
	for (var i = 0; i < elems.length; i++) {
		var name = elems[i].getAttribute('data-lang-href');
		var message = elems[i].href;
		message = message.replace(/<font style="vertical-align: inherit;">|<\/font>/ig, ""); // Remove Google translate's strange font tags
		obj[name] = { "message" : message };
	}
	console.log(JSON.stringify(obj, null, "\t"));
}


function set_lang_i18n() { // Version 1.5.6
	// chrome.i18n.getUILanguage() = 'en-US'; // Correct with a dash
	// chrome.i18n.getMessage("@@ui_locale") = 'en_US'; // Incorrect with underscore but is how _locales/LOCALE_CODE folder works: https://developer.chrome.com/docs/webstore/i18n/#name-and-description
	// navigator.language = 'en-US'; // Correct with dash
	// Use this: var lang_obj = languages_obj[navigator.language] || languages_obj[navigator.language.split("-")[0]] || "";
	var lang = chrome.i18n.getUILanguage() || "en";
	document.documentElement.setAttribute('lang', lang);
	var elems = document.querySelectorAll('[data-lang]'); // First change innerHTML of elements
	for (var i = 0; i < elems.length; i++) {
		var name = elems[i].getAttribute('data-lang');
		if (chrome.i18n.getMessage(name) && document.body.contains(elems[i])) 
			elems[i].innerHTML = chrome.i18n.getMessage(name);
	}
	var elems = document.querySelectorAll('[data-lang-href]'); // Next change href attributes of links
	for (var i = 0; i < elems.length; i++) {
		var name = elems[i].getAttribute('data-lang-href');
		if (chrome.i18n.getMessage(name) && document.body.contains(elems[i])) 
			elems[i].setAttribute('href', chrome.i18n.getMessage(name));
	}
}


function stop_recognition() { // Version 1.6.2
	// Edge freezes for 7 seconds or more when exiting
	// So let's try changing the onend event to not call start() and then stop() recognition
	console.log(new Date().toISOString()+" Stopping recognition and exiting");
	recognition.onend = function() {
		recognizing = false;	
	};
	recognition.stop();
}

function escapeRegex(string) { // Version 1.7.6 - To use () in .match()
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}


//window.onload = start_all; // Version 1.1.6 - Removed - It seems it was waiting for seabreezecomputers.com iframe
document.addEventListener("DOMContentLoaded", start_all, false); // Version 1.1.6

window.addEventListener("beforeunload", stop_recognition, false); // Version 1.6.2
