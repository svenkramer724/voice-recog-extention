// Detect if browser supports text-to-speech
var tts = ('speechSynthesis' in window) ? true : false;


/* I decided not to use chrome.tts for chrome extensions 
	because it uses the same voices as window.speechSynthesis
	but it doesn't have window.speechSynthesis.onvoiceschanged
	so I had to use a setTimeout
*/
/*
setTimeout(function(){
	// Requires "tts" permission in manifest.json 
	chrome.tts.getVoices(
		function(voices) {
		if (test_mode) console.table(voices);
			for (var i = 0; i < voices.length; i++) {
				
			}
	});
}, 3000);
*/

// Setup pitch and rate input event
settings_form.tts_pitch.addEventListener('input', function() {tts_change();}, false);
settings_form.tts_rate.addEventListener('input', function() {tts_change();}, false); 
settings_form.select_voice.addEventListener('change', function() {tts_rate_max();}, false); // Version 1.3.2
settings_form.tts_test_btn.addEventListener('click', function() { tts_test_speech(); }, false); // Version 1.5.7 - From say("This is a test."); to tts_test_seech()


function tts_test_speech() { // Version 1.5.7 - Added for language support
	var text = document.querySelector('[data-lang="tts_test_speech"]').innerText || "This is a test.";
	say(text);
}


function tts_rate_max() { // Version 1.3.2 - Microsoft voices allow rate up to 10. Google voices only allow rate up to 2
	if (document.settings_form.select_voice.value.match(/^Microsoft/))
		settings_form.tts_rate.max = 10; // Also had to change to max="10" in sr.html
	else { // A Voice by Google can only be a max rate of 2
		if (settings_form.tts_rate.value > 2)
			settings_form.tts_rate.value = 1;
		settings_form.tts_rate.max = 2;
		document.getElementById("rate_dis").innerHTML = settings_form.tts_rate.value; // Display rate on screen
		settings_form.tts_rate.dispatchEvent(new Event("input")); // Fire event so it is saved in storage
	}	
}


function tts_change() {
	el = event.target; // Target element of click
	
	if (el.name == "tts_pitch")
		document.getElementById("pitch_dis").innerHTML = el.value;
	else if (el.name == "tts_rate")
		document.getElementById("rate_dis").innerHTML = el.value;
		
	settings_form.tts_test_btn.disabled = false;	
}

if (tts)
{
	// wait on voices to be loaded before fetching list
	if (speechSynthesis.onvoiceschanged !== undefined) // Firefox does not need or use onvoiceschanged (chrome only does)
	window.speechSynthesis.onvoiceschanged = function() {
		if (document.settings_form.select_voice.options.length == 0) // don't create the list again if chrome thinks the voice changed
		{
		  	var voice_array = window.speechSynthesis.getVoices();
		  	//if (test_mode) console.table(voice_array);
		  	
		  	for (i = 0; i < voice_array.length ; i++) {
		  		document.settings_form.select_voice.options[i] = new Option(voice_array[i].name, voice_array[i].name); // text, value
				if (i == sra.settings.select_voice) {// Version 1.3.2 - Make it display the voice that is saved in settings
					document.settings_form.select_voice.selectedIndex = sra.settings.select_voice;
					tts_rate_max();
				}
				// Version 1.5.8 - The above if worked when we were saving select option by selectedIndex. Now we need below since we are saving select option by value
				else if (voice_array[i].name == sra.settings.select_voice) {
					document.settings_form.select_voice.value = sra.settings.select_voice;
					tts_rate_max();
				}
		  	}
		}
	};
}


function say(that, sender)
{
	if (typeof sender !== 'undefined' && typeof sender.tab !== 'undefined') sender_tab_id = sender.tab.id;
	if (typeof that == "string") { 
		if (typeof sender === "undefined") { // Version 1.6.8 - Added && typeof sender === "undefined" so that we only randomize by | if not coming from a website
			var that_array = that.split("|"); // Split that by |
			var that = [that_array[Math.floor(Math.random() * that_array.length)]]; // Get random array position
		}
		else that = new Array(that); // Version 1.6.8 - Still convert that from string to array
	}
	/*else if (Array.isArray(that)) 
		text = that.shift(); // Remove 1st element from array
	*/
	window.speechSynthesis.cancel(); // Version 1.2.0 - Bug in speechSynthesis - If text is too long it breaks and does not work until restarting browser. cancel() will fix the error.
	tts_index = 0;
	
	if (test_mode) console.log(that, sender); // Version 1.6.8 - Added ,sender
	if (tts && that)
	for (var i = 0; i < that.length; i++)
	{
		var text = that[i];
		
		var voicelist = settings_form.select_voice;
		//msg.onend = ""; // Remove old msg.onend if we had one
		let msg = new SpeechSynthesisUtterance(); // Version 1.7.5 - From var to let for setTimeout to work below
		//if (!text.match(/[\.\!\?\n]$/)) text += ".\n"; // Add period to end of sentence if not there.
		//text = text.replace(/(\w{2,})(\s{2,}|\n)/g, "$1.\n") // Version 1.2.2 - Add period if there is 2 or more letters and 2 spaces or a newline without a period // Version 1.2.5 - Not needed anymore with separating each text node
		text = text.replace(/([a-z])(\n)([A-Z])/g, "$1.$2$3") // Version 1.2.5 - If there is lowercase letter, CR, uppercase letter put a period in between.
		text = text.replace(/(,|;|:|—|\|)\s+([a-z0-9]|\n)/gi, function($0,$1,$2,$3) { // Version 1.6.8 - Added split at \| and 0-9 for wolframalpha and from \s* to \s+ to not split 1,454 (numbers with commas)
			return $1 + ". " +$2.toUpperCase(); 
		}); // Version 1.2.5 - speechSynthesis is terrible at punctuation.
		/* Version 1.6.2 - 1/2/2022 - Since Chrome is not firing onEnd if the text is too long even with the
			resumeInfinity() fix and the console.log fix. We need to try splitting at every period. */
		// var group = text.split("."); // Version 1.6.8 - Removed because it was splitting google.com
		var group = text.split(/\.\s+/); // Verison 1.6.8 - Only split at period if whitespace after it. 
		for (g = 0; g < group.length; g++)
			if (g > 0) // Add u00A0\u200C to start of every string but the first string so we don't go to next highlight later
				group[g] = "\u00A0\u200C"+group[g]; // (non breaking space and zero width non joiner) &nbsp;&zwnj;
		that.splice(i, 1, ...group); // Splice group into that array. arr.splice(index, itemsToDelete, item)		
		text = group[0];
		// End Version 1.6.2 changes
		
		msg.text = text;
		//msg.voice = voicelist.options[voicelist.selectedIndex].value;
		msg.voice = speechSynthesis.getVoices().filter(function(voice) { return voice.name == voicelist.value; })[0];
		//msg.voice = settings_form.select_voice.value;
		msg.pitch = settings_form.tts_pitch.value;
		msg.rate = settings_form.tts_rate.value;
		//msg.lang = "en-GB"; // Only works if you don't set msg.voice above
		//msg.gender = "male"; // Does not work
		console.log(msg); // Version 1.2.5 - onend and onstart would only be called a couple of times in live mode (test_mode == false) because of a bug in Chrome and speechSynthesis. When I console.log the msg then it works and tts_highlight then works because onend is called
		
		// Version 1.2.0 is below:
		msg.onerror = function(event) {
			console.log(event);
			window.speechSynthesis.cancel();
			if (!event.error.match(/interrupted/i)) // Version 1.7.6 - Error is "interrupted" if we call .cancel() in say() so don't display that error
				document.getElementById("error").innerHTML += '<p>An error has occurred with the speech synthesis: ' + event.error;
   		}
		msg.onstart = function(event) { change_tts_speaking(true); resumeInfinity(); 
			console.log(event); // Version 1.2.5 - Chrome speechSynthesis bug also needs this
			// Version 1.6.2 - Don't go to next highlight if starts with \u00A0\u200C (non breaking space and zero width non joiner) &nbsp;&zwnj;
			if (!event.utterance.text.match(/^\u00A0\u200C/)) {
				var obj = { "command" : "highlight_speak", option: tts_index}; // highlight next speak element
				if (sender_tab_id) // Version 1.2.6
					chrome.tabs.sendMessage(sender_tab_id, obj, function(response) { // Send to tab that sent us the say command
						//if (test_mode) console.log(JSON.stringify(response));
					});
				tts_index++;
			}
			clearTimeout(tts_sr_audio_pause_timer); // Version 1.7.5
			tts_sr_audio_pause(true); // Version 1.7.5
			
		};
		msg.onresume = function() { 
			console.log(event);
			change_tts_speaking(true); 
			resumeInfinity(); 
			tts_sr_audio_pause(true); // Version 1.7.5
		};
		msg.onpause = function() { 
			/* change_tts_speaking(false); */ 
			console.log(event);
			clearTimeout(timeoutResumeInfinity); 
			tts_sr_audio_pause(false); // Version 1.7.5
		};
		msg.onend = function(event) { 
			//sr_audio_pause = false; // Turn speech recognition back on
			//if (recognition) recognition.start(); 
			console.log(event); // Version 1.2.5 - Chrome speechSynthesis bug also needs this
			//if (!window.speechSynthesis.pending) // If there are no msgs in the queue left to speak // Version 1.2.4???
			{
				change_tts_speaking(false);
				clearTimeout(timeoutResumeInfinity);
			}
			if (typeof that != "undefined" && Array.isArray(that) && that.length > tts_index) {
				/*tts_index++;
				var obj = { "command" : "highlight_speak", option: tts_index}; // highlight next speak element
				chrome.tabs.sendMessage(sender_tab_id, obj, function(response) { // Send to tab that sent us the say command
					//if (test_mode) console.log(JSON.stringify(response));
				});*/
				/*setTimeout(function() { // I can't have setTimeout here because it will fire after pressing pause
					say(that); 
				}, 1500); // Pause for 1 seconds between paragraphs
				*/
			}
			if (!window.speechSynthesis.pending) // Version 1.7.5 - if speechSynthesis queue is empty then unpause sr
				tts_sr_audio_pause(false); // Version 1.7.5
		};
		
		//msg.onboundary = function(event){ if (test_mode) console.log(event); }
		
		setTimeout(function() { window.speechSynthesis.speak(msg); }, 100, msg); // Version 1.7.5 - Added setTimeout otherwise after a pause() with ESC key then tts won't speak again after cancel() without setTimeout delay
		
	}
}

// https://stackoverflow.com/a/40508243/4307527
var timeoutResumeInfinity; // Version 1.2.0
var tts_sr_audio_pause_timer; // Version 1.7.5
var tts_paused = false; // Version 1.2.0 - window.speechSynthesis.paused is always false even when paused. Broken API
var sender_tab_id;
var tts_index;
//var msg = ""; // SpeechSynthesisUtterance needed in say() to stop onend from using old 'that' array

function resumeInfinity() { // Version 1.2.0
	// If we keep calling resume() during talking then Chrome won't stop the speechSythesis in the middle.
    window.speechSynthesis.resume();
	tts_paused = false;
    timeoutResumeInfinity = setTimeout(resumeInfinity, 2000);
}


function stopSpeaking(keyword) {
	if (Array.isArray(keyword)) keyword = keyword[0];
	if (keyword.match(/^(Stop|Pause)/i) || (keyword === "" && tts_paused == false)) {
		window.speechSynthesis.pause(); // Version 1.2.0
		setTimeout(function() { tts_paused = true; }, 1000); // Version 1.2.4 - Added setTimeout
		clearTimeout(timeoutResumeInfinity);	
		change_tts_speaking(false);
		tts_sr_audio_pause(false); // Version 1.7.5
	}
	else {
		resumeInfinity();
		//change_tts_speaking(true);
	}
}

var tts_speaking_timer; // Version 1.2.3 - So it doesn't focus on text box when talking ends but is still in memory

function change_tts_speaking(bit) {
	sra.settings.tts_speaking = bit; // Change sra object
	var obj = { settings : sra.settings };
	if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
	clearTimeout(tts_speaking_timer);
	if (bit == false) // Version 1.2.3 - Wait 1 second to turn off speaking flag
		tts_speaking_timer = setTimeout(function() { save_to_storage(obj); }, 1500, obj); // Version 1.2.4 - Added obj at end
	else
		save_to_storage(obj);
}

// Version 1.2.0 - To Stop tts from speaking text 
// Version 1.3.3 - Added esc key to tts.js in sr.html so pause/resume works in SRA tab and not just other tabs
window.addEventListener('keydown', function(e){
    if(e.key=='Escape'||e.key=='Esc'||e.keyCode==27) 
		//send_to_background({"command": "stopSpeaking", "option": ""}); // Pause or unpause
	stopSpeaking(""); // Version 1.3.3

}, false);


// Version 1.7.5 - Pause "Speech Recognition Anywhere" if audio is playing in a tab wasn't working with tts for Jack Forman on Chrome Web Store support 2/9/2023
function tts_sr_audio_pause(bit) { // Version 1.7.5 - Added sr_audio_pause from sr.js
	if (bit == true && sra.settings.pause_for_audio) { // Pause sr because tts is speaking if pause_for_audio is true in settings
		sra.settings.sr_audio_pause = true; // Change sra object 
		var obj = { settings : sra.settings };
		if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
		save_to_storage(obj);
	}
	else if (sra.settings.pause_for_audio) //  && bit == false) // Unpause sr because tts finished but only if audio is not playing in another tab
	{
		tts_sr_audio_pause_timer = setTimeout(function() { // Version 1.7.5 - Need setTimeout or last sentence still goes into sr
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
					sr_msg.innerHTML = sr_msg.innerHTML.replace(chrome.i18n.getMessage("pause_for_audio_msg"),""); // Version 1.7.6 replaced && sr_msg.innerHTML.match(/^Speech Recognition output is paused/i)) sr_msg.innerHTML = "";
				chrome.action.setBadgeText({text: "On"}); // Removed tabID to affect every tab
				chrome.action.setBadgeBackgroundColor({"color": [255, 0, 0, 100]}); 
				sra.settings.sr_audio_pause = false; // Change sra object
				var obj = { settings : sra.settings };
				if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
				save_to_storage(obj);
			}
		});
		}, 1000);
	}
}

