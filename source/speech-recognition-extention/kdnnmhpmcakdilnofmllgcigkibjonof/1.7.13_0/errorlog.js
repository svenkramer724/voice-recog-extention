/* 
	Cool Error Log for Javascript
	Capture web page errors and keep them in a log automatically.
	Created by Jeff Baker 2021 Copyright
	Date Created 7/31/2021
	https://www.seabreezecomputers.com/
	
	Detects if webpage is using Google Analytics and automatically sends errors to:
		Google Analytics > Behavior > Top Events (Change Date Range to 'Today' if no events shown)
	
	If you want to put a Diagnostics link on the webpage that users can click on to view and possibly
	send js errors to you in an email then put an anchor tag like this to run the function:
	
	<a href="javascript:void(0);" onclick='return cool_error_log.display_errors();'>Diagnostics</a>
	
	Notes: 
	
	1. This script does NOT prevent javascript errors from stopping code execution. The only
	way to stop errors from stopping your code from running is to put 
		try { // your code } catch(error) { console.log(error); }
	blocks around all your code that might have an error. If you want to have the errors that
	are caught with try...catch... to be logged with this script then write your try() code like this:
	try { 
		// your code 
	} catch(error) {
			cool_error_log.logerror({error});
			console.error(error); 
	}
	
	2. This script does not prevent errors from displaying in Developer Console. You can prevent
	errors from displaying in developer console by putting try...catch... code blocks around your
	code that might cause errors and then DO NOT put console.log or console.error in the catch() section.
	
  
*/

var cool_error_log = {
	'test_mode' : false, // If true, adds button on the page to throw an error when clicked for testing
	'log_console_warn' : true, // Also log console.warn()
	'log_console_error' : true, // Also log console.error()
	'log_console_log' : false, // Also log console.log(). Not recommended!
	
	/* DO NOT EDIT BELOW THIS LINE */
	
	'errors' : [], // Array to hold all errors on page
};


window.addEventListener("error", 

cool_error_log.logerror = function (event) {
	
	var msg = "";
	var console_log = console.old_log || console.log; // In case user set log_console_log to true
	
	if (cool_error_log.test_mode) {
		console_log(event);
		// for (var e in event) console.log(e);
	}
	
	if (event.error) msg = event.error.stack;
	else { // IE 10 and below does not have event.error object
		msg += event.message + " (" + event.filename + ":" + event.lineno;
		if (event.colno) // IE 9 and below does not have event.colno
			msg += ":" + event.colno;
		msg += ")";
	}
	
	cool_error_log['errors'].push(msg);
	
	if (typeof window['gtag'] === 'function') // Send to Google Analytics gtag.js
		gtag('event', msg, { // 'event', 'action',
			'event_category' : 'onerror', 
			'event_label' : navigator.userAgent}); 
	else if (typeof window['ga'] === 'function') // Send to Google analytics.js
		ga('send', {
		  hitType: 'event',
		  eventCategory: 'onerror',
		  eventAction: msg,
		  eventLabel: navigator.userAgent
		});
	// https://analytics.google.com/ > Behavior > Top Events (Change Date Range to 'Today' if no events shown)
	//ga('send', 'event', 'window.onerror', message, navigator.userAgent); // Send to Google analytics.js https://stackoverflow.com/a/50855093/4307527
	
	//if (cool_error_log.test_mode) {
		var num_errors = cool_error_log['errors'].length - 1;
		console_log("cool_error_log['errors']["+num_errors+"] = "+msg);
	//}
		
    return false; // Return false in order to see the error in console.
	// Or console.error(event);
	// However, in testing it appears that return true; also shows the error in console.
});


cool_error_log.log_console = function(type) {
	console["old_"+type] = console[type]; // Save original console function. Ex: console.old_warn
	console[type] = function(message) {
		if (message && message.stack && message.stack.toString().indexOf("cool_error_log") > -1) 
			return; // So we don't create an endless loop if using test_mode and displaying message to console
		var msg = "cool_error_log: console."+ type + ": ";
		for (var i = 0; i < arguments.length; i++) {
			if (arguments[i] instanceof Element)
				msg += arguments[i].outerHTML; // To turn element to a string of html
			else
				msg += JSON.stringify(arguments[i]); // To turn objects or variables to strings 
			if (i < arguments.length - 1) 
				msg += ", ";
		}
		var error = new Error(); // To get stack trace line numbers create a new error
		var stack = JSON.stringify(error.stack); // Turn stack into string
		stack = stack.replace(/^"Error\\n/i, ""); // Remove "Error\n" from beginning of stack
		stack = stack.replace(/\\n\s{4}at/g, "    at"); // Remove \n so developer can click on links to script code
		error.stack = msg + stack; // Add stack to end of msg
		console["old_"+type].apply(console, arguments); // Display in console using original console["type"] function
		// console["old_"+type](error.stack); // Display stack trace. // Removed - logerror() already does this
		cool_error_log.logerror({error}); // Send error to logerror()
		//console.log(error);
	}
}

if (cool_error_log.log_console_warn) cool_error_log.log_console("warn");
if (cool_error_log.log_console_error) cool_error_log.log_console("error");
if (cool_error_log.log_console_log) cool_error_log.log_console("log");


cool_error_log.display_errors = function() {
	var newline = "<br>\r\n";
	var msg = "The information below has been copied to your clipboard."+newline+
			"You may now paste it in an email to the person helping you."+newline+newline;
	msg += "Diagnostics: " + newline + window.navigator.userAgent + newline + newline;
	if (cool_error_log['errors']) {
		for (var i = 0; i < cool_error_log['errors'].length; i++)
			msg += cool_error_log['errors'][i] + newline;
	}
	
	var items = ['order_id', 'kind', 'license', 'plan_id', 'status'];
	
	if (window['sra']) {
		for (var v in items) {
			if (sra[v])
				msg += v + ": "+sra[v] + newline;
		}
	}
	else if (window['sync'] && window['sync']['license']) {
		for (var v in items) {
			if (sync['license'][v])
				msg += v + ": "+sync['license'][v] + newline;
		}
	}
	
	cool_error_log.copy_to_clipboard(msg);
	cool_error_log.popup(msg);
	return false; // To prevent calling anchor tag from using the href and reloading the page
}


// Put string in clipboard by firing copy and listening but preventing default copy
cool_error_log.copy_to_clipboard = function(string) {   
	function handler (event){
        event.clipboardData.setData('text/plain', string.replace(/<\/?[^>]+(>|$)/g, ""));
		event.clipboardData.setData('text/html', string);
        event.preventDefault();
        document.removeEventListener('copy', handler, true);
    }
    document.addEventListener('copy', handler, true);
    document.execCommand('copy');
}

cool_error_log.popup = function(string) { //8/29/2022 - Use HTML5 dialog element if supported
	if (typeof HTMLDialogElement === 'function') {
		var dialog = document.createElement("DIALOG"); 
		document.body.appendChild(dialog);
		dialog.innerHTML = "<button style='float: right;' onclick='this.parentNode.close();'>Close</button><br>";
		dialog.innerHTML += string;
		dialog.showModal();
		dialog.addEventListener("click", event => { // Allow Close of dialog if clicking outside of box
			var rect = dialog.getBoundingClientRect();
			if (event.clientY < rect.top || event.clientY > rect.bottom ||
				event.clientX < rect.left || event.clientX > rect.right) 
					dialog.close();
		});
	} else { // HTML5 dialog not supported
		string = string.replace(/<\/?[^>]+(>|$)/g, "");
		alert(string); // Chrome Bug: Won't let you highlight alert text if it has \n in it	
	}
}

if (cool_error_log.test_mode) {
	var button = document.createElement("button");
	button.onclick = function () { 
		//function_that_does_not_exist(); 
		try {
			function_that_does_not_exist(); 
			//throw new Error("This is a test error for Cool Error Log."); 
			alert("Reached"); // Can't reach this if throw new Error above it
		} catch(error) { 
			//cool_error_log.logerror( {message: error.name+": "+error.message, 
			//	lineno: 137, filename: document.currentScript || ""});
			cool_error_log.logerror({error});
			//cool_error_log.logerror(error);
			//cool_error_log.logerror(error.stack.toString());
			/*console.log( Object.getOwnPropertyDescriptor(error, 'stack' ) );
			let allKeys = Object.getOwnPropertyNames(error);
			console.log(allKeys); 
			console.log(error.message);
			console.log(error.stack.toString());*/
			//console.error(error); 
			//console.log(error.stack);
			//throw new Error('New error message', { cause: error });
			//alert("Reached2"); // Can't reach this if throw new Error above it
		}
	}
	button.innerHTML = "Test Cool Error Log for Javascript";
	(document.body || document.documentElement).appendChild(button);
}

if (cool_error_log.test_mode)
	console.warn("This is a test", { this : 1, that : "hi" });