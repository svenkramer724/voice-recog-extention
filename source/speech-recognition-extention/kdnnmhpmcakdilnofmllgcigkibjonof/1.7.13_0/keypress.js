/* Simulate keypress in Google Docs 
	stringToKeypress(string) works if you paste the function in developer console
	and then run it. But it does not work in Google Docs with a chrome extension.
	Bewildered. But copyStringToClipboard(string) works in a chrome extension.

*/


function stringToKeypress(string) {
	if (Array.isArray(string)) // Version 1.5.2 - Custom command functions use arrays for variables
		string = string[0];	
	
	for (var i = 0; i < string.length; i++) {
		var key = string.charCodeAt(i);
		if (key == 10) key = 13; // Convert "\n" to "\r"
		var keytype = (key == 13) ? 'keydown' : 'keypress'; // keydown is needed for enter key (13) "\r"
	
		var event = document.createEvent( 'KeyboardEvent' );
		event.initKeyboardEvent( keytype, true, true, null, 0, false, 0, false, key, 0 ); // Last field must be 0 for enter key to work
		// Force Chrome to not return keyCode of 0 when fired
		Object.defineProperty(event, 'keyCode', {
	    	get : function() {
	    		return key;
	    	}
	    }); 	
		// "which" is possibly needed for Firefox or Safari??
		Object.defineProperty(event, 'which', {
	    	get : function() {
	    		return key;
	    	}
	    });     
	  
		/*var event = document.createEvent('Event'); 
		event.initEvent(keytype, true, true); 
		event.keyCode = key;
		*/
		// Dispatch event on activeElement. <iframe class="docs-texteventtarget-iframe"> if cursor is in editor
		if (document.activeElement.nodeName == "IFRAME")
			document.activeElement.contentWindow.document.dispatchEvent( event );
		else 
			document.dispatchEvent( event );
	}
}


function processGoogleDoc(text) {
	//var googleDocument = googleDocsUtil.getGoogleDocument(); // Get all the text in the Google Doc
	//var previousText = googleDocument.previousText; // Get the text before the cursor
	//if (test_mode) console.log(previousText);
	//text = capitalize(el, text); // Possibly put a capital for the first letter of the text string
	console.log(document.activeElement);
	stringToKeypress(text);

}


function copyStringToClipboard (string) {
	// Version 1.5.2g - Removed googleDocsUtil because it does not work with Google Docs new canvas element
	/*var googleDocument = googleDocsUtil.getGoogleDocument(); // Get all the text in the Google Doc
	if (test_mode) console.log(googleDocument);
	var previousText = googleDocument.previousText; // Get the text before the cursor
	if (test_mode) console.log("Google previousText: "+previousText); // Version 1.5.2
	*/
	var first_char = /\S/;
	string = string.replace(/\n/g, "<br>"); // replace \n with html new line // Version 1.5.2 Changed <br> to \r\n // Version 1.5.2i Changed back because new line was pasting previous clipboard data out of the blue // Version 1.6.13 - Added g for global to regex
	
	// Version 1.5.2g - Created paste_event_handler has stand alone function instead of inline with addEventListner. Also moved above instead of down below
	// Get current clipboard data by adding eventListener and firing paste
	function paste_event_handler(evt) {
		if (evt.clipboardData.getData('text/html'))
			clipboard_data_html = evt.clipboardData.getData('text/html');
		if (evt.clipboardData.getData('text/plain'))
			clipboard_data_plain = evt.clipboardData.getData('text/plain');
		if (test_mode) console.log("1. clipboard_data_plain: "+clipboard_data_plain);
		if (test_mode) console.log("1. clipboard_data_html: "+clipboard_data_html);
		evt.preventDefault(); // Version 1.5.2g
		document.removeEventListener('paste', paste_event_handler);
	}
	var clipboard_data_plain, clipboard_data_html;
	document.addEventListener('paste', paste_event_handler);
	document.execCommand("paste", false, null); // to fire eventListener*/
	if (test_mode) console.log("2. clipboard_data_plain: "+clipboard_data_plain);
	if (test_mode) console.log("2. clipboard_data_html: "+clipboard_data_html);
	//var clipboard_data = await navigator.clipboard.readText(); // Prompts user even in extension (Have to use keyboard) But only seems to prompt one time
	
	
	previousText = getSelectedText(); 
	if (test_mode) console.log("Google previousText: "+previousText); // Version 1.5.2f
	var textarea = document.createElement("textarea");
	textarea.value = previousText;
	if (test_mode) console.log("textarea.value: "+textarea.value);
	if (test_mode) console.log("charCodeAt: "+previousText.charCodeAt(previousText.length-1));
	
	// Google Docs automatically capitalizes except for first line in document
	// But we may need to remove the space before the string
	previousText = previousText.replace(/\u200c/g,""); // Version 1.4.8 - Google docs started adding %u200c after each word and before each space. So the last letter was %u200c. So need to remove them to get correct capitalization
	var lastLetter = previousText[previousText.length - 1]; 
	if (test_mode) console.log("Google Docs lastLetter: "+lastLetter); // Version 1.5.2 Added ,previousText.charCodeAt() - Removed because broke code if document was blank
	if (previousText.length == 0 || lastLetter == "") {
		string = string.replace(/^ /, ""); // Remove space from beginning of text if it exists	
		string = string.replace(first_char, function(m) { return m.toUpperCase(); }); // Capitalize first letter
	}
	else if (!string.match(/^[ \r\n\.!\?,]/)) { // Version 1.5.2g Added \r because Google Docs canvas uses \r\n for carriage return
		if (!previousText.match(/\s$/)) // Version 1.5.2 - Added to stop extra space if editing between text
			string = " "+string; // Add space to beginning of text
		//if (lastLetter.match(/^[\n\.!\?]/)) // Version 1.0.9 // Version 1.5.2 - Removed
		if (previousText.match(/[\r\n\.!\?]\s*$/)) // Version 1.5.2 - If clicking on bold then Google Docs starts adding a space after the period so it was not capitalizing with above lastLetter match // Version 1.5.2g Added \r because Google Docs canvas uses \r\n for carriage return
			string = string.replace(first_char, function(m) { return m.toUpperCase(); }); // Capitalize first letter // Version 1.0.1 - It wasn't here before? Confused am I.
	}
	if (previousText.match(/[\r\n\.!\?]\s*$/)) // Version 1.7.10 - Needed to add this here. Wasn't here before so I don't know how it was capitalizing previously
			string = string.replace(first_char, function(m) { return m.toUpperCase(); }); // Capitalize first letter // Version 1.0.1 - It wasn't here before? Confused am I.
			
	if (sra.settings.always_lowercase)  // Version 1.5.2
		string = string.toLowerCase();
			
	
	// Put string in clipboard by firing copy and listening but preventing default copy
    function handler (event){
        event.clipboardData.setData('text/html', string);
        event.preventDefault();
        document.removeEventListener('copy', handler, true);
    }
    document.addEventListener('copy', handler, true);
    document.execCommand('copy');
    
    // Paste string into Google Docs iFrame
    document.activeElement.contentWindow.document.execCommand("paste", false, null);
    
    // Put previous clipboard data back into clipboard // Version 1.5.2g - Added to this function instead of resuing handler() above
	function copy_event_handler (event){
		if (clipboard_data_html)
			event.clipboardData.setData('text/html', clipboard_data_html);
		if (clipboard_data_plain)
			event.clipboardData.setData('text/plain', clipboard_data_plain);
		//if (test_mode) console.log("5. previous_clipboard_data: "+previous_clipboard_data);
        event.preventDefault();
        document.removeEventListener('copy', copy_event_handler, true); // Version 1.7.0c - Added , true (Bug. Forgot)
    }
	document.addEventListener('copy', copy_event_handler, true);
    document.execCommand('copy');
    
    
}

function getSelectedText() {
	var el = document.activeElement;
	var dom = document; // Version 1.5.2f
	
	if (el.nodeName == "IFRAME") { // Version 1.5.2f - Added to undo() from clear_text()
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	}
	
	var previous_clipboard_data_plain, previous_clipboard_data_html, current_selected_text;
	
	function paste_handler_html(event) {
		if (event.clipboardData.getData('text/html'))
			previous_clipboard_data_plain = event.clipboardData.getData('text/html');
		if (event.clipboardData.getData('text/plain'))
			previous_clipboard_data_html = event.clipboardData.getData('text/plain');
		//if (test_mode) console.log("1. previous_clipboard_data: "+previous_clipboard_data);
		event.preventDefault();
		document.removeEventListener('paste', paste_handler_html); 
	}
	
	function paste_handler(event) {
		current_selected_text = event.clipboardData.getData('text/plain');
		if (test_mode) console.log("3. event.clipboardData.getData('text/plain'): "+event.clipboardData.getData('text/plain'));
		event.preventDefault();
		document.removeEventListener('paste', paste_handler); 
	}
	
	function copy_handler (event){
		if (previous_clipboard_data_html)
			event.clipboardData.setData('text/html', previous_clipboard_data_html);
		if (previous_clipboard_data_plain)
			event.clipboardData.setData('text/plain', previous_clipboard_data_plain);
		//if (test_mode) console.log("5. previous_clipboard_data: "+previous_clipboard_data);
        event.preventDefault();
        document.removeEventListener('copy', copy_handler);
    }
	
	// Get current clipboard data by adding eventListener and firing paste
	//document.addEventListener('paste', paste_handler_html);
	//document.execCommand("paste", false, null); // to fire eventListener
	//if (test_mode) console.log("2. previous_clipboard_data: "+previous_clipboard_data);
	
	var isCollapsed = el.ownerDocument.defaultView.getSelection().isCollapsed; // Version 1.5.2g
	if (test_mode) console.log("isCollapsed: "+el.ownerDocument.defaultView.getSelection().isCollapsed); // Version 1.5.4g
	
	//keypress([37, 0, 0, 1]); // Version 1.5.2f - Shift left arrow (Highlight previous line) // Version 1.7.10 - Removed
	//keypress([37, 0, 0, 1]); // Version 1.5.2g - Shift left arrow again // Version 1.7.10 - Removed
	// Version 1.7.10 - Added stand alone keypress event because keypress() in content.js is now using setTimeout which messes up Google Docs
	//var el = document.activeElement.contentWindow.document.activeElement; // For testing in page
	var code = "ArrowLeft";
	var key = "ArrowLeft";
	keyCode = 37;
	var charCode = 0;
	var keypressObj = { // The keypress event uses charCode for both charCode and keyCode property.
				'key':key, 'which':charCode, 'keyCode':keyCode, 'charCode':charCode,
				'bubbles':true, 'cancelable':true, 'code': code,
				'composed':true, 'isTrusted':true, 'view': window,
				'ctrlKey':false, 'altKey':false, 'shiftKey':true
			}
	el.dispatchEvent(new KeyboardEvent('keydown',keypressObj)); // Shift left arrow (Highlight previous line)
	el.dispatchEvent(new KeyboardEvent('keydown',keypressObj)); // Shift left arrow again
	
	var sent = dom.execCommand("copy"); // Copy currently selected text into clipboard 
	if (test_mode) console.log("Copy Sent: "+sent);
	
	if (test_mode) console.log("isCollapsed: "+el.ownerDocument.defaultView.getSelection().isCollapsed); // Version 1.5.4g
	// If cursor is at start of document then isCollapsed will be true since no previous text could be highlighted
	if (el.ownerDocument.defaultView.getSelection().isCollapsed) // Version 1.5.4g - Removed because "New paragraph" was taking the two selected letters away
		return "";
	
	
	// Get currently selected text from clipboard
	document.addEventListener('paste', paste_handler);
	document.execCommand("paste", false, null); // to fire eventListener
	if (test_mode) console.log("4. current_selected_text: "+current_selected_text);
	
	/* Version 1.5.2g - Google also puts copied text into it's activeElement and current_selected_text
		is sometimes randomly blank. So let's try getting activeElement.innerText.
		( It is also el.ownerDocument.getSelection().toString(); after copy event )*/
	if (test_mode) console.log("activeElement.innerText: "+el.innerText);
	if (!current_selected_text && el.innerText && el.innerText != " ")
		current_selected_text = el.innerText;
	
	//keypress([39, 0, 0, 1]); // Version 1.5.2f - Right shift arrow (Unhighlight previous line). DOESN'T work if they select text by double clicking!
	if (current_selected_text != "") { // Version 1.5.4g - Sometimes new paragraph was taking away the selected text
		//keypress([39, 0, 0, 0]); // Version 1.5.2f - Better to just do right arrow for now // Version 1.5.4g - Moved down lower to prevent bug of isCollapsed sometimes true when it shouldn't be with new paragraph // Version 1.7.10 - Removed
		// Version 1.7.10 - Added stand alone keypress event because keypress() in content.js is now using setTimeout which messes up Google Docs
		//var el = document.activeElement.contentWindow.document.activeElement; // For testing in page
		var code = "ArrowRight";
		var key = "ArrowRight";
		keyCode = 39;
		var charCode = 0;
		var keypressObj = { // The keypress event uses charCode for both charCode and keyCode property.
					'key':key, 'which':charCode, 'keyCode':keyCode, 'charCode':charCode,
					'bubbles':true, 'cancelable':true, 'code': code,
					'composed':true, 'isTrusted':true, 'view': window,
					'ctrlKey':false, 'altKey':false, 'shiftKey':false
				}
		el.dispatchEvent(new KeyboardEvent('keydown',keypressObj)); // Arrow right (unhighlight)

	}
	// Put previous clipboard data back into clipboard
	//document.addEventListener('copy', copy_handler);
	//document.execCommand("copy");
	
	/*if (current_selected_text.length > 1) // Version 1.5.2g - Maybe we can replace user selected text later. It didn't work if user selected text with mouse and was buggy even when selected by voice
		keypress([39, 0, 0, 1]); // Version 1.5.2g - Right shift arrow again
	
	if (test_mode) console.log("length: "+current_selected_text.length); // If the user had highlighted text already
	if (!isCollapsed) // Version 1.5.2g - If user highlighted text then only return the two new letters highlighted
		current_selected_text = current_selected_text.slice(0, 2); // Version 1.5.2g
	*/
	
	return current_selected_text;
	
}
