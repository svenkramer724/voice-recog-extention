/* content.js */
// Only load content script if it has not been loaded before;
if (typeof content_script_loaded === 'undefined')
{

var running_script = "content";
var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property
var last_speech = "";
var tooltip_timer;
var highlight_div_timer; // Version 1.5.2
var mutation_num = 0; // The number of mutations that has taken place
var labels = []; // Holds an array of elements on the page and their labels
var wakeup_timeout = false; // Used in connection with sra.settings.wakeup_timeout

function observe(el)
{

	// create an observer instance
	var observer = new MutationObserver(function(mutations) {
	  mutations.forEach(function(mutation) {
	    //console.log(mutation);
	    /* For some reason chrome will hang sometimes if I do add_label(el)
	    	using mutation observer. So I commented it out */
	    /* for (var i = 0; i < mutation.addedNodes.length; i++)
	    	if (mutation.addedNodes[i].nodeType == 1) // Only send element nodes not text nodes
				add_label(mutation.addedNodes[i]); // Send addedNodes to add_label(el)
	    add_label(mutation.target); // Send target node to add_label(el)
	    */
	    if (mutation.target != document.getElementById("speech_tooltip")
			&& mutation.target != document.getElementById("sra_highlight_div")) {// Version 1.5.2
			//if (test_mode) console.log(mutation);
			mutation_num++; // Add to count of mutations
		}
	    //if (test_mode) console.log("Mutations: "+mutation_num);
	  });    
	});
	 
	// configuration of the observer:
	var config = { attributes: true, childList: true, characterData: true, subtree: true };
	 
	// pass in the target node, as well as the observer options
	observer.observe(el, config);
}

//document.addEventListener('DOMContentLoaded', function () { // Version 1.2.8 - Added addEventLister to prevent: Uncaught TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'.
	observe(document.body || document.documentElement || document); // Version 1.5.4e - Added  || document.documentElement || document to try and prevent error above again at https://javascript.info/dispatch-events
// }); // Version 1.3.0 - Removed because manifest is loading content at documentend so DOMContentLoaded is never called


window["labels_obj"] = {
	timer: 0,
	start_at: 1,
	func: add_labels,
}

function scroll_handler(event) { // Version 1.5.4 - Used with add_numbers() and add_labels()
			clearTimeout(window["labels_obj"]);
			window["labels_obj"].timer = setTimeout(function() { 
				window["labels_obj"].func("", /*window["labels_obj"].start_at*/); } 
			, 1000); // Call again in 1 second
			// We wait one second before calling add_labels again in case user is actively scrolling, if so then the first timeout is cleared
		}

function add_numbers(keyword, option) { // Version 1.5.2d - Added option for iframes
	/* Version 1.5.2 - Add numbers to links, buttons and fields	*/ 
	clearTimeout(window["labels_obj"].timer); // Version 1.5.4c
	window.removeEventListener('scroll', scroll_handler, true); // Version 1.5.4 - useCapture true allows it to get scroll event on all elements not just body
	window.removeEventListener('click', scroll_handler, true); // Version 1.5.4e
	window["labels_obj"].func = add_numbers; // Version 1.5.4c
	
	if (Array.isArray(keyword)) 
	{
		if (keyword.length == 2 && !isNaN(keyword[1])) option = keyword[1];
		keyword = keyword[0];
	}
	
	var start_at = (typeof option === "undefined") ? 1 : option; // Version 1.5.2d
	
	if (typeof option === "undefined") 
	{ // Version 1.5.4c - Only blank out labels if calling function fresh
		for (var i = 0; i < labels.length; i++) {
			labels[i].tooltip.style.display = "none";	
			if (labels[i].tooltip && labels[i].parentNode) // Version 1.5.2e - Remove tooltip element from DOM // Version 1.6.6 - Added && labels[i].parentNode to fix Uncaught TypeError: Cannot read properties of null (reading 'removeChild') in Edge
				labels[i].tooltip.parentNode.removeChild(labels[i].tooltip);
		}
		labels = []; // Version 1.5.2 - Blank out labels
		window["labels_obj"].start_at = 1; // Version 1.5.4c
	}
	
	if (keyword.match(/^(hide|remove|ausblenden|entfernen|Ocultar|Eliminar|nascondi|rimuovi)/i))
	{
		return;
	}
	
	if (window.self !== window.top && typeof option === "undefined") { // Version 1.5.2d - If in iframe
		chrome.runtime.sendMessage({"add_numbers": null}, function(response) {
			if (test_mode) console.log("Response: ", response);
		});
		return;
	}
	
	var selectors = 'body, iframe, button, [href], input, select, textarea, details, [tabindex]:not([tabindex="-1"]), [contentEditable=true], [contentEditable="TRUE"], [role]'; // Version 1.5.4 - Added again and added body, // Version 1.5.4b - Added , [role]
	// Below is too slow when going through all iframes
	//var all_elems = getAllElems(selectors); // Version 1.5.2 - Get all elements including those in accessible iframes
	var elems = document.querySelectorAll(selectors); // Version 1.5.4 // Version 1.7.11 - from all_elems to elems
	
	// Version 1.7.11 - Put elems in all_elems[] array so shadowRootElems can be added below
	var all_elems = [];
	for (var i = 0; i < elems.length; i++)
		all_elems.push(elems[i]);
	
	// Version 1.7.11 - If activeElement is in shadowRoot then get the shadowRoot elements because selectors is not "*"
	var activeElement = getActiveElement();
	if (activeElement.getRootNode() && activeElement.getRootNode().host) {
		//var shadowRootElems = getAllElems(selectors, activeElement.getRootNode());
		var shadowRootElems = activeElement.getRootNode().querySelectorAll(selectors);
		//if (test_mode) console.log(shadowRootElems);
		for (var ii=0; ii < shadowRootElems.length; ii++)
			all_elems.push(shadowRootElems[ii]);
	}
	
	//var dom = document.body; // start under body this time
	// var all_elems = dom.getElementsByTagName("*"); // Version 1.5.4 - Removed
	for (var e=0; e<all_elems.length; e++)
	{
		var current_el = all_elems[e];
		add_number(current_el, start_at); // Version 1.5.2d - Added start_at
	}
	
	// Version 1.5.2d
	start_at = labels.length + start_at;
	chrome.runtime.sendMessage({"add_numbers": start_at}, function(response) {
		if (test_mode) console.log("Response: ", response, "start_at: " + start_at);
		window["labels_obj"].start_at = start_at; // Version 1.5.4c
		window.addEventListener('scroll', scroll_handler, true); // Version 1.5.4 - useCapture true allows it to get scroll event on all elements not just body
		window.addEventListener('click', scroll_handler, true); // Version 1.5.4e
	});
	
}


function add_number(current_el, start_at) {
		
		var current_label = null;
		var type = "any";
		//var label_text = e+1;
		var label_text = labels.length + start_at; // Version 1.5.2
		/* cross-origin policy problem with below code. So detect if iframe is cross-origin or not. How? */
		//if (elems[i].nodeName == "IFRAME")
		//	current_el = findElement(current_el, elems[i].contentWindow.document)
		/*if ( ( (current_el.isContentEditable && current_el.contentEditable != 'inherit') || 
			isInteractive(current_el, type) ||
			(current_el.hasAttribute("aria-label") && current_el.getAttribute("aria-label").length > 0) || // Version 1.5.4
			('alt' in current_el && current_el.alt.length > 0)	 // Version 1.5.4
			) && isVisible(current_el) )*/
		if (isInteractive(current_el) && isVisible(current_el) && isOnScreen(current_el) == true && !current_el.classList.contains("sra_label")) // Version 1.5.4 - Added && isOnScreen(current_el) == true && !current_el.classList.contains("sra_label")
		{	
			// See if we already found a label for this element
			for (var i = 0; i < labels.length; i++)
			{
				if (current_el == labels[i].el) {
					current_label = labels[i];
					label_text = current_label.tooltip.innerText; // Version 1.5.4c - If label already made then keep same label number
				}
				else if (labels[i].el.contains(current_el)) { // Version 1.5.4 - If element is ancestor of previous label then don't add twice
					var rect1 = current_el.getBoundingClientRect();
					var rect2 = labels[i].el.getBoundingClientRect();
					if (Math.round(rect1.left) == Math.round(rect2.left) &&
					Math.round(rect1.right) == Math.round(rect2.right) &&
					Math.round(rect1.top) == Math.round(rect2.top) &&
					Math.round(rect1.bottom) == Math.round(rect2.bottom)) { // Version 1.5.4 - If they have the same dimensions and position
						current_label = labels[i];
						label_text = current_label.tooltip.innerText; // Version 1.5.4c - If label already made then keep same label number
					}
				}
			}	
			
			if (!current_label)
			{	
				var tooltip = document.createElement('div');
				tooltip.style["font-size"] = "0.8em";
				tooltip.style["line-height"] = 1; // Version 1.5.4
				tooltip.style.position = "absolute";
				tooltip.style.border = "1px solid black";
				tooltip.style.background = "#f0f0f0";
				tooltip.style.opacity = 0.7;
				tooltip.style.zIndex = "1999999999";
				tooltip.className = "sra_label"; // Version 1.5.2k - Otherwise we might click on a label that is over another element (I.E. "Back to inbox" at gmail)
				tooltip.setAttribute("role", "button"); // Version 1.5.4c
				tooltip.style.color = "black"; // Version 1.6.7 - Text not showing well on Edge
				//window.tooltip_timer = ""; // create a global tooltip_timer variable
				//document.body.appendChild(tooltip);
				document.body.insertBefore(tooltip, document.body.firstChild);
				tooltip.addEventListener('click', function() {
					if (test_mode) console.log(current_el);
					setTimeout(function(){ 
						scrollToPosition(current_el);
						current_el.focus();
						highlight_element(current_el);
						click(current_el);
						/* Gmail "Compose" button only works on "mouseup" event */
						/*var event = document.createEvent('MouseEvents');
						event.initEvent("mousedown", true, false); // try (click|mousedown|mouseup), bubble, cancelable
						current_el.dispatchEvent(event);
						event = document.createEvent('MouseEvents');
						event.initEvent("click", true, false); // try (click|mousedown|mouseup), bubble, cancelable
						current_el.dispatchEvent(event);
						event = document.createEvent('MouseEvents');
						event.initEvent("mouseup", true, false); // try (click|mousedown|mouseup), bubble, cancelable
						current_el.dispatchEvent(event);*/
						//current_el.click();
					}, 250);
				}, false); 
				tooltip.addEventListener('mouseover', function() { highlight_element(current_el); }, false); // Version 1.5.4
				var obj = { "el" : current_el, "tooltip" : tooltip };
				labels.push(obj);
			}
			else
			{
				var tooltip = current_label.tooltip;
			}
			// Turn the tooltip off an on depending on if the element is visible or not
			var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
			var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
			var el_rect = current_el.getBoundingClientRect(); // Version 1.5.4
			var x = parseInt(el_rect.left + scrollLeft);
			var y = parseInt(el_rect.bottom + scrollTop);
			if (el_rect.height > 50) // Version 1.5.4 - Put label near top if tall element
				y = parseInt(el_rect.top) + scrollTop;
			if (isFixed(current_el)) { // Version 1.5.4 - If el or ancestor is position fixed
				tooltip.style.position = "fixed";
				x = x - scrollLeft; 
				y = y - scrollTop;
			}
			//tooltip.style.visibility = document.defaultView.getComputedStyle(current_el,null).getPropertyValue("visibility"); // Version 1.5.4 - Removed
			//tooltip.style.display = document.defaultView.getComputedStyle(current_el,null).getPropertyValue("display");
			tooltip.style.display = "block"; // Version 1.5.4
			tooltip.style.cursor = "pointer";
			tooltip.innerText = label_text;	
			tooltip.style.left = x + "px";
			if (tooltip.getBoundingClientRect().right >= (window.innerWidth - 10)) // If tooltip is too far to the right edge of screen
				tooltip.style.left = window.innerWidth - 10 - tooltip.getBoundingClientRect().width + "px"; //tooltip.style.left = x - 50 + "px"; // Version 1.5.4 - From x to window.innerWidth - 10
			tooltip.style.top = y - 5 + "px";	
			
			// If tooltips are overlapping then move them up or down
			for (var i = 0; i < labels.length; i++)
			{
				if (labels[i].tooltip != tooltip)
				{
					var rect1 = tooltip.getBoundingClientRect();
					var rect2 = labels[i].tooltip.getBoundingClientRect();
					var overlap = !(rect1.right < rect2.left ||
	                				rect1.left > rect2.right || 
	                				rect1.bottom < rect2.top || 
	                				rect1.top > rect2.bottom)
	                if (overlap && tooltip.style.position == labels[i].tooltip.style.position) { // Verison 1.5.4 - Only move if they are both fixed or both absolute
	                	//tooltip.style.top = parseFloat(tooltip.style.top) + rect2.height + "px";
						tooltip.style.top = parseInt(rect2.bottom) + 1 + "px"; // Version 1.5.4
						if (tooltip.style.position == "absolute") // Version 1.5.4 - Forgot to add scrollTop
							tooltip.style.top = parseInt(rect2.bottom) + 1 + scrollTop + "px"; 
					}
	            }
			}
			
		}
	
}

function add_labels(keyword, timer)
{
	timer = timer || false; // Version 1.5.4c - Added timer
	clearTimeout(window["labels_obj"].timer); // Version 1.5.4c
	window.removeEventListener('scroll', scroll_handler, true); // Version 1.5.4 - useCapture true allows it to get scroll event on all elements not just body
	window.removeEventListener('click', scroll_handler, true); // Version 1.5.4e
	window["labels_obj"].func = add_labels; // Version 1.5.4c
	
	/* Add text labels to buttons, links and elements that just have icons or images */
	if (Array.isArray(keyword)) 
	{
		keyword = keyword[0];
	}
	
	if (!timer) {// Version 1.5.4c 
		for (var i = 0; i < labels.length; i++) { // Version 1.5.2 - Removed from if (keyword.match(/^(hide... below
			labels[i].tooltip.style.display = "none";	
			if (labels[i].tooltip && labels[i].parentNode) // Version 1.5.2e - Remove tooltip element from DOM // Version 1.6.6 - Added && labels[i].parentNode to fix Uncaught TypeError: Cannot read properties of null (reading 'removeChild') in Edge
				labels[i].tooltip.parentNode.removeChild(labels[i].tooltip);
		}
		labels = []; // Version 1.5.2 - Blank out labels
	}
	
	if (keyword.match(/^(hide|remove|ausblenden|entfernen|Ocultar|Eliminar|nascondi|rimuovi)/i))
	{
		return;	// Version 1.5.2 - Added return;
	}
	else
	{
		var dom = document.body; // start under body this time
		// var all_elems = dom.getElementsByTagName("*");
		//var elems = document.querySelectorAll("*"); // Version 1.5.4 // Version 1.5.4c - Moved from up top - // Version 1.7.11 - from all_elems to elems
		var selectors = "[title],[aria-label],[data-tooltip],[mattooltip],[alt],[placeholder],[aria-placeholder],[name],[id]"; // Version 1.7.11
		var elems = document.querySelectorAll(selectors); // Version 1.7.11
		var scrollTop = document.body.scrollTop || document.documentElement.scrollTop; // Version 1.5.4c
		var scrollBottom = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight); // Version 1.5.4c - Without + scrollTop at end

		// Version 1.7.11 - Put elems in all_elems[] array so shadowRootElems can be added below
		var all_elems = [];
		for (var i = 0; i < elems.length; i++)
			all_elems.push(elems[i]);
		
		// Version 1.7.11 - If activeElement is in shadowRoot then get the shadowRoot elements because selectors is not "*"
		var activeElement = getActiveElement();
		if (activeElement.getRootNode() && activeElement.getRootNode().host) {
			//var shadowRootElems = getAllElems(selectors, activeElement.getRootNode());
			var shadowRootElems = activeElement.getRootNode().querySelectorAll(selectors); // Version 1.7.11b - from "*" to selectors
			if (test_mode) console.log(shadowRootElems);
			for (var ii=0; ii < shadowRootElems.length; ii++)
				all_elems.push(shadowRootElems[ii]);
		}
	
		for (var i = 0; i < all_elems.length; i++)
		{
			var current_el = all_elems[i];
			var el_rect = current_el.getBoundingClientRect(); // Version 1.5.4c
			var position = current_el.ownerDocument.defaultView.getComputedStyle(current_el).position; // Version 1.5.4c
			if (el_rect.top > -Math.abs(scrollBottom) && el_rect.top < (scrollBottom*2)) // Version 1.5.4c - Get 3 screen fulls
				add_label(current_el);
		}
		// if (test_mode) console.log(labels);
		window.addEventListener('scroll', scroll_handler, true); // Version 1.5.4 - useCapture true allows it to get scroll event on all elements not just body
		window.addEventListener('click', scroll_handler, true); // Version 1.5.4e
	}
}


function add_label(el)
{
	
	var current_label = null;
	
	if (isVisible(el) && !el.classList.contains("sra_label")) // Version 1.5.4c - Added && !el.classList.contains("sra_label")
	if ( ('title' in el && el.title.length > 0) ||
		 ('alt' in el && el.alt.length > 0)	||
		 (el.hasAttribute("aria-label") && el.getAttribute("aria-label").length > 0) ||
		 (isInteractive(el)) || // Version 1.5.4d
		 //(isTextInput(el) && el.value.length < 1 && el.placeholder.length < 1) // Version 1.3.0 - Removed
		 (isTextInput(el)) // Version 1.3.0 - Added because textareas and inputs were not getting labels
		)
	{
		// Find a label for this element
		var tag_number = 0; var label_text = "";
		/*var tags = document.body.getElementsByTagName(el.nodeName); // Version 1.5.4 - Removed - Will take too long
		for (var t = 0; t < tags.length; t++)
			if (el == tags[t]) { tag_number = t + 1; break; }
				label_text = el.nodeName + " " + tag_number; // Generic label. Ex: INPUT 5
		*/
		if ('title' in el && el.title.length > 0)
			label_text = el.title;
		else if (el.hasAttribute("aria-label") && el.getAttribute("aria-label").length > 0)
			label_text = el.getAttribute("aria-label");
		else if (el.hasAttribute("data-tooltip") && el.getAttribute("data-tooltip").length > 0) // Version 1.5.4d - https://developers.google.com/web/updates/2017/09/sticky-headers More button
			label_text = el.getAttribute("data-tooltip");
		else if (el.hasAttribute("mattooltip") && el.getAttribute("mattooltip").length > 0) // Version 1.7.11 - Google Bard
			label_text = el.getAttribute("mattooltip");
		else if ('alt' in el && el.alt.length > 0)
			label_text = el.alt;
		else if ('placeholder' in el && el.placeholder.length > 0) // Version 1.3.0 for textareas and inputs
			label_text = el.placeholder;
		else if (el.hasAttribute("aria-placeholder") && el.getAttribute("aria-placeholder").length > 0) // Version 1.5.4d - Did not work for evernote paper
			label_text = el.getAttribute("aria-placeholder");
		else if ('name' in el && el.name.length > 0)
			label_text = el.name.split(/[^A-Za-z0-9 ]/)[0]; // Get text up to _ or - or other non word character
		else if ('id' in el && el.id.length > 0) // Version 1.5.4d - Bug fix - el.name to el.id
			label_text = el.id.split(/[^A-Za-z0-9 ]/)[0]; // Get text up to _ or - or other non word character
			
		if (label_text.length >= 3) { // Version 1.5.4d
		// Find a way to add a label to this element
		if ('placeholder' in el && el.placeholder.length < 1 // Version 1.3.0 - Added && el.placeholder.length < 1
		&& ('value' in el && el.value.length == 0))  // Version 1.5.4 - Added && ('value' in el && el.value.length == 0
			el.placeholder = label_text;
		else if ( 
			('innerText' in el && el.innerText.length <= 1 && 'placeholder' in el == false) // Version 1.5.4d - Added && 'placeholder' in el == false
			|| (el.isContentEditable && el.contentEditable != 'inherit') // Version 1.5.4d
			|| ('placeholder' in el && 'value' in el && el.value.length > 1) // Version 1.5.4d
			|| (el.hasAttribute("mattooltip") && el.getAttribute("mattooltip").length > 0) // Version 1.7.11 - Google Bard microphone and send message icon weren't displaying without this
		)
		{
			// See if we already found a label for this element
			for (var i = 0; i < labels.length; i++)
			{
				if (el == labels[i].el)
					current_label = labels[i];
				else if (labels[i].el.contains(el)) { // Version 1.5.4 - If element is ancestor of previous label then don't add twice
					var rect1 = el.getBoundingClientRect();
					var rect2 = labels[i].el.getBoundingClientRect();
					if (Math.round(rect1.left) == Math.round(rect2.left) &&
					Math.round(rect1.right) == Math.round(rect2.right) &&
					Math.round(rect1.top) == Math.round(rect2.top) &&
					Math.round(rect1.bottom) == Math.round(rect2.bottom)) // Version 1.5.4 - If they have the same dimensions and position
						current_label = labels[i];
				}
			}			
			
			if (!current_label)
			{	
				var tooltip = document.createElement('div');
				tooltip.style["font-size"] = "0.8em";
				tooltip.style["line-height"] = 1; // Version 1.5.4
				tooltip.style.position = "absolute";
				tooltip.style.border = "1px solid black";
				tooltip.style.background = "#f0f0f0";
				tooltip.style.opacity = 0.7; // Version 1.5.2e - From 0.55 to 0.7
				tooltip.style.zIndex = "1999999999";
				tooltip.className = "sra_label"; // Version 1.5.2k - Otherwise we might click on a label that is over another element (I.E. "Back to inbox" at gmail)
				tooltip.setAttribute("role", "button"); // Version 1.5.4c
				tooltip.style.color = "black"; // Version 1.6.7 - Text not showing well on Edge
				//window.tooltip_timer = ""; // create a global tooltip_timer variable
				//document.body.appendChild(tooltip);
				document.body.insertBefore(tooltip, document.body.firstChild);
				tooltip.addEventListener('click', function() {
					setTimeout(function(){ 
						/* Gmail "Compose" button only works on "mouseup" event */
						scrollToPosition(el); // Version 1.5.2k - New from add_number()
						el.focus(); // Version 1.5.2k - New from add_number()
						highlight_element(el); // Version 1.5.2k - New from add_number()
						setTimeout(function() { // Version 1.6.4 - google.com > "show labels" > "click on google apps" wasn't working until setTimeout added
							click(el); // Version 1.5.2k - New from add_number()
						}, 100);
						/*var event = document.createEvent('MouseEvents');
						event.initEvent("mousedown", true, false); // try (click|mousedown|mouseup), bubble, cancelable
						el.dispatchEvent(event);
						event = document.createEvent('MouseEvents');
						event.initEvent("click", true, false); // try (click|mousedown|mouseup), bubble, cancelable
						el.dispatchEvent(event);
						event = document.createEvent('MouseEvents');
						event.initEvent("mouseup", true, false); // try (click|mousedown|mouseup), bubble, cancelable
						el.dispatchEvent(event);*/
					}, 250);
				}, false); 
				tooltip.addEventListener('mouseover', function() { highlight_element(el); }, false); // Version 1.5.4
				
				var obj = { "el" : el, "tooltip" : tooltip };
				labels.push(obj);
			}
			else
			{
				var tooltip = current_label.tooltip;
			}
			// Turn the tooltip off an on depending on if the element is visible or not
			//tooltip.style.visibility = document.defaultView.getComputedStyle(el,null).getPropertyValue("visibility"); // Version 1.5.4 - Removed
			//tooltip.style.display = document.defaultView.getComputedStyle(el,null).getPropertyValue("display");
			tooltip.style.display = "block"; // Version 1.5.4
			tooltip.style.cursor = "pointer";
			tooltip.innerText = label_text;	
			var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
			var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
			var el_rect = el.getBoundingClientRect();
			var x = parseInt(el_rect.left) + scrollLeft; // Version 1.5.4 - From parseInt(el.getBoundingClientRect().left) to rect.left
			var y = parseInt(el_rect.bottom) + scrollTop; // Version 1.5.4 - From parseInt(el.getBoundingClientRect().bottom) to rect.bottom
	
			if (el_rect.height > 50) // Version 1.5.4 - Put label near top if tall element
				y = parseInt(el_rect.top) + scrollTop;
			if (isFixed(el)) { // Version 1.5.4 - If el or ancestor is position fixed
				tooltip.style.position = "fixed";
				x = x - scrollLeft; 
				y = y - scrollTop;
			}
			tooltip.style.left = x + "px";
			tooltip.style.top = y - 5 + "px";
			if (tooltip.getBoundingClientRect().right >= (window.innerWidth - 10)) // If tooltip is too far to the right edge of screen
				tooltip.style.left = window.innerWidth - 10 - tooltip.getBoundingClientRect().width + "px"; //tooltip.style.left = x - 50 + "px"; // Version 1.5.4 - Changed from x to window.innerWidth - 10
			
			// If tooltips are overlapping then move them up or down
			for (var i = 0; i < labels.length; i++)
			{
				if (labels[i].tooltip != tooltip)
				{
					var rect1 = tooltip.getBoundingClientRect();
					var rect2 = labels[i].tooltip.getBoundingClientRect();
					var overlap = !(rect1.right < rect2.left ||
	                				rect1.left > rect2.right || 
	                				rect1.bottom < rect2.top || 
	                				rect1.top > rect2.bottom)
	                if (overlap && tooltip.style.position == labels[i].tooltip.style.position) { // Verison 1.5.4 - Only move if they are both fixed or both absolute
	                	//tooltip.style.top = parseFloat(tooltip.style.top) + rect2.height + "px";
						tooltip.style.top = parseInt(rect2.bottom) + 1 + "px"; // Version 1.5.4
						if (tooltip.style.position == "absolute") // Version 1.5.4 - Forgot to add scrollTop
							tooltip.style.top = parseInt(rect2.bottom) + 1 + scrollTop + "px"; 		
					}
	            }
			}
					
		}
		} // Version 1.5.4d			
	}	
}

function isFixed(elem){ // Version 1.5.4 is element or an ancestor fixed position?
    do{
      if(elem.ownerDocument.defaultView.getComputedStyle(elem).position == 'fixed') return true;
    }while(elem = elem.offsetParent);
    return false;
}

//setTimeout( "add_labels();", 2000);


function replace_mistakes(speech)
{
	var replace_obj = {
	"first" : 1, "second" : 2, "third" : 3, "3rd" : 3,
	"fourth" : 4, "4th" : 4, "fifth" : 5, "5th": 5, "v" : 5, "sixth" : 6, "6th" : 6,
	"seventh" : 7, "7th" : 7, "eighth" : 8, "8th" : 8, "ninth" : 9, "9th" : 9,
	"tenth" : 10, "10th" : 10, "eleventh" : 11, "11th" : 11, "twelfth" : 12, "12th" : 12,
	"thirteenth" : 13, "13th" : 13, "fourteenth" : 14, "14th" : 14, "fifteenth" : 15, "15th" : 15,
	"one" : 1, "two" : 2, "three" : 3, "four" : 4, "five" : 5, "six" : 6, "seven" : 7, "eight" : 8,
	"nine" : 9, "ten" : 10, "twice" : 2, "for" : 4, "to" : 2,
	"login" : "log in|login", "username" : "username|user name", "user id" : "userid|user id",
	"clothe" : "close", 
	};	
	
	for (var key in replace_obj)
	{
		var re = new RegExp("\\b"+key+"\\b",'i'); // insensative case search: 'i'; beginning of string: ^
		speech = speech.replace(re, replace_obj[key]);
	}
	return speech;
}

var num2words = function num2words(n, dash_or_space) {
  if (typeof dash_or_space === "undefined")
  	dash_or_space = "-";
  if (n == 0) return 'zero';
  var a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var b = ['', '', 'twenty', 'thirty', 'fourty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var g = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion'];
  var grp = function grp(n) {
    return ('000' + n).substr(-3);
  };
  var rem = function rem(n) {
    return n.substr(0, n.length - 3);
  };
  var fmt = function fmt(_ref) {
    var h = _ref[0];
    var t = _ref[1];
    var o = _ref[2];

    return [Number(h) === 0 ? '' : a[h] + ' hundred ', Number(o) === 0 ? b[t] : b[t] && b[t] + dash_or_space || '', a[t + o] || a[o]].join('');
  };
  var cons = function cons(xs) {
    return function (x) {
      return function (g) {
        return x ? [x, g && ' ' + g || '', ' ', xs].join('') : xs;
      };
    };
  };
  var iter = function iter(str) {
    return function (i) {
      return function (x) {
        return function (r) {
          if (x === '000' && r.length === 0) return str;
          return iter(cons(str)(fmt(x))(g[i]))(i + 1)(grp(r))(rem(r));
        };
      };
    };
  };
  return iter('')(0)(grp(String(n)))(rem(String(n)));
};

	
function send_to_background(obj)
{	
	chrome.runtime.sendMessage(obj, function(response) {
		if (test_mode) console.log(response.farewell);
	});
}


var num_injected_scripts = 0; // Version 1.5.6 - Keep track of injected scripts so we can have more than 1

document.addEventListener('sra_event', function (e) { // Version 1.5.6 - Get Return result variable to send to display_speech. 
	var result = e.detail; 
	if (typeof result !== 'string') // Version 1.7.0
		result = JSON.stringify(result); // Version 1.7.0 - Some results may be objects so turn them into strings
	if (test_mode) console.log("Result: ",result, new Date().getTime());
	if (result) display_speech({ "speech": result, "date": new Date().getTime()});
	//if (result && window.self === window.top) // Version 1.7.6 - Removed. We no longer want data returned from scripts to be on sr.html tab
	//	send_to_background({"command": "textbox", "option": result, "date": new Date().getTime()}); // Version 1.7.0b
}, false);

function inject_script(obj) {
	// Version 1.1.1 - Inject code into head // Version 1.3.0 - Removed
	/* var actualCode = '(' + function(obj) {
	    if (window[obj.command])
			window[obj.command].apply(this, obj.option);
	} + ')(' + JSON.stringify(obj) + ');'; */
	// Version 1.3.0 - New way to enter a string as javascript code
	if (test_mode) console.log(obj);
	if (obj.option.length >= 1)
		var actualCode = obj.command + "(" + obj.option.join(",") + ")"; // Version 1.3.0 // Join option by ,
	else
		var actualCode = obj.command; // Version 1.3.0 // Because option is not there e.g. document.querySelectorAll(".r")[1].innerHTML += 1
	num_injected_scripts++; // Version 1.5.6
	/* Version 1.5.6 - Return result variable to display_speech. 
	The problem with putting actual code in function() is if the user creates functions 
	they won't be accessible because they aren't global but are in function().
	They could declare it as window["bar"] = function() {}; but semicolon is needed or "Uncaught SyntaxError: Unexpected identifier"
	*/
	actualCode = "function sra_function"+num_injected_scripts+"() {"+
		actualCode + "}\n" + 
		"var sra_result"+num_injected_scripts+" = sra_function"+num_injected_scripts+"();\n"+
		"var sra_event = new CustomEvent('sra_event', { detail: sra_result"+num_injected_scripts+" });\n "+
		"if (sra_event) document.dispatchEvent(sra_event);"; // Version 1.5.6 // Version 1.7.8 - Added - if (sra_event) because was printing null for scripts that had no return value;
	if (test_mode) console.log(actualCode);
	/*var script = document.createElement('script'); 
	script.textContent = actualCode;
	(document.head||document.documentElement).appendChild(script);
	script.remove(); // Version 1.3.0 - Removed in case user wants to reuse variable e.g. var dog = document.getElementById(dog) // Version 1.5.6 - Added this line back because even if you remove the script code, the variables and functions are still in memory and can be used
	*/
	// Version 1.7.0 - From https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions/9517879#9517879
	// On certain websites like Google search this Manifest V3 compatible way doesn't work and console.error:
	// Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src 'nonce-RUe_5sZjmPFm2hP2pxVDxw' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:". Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list.
	// Version 1.7.0b - Possibly solved above error with https://stackoverflow.com/questions/70978021/chrome-extension-how-do-i-use-declarativenetrequest-to-bypass-the-content-secur
	try {
		var el = document.createElement("div");
		el.setAttribute('onreset', actualCode);
		el.dispatchEvent(new CustomEvent('reset'));
		el.removeAttribute('onreset');
	} catch (error) {
		console.log(error);
	}
}

// Version 1.7.0b - docs.google.com was still showing Content Security Policy error above with inject script even with try..catch..
// NOTE: Did not work with window or document! It is not catching the error
document.addEventListener('securitypolicyviolation', function(e) {
    e.preventDefault();
	console.log(e);
});


function script(option) {
	// Version 1.3.0 - script() command for javascript
	// convert html entities into text
	var element = document.createElement('div');
	element.innerHTML = option;
    option = element.textContent;
	inject_script({"command":option, "option":[]});	
}

var tts_sr_audio_pause_timer; // Version 1.7.5
var tts_sr_audio_pause_interval; // Version 1.7.5


// Listen to message from background script
// Listen to message from background script
chrome.runtime.onMessage.addListener(
	window["content_listener"] = function (obj, sender, sendResponse) { // Version 1.7.6 - Added window["content_listener"] = 
		if ('speechSynthesis' in window && window.speechSynthesis.speaking 
		&& !window.speechSynthesis.paused && sra.settings.pause_for_audio ) { // Version 1.7.5
			sra.settings.sr_audio_pause = true; // Change sra object 
			var obj = { settings : sra.settings };
			if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
			save_to_storage(obj);
			clearTimeout(tts_sr_audio_pause_timer);
			if (typeof sendResponse !== 'undefined') // Version 1.7.6
				sendResponse({farewell: "From content: I got the object."});
			//sendResponse({command: "tts_sr_audio_pause", option: true });
			tts_sr_audio_pause_interval = setInterval(function() { // Set interval to check if it is still speaking
				if ('speechSynthesis' in window && !window.speechSynthesis.speaking 
				&& sra.settings.pause_for_audio && sra.settings.sr_audio_pause) {
					tts_sr_audio_pause_timer = setTimeout(function() { 
						sra.settings.sr_audio_pause = false; // Change sra object 
						var obj = { settings : sra.settings };
						if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
						save_to_storage(obj);
						clearInterval(tts_sr_audio_pause_interval);
					}, 1000);
				}
			}, 1000);
			return;	
		}
		
		
    	var response = ""; // Version 1.2.0
    	/* On Google webpages we are getting the message multiple times!!
    	 	So we need to compare times to see if we should skip some
    	*/
		var date = new Date();
		if (test_mode) console.log(JSON.stringify(obj));
		//console.log(document.activeElement);
		window['sra_date'] = (obj.hasOwnProperty("date")) ? obj.date : 0; // Version 1.5.2 - Evernote was doing keypress() twice
		
		if (obj.hasOwnProperty("date")) // Version 1.3.9
		{
			// If we did this command or speech in another iframe then the attribute "sra-date" will match obj.date
			var el = getActiveElement(); // Version 1.7.11
			
			var data_sra = el.getAttribute('data-sra'); // Version 1.7.11 - From sra_date to data_sra
			if (data_sra > 0 && data_sra == obj.date) 
				return;	// If they match then don't do this same command again
			
			// Version 1.7.11 - Also check to see if sra_date is on the dom
			//var data_sra = el.ownerDocument['documentElement'||'body'].getAttribute('data-sra');
			//if (data_sra > 0 && data_sra == obj.date) 
			//	return;	// If they match then don't do this same command again
			// REMOVED! It caused "scroll down" not to work and possibly "show numbers" 
			
			// Version 1.7.11 - Now if I add obj.date to the dom then we won't run this command twice!
			//el.ownerDocument['documentElement'||'body'].setAttribute('data-sra', obj.date);
			// REMOVED! It caused "scroll down" not to work and possibly "show numbers" 
		}
		if (obj.hasOwnProperty("speech"))
		{
			var maximum = 11; var minimum = 1; // Version 1.0.6 - Add Free Trial Expired to speech randomly // Version 1.0.9 - Changed from 4 to 11
			var randomnumber = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
			if (randomnumber == 10) // Version 1.0.9 - Changed to 10
				if (sra.license.match(/expired/i)) obj.speech = chrome.i18n.getMessage(sra.license.replace(/ /g,"_")) + obj.speech; // Version 1.0.6	// Version 1.1.3 - Add chrome.i18n language support
			display_speech(obj); // Version 1.3.9 - Changed from (document.activeElement, obj.speech) to (obj)
		}
		if (obj.hasOwnProperty("interim"))
		{
			if (sra.license && sra.license.match(/expired/i)) obj.interim = sra.license + obj.interim; // Version 1.0.3
			speech_tooltip(document.activeElement, obj.interim);
		}
		if (obj.hasOwnProperty("command"))
		{
			/* if(obj.command == "switch_fields")
				switch_fields(obj.option);
			else if (obj.command == "switch_focus")
				switch_fields("any", obj.option); */
			if (obj.command == "insertHTML") { // Version 1.4.4b
				obj.insertType = "insertHTML";
				obj.speech = obj.option[0];
				display_speech(obj);
			}
			else if (window[obj.command])
				response = window[obj.command](obj.option); // Version 1.2.0 - Added response
			// Version 0.99.7 // Version 1.3.0 - Removed
			/* else if (obj.command.indexOf(".") != -1) {
				var splt = obj.command.split(".");
				if (test_mode) console.log(splt);
				if (splt.length == 2 && window[splt[0]] && window[splt[0]][splt[1]]) {
					var bit = window[splt[0]][splt[1]](obj.option); // Works with: document.execCommand(copy)
					if (test_mode) console.log("1: "+bit);
				}
				else if (splt[0][splt[1]]) {
					var phrase = splt[0][splt[1]](obj.option); // Works with: ibm.toUpperCase()
					if (test_mode) console.log("2: "+phrase);
					display_speech(document.activeElement, phrase);
				}
			} */
			else {
				inject_script(obj); // Version 1.1.1
			}
				
	
			/*else if (obj.command == "click_element")
				click_element(obj.option);
			else if (obj.command == "enter_key")
				enter_key(obj.option);
			else if (obj.command == "spacebar")
				spacebar(obj.option);	*/
		}
		if (obj.hasOwnProperty("wakeup_timeout"))
		{
			var seconds = obj.wakeup_timeout;
			clearTimeout(wakeup_timeout);
			wakeup_timeout = setTimeout(function()
			{
				wakeup_timeout = false;	
				chrome.tabs.sendMessage(tab_id, {"wakeup_timeout" : false });
			} , seconds); 
		}
    	if (obj.hasOwnProperty("button")) 
    	{
    		if (obj["button"] == "up") change_fontsize("up");
    		else if (obj["button"] == "down") change_fontsize("down");
    		else if (obj["button"] == "default") change_fontsize("default");	
    	}
    	else if (obj.hasOwnProperty("color")) 
    	{
    		if (obj["color"] == "reset")
    			change_fontcolor("background-color", obj["color"]);	// reset will do the next line also
			change_fontcolor("color", obj["color"]);
    	}
    	else if (obj.hasOwnProperty("bgcolor")) 
    	{
    		change_fontcolor("background-color", obj["bgcolor"]);
    	}
    	else if (obj.hasOwnProperty("send"))
		{
			if (obj["send"] == "colors")
			{
				var colors_obj = { "color" : current_color, "background-color" : current_bgcolor };
				if (typeof sendResponse !== 'undefined') // Version 1.7.6
					sendResponse(colors_obj);
				return;
			}
		} 
		
      	if (response && typeof sendResponse !== 'undefined') // Version 1.7.6 - Added typeof sendResponse !== 'undefined'
				sendResponse(response); // Version 1.2.0
		else if (typeof sendResponse !== 'undefined') // Version 1.7.6
			sendResponse({farewell: "From content: I got the object."});
  });



// wait on voices to be loaded before fetching list
var voice_array = [];
if (speechSynthesis.onvoiceschanged !== undefined) // Firefox does not need or use onvoiceschanged (chrome only does)
window.speechSynthesis.onvoiceschanged = function() {
	if (window.self === window.top) // Only load in top window not iframes
	if (voice_array.length == 0) // don't create the list again if chrome thinks the voice changed
	{
	  	voice_array = window.speechSynthesis.getVoices();
	  	if (test_mode) console.table(voice_array);
	}
};


// find on page - Version 0.99.0
function find_phrase(keyword) {

	setTimeout(function(){ // Version 0.99.7 - Wait for tooltip to disappear so we don't find keyword there
		var win = window;
		var dom = document;
		var el = document.activeElement;
		if (el.nodeName == "IFRAME") { // Version 1.5.2j - Added to find_phrase() from clear_text()
			try {
				while (el.nodeName == "IFRAME") {
					dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
					el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
					win = el.ownerDocument.defaultView; // Version 1.5.2j
				}
				if (test_mode) console.log(el); // Version 1.3.5
			} catch (err) { 
				if (test_mode) console.log(err);
			}
		}
		if (document.getElementById("speech_tooltip")) // Version 1.3.6 - Bug Fix: Uncaught TypeError: Cannot set property 'innerHTML' of null
			document.getElementById("speech_tooltip").innerHTML = ""; // Version 1.3.3 - Was always finding in tooltip
		// window.find(aString, aCaseSensitive, aBackwards, aWrapAround, aWholeWord, aSearchInFrames, aShowDialog);
		var found = win.find(keyword, false, false, true, false, true, true); // search downward // Version 1.3.3 - Added WrapAround "true" // Version 1.5.2j - Changed window to win for iframes (worked in tinyMCE), Also added boolean for aSearchInFrames but it did not work in tinyMCE without win
		console.log(keyword+" "+found);
		if (!found) speech_tooltip(document.activeElement, "'"+keyword+"' not found!");
		/*if (found == false)
			found = window.find(keyword, false, true, false, false, false, true); // search upward */ // Version 1.3.3 - Not needed because WrapAround above
		//console.log(keyword+" "+found);
	}, 1000);
}


var speak_tries = 0;

function speak(that)
{
	if (Array.isArray(that)) that = that[0]; // Version 0.99.7
	var text = that;
	var that_array = that.match(/(".*?"|'.*?'|[^"'\+]+)(?=\s*\+|\s*$)/g); // split by + not in quotes
	for (var a = 0; a < that_array.length; a++) {
		var element_id = that_array[a].split(".")[0];
		var el = (element_id == "body") ? document.body : document.getElementById(element_id); 
		if (el) {
			//var el = document.getElementById(element_id);
			if (that_array[a].indexOf(".") != -1) {
				var tag = that_array[a].split(".")[1]; // img[0]
				tag = tag.split("[")[0]; // img
				var num = that_array[a].match(/\[(\d+)/)[1]; // 0
				if (el.getElementsByTagName(tag)[num])
					el = el.getElementsByTagName(tag)[num];
			}
			
			if ('title' in el && el.title.length > 0)
				text = el.title;
			else if (el.hasAttribute("aria-label") && el.getAttribute("aria-label").length > 0)
				text = el.getAttribute("aria-label");
			else if ('alt' in el && el.alt.length > 0)
				text = el.alt;
			else if ('innerText' in el && el.innerText.length > 0)
				text = el.innerText;
		}
		else if (speak_tries < 15) {
			speak_tries++;
			setTimeout(function()
			{
				speak(that);
				//if (test_mode) console.log(that);
			} , 500);
			return;
		}
		
		speak_tries = 0;
		
		var sentences = text.split(/[\.\!\?\n]/); // Version 0.99.7 - Split by sentences to not break speechSynthesis with long text
		//say(sentences);  // Version 1.2.0 - Removed. Now doing say in sr.html because of Chrome 71 stopping speechSynthesis in pages without interaction
		//return ({"command": "say", "option": text}); // Version 1.2.0 - Now doing say in sr.html. Won't work because of setTimeout above
		send_to_background({"command": "say", "option": text}); // Version 1.2.0 - Still goes to sr.html because it is a background script
		elem_array = [];
		elem_array.push(el);
		highlight_speak(0); // Highlight first element to speak if set in settings
	}

}


function speak_element(that) // Version 1.6.8 - New function for tts to speak element using querySelectorAll
{
	// Wolfram Alpha: img._3c8e[1] <-- Speak the second img with class="_3c8e" ([0] would be the first img)
	if (test_mode) console.log(that);
	//if (Array.isArray(that)) that = that[0]; // Version 0.99.7
	var text = "Element not found.";
	
	//var that_array = that.match(/(".*?"|'.*?'|[^"'\+]+)(?=\s*\+|\s*$)/g); // split by + not in quotes
	var that = that.toString(); // Version 1.6.8 - ["w-answer","[aria-level='3'][role='heading']"] to "w-answer,[aria-level='3'][role='heading']"
	//for (var a = 0; a < that_array.length; a++) { // Version 1.6.8 - Removed
		var parts = that.split(/\[(\d+)\]/); // img._3c8e[1] --> ['img._3c8e', '1', '']
		var num = parts[1] || 0; // num --> if [d] not included then get first element (0)
		var el = document.querySelectorAll(parts[0])[num] || null;
		if (test_mode) console.log(that, parts, el, num);
		//var element_id = that_array[a].split(".")[0];
		//var el = (element_id == "body") ? document.body : document.getElementById(element_id); 
		if (el) {
			//var el = document.getElementById(element_id);
			/*if (that_array[a].indexOf(".") != -1) {
				var tag = that_array[a].split(".")[1]; // img[0]
				tag = tag.split("[")[0]; // img
				var num = that_array[a].match(/\[(\d+)/)[1]; // 0
				if (el.getElementsByTagName(tag)[num])
					el = el.getElementsByTagName(tag)[num];
			}*/
			
			if ('title' in el && el.title.length > 0)
				text = el.title;
			else if (el.hasAttribute("aria-label") && el.getAttribute("aria-label").length > 0)
				text = el.getAttribute("aria-label");
			else if ('alt' in el && el.alt.length > 0)
				text = el.alt;
			else if ('innerText' in el && el.innerText.length > 0)
				text = el.innerText;
		}
		else if (speak_tries < 15) {
			speak_tries++;
			setTimeout(function()
			{
				speak_element(that);
				//if (test_mode) console.log(that);
			} , 500);
			return;
		}
		
		speak_tries = 0;
		
		var sentences = text.split(/[\.\!\?\n]/); // Version 0.99.7 - Split by sentences to not break speechSynthesis with long text
		//say(sentences);  // Version 1.2.0 - Removed. Now doing say in sr.html because of Chrome 71 stopping speechSynthesis in pages without interaction
		//return ({"command": "say", "option": text}); // Version 1.2.0 - Now doing say in sr.html. Won't work because of setTimeout above
		send_to_background({"command": "say", "option": text}); // Version 1.2.0 - Still goes to sr.html because it is a background script
		elem_array = [];
		elem_array.push(el);
		highlight_speak(0); // Highlight first element to speak if set in settings
	//}

}


var elem_array = []; // To be used with read(that) // Version 1.2.0
var text_array = []; // Version 1.2.3 - Put outside of read function

function highlight_speak(index) { // Version 1.2.0
	// select or highlight the next element that is being read.
	if (typeof elem_array != "undefined" && elem_array.length > 0 && elem_array[index]) {
		//var elem = elem_array.shift(); // Return and remove first element
		var elem = elem_array[index];
		if (test_mode) console.log(elem, index);
		if (typeof elem !== "undefined") {  // Version 1.3.3 - Added 'typeof elem !== "undefined"' to be able to highlight elements in iframes
			if (elem.parentNode.nodeName == "TEXTAREA" && elem.parentNode.readOnly)
				elem = elem.parentNode; // Version 1.2.5 - Can't select the text in a readOnly textarea
			if (sra.settings.tts_highlight && document.body.contains(elem)) // // Version 1.2.5 - To prevent 'The given range isn't in document.' at gmail if clicking away from email while it is reading it
				select_node(elem); // select text being spoken
			if (elem.nodeType == 3) // Text node
				elem = elem.parentNode; // Can't scroll to a text node or add outline to text node so get the parent element
			if (sra.settings.tts_highlight)	// Version 1.2.4 - Forgot to check for tts_highlight here	
				highlight_element(elem); // Put outline around element
			if (sra.settings.tts_scroll) 
				scrollToPosition(elem);
		}
	}
}


function read(that) { // Verison 1.2.0
	/* Aria role="none" or role="presentation" just means you don't read that if it is an anchor or table element but you read the content still
		See: https://www.w3.org/TR/using-aria/#ariapresentation
	*/
	if (!window.location.href.match(/chrome-extension:.*?iframe.html/i)) // Stay if we are in sr.html iframe
	if (window.self !== window.top) // Only load in top window not iframes
		return;
	if (Array.isArray(that)) that = that.join(); // Version 1.2.3 - combine [images]+[ on screen] = "images on screen";
	
	// Version 1.7.6 - Adding iframe to all fathers so we can read contenteditable in iframes such as TinyMCE and CKEditor
	
	var fathers = getAllElems("iframe, body");
	//var queryTags = [node.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], p, img"), 
	//	node.querySelectorAll("a, [role='link']"), node.querySelectorAll("li")];
	
	
	if (that.match(/all|entire|everything/i)) {
		fathers = getAllElems("iframe, body");
	}
	else if (that.match(/alert|notification|status/i)) {
		fathers = getAllElems("iframe, [role='alert'],[role='alertdialog'],[role='dialog'],[role='status'],[aria-live='polite'],[aria-live='assertive'][aria-live='rude']");
	}
	else if (that.match(/heading|titles|headline/i)) { // Version 1.3.3 - Added s to the end of title
		fathers = getAllElems("iframe, h1, h2, h3, h4, h5, h6, [role='heading']");
	}
	else if (that.match(/title/i)) { // Version 1.3.3 - Read title tag of document if there or first h1 etc.
		fathers = getAllElems("title, h1, h2, h3, h4, h5, h6, [role='heading']");
		if (fathers.length > 0) {
			var text = fathers[0].innerText;
			send_to_background({"command": "say", "option": text});
			return;
		}
	}
	else if (that.match(/paragraph/i)) {
		fathers = getAllElems("iframe, p");
	}
	else if (that.match(/link/i)) {
		fathers = getAllElems("iframe, a, [role='link']");
	}
	else if (that.match(/button/i)) {
		fathers = getAllElems("iframe, button, [role='button'], [type='button']");
	}
	else if (that.match(/input/i)) {
		fathers = getAllElems("iframe, input");
	}
	else if (that.match(/text\s?area|(text )?box/i)) { // Version 1.7.6 - Added \s?
		fathers = getAllElems("iframe, textarea, [contentEditable='true']");
	}
	else if (that.match(/image|figure/i)) {
		fathers = getAllElems("iframe, img, figure, [role='img'], [role='figure']");
	}
	else if (that.match(/toolbar/i)) { // Version 1.3.3
		fathers = getAllElems("iframe, [role='toolbar']");
		if (fathers.length == 0) fathers = getAllElems("iframe, [class^=toolbar], [id^=toolbar]");
	}
	else if (that.match(/menu|nav/i)) {
		fathers = getAllElems("iframe, [role='navigation'][aria-label='Primary'], nav[aria-label='Primary']");
		if (fathers.length == 0) fathers = getAllElems("iframe, nav, [role='navigation']");
		if (fathers.length == 0) fathers = getAllElems("iframe, #topnav, .topnav, #navbar, .navbar, #menu, .menu, #nav, .nav");
		if (fathers.length == 0) fathers = getAllElems("iframe, [class^=menu], [id^=menu]"); // Version 1.3.3
		//if (node) queryTags = [node.querySelectorAll("a, [role='link']"), node.querySelectorAll("li")];
		//queryTags = [getAllElems("nav, [role='navigation']")];
	}
	else if (that.match(/page|webpage|^screen|article|website|site|main|content|text/i)) {
		// fathers = getAllElems("[role='main'], main, article, [role='article']"); // Version 1.6.2 - Split main and article because jw.org was reading screen twice
		fathers = getAllElems("iframe, [role='main'], main"); // Version 1.6.2
		if (fathers.length == 0) fathers = getAllElems("iframe, article, [role='article']"); // Version 1.6.2
		if (fathers.length == 0) fathers = getAllElems("iframe, #main, .main, #content, .content");
		if (fathers.length == 0) fathers = getAllElems("iframe, [class^=main], [class^=content], #container, .container");
		if (fathers.length == 0) fathers = getAllElems("iframe, body");
		/*if (window.location.href.match(/mail.google/i) && document.querySelector(".gs")) // or try .a3s.aXjCH for gmail
			var first_tag = node.querySelectorAll("h1, h2, .gs");
		else
			var first_tag = node.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], p, img");
		queryTags = [first_tag, node.querySelectorAll("dt, dd, td"),
			node.querySelectorAll("a, [role='link']"), node.querySelectorAll("li"), getAllElems("body")];	*/
	}
	else if (that.match(/header|banner/i)) {
		fathers = getAllElems("iframe, header, [role='banner']");
		if (fathers.length == 0) fathers = getAllElems("iframe, .header, #header");
		//queryTags = [getAllElems("header, [role='banner']")];
		//if (node) queryTags = [node.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], p, img"), 
		//node.querySelectorAll("a, [role='link']"), node.querySelectorAll("li")];
	}
	else if (that.match(/footer|contentinfo/i)) {
		fathers = getAllElems("iframe, footer, [role='contentinfo']");
		if (fathers.length == 0) fathers = getAllElems("iframe, .footer, #footer");
		//queryTags = [getAllElems("footer, [role='contentinfo']")];
		//if (node) queryTags = [node.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], p, img"), 
		//node.querySelectorAll("a, [role='link']"), node.querySelectorAll("li")];
	}
	else if (that.match(/sidebar|aside|complementary|complimentary/i)) {
		fathers = getAllElems("iframe, aside, [role='complementary'], #sidebar, .sidebar");
	}
	else if (that.match(/selected|highlighted|selection/i)) {
		//queryTags = [ [{"innerText":window.getSelection().toString()}], document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], p")];
		var text = "Text is not selected on the page.";
		if (window.getSelection().toString()) var text = window.getSelection().toString();
		else { // Version 1.3.3
			var frames = document.querySelectorAll("iframe");
			for (var f = 0; f < frames.length; f++) {
				if (test_mode) console.log(frames[f]);
				try {
					if (frames[f].contentWindow.window.getSelection().toString())
						var text = frames[f].contentWindow.window.getSelection().toString();
				} catch (err) { 
					if (test_mode) console.log(err);
				}
			}
		}	
		
		send_to_background({"command": "say", "option": text}); // Version 1.2.1
		elem_array = [];
		return;
	}
	
	var text = "";
	var all_text_length = 0;
	text_array = []; // blank text array
	elem_array = []; // blank elem_array
	var pause_text = ""; // Add period to end of element
	if ((fathers.length) == 0) {
		send_to_background({"command": "say", "option": that + " not found."}); // Version 1.2.3
		elem_array = [];
		return;
	}
		
	
	for (var q = 0; q < fathers.length; q++) {
		var father = fathers[q];
		read_children(father, that);
	}
	
	if (test_mode) console.log(elem_array);
	if (test_mode) console.log(text_array);
	
	if (text_array.length > 0) {
		highlight_speak(0); // Highlight first element to speak if set in settings
		send_to_background({"command": "say", "option": text_array}); // Version 1.2.0 - Still goes to sr.html because it is a background script
	}
}
		
		
function read_children(father, that) {
	if (test_mode) console.log(father);
	var node = (that.match(/image|input/i)) ? father : father.firstChild; // Version 1.2.3
	for (node; node; node=node.nextSibling) {	
		if (test_mode) console.log(node);
		if (node.nodeType == 1) { // element node
			// - Version 1.3.3 - If element is IFRAME get the read_children() on the iframe
			/* - Version 1.7.6 - Moved: nodeName == "IFRAME" below because it wasn't being called
				because previously "iframe" was not in the selectors. Also it was in the loop to 
				only be called if not simple tts mode.
			*/
			/*if (node.nodeName == "IFRAME")
				try {
					var fathers = node.contentWindow.document.querySelector("body");
					read_children(fathers, that); // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
				} catch (err) { 
					if (test_mode) console.log(err);
				}*/
			if (isVisible(node) && node.getAttribute("aria-hidden") != "true" && (!sra.settings.tts_simple || that.match(/image|input/i)) ) {
				if ((that.match(/page|webpage|paragraph|screen|on screen/i) && isOnScreen(node) == true) || 
				!that.match(/page|webpage|paragraph|screen|on screen/i)) {
					var text = ""; // Version 1.2.3 - Moved from out of if statements
					
					if (node.getAttribute("role") && node.getAttribute("role").match(/none|presentation/i)) text = "";
					else if (node.getAttribute("role")) text = node.getAttribute("role") + ". ";
					else if (node.tagName.match(/^(H\d)$/i)) text = "Heading. ";
					else if (node.tagName == "IMG" && (node.getAttribute('aria-label') || node.alt || node.title)) text = "Image. ";
					else if (node.tagName == "A" && node.innerText) text = "Hyperlink. ";
					else if (node.tagName.match(/BUTTON/i)) text = "Button. ";
					else if (node.tagName.match(/INPUT/i) && node.type != "hidden" && node.type.match(/checkbox/i)) { // Verison 1.2.5
						text = node.tagName + " " + node.type + ". ";
						text += (node.checked) ? "Checked. " : "Not checked. ";
					}
					else if (node.tagName.match(/LABEL/i) && node.type != "hidden" && node.innerText != "") text = node.tagName;
					else if (node.tagName.match(/SELECT/i) && node.type != "hidden") text = node.tagName + " type. " + node.type + ". Selected value is " + node.value + ". ";
					else if (node.tagName.match(/INPUT/i) && node.type != "hidden") text = node.tagName + " " + node.type + ". " + (node.value || node.placeholder) + ". ";
					else if (node.tagName.match(/TEXTAREA/i)) { 
						text = "Text Area. ";
						if (!node.readOnly) // textareas with readOnly have a firstChild text node. But non-readOnly have just a value
							text += (node.value || node.placholder) + ". "; // So read value if not readOnly
					}
					var add_text = node.getAttribute('aria-label') || node.alt || node.title || "";
					if (node.tagName == "A" && node.innerText.length > 1) add_text = node.getAttribute('aria-label') || ""; // It was annoying to have the title and innerText read
					if (node.getAttribute("role") && node.getAttribute("role").match(/img/i)) text = "Image. ";
					if (add_text) text += add_text + ". ";
					if (text) {
						if (node.readOnly) text += "Read only. ";
						if (node.disabled) text += "Disabled. ";
					}
					var label_elem = []; // Version 1.2.5 - From blank string to array
					if (node.getAttribute("aria-labelledby")) { // Version 1.2.5
						var label_ids = node.getAttribute("aria-labelledby").split(" "); // one or more element IDs split by space	
						for (var e = 0; e < label_ids.length; e++)
							label_elem.push(document.getElementById(label_ids[e]));
					}
					else if ((typeof node.labels != "undefined" && node.labels[0]))
						label_elem = node.labels;
					for (var le = 0; le < label_elem.length; le++) {
						if (label_elem[le] && label_elem[le] != father) { // Version 1.2.5 - Added '&& label_elem != father'
							for (var i = 0; i < elem_array.length; i++) {
								if (label_elem[le] == elem_array[i]) // See if we already spoke this label element
									break; 
							}
							if (i == elem_array.length) { // label was not in elem_array already so we can speak it
								//read_children(label_elem, that);
								text += "Label. " + label_elem[le].innerText + ". ";		
							}	
						}
					}
					if (text) {
						text_array.push(text);
						elem_array.push(node);	
					}
				}
			}
			if (that.match(/image|input/i)) break; // Version 1.2.3
			read_children(node, that); // Because an element could be visible even though parent is not because of absolute position
		}
		else if (node.nodeType == 3) { // text node		
			var elem = node.parentNode; 
			if (elem.nodeName == "OPTION") elem = elem.parentNode; // Version 1.2.5 - Option tags always return 0 for getBoundingClientRect() and look like they are onscreen. So get parent which should be SELECT
			if (isVisible(elem) && elem.getAttribute("aria-hidden") != "true" && elem.id != "speech_tooltip") { // Version 1.2.5 - Added != speech_tooltip
				if ((that.match(/page|webpage|paragraph|screen|on screen/i) && isOnScreen(elem) == true) || 
				!that.match(/page|webpage|paragraph|screen|on screen/i)) {
					if (!elem.tagName.match(/^(noscript)$/i)) // Don't read <noscript> innerText
					if (!node.nodeValue.match(/^\s+$/i)) {// If the whole text is just whitespace or newlines then ignore
						text_array.push(node.nodeValue);
						elem_array.push(node);
					}
				}
			}
		}	
	}
}
	
	/*queryTag_loop:
	for (var q = 0; q < queryTags.length; q++) {
		all_text_length = 0;
		var els = queryTags[q];
		els_loop:
		for (var i = 0; i < els.length; i++) {
			var elem = els[i];
			if (isVisible(elem) && elem.getAttribute("aria-hidden") != "true" && 
			(elem.getAttribute('aria-label') || elem.alt || elem.title || elem.innerText || elem.placeholder || elem.value)) {
				if ((that.match(/page|webpage|paragraph|screen|image|figure/i) && isOnScreen(elem) == true) || 
				!that.match(/page|webpage|paragraph|screen|image|figure/i)) {
					text = elem.getAttribute('aria-label') || elem.alt || elem.title || elem.innerText;
					text = text.replace(/https?:(\S*)/i, " hyperlink "); // Remove any http: links from google.com links
					if (elem.tagName == "IMG") text = "Image of " + text;
					if (elem.tagName == "A") text = "Hyperlink: " + text;
					if (elem.tagName == "LABEL") text = "Input Label: " + text;
					if (elem.tagName.match(/TEXTAREA|INPUT/i) && elem.value != "") 
						text = elem.tagName + ". " + elem.placeholder + ". Value is: " + elem.value;
					//if (!text.match(/[\.\!\?\n]$/)) text += pause_text; // Add period to end of sentence if not there.
					if (!text.match(/^\s+$/)) {// Don't include elements that are just spaces or blanks
						text_array.push(text);
						elem_array.push(elem);	
						if (that.match(/paragraph|heading|title|selected|highlighted|selection|text/i))
							break queryTag_loop; // Only one paragraph if they say paragraph
					}
				}
			}	
		}
		if (text_array.length > 0) break queryTag_loop; // Don't move on to next queryTag if we found elements to read
	}
	*/
/*	if (that.match(/selected|highlighted|selection|text/i)) {
		text = window.getSelection().toString();
		//if (!text.match(/[\.\!\?\n]$/)) text += pause_text; // Add period to end of sentence if not there.
		text_array.push(text);
		if (text == "") that = "page";
	}
	
	if (that.match(/alert|notification|status/i)) {
		var els = document.querySelectorAll("[role='alert'],[role='status'],[aria-live='polite'],[aria-live='assertive']");
		for (var i = 0; i < els.length; i++) {
			var elem = els[i];
			text = elem.innerText;
			//if (!text.match(/[\.\!\?\n]$/)) text += pause_text; // Add period to end of sentence if not there.
			text_array.push(text);
			elem_array.push(elem);
			
		}				
	}
	
	
	if (that.match(/page|webpage|paragraph|screen|article|website|site/i)) {
		if (document.querySelector(".a3s.aXjCH")) // gmail email body
			var els = document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], .a3s.aXjCH");
		else
			var els = document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], p");
		for (var i = 0; i < els.length; i++) {
			var elem = els[i];
			if (isVisible(elem) && (elem.getAttribute('aria-label') || elem.title || elem.alt || elem.innerText )) {
				if ((that.match(/page|webpage|paragraph|screen/i) && isOnScreen(elem) == true) || that.match(/article|website|site/i)) {
					text = elem.getAttribute('aria-label') || elem.title || elem.alt || elem.innerText;
					text = text.replace(/https?:(\S*)/i, " hyperlink "); // Remove any http: links from google.com links
					//if (!text.match(/[\.\!\?\n]$/)) text += pause_text; // Add period to end of sentence if not there.
					text_array.push(text);
					elem_array.push(elem);
					if (that.match(/paragraph/i))
						break; // Only one paragraph if they say paragraph
				}
			}	
		}
	}
	
	var sum = 0;
	for (var t = 0; t < text_array.length; t++) 
		sum += text_array[t].length;
	//if (test_mode) console.log(sum);
	if (sum <= text_array.length + 1) that = "links"; // If only blanks " " then get links as well
	
	if (that.match(/links|buttons|inputs/i) || (text_array.length == 0 && that.match(/page|webpage|paragraph|article|website|site/i)) ) {
		var els = document.querySelectorAll("a, input, [role='button']");
		for (var i = 0; i < els.length; i++) {
			var elem = els[i];
			if (isVisible(elem) && (elem.getAttribute('aria-label') || elem.title || elem.alt || elem.innerText)) {
				if (isOnScreen(elem) == true) {
					text = elem.getAttribute('aria-label') || elem.title || elem.alt || elem.innerText;
					text = text.replace(/https?:(\S*?)/i, " hyperlink "); // Remove any http: links from google.com links
					//if (!text.match(/[\.\!\?\n]$/)) text += pause_text; // Add period to end of sentence if not there.
					text_array.push(text);
					elem_array.push(elem);
					if (that.match(/paragraph/i))
						break; // Only one paragraph if they say paragraph
				}
			}	
		}
	}
	
	if (that.match(/images/i) || (text_array.length == 0 && that.match(/page|webpage|paragraph|article|website|site/i)) ) {
		var els = document.querySelectorAll("img");
		for (var i = 0; i < els.length; i++) {
			var elem = els[i];
			if (isVisible(elem) && (elem.getAttribute('aria-label') || elem.title || elem.alt || elem.innerText)) {
				if (isOnScreen(elem) == true) {
					text = elem.getAttribute('aria-label') || elem.title || elem.alt || elem.innerText;
					text = text.replace(/https?:(\S*?)/i, " hyperlink "); // Remove any http: links from google.com links
					//if (!text.match(/[\.\!\?\n]$/)) text += pause_text; // Add period to end of sentence if not there.
					text_array.push(text);
					elem_array.push(elem);
					if (that.match(/paragraph/i))
						break; // Only one paragraph if they say paragraph
				}
			}	
		}
	}
	*/
	



// Version 1.2.0 - To Stop tts from speaking text
window.addEventListener('keydown', function(e){
    if(e.key=='Escape'||e.key=='Esc'||e.keyCode==27) 
		send_to_background({"command": "stopSpeaking", "option": ""}); // Pause or unpause

}, false);

		
function say(that) 
{	
	window.speechSynthesis.cancel(); // Version 0.99.7 - Bug in speechSynthesis - If text is too long it breaks and does not work until restarting browser. cancel() will fix the error.
		
	if (window.self === window.top) { // Only load in top window not iframes
		var voice_array = window.speechSynthesis.getVoices();	
		var msg = new SpeechSynthesisUtterance();
		if (test_mode) console.log("Speaking: "+that[0]);
		msg.text = that.shift();
		msg.voice = voice_array[sra.settings.select_voice];
		msg.pitch = sra.settings.tts_pitch;
		msg.rate = sra.settings.tts_rate;
		//msg.lang = "en-GB"; // Only works if you don't set msg.voice above
		//msg.gender = "male"; // Does not work
		msg.onstart = function (event) {
	        if (test_mode) console.log('speechSynthesis Started ' + event);
	    };
	    msg.onend = function(event) {
	        if (test_mode) console.log('speechSynthesis Ended ' + event);
	        if (typeof that != "undefined" && that.length > 0) 
				say(that);
	    };
	    msg.onerror = function(event) {
	        if (test_mode) console.log('speechSynthesis Errored ' + event);
	    }
	    msg.onpause = function (event) {
	        if (test_mode) console.log('speechSynthesis paused ' + event);
	    }
	    msg.onboundary = function (event) {
	        if (test_mode) console.log('speechSynthesis onboundary ' + event);
	    }
		
		/*var sentences = that.split(/[\.\!\?\n]/); // Version 0.99.7 - Split by sentences to not break speechSynthesis with long text
		for (var i = 0; i < sentences.length; i++) {
			msg.text = sentences[i];
			if (test_mode) console.log("Sentence "+i+": "+sentences[i]);
			window.speechSynthesis.speak(msg);
		}*/
		window.speechSynthesis.speak(msg);
	}
}


function select_node(el) 
{
    // Copy textarea, pre, div, etc.
	if (document.body.createTextRange) {
        // IE 
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.select();  
    }
	else if (window.getSelection && document.createRange) {
        // non-IE
        /*var editable = el.contentEditable; // Record contentEditable status of element
        var readOnly = el.readOnly; // Record readOnly status of element
       	el.contentEditable = true; // iOS will only select text on non-form elements if contentEditable = true;
       	el.readOnly = false; // iOS will not select in a read only form element
		*/
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range); // Does not work for Firefox if a textarea or input
        if (el.nodeName == "TEXTAREA" || el.nodeName == "INPUT") 
        	el.select(); // Firefox will only select a form element with select()
        if (el.setSelectionRange && navigator.userAgent.match(/ipad|ipod|iphone/i))
        	el.setSelectionRange(0, 999999); // iOS only selects "form" elements with SelectionRange
        /*el.contentEditable = editable; // Restore previous contentEditable status
        el.readOnly = readOnly; // Restore previous readOnly status 
		*/
    }
} // end function select_node(el) 




function click_element(that)
{
	if (Array.isArray(that)) that = that[0]; // Version 0.99.7
	var times = 1;
	var that_array = that.match(/(".*?"|'.*?'|[^"'\+]+)(?=\s*\+|\s*$)/g); // split by + not in quotes
	for (var a = 0; a < that_array.length; a++) {
		var element_id = that_array[a].split(".")[0];
		var el_to_click = (element_id == "body") ? document.body : document.getElementById(element_id); 
		if (el_to_click) {
			//var el_to_click = document.getElementById(element_id);
			if (that_array[a].indexOf(".") != -1) {
				var tag = that_array[a].split(".")[1]; // img[0]
				tag = tag.split("[")[0]; // img
				var num = that_array[a].match(/\[(\d+)/)[1]; // 0
				if (el_to_click.getElementsByTagName(tag)[num])
					el_to_click = el_to_click.getElementsByTagName(tag)[num];
			}
		}
	}
	
	if (el_to_click)
	{
		scrollToPosition(el_to_click);
		el_to_click.focus();
		highlight_element(el_to_click);
		var ms = 250; // milliseconds
		for (var i = 0; i < times; i++)
		{
			setTimeout(function(){ 
				//el_to_click.click();
				var mutation_record = mutation_num; // Record current mutation amount
				if (test_mode) console.log(mutation_num);
				var j = 0;
				if (el_to_click.nodeName == "OPTION") el_to_click.selected = true;
				/* Gmail "Compose" button only works on "mouseup" event */
				var event = document.createEvent('MouseEvents');
				event.initEvent("mousedown", true, false); // try (click|mousedown|mouseup), bubble, cancelable
				el_to_click.dispatchEvent(event);
				event = document.createEvent('MouseEvents');
				event.initEvent("click", true, false); // try (click|mousedown|mouseup), bubble, cancelable
				el_to_click.dispatchEvent(event);
				event = document.createEvent('MouseEvents');
				event.initEvent("mouseup", true, false); // try (click|mousedown|mouseup), bubble, cancelable
				el_to_click.dispatchEvent(event);
				
				setTimeout(function(){ 
					if (test_mode) console.log(mutation_num);
					if (mutation_num == mutation_record) // The mutations have not advanced so the click did nothing 
					{
						if (el_to_click.children[0])
						 el_to_click.children[0].click();
					}
				}, 250); 
			
			}, ms); 
			ms += 250; // Add a 1/4 of second between each click
		}
		//el_to_click.click();
		if (test_mode) console.log(el_to_click);		
	}

}


function toggle_on_off(obj)
{
	/* Using chrome.storage.local instead of sync because we don't want to save the
    	variable between all the user's chrome devices */
    if (test_mode) console.log(JSON.stringify(obj));

    var now = new Date();
    if (obj.hasOwnProperty("toggle")) // If the object key "toggle" exists
    if (obj["toggle"].hasOwnProperty("date")) // date also exists
    {
	    obj.toggle['date'] = new Date(obj.toggle['date']); // convert date string back to date obj
		if (now > obj.toggle['date']) // the date exists but it is old
	    {
	    	// delete the storage
			chrome.storage.local.remove("toggle");
			// So run the links because they are no longer disabled	 
	    }
	    else if (now < obj.toggle['date']) // the key exists and it is NOT old
	    {
	    	// Disable WR
			var wr_buttons_array = document.getElementsByClassName("wr_buttons");
			for (var j = 0; j < wr_buttons_array.length; j++)
			{
				wr_buttons_array[j].className += " off";	
			}
			if (wr_timer) clearTimeout(wr_timer); // Clear timer to wr_read_links
			return; // Don't run the links
	    }
    }
	// Enable WR
	var wr_buttons_array = document.getElementsByClassName("wr_buttons");
	for (var j = 0; j < wr_buttons_array.length; j++)
	{
		wr_buttons_array[j].className = wr_buttons_array[j].className.replace(/\s\boff\b/, "");	
	}
    // Run the links
    wr_read_links();

} // end toggle_on_off(obj)





function show_your_votes(which)
{
		if (!wr_cid)
		{
			setTimeout(function()
			{
				show_your_votes(which); 
				return;
			} , 100);
			return;
		}
	var obj = { "your_votes" : { "which" : which } };
	option = which;
	send_to_server(obj);
}


function insertTextAtCaret(txtarea, text) {
    /* Chrome does not support selectionStart on input elements
		of special types except for type="text|search|password|tel|url"
		it will give this error: 
		Failed to read the 'selectionStart' property from 'HTMLInputElement'
		So we have to use try and catch
	*/
	// this function also does not preserve undo history
	try
	{
		var scrollPos = txtarea.scrollTop;
	    var caretPos = txtarea.selectionStart;
	
	    var front = (txtarea.value).substring(0, caretPos);
	    var back = (txtarea.value).substring(txtarea.selectionEnd, txtarea.value.length);
	    txtarea.value = front + text + back;
	    caretPos = caretPos + text.length;
	    txtarea.selectionStart = caretPos;
	    txtarea.selectionEnd = caretPos;
	    txtarea.focus();
	    txtarea.scrollTop = scrollPos;
	}
	catch(err)
	{
		/* Can't insert at cursor with type= "email" or "number", etc...
	  		so we will just have to add it to the end of value */
		txtarea.value += text;
	}
}


function linebreak(s) 
{
 	var two_line = / ?\n\n/g;
	var one_line = / ?\n ?/g; // Version 1.4.4c - Changed from / ?\n/g to / ?\n ?/g for user saying "new line" in middle of speaking
	//if (s.match(two_line))
	//	document.execCommand( 'insertParagraph', false ); // Version 1.1.0 - Removed
	// Version 1.1.0 - \u200C = &zwnj; = zero-width non-joiner
	//s = s.replace(two_line, '\n\n').replace(one_line, '<br \>\u200C'); // Version 1.1.0 - Added \u200C // Version 1.4.4b - Changed \n to \n\n
	s = s.replace(one_line, '\n\u200c'); // Version 1.4.4b
	return s;
}

function insertHTML(html) { // Version 1.4.4b - 
	/* This function is not being used because since it does not work with tinyMCE.
		Instead insertHTML command is redirected to display_speech with insertType : "insertHTML"
	 Since we changed insertHTML to insertText in display_speech we need a function for users to put insertHTML
	*/
	if (Array.isArray(html)) html = html[0];
	var sent = document.execCommand("insertHTML", false, html);
	if (test_mode) console.log("insertHTML Sent: "+sent);
}

function pasteHtmlAtCaret(html) {
	/* This function works great for text and new paragraphs and new lines
		in a content editable div. However, it does not preserve a
		undo history. On the other hand:
		document.execCommand("InsertHTML", false, html); does preserve an
		undo history and works great for content editable div and textarea.
		But it does not do new paragraphs well or new lines. */
    var sel, range;
    if (window.getSelection) {
        // IE9 and non-IE
        //document.execCommand("InsertHTML", false, html);
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();

            // Range.createContextualFragment() would be useful here but is
            // only relatively recently standardized and is not supported in
            // some browsers (IE9, for one)
            var el = document.createElement("div");
            el.innerHTML = html;
            var frag = document.createDocumentFragment(), node, lastNode;
            while ( (node = el.firstChild) ) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);

            // Preserve the selection
            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    } else if (document.selection && document.selection.type != "Control") {
        // IE < 9
        document.selection.createRange().pasteHTML(html);
    }
}


function insertTextAtCursor(text) {
    /* This function will insert text at the cursor
    	in a contentEditable div. However, it did not
    	do html. So we are not using it anymore.
    	Using pasteHtmlAtCaret(html) now.
    */
	var sel, range, html;
    
    //text = linebreak(text); // Add P tag to 'New Paragrah' and br tag to 'New Line'
	
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode( document.createTextNode(text) );
        }
    } else if (document.selection && document.selection.createRange) {
        document.selection.createRange().text = text;
    }
}

function speech_tooltip(el, message)
{
	if (window.self != window.top) return; // Version 0.99.9 - Don't do speech tooltip in iframes // Version 1.0 - Commented out // Version 1.7.6 - Put back in because without it, it made "New line whatever" at https://onlinenotepad.org/notepad put the interim in the text
	var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
	var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
	//var x = parseInt(el.getBoundingClientRect().left) + scrollLeft + 10; // Version 1.3.7 - Removed
	//var y = parseInt(el.getBoundingClientRect().top) + scrollTop + 10; // Version 1.3.7 - Removed
	var x = parseInt(el.getBoundingClientRect().left) + 10; // Version 1.3.7 - Added for fixed position because Reddit was scrolling up on speech
	var y = parseInt(el.getBoundingClientRect().top) + 10; // Version 1.3.7 - Added for fixed position because Reddit was scrolling up on speech
	if ( y < 0) y = 10; if (x < 0) x = 10; // Version 1.3.7 - Added for fixed position because Reddit was scrolling up on speech
	if (isOnScreen(el) != true) el = document.body; // Version 0.99.2 // Version 1.0.2 - Uncommented and added != true
	if (el.nodeName == "BODY")
	{
		//x = Math.round(scrollLeft) + 10; // Version 1.3.7 - Removed
		//y = Math.round(scrollTop) + 10; // Version 1.3.7 - Removed
		x = 10; // Version 1.3.7 - Added for fixed position because Reddit was scrolling up on speech
		y = 10;	// Version 1.3.7 - Added for fixed position because Reddit was scrolling up on speech
	}
	if (!document.getElementById("speech_tooltip"))
	{
		var tooltip = document.createElement('div');
		tooltip.id = "speech_tooltip";
		tooltip.style.position = "fixed"; // Version 1.3.7 - Changed from absolute to fixed for Reddit
		tooltip.style.border = "1px solid black";
		tooltip.style.background = "#dbdb00";
		tooltip.style.opacity = 1;
		tooltip.style.transition = "opacity 0.3s";
		tooltip.style.zIndex = "2147483647"; // Version 1.3.9b - Changed from 1999999999 to 2147483647
		tooltip.style.color = "black"; // Version 1.6.4 - Added because Edge was putting dark gray text color
		//window.tooltip_timer = ""; // create a global tooltip_timer variable
		document.body.appendChild(tooltip);
		//document["head"||"body"].appendChild(tooltip); // Version 1.7.6 - From .body to ["head"||"body"] because tooltip sometimes get stuck in https://onlinenotepad.org/notepad <body contenteditable='true'>
	}
	else
	{
		var tooltip = document.getElementById("speech_tooltip");
	}
	tooltip.style.opacity = 1;
	tooltip.style.display = "block";
	tooltip.style.left = x + "px";
	tooltip.style.top = y + "px";
	//if (window.self === window.top) // Only scroll in main document not the iframes // Version 1.3.7 - Removed
	//	scrollToPosition(tooltip); // Verison 1.3.7 - Removed
	tooltip.innerHTML = message;
	clearTimeout(tooltip_timer);
	tooltip_timer = setTimeout(function() { tooltip.style.display = "none"; tooltip.style.opacity = 0; }, 1000);
}


function scrollToPosition(el)
{  
   	/* This function scrolls to element only if it is out of the current screen */
	var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
	var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
	var scrollBottom = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) + scrollTop;
	var scrollRight = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) + scrollLeft;

   if (Array.isArray(el)) el = el[0]; // Version 0.99.7
   if (typeof el == "string") el = document.getElementById(el); // Version 0.99.7
   if (el)
   {
	   // Version 0.99.2 - commented out traversing DOM and using getBoundingClientRect() instead
	   /*var theElement = el;  
	   var elemPosX = theElement.offsetLeft;  
	   var elemPosY = theElement.offsetTop;  
	   theElement = theElement.offsetParent;  
	   	while(theElement != null)
	   	{  
			elemPosX += theElement.offsetLeft   
			elemPosY += theElement.offsetTop;  
			theElement = theElement.offsetParent; 
		}*/ 
		
		/* // Old way - Incorrect if scrolled element is not the body of the document
		elRect = el.getBoundingClientRect();
		var elemPosX = elRect.left + scrollLeft;
		var elemPosY = elRect.top + scrollTop;
		
		// Only scroll to element if it is out of the current screen
		if (elemPosX < scrollLeft || elemPosX > scrollRight ||
			elemPosY < scrollTop || elemPosY > scrollBottom) 
		window.scrollTo((el.getBoundingClientRect().left + scrollLeft) - ((scrollRight-scrollLeft)/2), 
						(el.getBoundingClientRect().top + scrollTop) - ((scrollBottom-scrollTop)/2)); 
		*/
		if (isOnScreen(el) != true) // Version 1.3.1 - New way of scrolling to el
		{
			//window.scrollTo(elemPosX ,elemPosY); 
			var isSmoothScrollSupported = 'scrollBehavior' in document.documentElement.style;
			if(isSmoothScrollSupported) {
	   			el.scrollIntoView({
			     behavior: "smooth",
			     block: "center"
			   });
			} else {
			   //fallback to prevent browser crashing
			   el.scrollIntoView(false);
			}
		}
		//window.scrollTo(elemPosX ,elemPosY); 
		//el.scrollIntoView();
	}
}  // end function scrollToPosition()

function isOnScreen(el)
{
	/* This checks to see if an element is within the current user viewport or not */
	var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
	var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
	var screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight; // Version 1.2.0
	var screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth; // Version 1.2.0
	var scrollBottom = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) + scrollTop;
	var scrollRight = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) + scrollLeft;
	var onScreen = false;
   
   /* if (el)
   {
	   var theElement = el;  
	   var elemPosX = theElement.offsetLeft;  
	   var elemPosY = theElement.offsetTop;  
	   theElement = theElement.offsetParent;  
	   	while(theElement != null)
	   	{  
			elemPosX += theElement.offsetLeft   
			elemPosY += theElement.offsetTop;  
			theElement = theElement.offsetParent; 
		} 
		// return false if element is not on screen
		if (elemPosX < scrollLeft || elemPosX > scrollRight ||
			elemPosY < scrollTop || elemPosY > scrollBottom) 
			return false;
		else
			return true;
	} */
	
	/* New way: el.getBoundingClientRect always returns 
		left, top, right, bottom of
		an element relative to the current screen viewport */ 
	var rect = el.getBoundingClientRect();
	if (rect.bottom >= 0 && rect.right >= 0 && 
	rect.top <= screenHeight && rect.left <= screenWidth) { // Version 1.2.0 - Changed from scrollBottom and scrollRight
		if (el.ownerDocument.defaultView.frameElement) // Version 1.5.4 - Not null if el is in an iframe (same domain only). If cross-origin then it will still be null
			return isOnScreen(el.ownerDocument.defaultView.frameElement); // Version 1.5.4 - Return the position of the iFrame
		return true;
	}
	else { 
		// Verison 1.0.2 - Calculate how many pixels it is offscreen
		var distance = Math.min(Math.abs(rect.bottom), Math.abs(rect.right), Math.abs(rect.top - screenHeight), Math.abs(rect.left - screenWidth));	
		if (rect.bottom < 0) distance = Math.abs(rect.bottom); // Version 1.5.4c
		else if (rect.top > screenWidth) distance = Math.abs(rect.top); // Version 1.5.4c
		
		return -Math.abs(distance); // Version 1.0.2 - Return distance as a negative. Used to return negative if off screen
		// NOTE: You must use isOnScreen(el) == true or != true because negative numbers in javascript are true! So you can't use if (isOnscreen(el))
	}
}


function isVisible(el)
{
	/* if parent element is display='none' the child still has its own display and visibility with
		getComputedStyle. So can't use that for display. Instead use the offsetWidth and offsetHeight trick
		which returns false if even the parent element is display='none'.
		But that only works for display='none' not for visibility='hidden'.
		The other problem with offsetWidth trick is if the parent has height of 0 or width of 0
		and overflow of none then the child still has its width.  So do we have to traverse the parents?
		
		Version 1.3.3 - If an element or its parent is position of 'absolute' or 'fixed' then it
		does not matter if the other parents have no offset as in the case where the body has offsetHeight of 0
		at: https://www.webworks.com/Documentation/Reverb/#page/Designing%20Templates%20and%20Stationery/Designing%20Input%20Format%20Standards.2.19.htm#
		
	*/
	var visible = true;
  	
  	for (var elem = el; elem; elem = elem.parentElement)
  	{
		if ( (elem.offsetWidth <= 2 || elem.offsetHeight <= 2) &&
			document.defaultView.getComputedStyle(elem,null).getPropertyValue("overflow") == "hidden")
  		{
  			visible = false;
  			break;
  		}
  		else if (document.defaultView.getComputedStyle(elem,null).getPropertyValue("display") == "none")
  		{
  			visible = false;
  			break;
  		}
		else if (document.defaultView.getComputedStyle(elem,null).getPropertyValue("position").match(/absolute|fixed/i)
			&& (elem.offsetWidth > 2 || elem.offsetHeight > 2) ) // Version 1.3.3
		{
			break;
		}
  	}
	
	//visible = el.offsetWidth > 0 || el.offsetHeight > 0; // Old way; Doesn't work if parent's height is 0
	/* However visibilty is inherited so we can use getComputed style for that. */
	//console.log(document.defaultView.getComputedStyle(el,null).getPropertyValue("display"));
	if (document.defaultView.getComputedStyle(el,null).getPropertyValue("visibility") == 'hidden')
		visible = false;
		
	// is element positioned offscreen to the left or top? (-2000 etc)
	var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
	var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
	if (Math.round(el.getBoundingClientRect().left + scrollLeft) < -1 ||
		Math.round(el.getBoundingClientRect().bottom + scrollTop) < -1) // Version 1.2.3 - Changed from top to bottom
		visible = false;

	return(visible);		
}


function isFormElement(el)
{
	/* if element is a form input element or textarea element
		and not type radio, checkbox, submit, button, color, hidden and
		not readOnly or disabled */
	if ( (el.nodeName.match(/^(TEXTAREA|BUTTON|LABEL|SELECT)$/i)) || 
		(el.nodeName == "INPUT" && el.type != "hidden") ) 
	if (el.readOnly != true && el.disabled != true)	
		return true;
	else
		return false;
}


function isInteractive(el, type)
{
	/* if element is a form input element or textarea element
		and not type radio, checkbox, submit, button, color, hidden and
		not readOnly or disabled */
	/* Note you can only focus on A or AREA tag if they have an href attribute */
	if (type == "text") return isTextInput(el);
	// had to remove |LABEL| from match below
	if ( (type == "form" && el.nodeName.match(/^(TEXTAREA|INPUT|BUTTON|SELECT)$/i)) ||
		 (type != "form" && el.nodeName.match(/^(TEXTAREA|INPUT|BUTTON|SELECT|OBJECT)$/i)) || 
		 (el.nodeName.match(/^(AREA|A)$/i) ) || // Version 1.5.2 - Removed && el.hasAttribute("href")
		 (el.nodeName.match(/^(DETAILS|BUTTON)$/i)) || // Version 1.5.2 - Added details // Version 1.5.4 - Added button
		 (el.hasAttribute('tabindex') && el.getAttribute('tabindex') != -1) || 
		 (el.hasAttribute('role') && el.getAttribute('role').match(/^(button|checkbox|combobox|gridcell|input|link|listbox|listitem|menuitem|menuitemcheckbox|menuitemradio|option|radio|select|slider|textbox|widget|tab|tabpanel|switch|searchbox|spinbutton)$/i)) || // Version 1.5.4 - Added |tab|tabpanel|switch|searchbox|spinbutton
		 (el.nodeName == "INPUT" && el.type != "hidden") ||
		 (el.isContentEditable && el.contentEditable != 'inherit') // Version 1.5.4 - Added
		 ) 
	if (el.disabled != true)	// used to have el.readOnly != true &&
		return true;
	else
		return false;
}


function isTextInput(el)
{
	/* if element is a form input element or textarea element
		and not type radio, checkbox, submit, button, color, hidden and
		not readOnly or disabled */
	if ( (el.nodeName == "TEXTAREA") ||
		(el.nodeName == "INPUT" && 
		!el.type.match(/^(radio|checkbox|submit|reset|button|color|hidden|image)$/i)) ) 
	if (el.disabled != true)  // used to have el.readOnly != true && 
		return true;
	else
		return false;
}


function findElement(el, dom) // Version 1.3.9b - Changed from (el, dom) to (dom)
{
	/* This function finds an input or contentEditable element
		and returns it. Preferrably an element within the
		current viewport */
	dom = dom || document; // Version 1.3.9b
	//var el = dom.activeElement; // Version 1.3.9b
	var closest_offscreen_el = el;	// Version 1.0.2
	var closest_distance = -10000; // Version 1.0.2 - Distance of closest_offscreen_el
	//var elems = dom.getElementsByTagName("*"); // Note we removed .body so we could get body tag as well and not just children of body
	var elems = dom.querySelectorAll("*"); // Version 1.7.11 - shadowRoot doesn't have getElementsByTagName
	//var elems = getAllElems(); // Version 1.3.9b
	for (var i=0; i<elems.length; i++)
	{
		var current_el = elems[i];
		/* cross-origin policy problem with below code. So detect if iframe is cross-origin or not. How? */
		if (elems[i].nodeName == "IFRAME") // Version 1.5.2e - Uncommented because I can test cross-origin with a try block
			try { // Version 1.3.9b
				//var test_el = elems[i].contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
				//current_el = findElement(elems[i].contentWindow.document); // Version 1.3.9b
				current_el = elems[i].contentWindow.document.activeElement; // Version 1.5.2e
			}
			catch (err) {
				if (test_mode) console.log(err);
			}
			
		if (elems[i].shadowRoot) { // Version 1.7.11 - Find shadowRoot contentEditable or input elements
			current_el = findElement(current_el, elems[i].shadowRoot);
		}
		
		if ( (current_el.isContentEditable || isTextInput(current_el)) && isVisible(current_el) && current_el.readOnly != true) // Version 1.0.2 - Added 'current_el.readOnly != true'
		{	
			el = current_el;
			var distance = isOnScreen(el); // Version 1.0.2
			if (distance == true) // If element is within the current current viewport
				break; // then accept this element
			else { // Version 1.0.2 - How far is it offscreen
				if (distance > closest_distance) { // numbers are negative so > is the closest
					closest_offscreen_el = current_el;
					closest_distance = distance;
				}	
			}
			
			// Otherwise, keep checking to see if there is another element in the viewport
		}
	}
	if (distance != true) // Version 1.0.2 - Didn't find onscreen element so choose the closest one
		el = closest_offscreen_el;
	el.focus();
	highlight_element(el);
	//dom = findElementFrame(el); // Version 1.3.9b
	//if (test_mode) { console.log(el); console.log(dom.document);} // Version 1.3.9b
	//return({"el": el, "dom": dom}); // Version 1.3.9b - Changed from (el) to ({"el": el, "dom": dom})
	return(el);
}

function isSearch(el)
{
	/* Find out if input is part of a search page */
	if (isTextInput(el)) // If it is an input element
	{
		// cycle thru attributes of element and look for "search|find"
		for (var i = 0; i < el.attributes.length; i++) {
		    var attrib = el.attributes[i];
		    if (attrib.specified) {
		        if (attrib.value.match(/search|find/i))
		        	if (el.form) return true;	
			}
		}
		// cycle thru attributes of form and look for "search|find"
		if (el.form)
		{
			for (var i = 0; i < el.form.attributes.length; i++) {
			    var attrib = el.form.attributes[i];
			    if (attrib.specified) {
			        if (attrib.value.match(/search|find/i))
			        	return true;	
				}
			}
		}
	}
	return false;
}


function submit_form()
{
	//var el = document.activeElement;
	var el = getActiveElement(); // Version 1.7.11
	if (el.form) // if element is part of a form
	{
		el.form.submit(); // then submit that form
	}
	else // else look for a form
	{ 
		var all_forms = document.forms;
		for (var i = 0; i < all_forms.length; i++)
		{
			if (isVisible(all_forms[i]) && isOnScreen(all_forms[i]) == true)
			{
				all_forms[i].submit();		
				break;	
			}
		}
	}
}


function keypress2(k) {
    var oEvent = document.createEvent('KeyboardEvent');

    // Chromium Hack
    Object.defineProperty(oEvent, 'keyCode', {
                get : function() {
                    return this.keyCodeVal;
                }
    });     
    Object.defineProperty(oEvent, 'which', {
                get : function() {
                    return this.keyCodeVal;
                }
    });     

    if (oEvent.initKeyboardEvent) {
        oEvent.initKeyboardEvent("keydown", true, true, document.defaultView, false, false, false, false, k, k);
    } else {
        oEvent.initKeyEvent("keydown", true, true, document.defaultView, false, false, false, false, k, 0);
    }

    oEvent.keyCodeVal = k;

    if (oEvent.keyCode !== k) {
        alert("keyCode mismatch " + oEvent.keyCode + "(" + oEvent.which + ")");
    }

    document.dispatchEvent(oEvent);
}



function keypress_inject(keyCode)
{
	var actualCode = '(' + function(keyCode) {
	    // All code is executed in a local scope.
	    // For example, the following does NOT overwrite the global `alert` method
	    //var alert = null;
	    // To overwrite a global variable, prefix `window`:
	    //window.alert = null;
	    // Simulate a keypress
	    var el = document.activeElement;
	
		// Event method
	  	var eventObj = document.createEvent("Events");
	  	eventObj.initEvent("keydown", true, true); // bubble, cancelable
	 	eventObj.keyCode = keyCode;
	    eventObj.which = keyCode;
	    el.dispatchEvent(eventObj);
	    //document.dispatchEvent(eventObj);
	    
	    eventObj = document.createEvent("Events");
	  	eventObj.initEvent("keypress", true, true);
	 	eventObj.keyCode = keyCode;
	    eventObj.which = keyCode;
	    el.dispatchEvent(eventObj);
	    //document.dispatchEvent(eventObj);
	    
	    eventObj = document.createEvent("Events");
	  	eventObj.initEvent("keyup", true, true);
	 	eventObj.keyCode = keyCode;
	    eventObj.which = keyCode;
	    el.dispatchEvent(eventObj);
	    //document.dispatchEvent(eventObj);
	    
	    // keyboard event method
		//var keyCode = 74; // 74 = j
		var keyboardEvent = document.createEvent("KeyboardEvent");
		var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
	    keyboardEvent[initMethod](
	                       "keypress",
	                        true,      // bubbles oOooOOo0
	                        true,      // cancelable   
	                        null,    // view
	                        false,     // ctrlKeyArg
	                        false,     // altKeyArg
	                        false,     // shiftKeyArg
	                        false,     // metaKeyArg
	                        keyCode,  
	                        keyCode          // charCode   
	    ); 
	    
		
	  	// Force Chrome to not return keyCode 0 when fired
		Object.defineProperty(keyboardEvent, 'keyCode', {
	        get : function() {
	            return keyCode;
	        }
	      });
	      
	    Object.defineProperty(keyboardEvent, 'which', {
        get : function() {
            return keyCode;
        }
      });

      Object.defineProperty(keyboardEvent, 'keyIdentifier', {
        get : function() {
            return 'Enter';
        }
      });

      Object.defineProperty(keyboardEvent, 'shiftKey', {
        get : function() {
            return false;
        }
      }); 
	  
	    el.dispatchEvent(keyboardEvent);
	
		 
	} + ')( ' + JSON.stringify(keyCode) + ');';
	
	var script = document.createElement('script');
	script.textContent = actualCode;
	(document.head||document.documentElement).appendChild(script);
	script.parentNode.removeChild(script);
	
	
	/* chrome.tabs.executeScript(null, {
    code: 'var s = document.createElement("script");' +
          's.textContent = ' + JSON.stringify(actualCode) + ';' + 
          '(document.head||document.documentElement).appendChild(s);' + 
          's.parentNode.removeChild(s);' 
	});
	*/
}



function keypress(array)
{
	// Simulate a keypress
	//if (test_mode) console.log(array);
	var keyCode, ctrl = false, alt = false, shift = false, no_insertText = false; // Version 1.6.10 - Added: = false to ctrl, alt, shift
	var el = document.activeElement;
	var dom = document; // Version 1.5.2
	
	/*if (el.nodeName == "IFRAME") { // Version 1.5.2 - Added to keypress() from clear_text()
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	}*/
	
	el = getActiveElement(); // Version 1.7.11
	dom = el.ownerDocument; // Version 1.7.11
	
	// array is an array: [keyCode, ctrl, alt, shift]
	if (Array.isArray(array)) {
		keyCode = array[0]; // Version 0.99.7
		ctrl = (typeof array[1] != 'undefined' && array[1] != "0" && array[1] != "false" && array[1] != false) ? true : false;
		alt = (typeof array[2] != 'undefined' && array[2] != "0" && array[2] != "false" && array[2] != false) ? true : false;
		shift = (typeof array[3] != 'undefined' && array[3] != "0" && array[3] != "false" && array[3] != false) ? true : false;	
		no_insertText = (typeof array[4] != 'undefined' && array[4] != "0" && array[4] != "false" && array[4] != false) ? true : false;	
	}	
	else keyCode = array; // keypress(32) instead of keypress([32])
	
	var keyCodes = [ 
	 {  "code": "Backspace",  "key": "Backspace",  "keyCode": 8,  "shiftKey": false },
	 {  "code": "Tab",  "key": "Tab",  "keyCode": 9,  "shiftKey": false },
	 {  "code": "Tab",  "key": "Tab",  "keyCode": 9,  "shiftKey": true },
	 {  "code": "Numpad5",  "key": "Clear",  "keyCode": 12,  "shiftKey": false },
	 {  "code": "Enter",  "key": "Enter",  "keyCode": 13,  "shiftKey": false, "data": "\n" },
	 {  "code": "ShiftLeft",  "key": "Shift",  "keyCode": 16,  "shiftKey": true },
	 {  "code": "ShiftLeft",  "key": "Shift",  "keyCode": 16,  "shiftKey": false },
	 {  "code": "ControlLeft",  "key": "Control",  "keyCode": 17,  "shiftKey": false },
	 {  "code": "AltRight",  "key": "Alt",  "keyCode": 18,  "shiftKey": false },
	 {  "code": "AltRight",  "key": "AltGraph",  "keyCode": 18,  "shiftKey": false },
	 {  "code": "Pause",  "key": "Pause",  "keyCode": 19,  "shiftKey": false },
	 {  "code": "CapsLock",  "key": "CapsLock",  "keyCode": 20,  "shiftKey": false },
	 {  "code": "Escape",  "key": "Escape",  "keyCode": 27,  "shiftKey": false },
	 {  "code": "Space",  "key": " ",  "keyCode": 32,  "shiftKey": false },
	 {  "code": "PageUp",  "key": "PageUp",  "keyCode": 33,  "shiftKey": false },
	 {  "code": "PageDown",  "key": "PageDown",  "keyCode": 34,  "shiftKey": false },
	 {  "code": "End",  "key": "End",  "keyCode": 35,  "shiftKey": false },
	 {  "code": "Home",  "key": "Home",  "keyCode": 36,  "shiftKey": false },
	 {  "code": "ArrowLeft",  "key": "ArrowLeft",  "keyCode": 37,  "shiftKey": false },
	 {  "code": "ArrowUp",  "key": "ArrowUp",  "keyCode": 38,  "shiftKey": false },
	 {  "code": "ArrowRight",  "key": "ArrowRight",  "keyCode": 39,  "shiftKey": false },
	 {  "code": "ArrowDown",  "key": "ArrowDown",  "keyCode": 40,  "shiftKey": false },
	 {  "code": "PrintScreen",  "key": "PrintScreen",  "keyCode": 44,  "shiftKey": false },
	 {  "code": "Insert",  "key": "Insert",  "keyCode": 45,  "shiftKey": false },
	 {  "code": "Delete",  "key": "Delete",  "keyCode": 46,  "shiftKey": false },
	 {  "code": "Digit0",  "key": ")",  "keyCode": 48,  "shiftKey": true },
	 {  "code": "Digit0",  "key": "0",  "keyCode": 48,  "shiftKey": false },
	 {  "code": "Digit1",  "key": "!",  "keyCode": 49,  "shiftKey": true },
	 {  "code": "Digit1",  "key": "1",  "keyCode": 49,  "shiftKey": false },
	 {  "code": "Digit2",  "key": "2",  "keyCode": 50,  "shiftKey": false },
	 {  "code": "Digit2",  "key": "@",  "keyCode": 50,  "shiftKey": true },
	 {  "code": "Digit3",  "key": "#",  "keyCode": 51,  "shiftKey": true },
	 {  "code": "Digit3",  "key": "3",  "keyCode": 51,  "shiftKey": false },
	 {  "code": "Digit4",  "key": "$",  "keyCode": 52,  "shiftKey": true },
	 {  "code": "Digit4",  "key": "4",  "keyCode": 52,  "shiftKey": false },
	 {  "code": "Digit5",  "key": "%",  "keyCode": 53,  "shiftKey": true },
	 {  "code": "Digit5",  "key": "5",  "keyCode": 53,  "shiftKey": false },
	 {  "code": "Digit6",  "key": "6",  "keyCode": 54,  "shiftKey": false },
	 {  "code": "Digit6",  "key": "^",  "keyCode": 54,  "shiftKey": true },
	 {  "code": "Digit7",  "key": "&",  "keyCode": 55,  "shiftKey": true },
	 {  "code": "Digit7",  "key": "7",  "keyCode": 55,  "shiftKey": false },
	 {  "code": "Digit8",  "key": "*",  "keyCode": 56,  "shiftKey": true },
	 {  "code": "Digit8",  "key": "8",  "keyCode": 56,  "shiftKey": false },
	 {  "code": "Digit9",  "key": "(",  "keyCode": 57,  "shiftKey": true },
	 {  "code": "Digit9",  "key": "9",  "keyCode": 57,  "shiftKey": false },
	 {  "code": "KeyA",  "key": "A",  "keyCode": 65,  "shiftKey": true },
	 {  "code": "KeyA",  "key": "a",  "keyCode": 65,  "shiftKey": false },
	 {  "code": "KeyB",  "key": "B",  "keyCode": 66,  "shiftKey": true },
	 {  "code": "KeyB",  "key": "b",  "keyCode": 66,  "shiftKey": false },
	 {  "code": "KeyC",  "key": "C",  "keyCode": 67,  "shiftKey": true },
	 {  "code": "KeyC",  "key": "c",  "keyCode": 67,  "shiftKey": false },
	 {  "code": "KeyD",  "key": "D",  "keyCode": 68,  "shiftKey": true },
	 {  "code": "KeyD",  "key": "d",  "keyCode": 68,  "shiftKey": false },
	 {  "code": "KeyE",  "key": "E",  "keyCode": 69,  "shiftKey": true },
	 {  "code": "KeyE",  "key": "e",  "keyCode": 69,  "shiftKey": false },
	 {  "code": "KeyF",  "key": "F",  "keyCode": 70,  "shiftKey": true },
	 {  "code": "KeyF",  "key": "f",  "keyCode": 70,  "shiftKey": false },
	 {  "code": "KeyG",  "key": "G",  "keyCode": 71,  "shiftKey": true },
	 {  "code": "KeyG",  "key": "g",  "keyCode": 71,  "shiftKey": false },
	 {  "code": "KeyH",  "key": "H",  "keyCode": 72,  "shiftKey": true },
	 {  "code": "KeyH",  "key": "h",  "keyCode": 72,  "shiftKey": false },
	 {  "code": "KeyI",  "key": "i",  "keyCode": 73,  "shiftKey": false },
	 {  "code": "KeyI",  "key": "I",  "keyCode": 73,  "shiftKey": true },
	 {  "code": "KeyJ",  "key": "j",  "keyCode": 74,  "shiftKey": false },
	 {  "code": "KeyJ",  "key": "J",  "keyCode": 74,  "shiftKey": true },
	 {  "code": "KeyK",  "key": "k",  "keyCode": 75,  "shiftKey": false },
	 {  "code": "KeyK",  "key": "K",  "keyCode": 75,  "shiftKey": true },
	 {  "code": "KeyL",  "key": "l",  "keyCode": 76,  "shiftKey": false },
	 {  "code": "KeyL",  "key": "L",  "keyCode": 76,  "shiftKey": true },
	 {  "code": "KeyM",  "key": "M",  "keyCode": 77,  "shiftKey": true },
	 {  "code": "KeyM",  "key": "m",  "keyCode": 77,  "shiftKey": false },
	 {  "code": "KeyN",  "key": "N",  "keyCode": 78,  "shiftKey": true },
	 {  "code": "KeyN",  "key": "n",  "keyCode": 78,  "shiftKey": false },
	 {  "code": "KeyO",  "key": "o",  "keyCode": 79,  "shiftKey": false },
	 {  "code": "KeyO",  "key": "O",  "keyCode": 79,  "shiftKey": true },
	 {  "code": "KeyP",  "key": "p",  "keyCode": 80,  "shiftKey": false },
	 {  "code": "KeyP",  "key": "P",  "keyCode": 80,  "shiftKey": true },
	 {  "code": "KeyQ",  "key": "Q",  "keyCode": 81,  "shiftKey": true },
	 {  "code": "KeyQ",  "key": "q",  "keyCode": 81,  "shiftKey": false },
	 {  "code": "KeyR",  "key": "r",  "keyCode": 82,  "shiftKey": false },
	 {  "code": "KeyR",  "key": "R",  "keyCode": 82,  "shiftKey": true },
	 {  "code": "KeyS",  "key": "S",  "keyCode": 83,  "shiftKey": true },
	 {  "code": "KeyS",  "key": "s",  "keyCode": 83,  "shiftKey": false },
	 {  "code": "KeyT",  "key": "t",  "keyCode": 84,  "shiftKey": false },
	 {  "code": "KeyT",  "key": "T",  "keyCode": 84,  "shiftKey": true },
	 {  "code": "KeyU",  "key": "u",  "keyCode": 85,  "shiftKey": false },
	 {  "code": "KeyU",  "key": "U",  "keyCode": 85,  "shiftKey": true },
	 {  "code": "KeyV",  "key": "V",  "keyCode": 86,  "shiftKey": true },
	 {  "code": "KeyV",  "key": "v",  "keyCode": 86,  "shiftKey": false },
	 {  "code": "KeyW",  "key": "W",  "keyCode": 87,  "shiftKey": true },
	 {  "code": "KeyW",  "key": "w",  "keyCode": 87,  "shiftKey": false },
	 {  "code": "KeyX",  "key": "X",  "keyCode": 88,  "shiftKey": true },
	 {  "code": "KeyX",  "key": "x",  "keyCode": 88,  "shiftKey": false },
	 {  "code": "KeyY",  "key": "y",  "keyCode": 89,  "shiftKey": false },
	 {  "code": "KeyY",  "key": "Y",  "keyCode": 89,  "shiftKey": true },
	 {  "code": "KeyZ",  "key": "Z",  "keyCode": 90,  "shiftKey": true },
	 {  "code": "KeyZ",  "key": "z",  "keyCode": 90,  "shiftKey": false },
	 {  "code": "MetaLeft",  "key": "Meta",  "keyCode": 91,  "shiftKey": false },
	 {  "code": "MetaRight",  "key": "Meta",  "keyCode": 92,  "shiftKey": false },
	 {  "code": "ContextMenu",  "key": "ContextMenu",  "keyCode": 93,  "shiftKey": false },
	 {  "code": "NumpadMultiply",  "key": "*",  "keyCode": 106,  "shiftKey": false },
	 {  "code": "NumpadAdd",  "key": "+",  "keyCode": 107,  "shiftKey": false },
	 {  "code": "F1",  "key": "F1",  "keyCode": 112,  "shiftKey": false },
	 {  "code": "F2",  "key": "F2",  "keyCode": 113,  "shiftKey": false },
	 {  "code": "F3",  "key": "F3",  "keyCode": 114,  "shiftKey": false },
	 {  "code": "F4",  "key": "F4",  "keyCode": 115,  "shiftKey": false },
	 {  "code": "F5",  "key": "F5",  "keyCode": 116,  "shiftKey": false },
	 {  "code": "F6",  "key": "F6",  "keyCode": 117,  "shiftKey": false },
	 {  "code": "F7",  "key": "F7",  "keyCode": 118,  "shiftKey": false },
	 {  "code": "F8",  "key": "F8",  "keyCode": 119,  "shiftKey": false },
	 {  "code": "F9",  "key": "F9",  "keyCode": 120,  "shiftKey": false },
	 {  "code": "F10",  "key": "F10",  "keyCode": 121,  "shiftKey": false },
	 {  "code": "F11",  "key": "F11",  "keyCode": 122,  "shiftKey": false },
	 {  "code": "F12",  "key": "F12",  "keyCode": 123,  "shiftKey": false },
	 {  "code": "NumLock",  "key": "NumLock",  "keyCode": 144,  "shiftKey": false },
	 {  "code": "ScrollLock",  "key": "ScrollLock",  "keyCode": 145,  "shiftKey": false },
	 {  "code":  "AudioVolumeMute",  "key":  "AudioVolumeMute",  "keyCode":  173,  "shiftKey":  false  },
	 {  "code":  "AudioVolumeDown",  "key":  "AudioVolumeDown",  "keyCode":  174,  "shiftKey":  false  },
	 {  "code":  "AudioVolumeUp",  "key":  "AudioVolumeUp",  "keyCode":  175,  "shiftKey":  false  },
	 {  "code":  "MediaPlayPause",  "key":  "MediaPlayPause",  "keyCode":  179,  "shiftKey":  false  },
	 {  "code":  "LaunchApp2",  "key":  "LaunchApplication2",  "keyCode":  183,  "shiftKey":  false  },
	 {  "code": "Semicolon",  "key": ";",  "keyCode": 186,  "shiftKey": false },
	 {  "code": "Semicolon",  "key": ":",  "keyCode": 186,  "shiftKey": true },
	 {  "code": "Equal",  "key": "=",  "keyCode": 187,  "shiftKey": false },
	 {  "code": "Equal",  "key": "+",  "keyCode": 187,  "shiftKey": true },
	 {  "code": "Comma",  "key": ",",  "keyCode": 188,  "shiftKey": false },
	 {  "code": "Comma",  "key": "<",  "keyCode": 188,  "shiftKey": true },
	 {  "code": "Minus",  "key": "-",  "keyCode": 189,  "shiftKey": false },
	 {  "code": "Minus",  "key": "_",  "keyCode": 189,  "shiftKey": true },
	 {  "code": "Period",  "key": ".",  "keyCode": 190,  "shiftKey": false },
	 {  "code": "Period",  "key": ">",  "keyCode": 190,  "shiftKey": true },
	 {  "code": "Slash",  "key": "/",  "keyCode": 191,  "shiftKey": false },
	 {  "code": "Slash",  "key": "?",  "keyCode": 191,  "shiftKey": true },
	 {  "code": "Backquote",  "key": "`",  "keyCode": 192,  "shiftKey": false },
	 {  "code": "Backquote",  "key": "~",  "keyCode": 192,  "shiftKey": true },
	 {  "code": "BracketLeft",  "key": "[",  "keyCode": 219,  "shiftKey": false },
	 {  "code": "BracketLeft",  "key": "{",  "keyCode": 219,  "shiftKey": true },
	 {  "code": "Backslash",  "key": "\\",  "keyCode": 220,  "shiftKey": false },
	 {  "code": "Backslash",  "key": "|",  "keyCode": 220,  "shiftKey": true },
	 {  "code": "BracketRight",  "key": "]",  "keyCode": 221,  "shiftKey": false },
	 {  "code": "BracketRight",  "key": "}",  "keyCode": 221,  "shiftKey": true },
	 {  "code": "Quote",  "key": "'",  "keyCode": 222,  "shiftKey": false },
	 {  "code": "Quote",  "key": "\"",  "keyCode": 222,  "shiftKey": true },
	 {  "code": "KeyA",  "key": "á",  "keyCode": 225,  "shiftKey": false },
	 {  "code": "KeyE",  "key": "é",  "keyCode": 233,  "shiftKey": false },
	 {  "code": "KeyI",  "key": "í",  "keyCode": 237,  "shiftKey": false },
	 {  "code": "KeyN",  "key": "ñ",  "keyCode": 241,  "shiftKey": false },
	 {  "code": "KeyO",  "key": "ó",  "keyCode": 243,  "shiftKey": false },
	 {  "code": "KeyU",  "key": "ú",  "keyCode": 250,  "shiftKey": false } 
	]; 

	/*var charCodes = []; // Version 1.5.2 - Allow keyCode to be a string
	if (isNaN(keyCode)) { // if keyCode is not a number
		// keyCode = keyCode.charCodeAt(0); // Convert string character into charCode // Version 1.5.2 - Commented out
		for (var k = 0; k < keyCode.length; k++) {
			charCodes.push(keyCode.charCodeAt(k));
		}
	} // Version 0.99.7
	else // Version 1.5.2
		charCodes.push(Number(keyCode));
	for (var k = 0; k < charCodes.length; k++) { // Version 1.5.2 - Press all the keys in charCodes array
	keyCode = charCodes[k]; // Version 1.5.2
	keyCode = Number(keyCode);
	var keyCodeLowerCase = keyCode;
	var key = String.fromCharCode(keyCode);
	var code = "Key" + key.toUpperCase();
	for (var c = 0; c < keyCodes.length; c++) {
		if (keyCode == keyCodes[c].keyCode) {
			code = keyCodes[c].code;
			key = keyCodes[c].key;
			no_insertText = true; // Don't insert text for keys in keyCodes array
			if (keyCodes[c].hasOwnProperty('no_insertText'))
				no_insertText = keyCodes[c].no_insertText;
		}
	}*/
	
	var all_keys = []; // Version 1.6.10 - Fixing function keypress() to be better
	/* Jeff note: charCode is only needed for keypress and keypress is only sent if key.length == 1 or key == "Enter.
	 The keypress event uses charCode for both charCode and keyCode property.
	 textInput and input is true for all key.length == 1 keys and Enter key. But backspace only has input not textInput.
	 CTRL and ALT have no keypress or input event except for CTRL+X which may have inputType["deleteByCut"]
	 and CTRL+V which may have textInput with data of pasted text and input with inputType["insertFromPaste"]
	*/
	var num = Number(keyCode); // Convert keyCode to number. Also " ", "\t" and "\n" become 0 but strings = NaN
	if (!isNaN(keyCode) && num != 0) { // keyCode is a number in a string such as "190"
		for (var c = 0; c < keyCodes.length; c++) { // Look for keyCode in keyCodes array
			var found = 0;
			if (keyCode == keyCodes[c].keyCode && keyCodes[c].shiftKey == shift) {
				found = 1;
				//console.log(keyCodes[c]);
				var this_key = keyCodes[c];
				break;
			}
		}
		if (!found) { // Character not found in keyCodes so build our own
			var this_key = {
				"code": "", "key": "", "keyCode": num, "shiftKey": false	
			}
		}
		// Add user passed ctrl, alt and shift settings to the keypress
		if (ctrl) this_key.ctrlKey = ctrl;
		if (alt) this_key.altKey = alt;
		if (shift) this_key.shiftKey = shift;
		all_keys.push(this_key);
	}
	else { // keyCode is a string
		var string = keyCode;
		for (var k = 0; k < string.length; k++) { // Loop through each character in the string
			for (var c = 0; c < keyCodes.length; c++) { // Look for character in keyCodes array
				var found = 0;
				if (string[k] == keyCodes[c].key || string[k] == keyCodes[c].data) {
					found = 1;
					var this_key = keyCodes[c];
					break;
				}
			}
			if (!found) { // Character not found in keyCodes so build our own
				var this_key = {
					"code": "", "key": string[k], "keyCode": string.charCodeAt(k), "shiftKey": false	
				}
			}
			// Add user passed ctrl, alt and shift settings to the keypress
			if (ctrl) this_key.ctrlKey = ctrl;
			if (alt) this_key.altKey = alt;
			if (shift) this_key.shiftKey = shift;
			all_keys.push(this_key);
		}
	}

	var keypress_seconds = 0; // Version 1.7.8 - For setTimeout below 
	
// Now press all the keys in the all_keys array
for (var k = 0; k < all_keys.length; k++) { 
		
	/* Version 1.7.8 - Slow down each keypress using setTimeout for Fabio Quinci for chathomebase.com/chat
		The keypress() method without setTimeout worked fine with the old chat portal: centralemessaggi.com/messages
	*/
	(function(el, all_keys, k, ctrl, alt, shift) { 
	setTimeout(function() { 
							
		var this_key = all_keys[k];
		var key = this_key.key;
		var keyCode = this_key.keyCode;
		var code = this_key.code;
		var charCode = this_key.key.charCodeAt(0);
		var data = this_key.data || this_key.key;
		var inputType = "insertText";
		
		// Version 1.6.10 - Special keys
		if (keyCode == 8) inputType = "delete"; // Backspace
		//if (keyCode == 13) inputType = "insertLineBreak"; // Enter // Version 1.6.13 - Removed. Caused CKEditor 5 to display @ after linebreak
		if (keyCode == 13) { // Version 1.6.13 - It is random that monitorEvent($0) does insertParagraph or insertLineBreak as an inputEvent. Sometimes it is an inputEvent of "insertText" with data: null
			if (el.isContentEditable)
				inputType = "insertParagraph";
			else
				inputType = "insertLineBreak";	
		}
		if (keyCode == 46) inputType = "forwardDelete"; // Delete
		if (ctrl) {
			if (keyCode == 65) inputType = "selectAll"; // Ctrl+A
			if (keyCode == 66) inputType = "bold"; // Ctrl+B
			if (keyCode == 67) inputType = "copy"; // Ctrl+C
			if (keyCode == 73) inputType = "italic"; // Ctrl+I
			if (keyCode == 85) inputType = "underline"; // Ctrl+U
			if (keyCode == 86) inputType = "paste"; // Ctrl+V
			if (keyCode == 88) inputType = "cut"; // Ctrl+X
			if (keyCode == 89) inputType = "redo"; // Ctrl+Y
			if (keyCode == 90) inputType = "undo"; // Ctrl+Z
		}
		
		var defaultView = window; // Version 1.7.8 - Adding defaultView From function click(). Still didn't make chatGPT clear the textarea on enter
		try {
			defaultView = el.ownerDocument.defaultView;
		} catch (error) {
			if (test_mode) console.log(error);
		}
		
		var keyObj = { // For keydown and keyup events
			'key':key, 'which':keyCode, 'keyCode':keyCode, 'charCode':0,
			'bubbles':true, 'cancelable':true, 'code': code,
			'composed':true, 'isTrusted':true, 'view': defaultView, 
			'ctrlKey':this_key.ctrlKey, 'altKey':this_key.altKey, 'shiftKey':this_key.shiftKey
		}
		//if (test_mode) console.log(el, JSON.stringify(keyObj), inputType); // Version 1.7.8 - Adding 'view' creates error if I use console.log with the obj: Error in event handler: TypeError: Converting circular structure to JSON --> starting at object with constructor 'Window' --- property 'window' closes the circle
		
		var keypressObj = { // The keypress event uses charCode for both charCode and keyCode property.
			'key':key, 'which':charCode, 'keyCode':charCode, 'charCode':charCode,
			'bubbles':true, 'cancelable':true, 'code': code,
			'composed':true, 'isTrusted':true, 'view': defaultView,
			'ctrlKey':this_key.ctrlKey, 'altKey':this_key.altKey, 'shiftKey':this_key.shiftKey
		}
		
		if (ctrl) el.dispatchEvent(new KeyboardEvent('keydown',{'key':'Control', 'code':'ControlLeft', 'keyCode':17, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift, 'bubbles': true})); // Version 1.6.10 - Added 'bubbles': true for all ctrl, alt and shift keypresses				
		if (alt) el.dispatchEvent(new KeyboardEvent('keydown',{'key':'Alt', 'code':'AltLeft', 'keyCode':18, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift, 'bubbles': true})); 				
		if (shift) el.dispatchEvent(new KeyboardEvent('keydown',{'key':'Shift', 'code':'ShiftLeft', 'keyCode':16, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift, 'bubbles': true})); 				
		
		el.dispatchEvent(new KeyboardEvent('keydown',keyObj));
		//if (!document.activeElement.className.match(/docs-texteventtarget-iframe/i)) // Version 1.5.2 - Google docs does cursor down with keydown but displays character with keypress
		if ( (key.length == 1 || key == "Enter") && (!ctrl || key == "Enter") && !alt) // Version 1.6.13 - From !ctrl to (!ctrl || key == "Enter") because CTRL+Enter has a keypress event
			el.dispatchEvent(new KeyboardEvent('keypress',keypressObj));
		// charCode is only needed for keypress and keypress is only sent if key.length == 1 or key == "Enter
		if (key.length == 1 || key == "Enter") 
		if ( (el.isContentEditable || isTextInput(el)) && no_insertText == false && !ctrl && !alt) {	
			var textEvent = dom.createEvent('TextEvent'); // Version 1.5.2 - From document to dom
			textEvent.initTextEvent('textInput', true, true, null, data, 9, "en-US");
			el.dispatchEvent(textEvent); // Version 1.0.4 - Needed for messenger.com to display first character. Not needed for enter(13) in messenger or google hangouts
		}
		if (key.length == 1 || key == "Enter" || inputType != "insertText") 
		//if (no_insertText == false && !ctrl && !alt || inputType != "insertText") { // Version 1.6.13 - Removed and replaced
		if (no_insertText == false && (!ctrl || inputType != "insertText") && !alt) { // Version 1.6.13
			//el.dispatchEvent(new InputEvent('input',{'data':key, inputType:'insertText', 'bubbles':true }));
			var sent = dom.execCommand(inputType, false, data); // Messes up messenger.com and facebook.com chat box // Version 1.5.2 - From document to dom
			if (test_mode) console.log("Sent: "+sent);
		}
		
		el.dispatchEvent(new KeyboardEvent('keyup',keyObj));
		
		//if (ctrl && key.toLowerCase() == 'z')
		//	el.dispatchEvent(new InputEvent('input',{'data':null, 'inputType':'historyUndo', 'composed':true})); // monitorEvents shows good event but does not undo
		if (ctrl) el.dispatchEvent(new KeyboardEvent('keyup',{'key':'Control', 'code':'ControlLeft', 'keyCode':17, 'ctrlKey':false, 'altKey':alt, 'shiftKey':shift, 'bubbles': true})); 
		if (alt) el.dispatchEvent(new KeyboardEvent('keyup',{'key':'Alt', 'code':'AltLeft', 'keyCode':18, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift, 'bubbles': true})); 				
		if (shift) el.dispatchEvent(new KeyboardEvent('keyup',{'key':'Shift', 'code':'ShiftLeft', 'keyCode':16, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift, 'bubbles': true})); 				

	}, keypress_seconds); })(el, all_keys, k, ctrl, alt, shift); // Wait to make sure tab is loaded first
	keypress_seconds += 25; // Version 1.7.8 - End of setTimeout addition (1/40th of a second)
	
}
	
	/*
	// keydown and keyup change a-z (97-122) to A-Z (65-90); keypress leaves it as lowercase
	if (keyCode >= 97 && keyCode <= 122)
		keyCodeLowerCase = keyCode - 32;
	
	
	var keyObj = {'key':key, 'which':keyCodeLowerCase, 'keyCode':keyCodeLowerCase, 'charCode':0,
				'bubbles':true, 'cancelable':true, 'code': code,
				'composed':true, 'isTrusted':true,
				'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift
				}
	if (test_mode) console.log(el, JSON.stringify(keyObj));
				
	var keypressObj = {'key':key, 'which':keyCode, 'keyCode':keyCode, 'charCode':keyCode,
				'bubbles':true, 'cancelable':true, 'code': code,
				'composed':true, 'isTrusted':true,
				'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift
				}
				
				
	if (ctrl) el.dispatchEvent(new KeyboardEvent('keydown',{'key':'Control', 'code':'ControlLeft', 'keyCode':17, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift})); 				
	if (alt) el.dispatchEvent(new KeyboardEvent('keydown',{'key':'Alt', 'code':'AltLeft', 'keyCode':18, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift})); 				
	if (shift) el.dispatchEvent(new KeyboardEvent('keydown',{'key':'Shift', 'code':'ShiftLeft', 'keyCode':16, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift})); 				
	
	el.dispatchEvent(new KeyboardEvent('keydown',keyObj));
	if (!document.activeElement.className.match(/docs-texteventtarget-iframe/i)) // Version 1.5.2 - Google docs does cursor down with keydown but displays character with keypress
		el.dispatchEvent(new KeyboardEvent('keypress',keypressObj));
	//el.dispatchEvent(new InputEvent('input',{'data':key, inputType:'insertText' }));
	if ( (el.isContentEditable || isTextInput(el)) && no_insertText == false && !ctrl && !alt) {	
		var textEvent = dom.createEvent('TextEvent'); // Version 1.5.2 - From document to dom
	    textEvent.initTextEvent('textInput', true, true, null, key, 9, "en-US");
		el.dispatchEvent(textEvent); // Version 1.0.4 - Needed for messenger.com to display first character. Not needed for enter(13) in messenger or google hangouts
		dom.execCommand("InsertText", false, key); // Messes up messenger.com and facebook.com chat box // Version 1.5.2 - From document to dom
	}
	el.dispatchEvent(new KeyboardEvent('keyup',keyObj));
	
	//if (ctrl && key.toLowerCase() == 'z')
	//	el.dispatchEvent(new InputEvent('input',{'data':null, 'inputType':'historyUndo', 'composed':true})); // monitorEvents shows good event but does not undo
	if (ctrl) el.dispatchEvent(new KeyboardEvent('keyup',{'key':'Control', 'code':'ControlLeft', 'keyCode':17, 'ctrlKey':false, 'altKey':alt, 'shiftKey':shift})); 
	if (alt) el.dispatchEvent(new KeyboardEvent('keyup',{'key':'Alt', 'code':'AltLeft', 'keyCode':18, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift})); 				
	if (shift) el.dispatchEvent(new KeyboardEvent('keyup',{'key':'Shift', 'code':'ShiftLeft', 'keyCode':16, 'ctrlKey':ctrl, 'altKey':alt, 'shiftKey':shift})); 				

	//if (sra_date)
	//	el.setAttribute('data-sra', sra_date); // Version 1.5.2 - Evernote was doing keypress() twice // Version 1.5.2 - Removed. Was only doing "Press enter" twice but was stopping moveCursor sometimes
	*/
} // Version 1.5.2

/*	
	// Event method
  	var eventObj = document.createEvent("Events");
  	eventObj.initEvent("keydown", true, true); // bubble, cancelable
 	eventObj.keyCode = keyCode;
    eventObj.which = keyCode;
    eventObj.charCode = keyCode;
    eventObj.key = String.fromCharCode(keyCode);
    eventObj.code = "Key" + String.fromCharCode(keyCode);
    el.dispatchEvent(eventObj);
    //document.dispatchEvent(eventObj);
    
    eventObj = document.createEvent("Events");
  	eventObj.initEvent("keypress", true, true);
 	eventObj.keyCode = keyCode;
    eventObj.which = keyCode;
    eventObj.charCode = keyCode;
    eventObj.key = String.fromCharCode(keyCode);
    eventObj.code = "Key" + String.fromCharCode(keyCode);
    el.dispatchEvent(eventObj);
    //document.dispatchEvent(eventObj);
    
    eventObj = document.createEvent("Events");
  	eventObj.initEvent("keyup", true, true);
 	eventObj.keyCode = keyCode;
    eventObj.which = keyCode;
    eventObj.charCode = keyCode;
    eventObj.key = String.fromCharCode(keyCode);
    eventObj.code = "Key" + String.fromCharCode(keyCode);
    el.dispatchEvent(eventObj);
    //document.dispatchEvent(eventObj);
*/
    
    /*eventObj = document.createEvent('TextEvent'); // Does not save undo history without clicking somewhere with mouse
	eventObj.initTextEvent('textInput', true, true, null, String.fromCharCode(keyCode));
	el.dispatchEvent(eventObj); 
	
	eventObj = document.createEvent('Event'); 
	eventObj.initEvent('input', false, false);
	el.dispatchEvent(eventObj);
	
	eventObj = document.createEvent('Event'); 
	eventObj.initEvent('change', false, false);
	el.dispatchEvent(eventObj);*/
	
	
	// keyboard event method
	//var keyCode = 74; // 74 = j
/*	var keyboardEvent = window.document.createEvent("KeyboardEvent");
	var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
    keyboardEvent[initMethod](
                       "keydown",
                        true,      // bubbles oOooOOo0
                        true,      // cancelable   
                        null,    // view
                        false,     // ctrlKeyArg
                        false,     // altKeyArg
                        false,     // shiftKeyArg
                        false,     // metaKeyArg
                        keyCode,  
                        0          // charCode   
    );
    
	// forece Chrome to not return keyCode of 0 when fired
  	Object.defineProperty(keyboardEvent, 'keyCode', {
        get : function() {
            return keyCode;
        }
      });
      
    Object.defineProperty(keyboardEvent, 'key', {
        get : function() {
            return String.fromCharCode(keyCode);
        }
      });
    
    Object.defineProperty(keyboardEvent, 'code', {
        get : function() {
            return "Key" + String.fromCharCode(keyCode);
        }
      });
  
    el.dispatchEvent(keyboardEvent); 
    */
	


function lastLetter(el, next = false) // Version 1.7.6 - Added next = false to possibly get next character instead of previous
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
			// Version 1.7.6 - Returning last two characters now in case user moves the cursor between . and space. We need to know to capitalize.
			var precedingChar = el.value.substring(el.selectionStart-2, el.selectionStart); // Get previous 2 letters
			var nextChar = el.value.substring(el.selectionEnd, el.selectionEnd+1); // Get next 1 letter
			if (next)
				return(nextChar);
			else
				return(precedingChar);
			//return(el.value.charAt(start-1));
		} catch(err) {
			return "";
		}
	}
	else // Now Get cursor position of another type of element
	{
		var precedingChar = "", nextChar = "", sel, range, precedingRange; // Version 1.7.6 - Added nextChar = "",
	    if (window.getSelection) {
	        sel = window.getSelection();
			if (document.activeElement.nodeName == "IFRAME") { // Version 1.3.8 - For bitrix24.com CRM comment box
				try {
					var el2 = document.activeElement;
					var iframe = document.activeElement;
					while (el2.nodeName == "IFRAME") { // Version 1.3.9b
						iframe = el2.contentWindow.document; // Version 1.3.8
						el2 = el2.contentWindow.document.activeElement;
					}
					sel = iframe.getSelection();
					//if (test_mode) console.log(el); // Version 1.3.9b
					//if (test_mode) console.log(sel); // Version 1.3.9 - Accidentally didn't have test_mode in Version 1.3.8
				}
				catch (err) {
					if (test_mode) console.log(err);
				}
			}
	        /* Version 1.5.2i - range.toString() only includes content from text nodes. Therefore <br>
				tags are not included. But sel.toString() inlcudes text nodes and shows <br> as \n
				Therefore, after all this time we are replacing range with sel below. However, the nice thing
				about the old cloneRange() is we didn't affect the selection highlighted, but since we are using
				sel we can instantly restore it with sel.collapseToEnd(). The other bad thing about the new way
				is that if we press CTRL+B in contentEditible DIV then it loses bold when we add the range back.
			*/
			/* Version 1.7.6 - Going back to range.toString() so that if we press CTRL+B it will still keep the bold
				after we look at the last letter which sel.toString() doesn't do after sel.extend(el, 0);
				But range.toString() does not see line breaks as \n
				I did a lot of testing and it seems that if (range.endOffset == 0) then it is a line break!
				Or just change range.setStart(el, 0); to range.setStart(range.startContainer, 0);
				and it returns "" after a line break;
			*/ 
			if (sel.rangeCount > 0) {
	            range = sel.getRangeAt(0).cloneRange();
	            range.collapse(true); // Collapse to start
	            range.setStart(range.startContainer, 0); // Version 1.7.6 - From el to range.startContainer. It returns "" after linebreaks
	            //precedingChar = range.toString().slice(-1); // Old get previous 1 character
				precedingChar = range.toString().slice(-2); // Version 1.7.6 - Get previous 2 characters
				var range2 = sel.getRangeAt(0).cloneRange();
				range2.collapse(false); // Collapse to end
				range2.setEndAfter(el);
				nextChar = range2.toString().slice(0,1); // Get next 1 character
				/* range.toString() doesn't recognize if next char is \n and puts a space after the text when not needed
					Fix it later Jeff. I'm tired! 
					Version 1.7.6b fix: Insert my own fake cursor to find the chars around it.
					This works but it doesn't preserve CTRL+B unless I use insertNode with a span instead of text node.
				*/
				var clone = sel.getRangeAt(0).cloneRange();
				var cursor_span = el.ownerDocument.createElement("span")
				cursor_span.innerHTML = "❘|J";
				clone.insertNode(cursor_span);
				//el.ownerDocument.execCommand("insertHTML", null, "❘|J"); // Insert cursor: Light vertical bar \u2758 next to regular vertical bar \u007C 
				var matches = el.innerText.match(/(.{0,2})\❘\|J(.{0,1})/); // Match chars before (0 to 2) and after (0 to 1)
				if (matches) {
					precedingChar = matches[1];
					nextChar = matches[2];
				}
				/* Version 1.7.6b - tinyMCE puts a zero width no break space at the cursor &#xfeff; when pressing CTRL+B 
					which makes the next word insert right next to the previous word because it matches \s
					so lets remove all zero width characters from the last letter
					\ufeff = &#xfeff; \u200B = &ZeroWidthSpace; \u200C = &zwnj; \u200D = &zwj; 
				*/
				precedingChar = precedingChar.replace(/[\ufeff\u200B\u200C\u200D]/, "");
				//el.ownerDocument.execCommand("undo", null, "❘|"); // Undo insert of cursor. Only works with insertHTML. If insertText is used then it may undo more than one insert.
				cursor_span.remove();
				
				/*if (range.endOffset < range.endContainer.length) { // Version 1.7.6 - Get next character
					range.setEnd(range.endContainer, range.endOffset + 1); // Extend range 1 character
					nextChar = range.toString().slice(-1); // Get next 1 character
					console.log("range.toString().slice(-1):"+nextChar);
				}
				else if (range.endContainer.nextSibling) {
					var sibling = range.endContainer.nextSibling;
					while (sibling) {
						console.log("sibling: "+sibling.textContent);
						if (sibling.textContent) {
							nextChar = sibling.textContent.substring(0, 1); // Get next 1 character
							break;
						}
						sibling = sibling.nextSibling;
					}
				}*/
				//if (range.endOffset == 0) // Version 1.7.6 - cursor is before a linebreak
				//	precedingChar = "";
					
				/*range = sel.getRangeAt(0); // Save current selection (range)
				sel.extend(el, 0);
				//if (test_mode) console.log(sel.toString());
				precedingChar = sel.toString().slice(-2); // Version 1.7.6 - From -1 to -2
				sel.collapseToEnd();
				sel.removeAllRanges(); sel.addRange(range); // Restore previous selection (range)
				*/
	        }
			
	    } else if ( (sel = document.selection) && sel.type != "Control") {
	        range = sel.createRange();
	        precedingRange = range.duplicate();
	        precedingRange.moveToElementText(el);
	        precedingRange.setEndPoint("EndToStart", range);
	        precedingChar = precedingRange.text.slice(-1);
	    }
	    if (test_mode && range && range.toString) console.log("range.toString(): "+ range.toString());
		if (test_mode) console.log("lastLetter: "+ precedingChar);
	    if (next) // Version 1.7.6
				return(nextChar);
			else
				return(precedingChar);
	}
}


function capitalize(el, text) {
	
	var cap = false; // Should first letter be capitalized?
	var space = false; // Should a space be added to the beginning of the text
	var first_char = /\S/;
	var last_letter = lastLetter(el);
	if (test_mode) console.log("lastLetter: "+ last_letter);
	text = text.replace(/^ /, ""); // Version 1.7.6 - 'Always' Remove space from beginning of text if it exists
	
	/* Don't capitalize inputs with type email|search|password or
		name = "username|email|login" */
	if (el.nodeName == "INPUT")
	{ 
	 	/* Chrome will not use selectionStart on type email or number.
		We need to check for valid types before using it */
		var valid_type = el.type.match(/^(text|password|search|tel|url)$/);
		
		if (!el.type.match(/email|search|password|url/i) // Version 1.7.6 - Added url
			&& !el.name.match(/username|email|login|url/i)) // Version 1.7.6 - Added url
			if ( (el.value.length == 0) || (valid_type && el.selectionStart == 0) )
			{
				if (el.hasAttribute("autocapitalize") && el.getAttribute("autocapitalize").match(/^(off|none)/)) // Version 0.99.9
					cap = false;
				else
					cap = true;
			}
			else if (!last_letter.match(/\s$/)) // Version 1.2.0	// Version 1.7.6 - From != " " to .match(/\s$/) because lastLetter() may return 2 characters now
				space = true;
			/*if (el.type.match(/email/i) || el.name.match(/username|userid|onlineid/i) || el.id.match(/username|userid|onlineid/i)
				text = text.replace(/ /, ""); // Remove all spaces. Version 0.99.9 - Bad idea. What if it is confused with a Display name field? */
			if (el.type.match(/email|url/i) || el.name.match(/email|url/i) || el.id.match(/email|url/i)) // Version 1.7.6 - Added |url
			{
				text = text.replace(/\bat\b/i, "@"); // Replace word boundary "at" with "@"; Version 0.99.9
				text = text.replace(/ /g, ""); // Remove all spaces. Version 0.99.9	
			}
		text = text.replace(/^ /, ""); // Remove space from beginning of text if it exists // Version 0.99.9 - Moved outside of above if statement
	}
	else if (el.nodeName == "TEXTAREA")
	{
		if (el.value.length == 0 || el.selectionStart == 0 || last_letter.match(/[\n\.!\?][^\S\r\n]?$/)) // Version 1.7.6 - Added [^\S\r\n]?$ to match optional whitespace at end that is NOT \n or \r
		{
			cap = true;
			text = text.replace(/^ /, ""); // Remove space from beginning of text if it exists
		}
		else if (!last_letter.match(/\s$/)) // Version 1.7.6 - From != " " to .match(/\s$/) because lastLetter() may return 2 characters now
			space = true;
	}
	else // Any contentEditable element
	{
		if (el.innerHTML.length == 0 || last_letter == "" || last_letter.match(/[\n\.!\?\u200C][^\S\r\n]?$/)) // Version 1.1.0 - Added \u200C // Version 1.7.6 - Added [^\S\r\n]?$ to match optional whitespace at end that is NOT \n or \r
		{
			cap = true;
			text = text.replace(/^ /, ""); // Remove space from beginning of text if it exists
		}
		else if (!last_letter.match(/\s$/)) { // Version 1.7.6 - From != " " to .match(/\s$/) because lastLetter() may return 2 characters now
			space = true;
		}
	}
	
	// If last letter was a line feed or an end of sentence character .!?
	if (last_letter.match(/[\n\.!\?;][^\S\r\n]?$/)) // Version 1.4.4b - Added ; for https://ckeditor.com/ckeditor-5/demo/ adding &nbsp; on "Press enter" // Version 1.7.6 - Added [^\S\r\n]?$ to match optional whitespace at end that is NOT \n or \r
		cap = true;
	if (last_letter.match(/[\.!\?]$/)) // Version 1.7.6 - Added $
		space = true;
	
	if (cap == true)
		text = text.replace(first_char, function(m) { return m.toUpperCase(); }); // Capitalize first letter
		/* Note: Above we are capitalizing first letter found not first character because
		speech recognition may have returned \n or \n\n as the first characters */
	if (space == true && !text.match(/^[ \n\.!\?,;]/)) // if there is not already a space or .!?, at beginning of string
		text = " "+text; // Add space to beginning of text
		
	// Version 1.7.6 - If next character after insert is not a space then add one
	var nextChar = lastLetter(el, true);
	if (test_mode) console.log("nextChar: "+nextChar);
	if (nextChar != "" && !nextChar.match(/^[ \n\.!\?,;]/))
		text += " "; // Add space to end of text
		
	
	return (text);
}


function placeCursor(option)
{
	/* No longer using. Everything can be done with moveCursor(keyword) now.
		This function could never scroll to the cursor if it moved it to the bottom
	*/
	/* this function places the cursor in an element at the start|end|top|bottom of
		an element and then scrolls the element to that position
	*/
	var el = document.activeElement;
	var start = true;
	if (Array.isArray(option))
	{
		if (option.length <= 0) option.push("end");
		option = option[0];
	}
	
	if (option.match(/^(end|bottom)/))
		start = false;
	
	// Move cursor to start or end
	if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
    {
        range = document.createRange();//Create a range (a range is a like the selection but invisible)
        range.selectNodeContents(el);//Select the entire contents of the element with the range
		range.collapse(start);//collapse the range to the end point. false means collapse to end rather than the start
        selection = window.getSelection();//get the selection object (allows you to change selection)
        selection.removeAllRanges();//remove any selections already made
        selection.addRange(range);//make the range you have just created the visible selection
    }
    
    scrollToCursor(el);
}


/*function highlight_element(el) // Version 1.5.2 - Removed. Now using function below instead.
{
	// Change background color of focused element for a second 
	// border does not work on checkbox so I decided to use CSS outline instead 
	var old_outline = document.defaultView.getComputedStyle(el,null).getPropertyValue("outline");
	var old_background_color = document.defaultView.getComputedStyle(el,null).getPropertyValue("background-color");
	if (!el.getAttribute('data-old-outline')) // Version 1.2.3 - Only set if not set previously
		el.setAttribute('data-old-outline', old_outline);

	el.style.setProperty("outline", "2px solid blue", "important");

	setTimeout(function(){ 
		el.style.setProperty("outline", el.getAttribute('data-old-outline'), "important");
	}, 2500);
}*/

function highlight_element(el, interval) { // Version 1.5.2 - New way to do highlight with a single re-used div
	if (typeof interval === "undefined") // Version 1.7.11
		clearTimeout(window["highlight_div_interval"]);
		
	if (!document.getElementById("sra_highlight_div")) {
		var highlight_div = document.createElement('div');
		highlight_div.id = "sra_highlight_div";
		highlight_div.style.position = "absolute"; // Version 1.3.7 - Changed from absolute to fixed for Reddit
		highlight_div.style.border = "2px solid blue";
		highlight_div.style.backgroundColor = "transparent";
		highlight_div.style.opacity = 1;
		highlight_div.style.transition = "opacity 0.3s";
		highlight_div.style.zIndex = "2147483647"; // Version 1.3.9b - Changed from 1999999999 to 2147483647
		//window.highlight_div_timer = ""; // create a global highlight_div_timer variable
		document.body.appendChild(highlight_div);
	}
	else
	{
		var highlight_div = document.getElementById("sra_highlight_div");
	}
	
	var scrollLeft = window.scrollX || window.pageXOffset;
	var scrollTop = window.scrollY || window.pageYOffset;
	if (window == window.top) {
		try {
			var framePos = currentFrameAbsolutePosition(el.ownerDocument.defaultView); // get iframe of element 
			scrollLeft += framePos.x;
			scrollTop += framePos.y;
			if (test_mode) console.log(window.document, framePos, scrollLeft);
		} catch (error) { 
			if (test_mode) console.log(error); 
		}
	}
	highlight_div.style.opacity = 1;
	highlight_div.style.display = "block";
	highlight_div.style.left = el.getBoundingClientRect().left + scrollLeft + "px";
	highlight_div.style.top = el.getBoundingClientRect().top + scrollTop + "px";
	highlight_div.style.width = el.getBoundingClientRect().width + "px";
	highlight_div.style.height = el.getBoundingClientRect().height + "px";
	//if (window.self === window.top) // Only scroll in main document not the iframes // Version 1.3.7 - Removed
	//	scrollToPosition(highlight_div); // Verison 1.3.7 - Removed
	//highlight_div.innerHTML = message;
	if (typeof interval === "undefined") {
		clearTimeout(highlight_div_timer);
		highlight_div_timer = setTimeout(function() { 
			highlight_div.style.display = "none"; 
			highlight_div.style.opacity = 0; 
			clearTimeout(window["highlight_div_interval"]); // Version 1.7.11
		}, 2000); // Version 1.5.4c - From 2500 to 2000
		
		window["highlight_div_interval"] = setInterval(function() { // Version 1.7.11 - Sometimes element moves
			highlight_element(el, true); // Like Gmail subject line
		}, 250); // So check position every 1/4 of a second
		
		if (test_mode) console.log(el); // Version 1.5.4c
	}
	
}


function currentFrameAbsolutePosition(currentWindow) { // Version 1.5.2
	//	https://stackoverflow.com/questions/53056796/getboundingclientrect-from-within-iframe
	// highlight_element(el) is off in iframes so we need this function
  currentWindow = currentWindow || window;
  let currentParentWindow;
  let positions = [];
  let rect;

  while (currentWindow !== window.top) {
    currentParentWindow = currentWindow.parent;
    for (let idx = 0; idx < currentParentWindow.frames.length; idx++)
      if (currentParentWindow.frames[idx] === currentWindow) {
        for (let frameElement of currentParentWindow.document.getElementsByTagName('iframe')) {
          if (frameElement.contentWindow === currentWindow) {
            rect = frameElement.getBoundingClientRect();
            positions.push({x: rect.x, y: rect.y});
          }
        }
        currentWindow = currentParentWindow;
        break;
      }
  }
  return positions.reduce((accumulator, currentValue) => {
    return {
      x: accumulator.x + currentValue.x,
      y: accumulator.y + currentValue.y
    };
  }, { x: 0, y: 0 });
}


function switch_fields(option)
{
	if (window.self != window.top) return; // Version 0.99.9 - Don't do switch_fields in iframes
	/* type = "form" for form element or "any" or "link" or "text" */	
	var type = "any";
	var times = 1;
	var keyword = null;
	var activeElement = document.activeElement; // Version 1.5.2 
	var dom = document; // Version 1.5.2 
	if (activeElement.nodeName == "IFRAME") { // Version 1.5.2
		try {
			while (activeElement.nodeName == "IFRAME") {
				//dom = activeElement.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				activeElement = activeElement.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(activeElement); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	} 
	if (activeElement.shadowRoot) { // Version 1.7.11 - Get shadowRoot elems (Bing chat)
		while (activeElement.shadowRoot) {
			activeElement = activeElement.shadowRoot.activeElement;
		}
	}
	
	if (test_mode) console.log(activeElement); // Version 1.5.2b

	if (Array.isArray(option))
	{
		if (option.length <= 0) option.push("next");	
		for (var a = 0; a < option.length; a++)
		{
			if (String(option[a]).match(/^(form|field|input|box|text|entry|area)/i))
				type = "text";
			else if (!isNaN(option[a])) // if is a number
				times = parseInt(option[a]);
			else if (!String(option[a]).match(/^times?$/i)) // Version 1.6.9 from else to else if (!String(option[a]).match(/^times?$/i))
				keyword = option[a];
		}
		if (keyword) option = keyword;
		else option = option[0];
		if (test_mode) console.log(times);
		if (test_mode) console.log(option);
	}
	else if (option == "") option = "next"; // Version 0.99.7 - So custom command can have switch_fields(previous) as well as next
	
	var nextField = document.body;
	// var dom = document; // Version 1.5.2 - Removed - Up top now
	var activeElementIndex = null;
	var current_el = null;
	var interactiveElements = [];
	
	
	/* Search for any user input element */
	//var elems = dom.getElementsByTagName("*"); // Note we removed .body so we could get body tag as well and not just children of body // Version 1.5.2 - Replaced with getAllElems()
	var selectors = 'iframe, button, [href], input, select, textarea, details, [tabindex]:not([tabindex="-1"]), [contentEditable=true], [contentEditable="TRUE"]';
	var elems = getAllElems(selectors); // Version 1.5.2 - Get all elements including those in accessible iframes
	// Version 1.7.11 - If activeElement is in shadowRoot then get the shadowRoot elements because selectors is not "*"
	if (activeElement.getRootNode() && activeElement.getRootNode().host) {
		//var shadowRootElems = getAllElems(selectors, activeElement.getRootNode());
		var shadowRootElems = activeElement.getRootNode().querySelectorAll(selectors);
		for (var ii=0; ii < shadowRootElems.length; ii++)
			elems.push(shadowRootElems[ii]);
	}
	for (var i=0; i<elems.length; i++)
	{
		current_el = elems[i];
		/* cross-origin policy problem with below code. So detect if iframe is cross-origin or not. How? */
		//if (elems[i].nodeName == "IFRAME")
		//	current_el = findElement(current_el, elems[i].contentWindow.document)
		if (current_el == activeElement) activeElementIndex = i; // Version 1.5.2 - From document.activeElement to activeElement
		if ( (current_el.isContentEditable || isInteractive(current_el, type)) && isVisible(current_el) )
		{	
			interactiveElements.push(current_el);
			if (isNaN(option)) // if option is a string and not a number
			{
				if (option.match(/^(tab|keyword|next|right|down|forward|forwards|for word|4 word|to|on|in|the|form|farm|weiter|siguiente|derecha|abajo|adelante|tabulaci.n|tabulador|successivo)$/i)) {
					if (activeElementIndex != null && i > activeElementIndex) {
						if (times > 1)
							times--;
						else
						{
							current_el.focus(); // see if current element can get focus
							activeElement = document.activeElement; // Version 1.5.2
							if (activeElement.nodeName == "IFRAME") { // Version 1.5.2
								try {
									while (activeElement.nodeName == "IFRAME") {
										//dom = activeElement.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
										activeElement = activeElement.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
									}
									if (test_mode) console.log(activeElement); // Version 1.3.5
								} catch (err) { 
									if (test_mode) console.log(err);
								}
							}
							if (activeElement.shadowRoot) { // Version 1.7.11 - Get shadowRoot elems (Bing chat)
								while (activeElement.shadowRoot) {
									activeElement = activeElement.shadowRoot.activeElement;
								}
							}
						 
							if (current_el == activeElement) // if it didn't get focus then it wouldn't be activeElement // Version 1.5.2 - From document.activeElement to activeElement 
							{
								// keypress(9); // Version 1.7.6 - Was keypress_inject // Version 1.7.11 - Removed - Was now causing gmail to skip from subject to send instead of message body
								nextField = current_el; 
								break;
							}
						}
					}
				}	
		    	else if (option.match(/^(shift tab|previous|left|up|app|a|backward|backwards|zur|anterior|izquierda|arriba|atr.s|maiusc tab|precedente)$/i)) {
		    		if (i == activeElementIndex && interactiveElements.length > 1) {
		    			for (var e = interactiveElements.length - 2; e >= 0; e--) {
			    			if (times > 1)
								times--;
							else
							{
								nextField = interactiveElements[e];
				    			nextField.focus(); // see if current element can get focus
								activeElement = document.activeElement; // Version 1.5.2
								if (activeElement.nodeName == "IFRAME") { // Version 1.5.2
									try {
										while (activeElement.nodeName == "IFRAME") {
											//dom = activeElement.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
											activeElement = activeElement.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
										}
										if (test_mode) console.log(activeElement); // Version 1.3.5
									} catch (err) { 
										if (test_mode) console.log(err);
									}
								}
								if (activeElement.shadowRoot) { // Version 1.7.11 - Get shadowRoot elems (Bing chat)
									while (activeElement.shadowRoot) {
										activeElement = activeElement.shadowRoot.activeElement;
									}
								}
								if (nextField == activeElement) // if it didn't get focus then it wouldn't be activeElemnt // Version 1.5.2 - From document.activeElement to activeElement 
									break;
							}
						}
					}	 
		    	}
		    	else
		    	{
		    		// Search for field with keywords with and without spaces: sea breeze computers, seabreezecomputers
		    		var keyword = option;
					var re = new RegExp("^("+String(keyword)+"|"
							+String(keyword).replace(" ","")+"|"
							+replace_mistakes(String(keyword))+"|"
							+String(keyword).replace(/(\d+)/g, function (number) { return(num2words(number, "-").trim())})+"|"
							+String(keyword).replace(/(\d+)/g, function (number) { return(num2words(number, " ").trim())})
						+")",'i');
					if ( ('textContent' in current_el && current_el.textContent.match(re)) ||
						 ('innerText' in current_el && current_el.innerText.match(re)) ||
						 ('innerHTML' in current_el && current_el.innerHTML.match(re)) ||
						 ('name' in current_el && String(current_el.name).match(re)) ||
						 ('placeholder' in current_el && current_el.placeholder.match(re)) ||
						 (current_el.hasAttribute("aria-label") && current_el.getAttribute("aria-label").match(re)) ||
						 ('title' in current_el && current_el.title.match(re)) ||
						 ('id' in current_el && String(current_el.id).match(re)) ||
						 ('value' in current_el && String(current_el.value).match(re)) ||
						 (String(keyword).match(/^(box|input|text|area|text area|text box|field|text field)$/i) && current_el.nodeName.match(/INPUT|TEXTAREA/i)) 
						)
					{
						nextField = current_el;
					    break;
					}	
				}
		    }
		    else // if option is a number
		    {
		    	var FieldNumber = option - 1;
		    	if (FieldNumber < 0) FieldNumber = 0;
		    	if (interactiveElements.length > FieldNumber) {
					nextField = interactiveElements[FieldNumber]; // Go to that field number (Remember that first field is 0)
					if (test_mode) console.log(option);
					break;
				}
		    }
		}
	}
	if (isNaN(option) && option.match(/^last$/i) && interactiveElements.length > 1)
		nextField = interactiveElements[interactiveElements.length - 1];
	
	if (test_mode) console.log(interactiveElements);
	if (test_mode) console.log(nextField);
	if (nextField)
	{
		nextField.focus(); 
		//if (nextField.isContentEditable) // When you focus on contentEditable divs the focus goes to start instead of end
		//	placeCursor("end"); 
		highlight_element(nextField);
	}
}


function browse(keyword) // Version 1.6.11 - From navigation to browse because navigation is a new W3 Javascript window function
{
	if (Array.isArray(keyword)) keyword = keyword[0]; // Version 0.99.7
	
	if (window.self === window.top)
	{
		if (String(keyword).match(/^(back)$/i))
			window.history.back(); // Press browser back button
		if (String(keyword).match(/^(forward)$/i))
			window.history.forward(); // Press browser forward button
		else if (String(keyword).match(/^(homepage)$/i))
			window.location.href = "chrome://newtab"; // Not allowed to load local resource: chrome://newtab/ so doing in commands.js url() function
		else if (String(keyword).match(/^(reload|refresh)$/i))
			window.location.reload();
	}
}


function click_keyword(keyword, dom) // Version 1.5.2 - Added ", dom" for docs.google.com to click on blank
{
	/* With this function we are going to click on any element
		with value or innerText that matches keyword but
		with preference that it is on screen and a button or a
		link
	*/
	var times = 1;
	var type = "";
	if (Array.isArray(keyword)) 
	{
		// Version 1.5.2d - Removed below for loop because no longer clicking on button n times because of add_numbers()
		/*for (var a = 0; a < keyword.length; a++)
		{
			if (!isNaN(keyword[a])) // if is a number
				times = parseInt(keyword[a]);
			else
				type = String(keyword[a]); // button|link|box|click|check|uncheck
		}*/
		keyword = keyword[0]; 
		if (keyword == "keyword") { keyword = times; times = 1; } // Version 1.5.2 - To help with add_numbers()
		if (!isNaN(keyword)) keyword = String(keyword); // Version 1.5.2 - To help with add_numbers()
		if (test_mode && !dom) console.log("Keyword: "+keyword); // Version 1.7.11 - Added && !dom
	}
	if (times > 20) times = 19; // Only let them click element 19 times
	dom = dom || document.body; // Changed from var dom = document.body; to dom = dom || document.body;
	var current_el = null;
	var el_to_click = null;
	var eligible = false; // Is the current element eligible to be clicked on
	var re_array = [];
	keyword = keyword.replace(/'/g, "['‘’]"); // Version 1.5.3 - Match smart apostrophe's or curly (JW.org > See What’s New)
	// Search for button with keywords with and without spaces: sea breeze computers, seabreezecomputers
	var regex = "("+String(keyword)+"|"
				+String(keyword).replace(/\s/g,"")+"|" // Version 1.5.2 - From " " to /\s/g
				+replace_mistakes(String(keyword))+"|"
				+String(keyword).replace(/(\d+)/g, function (number) { return(num2words(number, "-").trim())})+"|"
				+String(keyword).replace(/(\d+)/g, function (number) { return(num2words(number, " ").trim())})
			+")";
	if (window.location.href.match(/facebook.com|messenger.com/i) && keyword.toLowerCase() == "send") regex += "$"; // Version 1.0.4 - So we click on "Send" and not "Send Money"
	if (window.location.href.match(/evernote.com\/Login.action/i) && keyword.toLowerCase() == "continue") regex += "$"; // Version 1.5.2 - Because Evernote login would click on "Continue with apple" instead of "continue"
	re_array.push( new RegExp("^\\s*"+regex+"\\s*$", 'i')); // Version 1.5.2 - First search for exact phrase
	re_array.push( new RegExp("^\\s*"+regex, 'i')); // Second search for keyword at beginning of strings // Version 1.5.2 - Added \\s*
	if (!String(keyword).match(/^(back|forward|refresh|reload)$/i))
		re_array.push( new RegExp("(^|\\b)"+regex+"(\\b|$)", 'i')); // Third search for keyword anywhere in the strings // Version 1.5.2 - Changed from regex to "(^|\\b)"+regex+"(\\b|$)"
	
	var interactiveElements = [];
	if (String(keyword).match(/^(click|check|uncheck|button|link|it|clic|marcar|desmarcar|Klicka|Markera|Avmarkera)$/i))
	{
		// Click on current element
		if (window.self === window.top) { // Version 1.6.9 - Only click on active element in top window not iframe otherwise we click on all the ads on the page
			el_to_click = document.activeElement;
			if (el_to_click.shadowRoot) { // Version 1.7.11 - Get shadowRoot elems (Bing chat)
				while (el_to_click.shadowRoot) {
					el_to_click = el_to_click.shadowRoot.activeElement;
				}
			}
		}
	}
	/*else if (String(keyword).match(/^(submit)$/i)) // Version 1.7.11 - Removed - Doesn't work with Bing chat
	{
		submit_form();
		return;
	}*/
	
	/*var all_doms = [];
	all_doms.push(document);
	for (var f=0; f<window.frames.length;f++)
	{
		try {
			var iframe = window.frames[f].contentDocument || window.frames[f].contentWindow.document; // deal with older browsers
			all_doms.push(iframe);
		} catch(err) {
			// catch if iframe is cross-origin
		}
	}
	for (var d=0; d<all_doms.length;d++)
	{
	if (el_to_click) // if we found element to click before going though all iframes
		break; // then break the loop
	dom = all_doms[d].body; */
	
	//var elems = dom.getElementsByTagName("*"); // Note we removed .body so we could get body tag as well and not just children of body
	//var elems = dom.querySelectorAll("*"); // Version 1.7.11 - shadowRoot traversing added below. shadowRoot does not support getElementsByTagName
	var elems = getAllElems(); // Version 1.7.11b - Worked better with Bing Chat "click on submit" than using a recursive function with shadowRoot(s)
	for (var r = 0; r < re_array.length; r++)
	{
		var re = re_array[r];
		if (el_to_click) // if we found element to click before looking for keyword without beginning of string match: ^
			break; // then break the loop	
	for (var i=0; i<elems.length; i++)
	{
		current_el = elems[i];
		/*if (elems[i].nodeName == "IFRAME")
		try 
		{ 
	    	current_el = current_el.contentDocument || current_el.contentWindow.document; // deal with older browsers
	    } catch(err){
	    	// catch if iframe is cross-origin
	      	// do nothing
	    }*/
		
		// Version 1.7.11 - Traverse shadowRoot(s) (Bing chat) - Removed because the recursive function was not working. It was clicking on more than one button
		/*if (current_el.shadowRoot) {
			//if (test_mode) console.log(current_el, current_el.shadowRoot);
			var result = false;
			result = click_keyword([keyword, times, type], current_el.shadowRoot);
			if (result) {
				if (test_mode) console.log("Result: ",result)
				return; // Found el_to_click in shadowRoot so exit function
			}
		}*/

		//	current_el = findElement(current_el, elems[i].contentWindow.document)
		eligible = false;
		if (isVisible(current_el))
		{
			eligible = true;
			if ('type' in current_el && current_el.type == 'hidden') eligible = false;
			if ('disabled' in current_el && current_el.disabled == true) eligible = false;
			//if (!isNaN(String(keyword)) && labels.length && 'textContent' in current_el && current_el.textContent.match(re) && !current_el.classList.contains("sra_label")) eligible = false; // Version 1.5.4c - If labels are on then don't click on other numbers
			//if ('readOnly' in current_el && current_el.readOnly == true) eligible = false; // Yes you can click in readOnly textarea so you can copy it!
				
			if (eligible)
			{
				if (typeof keyword === 'string' || keyword instanceof String)
				{
					//console.log(current_el);
					/* I did have these in the if statement:
						('textContent' in current_el && current_el.textContent.match(re)) ||
						 ('innerText' in current_el && current_el.innerText.match(re)) ||
					*/
					if ( // ('textContent' in current_el && current_el.textContent.match(re)) || // Version 1.7.11 - Removed because on Bing Chat "Click on Submit" clicks on image links in answers
						 ('innerText' in current_el && current_el.innerText.match(re)) ||
						 //('innerHTML' in current_el && current_el.innerHTML.match(re)) ||
						 ('name' in current_el && String(current_el.name).match(re)) ||
						 ('placeholder' in current_el && current_el.placeholder.match(re)) ||
						 (current_el.hasAttribute("aria-label") && current_el.getAttribute("aria-label").match(re)) ||
						 (current_el.hasAttribute("data-tooltip") && current_el.getAttribute("data-tooltip").match(re)) || // Version 1.5.4d - https://developers.google.com/web/updates/2017/09/sticky-headers More button
						 (current_el.hasAttribute("mattooltip") && current_el.getAttribute("mattooltip").match(re)) || // Version 1.7.11 - Google Bard microphone and send message icon
						 (current_el.hasAttribute("data-placeholder") && current_el.getAttribute("data-placeholder").match(re)) || // Version 1.5.4d - Evernote contenteditable paper element
						 ('title' in current_el && String(current_el.title).match(re)) || // Version 1.5.2 - Added String( because wikipedia.org error: title.match is not a function
						 //('id' in current_el && String(current_el.id).match(re)) || // Version 1.5.2 - Removed because at Gmail > "Click on 58" it was clicking on <div id=":58.sn">New voice mail</div>
						 ('value' in current_el && String(current_el.value).match(re)) ||
						 (String(keyword).match(/^(paper|document|editor|text\s*area|text\s*box|field|text\s*field)$/i) && current_el.isContentEditable && current_el.contentEditable != 'inherit' && current_el.id != "WACViewPanel_EditingElement") || // Version 1.5.2 - Evernote note body or Word online (paper|document|editor) // Version 1.5.2c - Added  && current_el.id != "WACViewPanel_EditingElement" so that can click on "Document 8" for unnamed documents
						 (String(keyword).match(/^(paper|editor|text\s*area|text\s*box|field|text\s*field)$/i) && current_el.id == "WACViewPanel_EditingElement") || // Version 1.5.2c - Word online
						 (String(keyword).match(/^(box|text\s*area|text\s*box|field|text\s*field)$/i) && current_el.nodeName.match(/TEXTAREA/i)) || // Version 1.0.2 - Added textarea // Version 1.5.2j - Moved below so contenteditable is clicked on first
						 (String(keyword).match(/^(box|input|text\s*box|field|text\s*field|input box|input field)$/i) && current_el.nodeName.match(/INPUT/i))  // Version 1.0.2 - Added textarea
			 	
						 )
					if (current_el.id != "speech_tooltip")
					{
						el_to_click = current_el; 
						/* If element is within the current current viewport
							and is a button or a link */
						if (isOnScreen(current_el) == true)
						{
							if (current_el.nodeName == "INPUT" && current_el.type.match(/^(button|radio|reset|submit)$/i))
						 		break; // then accept this element
						 	else if (current_el.nodeName == "TEXTAREA")
						 		break;
						 	else if (current_el.nodeName.match(/^(BUTTON|A|OPTION|DETAILS)$/i)) // version 1.3.2 - Removed SELECT // Version 1.5.2 - Added DETAILS
						 		break; // then accept this element
							else if (current_el.nodeName.match(/^(SELECT)$/i) && // Version 1.3.2 - Added SELECT by itself
									( ('id' in current_el && String(current_el.id).match(re)) ||
									  ('name' in current_el && String(current_el.value).match(re)) ) )
								break;
						 	else if (current_el.nodeName.match(/^(LABEL)$/i)) // if label then get input child of label
						 	{
						 		/*el_to_click = (current_el.htmlFor)
					        		? document.getElementById(current_el.htmlFor)
					            	: current_el.getElementsByTagName('input')[0];*/
					            break; 
						 	}
						 	else if ( (current_el.hasAttribute('tabindex') && current_el.getAttribute('tabindex') != -1) || 
		 				  			  (current_el.hasAttribute('role') && current_el.getAttribute('role').match(/^(button|checkbox|combobox|gridcell|input|link|listbox|listitem|menuitem|menuitemcheckbox|menuitemradio|option|radio|select|slider|textbox|widget)$/i)) 
		 				  			)
		 				  		break;
							else if (current_el.isContentEditable && current_el.contentEditable != 'inherit') // Version 1.5.2 - Evernote note body
								break;
							else if (current_el.parentElement && current_el.parentElement.nodeName == "A") // Version 1.5.2 - Wikipedia.org > English hyperlink
		 				  	{
								el_to_click = current_el.parentElement;
								break;
							}	
							/*else // search children of element
							{
								var children = current_el.children;
								for (var c = 0; c < children.length; c++)
								{
									if ( (current_el.nodeName == "INPUT" && current_el.type.match(/^(button|radio|reset|submit)$/i)) ||
										 (current_el.nodeName.match(/^(BUTTON|A|OPTION|SELECT|LABEL)$/i)) )
										el_to_click = current_el;
								}	
								break; // I think I should break anyway	
							}*/
						}
					}
				}
				else if (typeof keyword === 'number' && isOnScreen(current_el) == true)
				{
					if ( (type == "button") && 
						( (current_el.nodeName == "INPUT" && current_el.type.match(/^(button|radio|reset|submit)$/i)) ||
						  (current_el.nodeName.match(/^(BUTTON)$/i)) ) ||
						  (current_el.hasAttribute('tabindex') && current_el.getAttribute('tabindex') != -1) || 
		 				  (current_el.hasAttribute('role') && current_el.getAttribute('role').match(/^(button|checkbox|combobox|gridcell|listbox|listitem|menuitem|menuitemcheckbox|menuitemradio|option|radio|select|slider|widget)$/i))
		 				)
						interactiveElements.push(current_el);
					else if ( (type == "link" && current_el.nodeName == "A") ||
							  (current_el.hasAttribute('tabindex') && current_el.getAttribute('tabindex') != -1) || 
							  (current_el.hasAttribute('role') && current_el.getAttribute('role').match(/^(link|menuitem|menuitemcheckbox|menuitemradio|widget)$/i))
		 					)
						interactiveElements.push(current_el);
					var FieldNumber = keyword - 1;
			    	if (FieldNumber < 0) FieldNumber = 0;
			    	if (interactiveElements.length > FieldNumber) {
						el_to_click = interactiveElements[FieldNumber]; // Go to that field number (Remember that first field is 0)
						break;
					}
				}
			}	 
		}
	}
	} // end all reg expressions for loop
	if (typeof keyword === 'string' && keyword.match(/^last$/i) && interactiveElements.length > 1)
		el_to_click = interactiveElements[interactiveElements.length - 1];
	
	if (el_to_click)
	{
		scrollToPosition(el_to_click);
		if (test_mode) console.log(mutation_num);
		el_to_click.focus();
		highlight_element(el_to_click);
		var ms = 250; // milliseconds
		for (var i = 0; i < times; i++)
		{
			setTimeout(function(){ 
				//el_to_click.click();
				var mutation_record = mutation_num; // Record current mutation amount
				if (test_mode) console.log(mutation_num);
				var activeElement = document.activeElement; // Version 1.5.2
				var scrollX = window.scrollX; // Version 1.5.2
				var scrollY = window.scrollY; // Version 1.5.2
				var j = 0;
				if (el_to_click.nodeName == "SELECT") { // Version 1.3.2 - Moved above "OPTION" instead of below it
					if (typeof el_to_click.options[el_to_click.selectedIndex] !== "undefined") { // Version 1.3.2 - Added these 2 lines and commented out below 2 lines
						if (test_mode) console.log(el_to_click.options[el_to_click.selectedIndex]);
						el_to_click = el_to_click.options[el_to_click.selectedIndex];
					}
					/*if (el_to_click.size <= 1) el_to_click.size = el_to_click.length; // Version 1.0.1 - Open select box
					else if (el_to_click.size == el_to_click.length) el_to_click.size = 1; // Version 1.0.1 - Close select box	
					*/
				}
				if (el_to_click.nodeName == "OPTION") { 
					if (el_to_click.index != el_to_click.parentNode.selectedIndex) { // If not currently selected option then select it
						el_to_click.selected = true;
						var event = new Event('change');
						el_to_click.parentNode.dispatchEvent(event); // Version 1.0.1 - Fire change event
						if (test_mode) console.log("selectedIndex: "+el_to_click.parentNode.selectedIndex);
					}
					if (el_to_click.parentNode.size <= 1) {
						el_to_click.parentNode.size = el_to_click.parentNode.length; // Version 1.0.1 - Open select box // Version 1.3.2 - Changed 5 to el_to_click.parentNode.length
						el_to_click.parentNode.setAttribute("sra_size", el_to_click.parentNode.size); // Version 1.5.2 - Add attribute so we only make it smaller if we made it bigger 
					}
					//else if (el_to_click.parentNode.size == el_to_click.parentNode.length) // Version 1.5.2 - Removed
					else if (el_to_click.parentNode.hasAttribute("sra_size")) // Version 1.5.2 - Added
						el_to_click.parentNode.size = 1; // Version 1.0.1 - Close select box	// Version 1.3.2 - Changed 5 to el_to_click.parentNode.length
				}
				/* Gmail "Compose" button only works on "mouseup" event */
				click(el_to_click); // Version 1.5.2 - Click on top el at location
				// Version 1.5.2 - document.createEvent and initEvent are deprecated
				/*var event = document.createEvent('MouseEvents');
				event.initEvent("mousedown", true, false); // try (click|mousedown|mouseup), bubble, cancelable
				el_to_click.dispatchEvent(event);
				event = document.createEvent('MouseEvents');
				event.initEvent("click", true, false); // try (click|mousedown|mouseup), bubble, cancelable
				el_to_click.dispatchEvent(event);
				event = document.createEvent('MouseEvents');
				event.initEvent("mouseup", true, false); // try (click|mousedown|mouseup), bubble, cancelable
				el_to_click.dispatchEvent(event);
				*/
				
				// Version 1.5.2 - Look at all children of el_to_click and possibly click
				/*var el_children = el_to_click.querySelectorAll("*");
				var el_and_children = [];
				el_and_children.push(el_to_click); // Add el_to_click to front of array
				for (var ee = 0; ee < el_children.length; ee++) {
					el_and_children.push(el_children[ee]);
				}
				for (var ee = 0; ee < el_and_children.length; ee++) {
					var el = el_and_children[ee]; 
					// Version 1.5.2 - cancelable true because Google Apps button was going to a strange website when false
					// Version 1.5.2 - All this defaultView, x ,y is because embedded youtube video
					// would not click on play unless I first click anywhere in iframe or main document.
					// None of the extra code did anything. Probably because of Google's policy:
					// Uncaught (in promise) DOMException: play() failed because the user didn't interact with the document first.
					// But it isn't showing that in Developer Console unless I use:
					// if (document.getElementsByTagName("video")[0].paused)
					//	document.getElementsByTagName("video")[0].play();
					var defaultView = window;
					var x = el.getBoundingClientRect().x;
					var y = el.getBoundingClientRect().y;
					try {
						defaultView = el.ownerDocument.defaultView;
					} catch (error) {
						if (test_mode) console.log(error);
					}
					var eventInitObj = { view: defaultView, bubbles: true, cancelable: true, screenX: x, screenY: y };
					var event = new MouseEvent('mousedown', eventInitObj); // defaultView was window
					el.dispatchEvent(event); 
					event = new MouseEvent('click', eventInitObj);
					el.dispatchEvent(event); 
					event = new MouseEvent('mouseup', eventInitObj);
					el.dispatchEvent(event);
					
					//var event = document.createEvent('MouseEvents');
					//event.initEvent("mousedown", true, false); // try (click|mousedown|mouseup), bubble, cancelable
					//el.dispatchEvent(event);
					//event = document.createEvent('MouseEvents');
					//event.initEvent("click", true, false); // try (click|mousedown|mouseup), bubble, cancelable
					//el.dispatchEvent(event);
					//event = document.createEvent('MouseEvents');
					//event.initEvent("mouseup", true, false); // try (click|mousedown|mouseup), bubble, cancelable
					//el.dispatchEvent(event);
					
					if (test_mode) console.log("Clicked:", el, mutation_num);
					
					if (el.nodeName.match(/^(INPUT|TEXTAREA|BUTTON|A|OPTION|DETAILS|SUMMARY|SELECT|AREA|LABEL)$/i) ||
						(el.hasAttribute('tabindex') && el.getAttribute('tabindex') != -1) ||
						// Version 1.5.2 - Removed menuitem from role because clicking on Meetings at wol.jw.org didn't work
						// Version 1.5.2 - Removed option from role because clicking on Blank at docs.google.com not working (Google Docs)
						(el.hasAttribute('role') && el.getAttribute('role').match(/^(button|checkbox|combobox|gridcell|input|link|listbox|listitem|menuitemcheckbox|menuitemradio|radio|select|slider|textbox|widget)$/i)) || 
						(el.isContentEditable && el.contentEditable != 'inherit') ||
						(el.hasAttribute("aria-labelledby")) ||
						(activeElement != document.activeElement)
					)
						break; // If el_to_click or a child is a clickable element then assume it worked
				}	*/	
				
				setTimeout(function(){ 
					if (test_mode) console.log(mutation_num);
					/*if (mutation_num == mutation_record) // The mutations have not advanced so the click did nothing 
					{
						if (el_to_click.children[0]) {
							el_to_click.children[0].click();
							if (mutation_num == mutation_record) // Version 1.5.2 
							if (el_to_click.children[0].children[0]) // Version 1.5.2 - docs.google.com would not "Click on blank"
								el_to_click.children[0].children[0].click(); // Version 1.5.2 
						}
						//if (el_to_click.children.length > 1) { // Version 1.5.2 - docs.google.com would not "Click on blank"
						//	click_keyword([keyword, times, type], el_to_click); // Try the children
						//	return; // Version 1.5.2 - Users have not complained about click_keyword() so I will save this for later
						//}
					}
					else if (el_to_click.children[0] && (el_to_click.children[0].nodeName.match(/^(A|SUMMARY)$/i) // Version 1.5.2 - Even if mutations advanced if first child is an anchor tag then we should probably click it (wol.jw.org > Publications) and Summary tag of Details tag
					|| el_to_click.children[0].getAttribute("aria-labelledby")) // Version 1.5.2 - Google Docs would not "Click on blank" after we added to re_array ^keyword$ above
					) 		
						el_to_click.children[0].click();*/
				}, 250); 
			
			}, ms); 
			ms += 250; // Add a 1/4 of second between each click
		}
		//el_to_click.click();
		if (test_mode) console.log(el_to_click);	
		return (el_to_click); // Version 1.5.2 - To allow click in iframes with no src
	}
	else
	{
		if (window.self === window.top) // Otherwise window.history is executed in all iframes also and we go back 2 or more times
		{
			el_to_click = 1;
			// Did not find a button to click
			if (String(keyword).match(/^(back)$/i))
				window.history.back(); // Press browser back button
			if (String(keyword).match(/^(forward)$/i))
				window.history.forward(); // Press browser forward button
			else if (String(keyword).match(/^(homepage|home page)$/i))
				window.location.href = "//about:newtab"; // Goes to //about:blank instead!! and reload() after just reloads current page!
			else if (String(keyword).match(/^(reload|refresh)$/i))
				window.location.reload();
			else
				el_to_click = null;
		}
	}
	
	// Version 1.5.2 - "all_frames": true in manifest does not work on iframes with no src so we need to try to find the element there
	// Version 1.7.11b - Removed iframes recursive function below because now using getAllElems() above. Need more testing. It may be slow on some websites
	/*if (el_to_click == null && dom == document.body) {
		var iframes = document.getElementsByTagName("iframe");
		var result = false;
		for (var ii = 0; ii < iframes.length; ii++) {
			if (iframes[ii].src == "" || iframes[ii].src == "about:blank") { // Google docs iframe src="about:blank"
				try {
					var iframe_dom = iframes[ii].contentWindow.document; // Uncaught DOMException: Blocked a frame with origin "https://www.bitdegree.org" from accessing a cross-origin frame.
					result = click_keyword([keyword, times, type], iframe_dom);
					if (test_mode) console.log(result);
				} catch (err) {
					if (test_mode) console.log(err);
				}
			}
			if (result) { 
				scrollToPosition(iframes[ii]); // Version 1.5.3 - Scroll to iframe (tinyMCE > Click on paper)
				break; // If an iframe had an element to click then break loop
			}
		}
	}*/
	//if (test_mode) console.log(el_to_click); // Version 1.7.11 - Commented out
	//} // end all_doms for loop
}


function click(el) { // Version 1.5.2
	no_labels = false; // Version 1.5.2k - Don't click on any labels if this click is coming from a label
	for (var i = 0; i < labels.length; i++) // Version 1.5.2k
		if (labels[i].el == el) // Click is coming from a label
			no_labels = true;
	// Click on the topmost element at x,y location of el
	var rect = el.getBoundingClientRect(); // relative to the top-left of the viewport
	var center_x = rect.x + (rect.width/2);
	var center_y = rect.y + (rect.height/2);
	var center_x = rect.x + 8; center_y = rect.y + 8; // Version 1.6.4 - Stops google.com > "Click on 5 (google apps)" from clicking on youtube in middle of iframe div with aria-label="Google apps"
	var border_radius = el.ownerDocument.defaultView.getComputedStyle(el).getPropertyValue("border-radius"); // Version 1.6.4 - google.com > google apps menu elements have a border-radius so elementsFromPoint doesn't work without removing it // https://jsfiddle.net/v0xtnLm1/1/
	//var top_el = el.ownerDocument.elementsFromPoint(center_x,center_y); // el.ownerDocument instead of document in case element is in iframe
	/* Version 1.7.11 - el.ownerDocument gets the top document for shadowRoot elements.
		Therefore we need to use el.getRootNode() to get the shadowRoot document
	*/
	var top_el = el.getRootNode().elementsFromPoint(center_x,center_y); // In case el is in iFrame or shadowRoot
	el.style["border-radius"] = border_radius; // Version 1.6.4 - Restore border radius after elementsfromPoint() https://jsfiddle.net/v0xtnLm1/1/
	// elementfromPoint() returns the topmost Element at the specified coordinates (relative to the viewport).
	if (test_mode) {
		console.log(el); 
		console.log(top_el); 
		console.log(center_x + ", " + center_y);
	}
	
	if (window.self !== window.top && el.getAttribute("aria-label") && // Version 1.6.4 - Only needed if removing border_radius above is not used
		el.getAttribute("aria-label").match(/^google apps/i)) // Version 1.6.4
			return; // Version 1.6.4 - Don't click on div with aria-label="Google apps" in iFrame on google.com
		
	if (top_el.length == 0) // Click on google apps -> Click on Gmail moves so that top_el gets no elements
		top_el = el;
	else {
		for (var e = 0; e < top_el.length; e++) {
			if (!top_el[e].id.match(/^(speech_tooltip|sra_highlight_div)$/i)) 
			if (!no_labels || !top_el[e].classList.contains("sra_label"))  // Version 1.5.2k - Added line
			//if (typeof top_el[e].click !== "undefined") // Version 1.6.4 - google.com > "click on google apps". path and svg elements have no click event. !!!! Sometimes google allows click on path using mouseevent and sometimes it allows click on the google apps anchor. But not always!!!!
			{	
				top_el = top_el[e];
				break;
			}
		}
	}
	var defaultView = window;
	try {
		defaultView = top_el.ownerDocument.defaultView;
		// Version 1.7.11 - Still using ownerDocument instead of getRootNode() because el.getRootNode().defaultView is undefined for shadowRoot elements
	} catch (error) {
		if (test_mode) console.log(error);
	}
	var bubbles = true;
	if (top_el.classList.contains("sra_label")) // Version 1.5.4e - Google Calendar > "Click on start date" > "Show numbers" > "Click on 40" was closing start date calendar before clicking on the correct number. But bubbles = false did NOT work
		bubbles = false;
	var eventInitObj = { 
		view: defaultView, 
		bubbles: bubbles, 
		cancelable: true, 
		screenX: center_x, 
		screenY: center_y, 
		clientX: center_x, 
		clientY: center_y,
	};
	try {
		var event = new MouseEvent('mousedown', eventInitObj); 
		if (!top_el.classList.contains("sra_label")) // Version 1.5.4e - Google Calendar > "Click on start date" > "Show numbers" > "Click on 40" was closing start date calendar before clicking on the correct number. Not doing mousedown and mouseup worked
			top_el.dispatchEvent(event); 
		if (test_mode) console.log(event);
		var event = new MouseEvent('mouseup', eventInitObj); 
		if (!top_el.classList.contains("sra_label")) // Version 1.5.4e - Google Calendar > "Click on start date" > "Show numbers" > "Click on 40" was closing start date calendar before clicking on the correct number. Not doing mousedown and mouseup worked
			top_el.dispatchEvent(event); 
		if (test_mode) console.log(event);
		var event = new MouseEvent('click', eventInitObj); // Click happens after mouseup!
		top_el.dispatchEvent(event);
		if (test_mode) console.log(event);
	} catch (error) {
		if (test_mode) console.log(error);
	}
	if (test_mode) console.log("Clicked:", top_el, mutation_num);
}


function mouseDrag() {
	var el = document.activeElement;
	var dom = document; // Version 1.4.4c
	if (el.nodeName == "IFRAME") { // Version 1.4.4c - Added to enter_key() from clear_text()
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
	if (defaultView.getSelection().rangeCount) {
		var rect = defaultView.getSelection().getRangeAt(0).getBoundingClientRect();
		var top_el = el.ownerDocument.elementsFromPoint(rect.left, rect.top);
		for (var e = 0; e < top_el.length; e++) {
			if (!top_el[e].id.match(/^(speech_tooltip|sra_highlight_div)$/i)) 
			if (!top_el[e].classList.contains("sra_label"))  // Version 1.5.2k - Added line
			{	
				top_el = top_el[e];
				break;
			}
		}
		var defaultView = window;
		try {
			defaultView = top_el.ownerDocument.defaultView;
		} catch (error) {
			if (test_mode) console.log(error);
		}
		var eventInitObj = { 
			view: defaultView, 
			bubbles: true, 
			cancelable: true, 
			screenX: rect.left, 
			screenY: rect.top, 
			clientX: rect.left, 
			clientY: rect.top,
		};
		try {
			var event = new MouseEvent('mousedown', eventInitObj); 
			top_el.dispatchEvent(event); 
			if (test_mode) console.log(event);
			eventInitObj.screenX = eventInitObj.clientX = rect.right; // Move mouse to far right of selection
			var event = new MouseEvent('mousemove', eventInitObj); // Click happens after mouseup!
			top_el.dispatchEvent(event);
			if (test_mode) console.log(event);
			var event = new MouseEvent('mouseup', eventInitObj);
			top_el.dispatchEvent(event); 
			if (test_mode) console.log(event);
		} catch (error) {
			if (test_mode) console.log(error);
		}
	}
}


function enter_key(keyword)
{
	var el = document.activeElement;
	var dom = document; // Version 1.4.4c
	var text = "\n";
	var times = 1;
	
	el = getActiveElement(); // Version 1.7.11
	dom = el.ownerDocument; // Version 1.7.11
	
	if (Array.isArray(keyword))
	{
		for (var a = 0; a < keyword.length; a++)
		{
			// if (!isNaN(keyword[a])) // if is a number
			if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);
		}	
	}
	
	if (el.id.match(/WACViewPanel_EditingElement/i)  // Version 1.5.2 - onedrive.live.com - Word online messes up if we insert \n
	//|| window.location.href.match(/facebook.com|messenger.com|twitter.com|hubspot.com/i) // Version 1.5.2 - Hubspot messes up if we insert \n
	) { 
		keypress(13);
		return;
	}
	var ckeditor5 = (el.className.match(/ck-editor/)) ? true : false; // Version 1.5.2i
	if (ckeditor5) {
		keypress(13);
		return; // Version 1.6.13
	}
	
	// If element is IFRAME get the activeElement on the iframe
	//if (el.nodeName == "IFRAME")
	//	el = el.contentWindow.document.activeElement;
	/*if (el.nodeName == "IFRAME") { // Version 1.4.4c - Added to enter_key() from clear_text()
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	}*/
	
	if (test_mode) console.log(el);	
		
	for (var i = 0; i < times; i++)
	{
		if (el.isContentEditable)
		{
			//text = linebreak(text); // Add P tag to 'New Paragrah' and br tag to 'New Line'
			//console.log(text);
			//insertTextAtCursor(text); // This one didn't work with html nor did it move the caret to the end.
			//pasteHtmlAtCaret(text);
			if (document.activeElement.className.match(/docs-texteventtarget-iframe/i)) { // Version 1.4.4c - Google docs
				copyStringToClipboard("\n");
				return;
			}
			var chars = el.innerText.length; // Version 1.4.4c 
			if (test_mode) console.log("Before Length: "+chars);
			var insertType = "insertText"; // Version 1.5.2 - insertText is needed for \n to work on normal contentEditable elements
			var watir = (el.firstChild && el.firstChild.nodeType == 1 && el.firstChild.hasAttribute("data-contents")) ? true : false; // Version 1.5.2 - facebook.com|messenger.com|twitter.com|hubspot.com use Watir (ruby) contentEditable divs
			if (watir) // Version 1.5.2 - If using watir (twitter|hubspot|messenger)
				insertType = "insertHTML"; // Version 1.5.2 - If we use insertText with \n then it deletes text already there
			//dom.execCommand(insertType, false, "\n\u200c"); // \n is for capitalizing the next line with capitalize() function // Version 1.4.4b - Changed \n<br>&nbsp; to \n\u200c and insertHTML to insertText and document to dom
			/* Version 1.7.6 - Commented out execCommand above because we are always calling keypress(13)
				and keypress(13) is also doing a execCommand "insertParagraph"
			*/
			if (test_mode) console.log("After Length: "+el.innerText.length);
			//keypress_inject(13);
			// All this garbage below to make it scroll to the cursor after "<br>"
			/*selection = window.getSelection(); // Version 1.4.4b - Removed these two lines after editing execCommand to insertText instead of InsertHTML
			selection.modify("extend", "backward", "character"); */
			//if (chars == el.innerText.length) // Version 1.4.4c - Only press key 13 if insertText did not work // Version 1.5.2 - Changed < to == // Version 1.5.4g - Commented out to Always send keypress(13) because https://web.whatsapp.com/ doesn't have label on send button (possibly other websites too)
				keypress(13); // Version 1.0.4 - Was keypress_inject(13)
			
			scrollToCursor(el); // Version 1.4.4c - Still needed with insertText
			
			//setTimeout(function() { document.execCommand("delete"); }, 250);*/
			
			// All this garbage below to make it scroll to the cursor after "<br><br>"
			/*var event = document.createEvent('TextEvent'); // Does not save undo history without clicking somewhere with mouse
			event.initTextEvent('textInput', true, true, null, String.fromCharCode(13));
			el.dispatchEvent(event);*/
		}
		else if (isTextInput(el))
		{
			var mutation_record = mutation_num;
			if (test_mode) console.log(mutation_record);
			keypress(13); // Version 1.0.4 - Was keypress_inject(13)
			
			if (el.nodeName == "TEXTAREA")
			{
				//insertTextAtCaret(el, text);
				//dom.execCommand("InsertText", false, "\n"); // Version 1.4.4c - Changed from insertHTML to insertText
				/* Version 1.7.6 - Commented out execCommand above because we are always calling keypress(13)
					and keypress(13) is also doing a execCommand "insertLineBreak"
				*/
				scrollToCursor(el); // Version 1.4.4c
				//if (lastLetter(el) != "\n") // For some reason InsertHTML will not send \n the VERY first time we try it! // Version 1.4.4c - Not needed with insertText instead of insertHTML
				//	document.execCommand("InsertHTML", false, text); // So send the \n again	
				//el.blur(); el.focus(); // Otherwise InsertHTML does not scroll to the cursor position, but this prevents gmail recipient field from showing suggestions unless we do it before insertHTML
			}
			else // if input element
			{
				setTimeout(function(){ 
					if (test_mode) console.log(mutation_num);
					if (mutation_num == mutation_record) // The mutations have not advanced so the enter key did nothing  - Version 0.99.7 - Commented out so "Press enter" submits at google.com // Version 1.7.8 - Added back because Gmail was reloading page on search box and not Google.com is submitting properly with it
						if (isSearch(el)) 
							submit_form(); // So try submitting a form
						else switch_fields("next"); // tab to next field
							
				}, 250);
				//if (isSearch(el)) submit_form();
			}
		}
		else // click every other element
		{
			/*scrollToPosition(el);
			el.focus();
			highlight_element(el);*/
			setTimeout(function(){ 
				//el.click();
				var mutation_record = mutation_num;
				if (test_mode) console.log(mutation_record);
				keypress(13); // Version 1.0.4 - Was keypress_inject(13)
				setTimeout(function(){ 
					if (test_mode) console.log(mutation_num);
					if (mutation_num == mutation_record) // The mutations have not advanced so the enter key did nothing  
						el.click(); // So try clicking element
					// But in chrome the enter key does not select checkboxes so should we not click??
				}, 250);
				/* Gmail "Compose" button only works on "mouseup" event */
				/*var event = document.createEvent('MouseEvents');
				event.initEvent("mousedown", true, false); // try (click|mousedown|mouseup), bubble, cancelable
				el.dispatchEvent(event);
				event = document.createEvent('MouseEvents');
				event.initEvent("click", true, false); // try (click|mousedown|mouseup), bubble, cancelable
				el.dispatchEvent(event);
				event = document.createEvent('MouseEvents');
				event.initEvent("mouseup", true, false); // try (click|mousedown|mouseup), bubble, cancelable
				el.dispatchEvent(event);*/
			}, 250);
			//el.click();
		}			
	}
	
	if (sra_date) el.setAttribute('data-sra', sra_date); // Version 1.7.11
}


function spacebar(keyword)
{
	var el = document.activeElement;
	var dom = document; // Version 1.5.2e
	var text = " ";
	var times = 1;
	
	if (Array.isArray(keyword))
	{
		for (var a = 0; a < keyword.length; a++)
		{
			// if (!isNaN(keyword[a])) // if is a number
			if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);
		}	
	}
	
	
	// If element is IFRAME get the activeElement on the iframe
	/*if (el.nodeName == "IFRAME") { // Version 1.5.2e - Added to spacebar() from clear_text()
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	}*/
	
	el = getActiveElement(); // Version 1.7.11
	dom = el.ownerDocument; // Version 1.7.11
	
	
	for (var i = 0; i < times; i++)
	{
		if (document.activeElement.className.match(/docs-texteventtarget-iframe/i))  // Version 1.5.2 - Google docs
			copyStringToClipboard("\u200c ");
		else
		if (el.isContentEditable || isTextInput(el))
		{	
			keypress(32); // Version 1.0.4
			//document.execCommand("InsertHTML", false, text);
		}
		else // click every other element
		{
			var mutation_record = mutation_num;
			if (test_mode) console.log(mutation_record);
			keypress(32); // Version 1.0.4 - Was keypress_inject
			setTimeout(function(){ 
				if (test_mode) console.log(mutation_num);
				if (mutation_num <= (mutation_record+1)) // The mutations have not advanced so the spacebar did nothing // Version 1.04 - Added +1
				{ 
					scrollToPosition(el);
					el.focus();
					highlight_element(el);
					el.click();
				}
			}, 250);
			//el.click();	
		}	
	}
	if (test_mode) console.log(el);	
	
	if (sra_date) el.setAttribute('data-sra', sra_date); // Version 1.7.11
}

function backspace(keyword)
{
	var el = document.activeElement;
	var dom = document; // Version 1.5.2e
	var text = " ";
	var times = 1;
	
	if (Array.isArray(keyword))
	{
		for (var a = 0; a < keyword.length; a++)
		{
			// if (!isNaN(keyword[a])) // if is a number
			if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);
		}	
	}
	
	// If element is IFRAME get the activeElement on the iframe
	/*if (el.nodeName == "IFRAME") { // Version 1.5.2e - Added to backspace() from clear_text()
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	}*/
	
	el = getActiveElement(); // Version 1.7.11
	dom = el.ownerDocument; // Version 1.7.11
		
	for (var i = 0; i < times; i++)
	{
		var before_length = (el.value) ? el.value.length : el.innerText.length; // Version 1.5.2i
		
		if (el.isContentEditable || isTextInput(el))
		{
			send_command("delete");
			//window.getSelection().modify("extend", "backward", "character");
			//selection = window.getSelection().baseNode.data.slice(0, -1);
		}	
		var after_length = (el.value) ? el.value.length : el.innerText.length; // Version 1.5.2i
		if (before_length == after_length) // Version 1.5.2f 
			keypress(8); // Version 1.0.4 - was keypress_inject(8)
	}
	
	if (sra_date) el.setAttribute('data-sra', sra_date); // Version 1.7.11
}


function escape_key(keyword)
{
	var el = document.activeElement;
	var text = " ";
	var times = 1;
	
	if (Array.isArray(keyword))
	{
		for (var a = 0; a < keyword.length; a++)
		{
			// if (!isNaN(keyword[a])) // if is a number
			if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);
		}	
	}
	
	// If element is IFRAME get the activeElement on the iframe
	//if (el.nodeName == "IFRAME") // Version 1.5.2 - Removed. Not needed and will break with error
	//	el = el.contentWindow.document.activeElement;
		
	for (var i = 0; i < times; i++)
	{
		keypress(27); // Version 1.0.4 - Was keypress_inject(27)
	}
}


function select(keyword)
{
	var el = document.activeElement; // Version 1.5.2e
	var dom = document; // Version 1.5.2e
	var direction = "backward";
	var times = 1;
	var option = "all";
	var alter = "extend"; // Select text as you move the cursor
	
	/*if (el.nodeName == "IFRAME") { // Version 1.5.2e - Added to moveCursor() from clear_text()
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	}*/
	
	el = getActiveElement(); // Version 1.7.11
	dom = el.ownerDocument; // Version 1.7.11
	
	var selection = el.ownerDocument.defaultView.getSelection(); // Version 1.5.2e - Changed from window.getSelection() to el.ownerDocument.defaultView.getSelection()
	
	if (Array.isArray(keyword))
	{
		if (keyword.length <= 0) option = "all";
		for (var a = 0; a < keyword.length; a++)
		{ 
			if (String(keyword[a]).match(/^(last|previous|.ltimo|anterior|letzte|zur.ck|start)/i)) // Version 1.5.2f - Added |start
				direction = "backward";
			else if (String(keyword[a]).match(/^(next|siguiente|end)/i)) // Version 1.5.2f - Added |end
				direction = "forward";
			else if (String(keyword[a]).match(/^(text|field|box|all|tod[ao]s?|texto|campo|Bereich)/i))
				option = "all";	
			else if (String(keyword[a]).match(/^(none|nothing|ninguno|nada|no)/i))
				option = "none"; 
			else if (String(keyword[a]).match(/^(character|letter|car.cter|letra|Zeichen|Buchstaben)/i))
				option = "character";	
			//else if (!isNaN(keyword[a])) // if is a number
			else if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);
			else if (String(keyword[a]).match(/^(word|palabra|Wort)/i))
				option = "word";
			else if (String(keyword[a]).match(/^(sentence|oraci.n|Satz)/i))
				option = "sentence";	
			else if (String(keyword[a]).match(/^(paragraph|p.rrafo|Absatz)/i))
				option = "paragraph";
			else if (String(keyword[a]).match(/^(line|l.nea|Linie)/i))
				option = "line";
			else if (String(keyword[a]).match(/^(document|paper)/i)) // Verison 1.5.2f - Added
				option = "documentboundary";
			if (test_mode) console.log(option);
		}
		//if (test_mode) keyword = keyword[0];	// Version 1.5.3 - Removed because was causing "Select to start of line" to use up arrow instead of home key
	}
	else option = keyword;
	
	if (String(keyword[0]).match(/^(start|end)/i)) {
		if (option == "all") 
			option = "documentboundary";
		if (option.match(/line|sentence|paragraph/i)) // Version 1.5.2f
			option += "boundary";
	}
	
	if (option.match(/^all$/))
	{
		dom.execCommand('selectAll',false,null); // Version 1.5.2f - From document to dom
		keypress([65, 1]); // Google Docs CTRL+A
	}
	else if (option.match(/^(none|nothing)$/))
	{
        //if (!selection.isCollapsed) // Version 1.5.2 - To avoid Google Docs: Error in event handler: Error: Failed to execute 'collapseToEnd' on 'Selection': there is no selection.
		try { // Version 1.5.6 - isCollapsed does not work with textarea or input so we need to try to avoid above error instead
			selection.collapseToEnd();
		} catch (error) {
			if (test_mode) console.log(error);
		}
		//selection.removeAllRanges();//remove any selections already made
		keypress(39); // Google Docs Right Arrow
	}
	else
	{
		var keyCode = 39; // Version 1.5.2f right arrow
		var shift = 1; // Version 1.5.2f - Need shift for selecting in Google Docs
		var ctrl = 0; // Version 1.5.2f - Without ctrl key then it just moves one character
		
		// Version 1.5.2f - Added keyCodes below:
		if (direction == "forward") { 
			keyCode = 39; // Right arrow
			if (option == "word" || option.match(/paragraph/i)) ctrl = 1;	
			if (option == "line" || option.match(/paragraph/i)) keyCode = 40; // Down arrow
			if (option == "lineboundary" || option == "sentence") keyCode = 35; // End key // Version 1.5.3 - Added || option == "sentence"
			if (option == "documentboundary") { keyCode = 35; ctrl = 1; } // End key
		}
		else if (direction == "backward") { 
			keyCode = 37; // Left arrow
			if (option == "word" || option.match(/paragraph/i)) ctrl = 1;	
			if (option == "line" || option.match(/paragraph/i)) keyCode = 38; // Up Arrow	
			if (option == "lineboundary" || option == "sentence") keyCode = 36; // Home key // Version 1.5.3 - Added || option == "sentence"
			if (option == "documentboundary") { keyCode = 36; ctrl = 1; } // Home key	
		}	
		
		for (i = 0; i < times; i++)
		{
			var before_length = selection.toString().length; // Version 1.5.2i - Evernote did "select previous word" twice, so need to see if selection range has changed	
			//if (!document.activeElement.id.match(/WACViewPanel_EditingElement/i))  // Version 1.5.4a - Word online. This works for highlighting but doesn't highlight in a way that we can "Click on bold"
				selection.modify(alter, direction, option);
			var after_length = selection.toString().length; // Version 1.5.2i
			if (test_mode) console.log("before_length: "+before_length+", after_length: "+after_length);
			if (before_length == after_length // Version 1.5.2i - If length has not changed then try keypress
			|| document.activeElement.className.match(/docs-texteventtarget-iframe/i) // Version 1.5.2i - Google Docs puts &nbsp; in it's blank content editable div when you highlight the first word
			//|| document.activeElement.id.match(/WACViewPanel_EditingElement/i)  // Version 1.5.4a - Word online. Word selects with selection.modify but can't click on bold without keypress. But it sometimes puts weird text or deletes the 2 last letters of entered text
			) 
				keypress([keyCode, ctrl, 0, shift]); // Version 1.5.2f - Google Docs
		}
	}
	if (sra_date) // Version 1.5.2i
		el.setAttribute('data-sra', sra_date); // Version 1.5.2i
	//mouseDrag(); // Version 1.5.4 - Word online doesn't select the selection for Word without a mouse drag
}


function clipboard(keyword)
{
	var el = document.activeElement; // Version 1.5.2e
	var dom = document; // Version 1.5.2e
	
	if (Array.isArray(keyword))
	{
		keyword = keyword[0];	
	}
	else option = keyword;
	
	// If element is IFRAME get the activeElement on the iframe
	/*if (el.nodeName == "IFRAME") { // Version 1.5.2e - Added to spacebar() from clear_text()
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	}*/
	
	el = getActiveElement(); // Version 1.7.11
	dom = el.ownerDocument; // Version 1.7.11
	
	if (keyword.match(/^(copy|coffee|copiar|Kopieren|Kopiera|copia)/i)) // Version 1.7.11 - Added i
	{
		if (!dom.queryCommandEnabled("copy")) // If it returns false then no text is selected // Version 1.7.11 - From document. to dom
			dom.execCommand('selectAll'); // so select all the text in the current element
    
		if (window.self === window.top) // Version 0.99.8 - Copy only in top frame not iframes. Because Google Adsense changed something in their iframes?
			dom.execCommand("copy", false, null); // permissions: [ "clipboardWrite" ] in manifest.json
	}
	else if (keyword.match(/^(paste|pegar|Einf|klistra|incolla)/i)) // Version 1.7.11 - Added i // Version 1.7.13 - Removed $ because not matching German Einfügen
	{
		dom.execCommand("paste", false, null); // permissions: [ "clipboardRead" ] in manifest.json
	}
	else if (keyword.match(/^(cut|cortar|Ausschneiden|klipp|taglia)/i)) // Version 1.7.11 - Added i // Version 1.7.13 - Removed $ because not matching German Einfügen
	{
		dom.execCommand("cut", false, null); // permissions: [ "clipboardWrite" ] in manifest.json
	}
	
	if (sra_date) el.setAttribute('data-sra', sra_date); // Version 1.7.11
	
}


function clear_text(keyword)
{
	var el = document.activeElement;
	var dom = document; // Version 1.3.9b
	/*if (el.nodeName == "IFRAME") { // Version 1.3.9b
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	}*/
	el = getActiveElement(); // Version 1.7.11
	dom = el.ownerDocument; // Version 1.7.11
	
	// Can element accept input?
	if ( (!el.isContentEditable && !isTextInput(el)) || !isVisible(el) )
		el = findElement(el, document); // If not then find one that can
	
	dom.execCommand("selectAll", false, null); // Version 1.3.9b - Changed from document to dom
	dom.execCommand("delete"); // Preserves undo, but SelectAll above is a second undo // Version 1.3.9b - Changed from document to dom
	
	//if (el.isContentEditable) el.innerHTML = ""; // Does not preserve undo history
	//else if (isTextInput(el)) el.value = ""; // Does not preserve undo history
}


function moveCursor(keyword)
{
	var el = document.activeElement; // Version 1.5.2e
	var dom = document; // Version 1.5.2e
	var ctrl = 0; // Version 1.5.2f - For Google Docs keypress
	var direction = "up";
	var times = 1;
	var option = ""; // Version 1.5.2f - From "times" to ""
	var alter = "extend"; // Select text as you move the cursor
	var all_the_way = false; // Version 1.6.0
	if (Array.isArray(keyword))
	{
		if (keyword.length <= 0) option = "up";
		for (var a = 0; a < keyword.length; a++)
		{
			if (String(keyword[a]).match(/^(up|left|right|write|down|end|and|start|home|top|bottom|inicio|fin|arriba|abajo|derecha|izquierda|oben|unten|links|rechts)/i))
				direction = String(keyword[a]);
			//else if (!isNaN(keyword[a])) // if is a number
			else if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);
			else if (String(keyword[a]).match(/^(time|line|word|character|space|letter|sentence|paragraph|box|text|field|document|paper)/i)) // // Version 1.5.2d - Added |document // Version 1.6.0 - Added |paper
				option = keyword[a];
			else if (String(keyword[a]).match(/^(all)/i)) // Version 1.6.0
				all_the_way = true;
		}
		keyword = keyword[0];	
		
		if (all_the_way && direction.match(/^(up)/i)) // Version 1.6.0
			direction = "top";
		else if (all_the_way && direction.match(/^(down)/i)) // Version 1.6.0
			direction = "bottom";	
	}
	else direction = keyword; // Version 0.99.7
	
	// Version 1.7.11 - Removed below because using getActiveElement()
	/*if (el.nodeName == "IFRAME") { // Version 1.5.2e - Added to moveCursor() from clear_text()
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.9b - Changed from iframe to dom
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	}*/
	
	el = getActiveElement(); // Version 1.7.11
	dom = el.ownerDocument; // Version 1.7.11
	
	if (el && el.hasAttribute('data-sra') && el.getAttribute('data-sra') == sra_date) // Version 1.7.6
		return true;	
	
	var selection = el.ownerDocument.defaultView.getSelection(); // Version 1.5.2e - Changed from window.getSelection() to el.ownerDocument.defaultView.getSelection()
	if (selection.isCollapsed) // Just a cursor no text selected (this seems to always return true even when these is a selection)
		alter = "move"; // Just move the cursor with no selection of text	
	if (test_mode) console.log(alter, selection.isCollapsed);
	for (i = 0; i < times; i++)
	{
		if (direction.match(/^(up|arriba|Oben)$/i) && (!option || option.match(/line/i))) // Version 1.5.2f - Added (!option || option.match(/line/i) 
		{
			keypress(38); // Version 1.5.2 - From keypress_inject to keypress for Google docs
			selection.modify(alter, "backward", "line");
		}
		else if (direction.match(/^(down|abajo|Unten)$/i) && (!option || option.match(/line/i))) // Version 1.5.2f - Added (!option || option.match(/line/i) )
		{
			keypress(40); // Version 1.5.2 - From keypress_inject to keypress for Google docs
			selection.modify(alter, "forward", "line");
		}
		else if (direction.match(/^(home|start|top|inicio)/i))
		{
			if (option.match(/word|paragraph|sentence/i)) option = option;
			else if (option.match(/box|text|field|document|paper/i) || direction.match(/top/i)) { // Version 1.5.2d - Added |document // Version 1.6.0 - Added paper
				option = "documentboundary";
				ctrl = 1; // Version 1.5.2f - Google docs
			}
			else option = "lineboundary";
			keypress([36, ctrl]); // Version 1.5.2 - From keypress_inject to keypress for Google docs
			selection.modify(alter, "backward", option);
		}
		else if (direction.match(/^(end|and|bottom|fin)/i))
		{
			if (option.match(/word|paragraph|sentence/i)) option = option;
			else if (option.match(/box|text|field|document|paper/i) || direction.match(/bottom/i)) { // Version 1.5.2d - Added |document // Version 1.6.0 - Added paper
				option = "documentboundary";
				ctrl = 1; // Version 1.5.2f - Google docs
			}
			else option = "lineboundary";
			keypress([35, ctrl]); // Version 1.5.2 - From keypress_inject to keypress for Google docs
			selection.modify(alter, "forward", option);
		}
		else if (direction.match(/^(left|izquierda|links|up)$/i)) // Version 1.5.2f - Added |up
		{
			if (option.match(/word|paragraph|sentence/i)) option = option;
			else if (option.match(/character|space|letter/i)) option = "character";
			else option = "word";
			var keyCode = 37; // left arrow - Version 1.5.2e
			if (option.match(/word/i)) { // Version 1.5.2e
				ctrl = 1;
			} 
			else if (option.match(/paragraph/i)) { // Version 1.5.2e
				keyCode = 38; // Up arrow
				ctrl = 1;
			} 
			keypress([keyCode, ctrl]); // Version 1.5.2 - From keypress_inject to keypress for Google docs
			selection.modify(alter, "backward", option);
		}
		else if (direction.match(/^(right|write|derecha|rechts|down)$/i)) // Version 1.5.2f - Added - |down
		{
			if (option.match(/word|paragraph|sentence/i)) option = option;
			else if (option.match(/character|space|letter/i)) option = "character";
			else option = "word";
			var keyCode = 39; // right arrow - Version 1.5.2e
			if (option.match(/word/i)) { // Version 1.5.2e
				ctrl = 1;
			} 
			else if (option.match(/paragraph/i)) { // Version 1.5.2e
				keyCode = 40; // down arrow
				ctrl = 1;
			} 
			keypress([keyCode, ctrl]); // Version 1.5.2 - From keypress_inject to keypress for Google docs
			selection.modify(alter, "right", option);
		}
	}
	
	//if (window.getSelection() && window.getSelection().rangeCount > 0) // this if so google maps can scroll with "Press up arrow key". Say "Click on map" first
	if (el.ownerDocument.defaultView.getSelection() && el.ownerDocument.defaultView.getSelection().rangeCount > 0)	// Version 1.5.2i - For tinyMCE in iFrame "scroll to bottom" > https://www.tiny.cloud/docs/demo/basic-example/
		scrollToCursor(el); // Version 1.5.2i - From document.activeElement to el
		
	if (sra_date) // Version 1.7.6
		el.setAttribute('data-sra', sra_date); // Version 1.7.6
}


function scroll_it(keyword)
{
	// This function looks for elements in the current screen view
	//	and scrolls them in the direction specified. If they are 
	//	already scrolled all the way then we go to the parent elements
		
	var all_the_way = false;
	var option = "scroll";
	//var leeway = 100; // Chrome's leeway changes with the browser height but at full screen it is about 110 pixels // Version 1.5.4d - Put down lower
	var direction = "down"; // Version 1.5.4d - From keyword to "down"
	var keyCode = 0; // Version 1.5.2j - Scroll Google Docs 
	var ctrl = 0; // Version 1.5.2j - Scroll Google Docs 
	if (Array.isArray(keyword)) 
	{
		for (var a = 0; a < keyword.length; a++)
		{
			if (String(keyword[a]).match(/^(up|left|right|write|down|end|and|start|home|top|bottom|arriba|abajo|izquierda|derecha|cima|top|final|oben|unten|links|rechts|Anfang|su|giù|sinistra|destra|inizio|inizio|fine|fondo|baixo|esquerda|direita|topo)/i))
				direction = String(keyword[a]);
			// if (!isNaN(keyword[a])) // if is a number
			if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);
			if (String(keyword[a]).match(/^scroll/i))
				option = "scroll";
			if (String(keyword[a]).match(/^(page|body|document|menu|sidebar|box)/i)) // Version 1.5.4d - From ^page to ^(page|body|document|menu|box)
				option = String(keyword[a]); // Version 1.5.4d - From "page" to String(keyword[a])
			if (String(keyword[a]).match(/^all|top|bottom|cima|final|end|Anfang|tutto|tutta|topo/i))
				all_the_way = true;
		}
		keyword = keyword[0];
	}
	var dom = document; // start under body this time // Version 1.5.3 - From document.body to document
	var el = dom.activeElement; // Version 1.5.3 - From document to dom
	if (el.shadowRoot) { // Version 1.7.11 - Get shadowRoot elems (Bing chat)
		while (el.shadowRoot) {
			el = el.shadowRoot.activeElement;
			dom = el.ownerDocument;
		}
	}
	var traverse = "parents"; // keep looking for element to scroll?
	var elem = el;
	var elems = [];
	if (option.match(/^(menu|sidebar|box)/i)) { // Version 1.5.4d - If they said scroll menu or scroll box then start under body so we don't scroll body
		dom = document.body; // Version 1.5.4d
		var selectors = "nav, [role='navigation'], [role='menu'], [id*='menu'], [id*='navigation'], [id*='sidebar']";
		var all_elems = dom.querySelectorAll(selectors);
		for (var i = 0; i < all_elems.length; i++) 
			elems.push(all_elems[i]);
	}
	
	if (!option.match(/^(page|body|document)/i)) { // Version 1.5.4d - Only put active element first if they didn't say scroll page
		elems.push(el); // Version 1.5.3
		if (option.match(/^(box)/i) && (el == document.documentElement || el == document.body))
			elems.pop(); // Version 1.5.4d - Remove body if they say "Scroll box"
	}
	var all_elems = dom.getElementsByTagName("*");
	for (var i = 0; i < all_elems.length; i++) { // Convert live node list into array
		elems.push(all_elems[i]);
		if (option.match(/^(box)/i)) { // Version 1.5.4d - If they said box then remove any menu or sidebar elements
			if (all_elems[i].nodeName == "NAV" ||
				(all_elems[i].hasAttribute("role") && all_elems[i].getAttribute("role").match(/menu|sidebar|navigation/)) ||
				(all_elems[i].hasAttribute("aria-label") && all_elems[i].getAttribute("aria-label").match(/menu|sidebar|navigation/)) ||
				all_elems[i].id.match(/menu|sidebar|navigation/) ||
				('title' in all_elems[i] && String(all_elems[i].title).match(/menu|sidebar/)) ||
				('className' in all_elems[i] && String(all_elems[i].className).match(/menu|sidebar|navigation/)) ||
				(all_elems[i].firstElementChild && (all_elems[i].firstElementChild.nodeName == "NAV" || (all_elems[i].firstElementChild.hasAttribute("role") && all_elems[i].firstElementChild.getAttribute("role").match(/menu|sidebar/))))
			)
				elems.pop();
		}
	}
	for (var i = 0; i < elems.length; i++) { // Traverse starting with activeElement then html
		elem = elems[i];
		if (elem.nodeName == "IFRAME") { // Version 1.5.2j - To scroll iframes (tinyMCE)
			try {
				//var iframe_dom = elem.contentWindow.document; // Version 1.5.3 - Otherwise we do iframe and don't do children
				//var result = scroll_it(keyword, iframe_dom); // Version 1.5.3 
				//if (result) return true; // Iframe scrolled so we can exit
				elem = elem.contentWindow.document.scrollingElement || elem.contentWindow.document.documentElement || elem.contentWindow.document.body; // Version 1.5.4d - Added || elem.contentWindow.document.documentElement || elem.contentWindow.document.body 
			} catch (error) {
				console.log(error);
			}
		}
		if (elem && elem.hasAttribute('data-sra') && elem.getAttribute('data-sra') == sra_date) // Version 1.5.2j - Evernote was still scrolling twice. I didn't know we had to check for sra_date in the middle of a function
			return true;	
		var event = new MouseEvent("mouseover"); // Version 1.5.4d - Gmail inbox sidebar only turns off overflow='hidden' with mouseover
		elem.dispatchEvent(event); // Version 1.5.4
		if ((isScrollable(elem) && isVisible(elem) && isOnScreen(elem) == true) || elem == dom.body || elem == dom.documentElement || elem == dom.scrollingElement) // Version 1.5.3 - Changed document. to dom.
		{
			var event = new MouseEvent("mouseout"); // Version 1.5.4d - Gmail inbox sidebar only turns off overflow='hidden' with mouseover
			elem.dispatchEvent(event); // Version 1.5.4
			var leeway = (elem.clientHeight > 150) ? 100 : 15; // Version 1.5.4d - So you can scroll small boxes
			if (test_mode) console.log(elem);
			var scrollPos = 0; // Version 1.5.3
			var scrollType = "scrollTop"; // Version 1.5.3
			if (direction.match(/^(up|top|start|arriba|cima|oben|su|inizio)/i))
			{
				keyCode = 33; // Version 1.5.2j - PageUp
				//if (elem.scrollTop > 0)
				{
					scrollType = "scrollTop";
					scrollPos = elem.scrollTop; // record current scrollTop
					if (elem == document.body)
						elem.scrollTop -= window.innerHeight - leeway;
					else
						elem.scrollTop -= elem.clientHeight - leeway;
					if (direction.match(/^(top|start|inizio)/i) || all_the_way == true) {
						elem.scrollTop = 0; 
						ctrl = 1;
						keyCode = 36; // Version 1.5.2j - Home key
					}
					if (elem.scrollTop != scrollPos) // If it equals recorded scrollTop then it did not move
						break;
				}			
			}
			else if (direction.match(/^(down|end|bottom|abajo|final|unten|giù|fine|fondo|baixo)/i))
			{
				keyCode = 34; // Version 1.5.2j - PageDown
				//if (elem.scrollTop < (elem.scrollHeight - elem.clientHeight))
				{
					scrollType = "scrollTop";
					scrollPos = elem.scrollTop; // record current scrollTop
					if (elem == document.body)
						elem.scrollTop += window.innerHeight - leeway;
					else
						elem.scrollTop += elem.clientHeight - leeway;
					if (direction.match(/^(end|bottom|fine|fondo)/i) || all_the_way == true) {
						elem.scrollTop = elem.scrollHeight; 	
						ctrl = 1; // Version 1.5.2j
						keyCode = 35; // Version 1.5.2j - End key
					}
					if (elem.scrollTop != scrollPos) // If it equals recorded scrollTop then it did not move		
						break;
				}
			}
			if (direction.match(/^left|start|izquierda|links|sinistra|esquerda/i))
			{
				//if (elem.scrollLeft > 0)
				{
					scrollType = "scrollLeft";
					scrollPos = elem.scrollLeft; // record current scrollTop
					if (elem == document.body)
						elem.scrollLeft -= window.innerWidth - leeway;
					else
						elem.scrollLeft -= elem.clientWidth - leeway;
					if (direction.match(/^start/i) || all_the_way == true)
						elem.scrollLeft = 0; 
					if (elem.scrollLeft != scrollPos) // If it equals recorded scrollLeft then it did not move
						break;
				}			
			}
			else if (direction.match(/^right|write|end|derecha|rechts|destra|direita/i))
			{
				//if (elem.scrollLeft < (elem.scrollWidth - elem.clientWidth))
				{
					scrollType = "scrollLeft";
					scrollPos = elem.scrollLeft; // record current scrollLeft
					if (elem == document.body)
						elem.scrollLeft += window.innerWidth - leeway;
					else
						elem.scrollLeft += elem.clientWidth - leeway;
					if (direction.match(/^end/i) || all_the_way == true)
						elem.scrollLeft = elem.scrollWidth; 
					if (elem.scrollLeft != scrollPos) // If it equals recorded scrollLeft then it did not move			
						break;
				}
			}
			if (test_mode) console.log(scrollType+" Before:"+scrollPos+". "+scrollType+" After:"+elem[scrollType]); 
			/*if (keyCode) { // Version 1.5.4 - Commented out because was pressing key after every element
				keypress([keyCode, ctrl, 0, 0]);
				keyCode = 0;	
			}
			if (test_mode) console.log(scrollType+" Before:"+scrollPos+". "+scrollType+" After Keypress:"+elem.scrollTop); 
			*/
			if (elem[scrollType] != scrollPos) // If it equals recorded scrollTop then it did not move		
				break;
		}
	}
	if (test_mode) console.log(scrollType+" Final Before:"+scrollPos+". "+scrollType+" Final After:"+elem[scrollType]); 
			
	//if (document.activeElement.className.match(/docs-texteventtarget-iframe/i))  // Google docs // Version 1.5.4 - Commented out to do keypress here for all websites
	if (elem[scrollType] == scrollPos) // Version 1.5.4 - If scrolling didn't work then try a keypress
	{	
		if (keyCode) {
			keypress([keyCode, ctrl, 0, 0]);
			if (test_mode) console.log(scrollType+" Before Keypress:"+scrollPos+". "+scrollType+" After Keypress:"+elem.scrollTop); 
		}
	} 
	if (elem && scrollPos != elem[scrollType] && sra_date) { // Version 1.5.2j // Version 1.5.3 - Added && typeof scrollTop !== undefined"
		elem.setAttribute('data-sra', sra_date); // Version 1.5.2j
		return true; // We scrolled an element
	}
	else 
		return false; // We did not scroll an element
	
		
}
	

function scroll_it_old(keyword, dom)
{
	// This function looks for elements in the current screen view
	//	and scrolls them in the direction specified. If they are 
	//	already scrolled all the way then we go to the parent elements
		
	var all_the_way = false;
	var option = "scroll";
	var leeway = 100; // Chrome's leeway changes with the browser height but at full screen it is about 110 pixels
	var direction = keyword;
	var keyCode = 0; // Version 1.5.2j - Scroll Google Docs 
	var ctrl = 0; // Version 1.5.2j - Scroll Google Docs 
	if (Array.isArray(keyword)) 
	{
		for (var a = 0; a < keyword.length; a++)
		{
			if (String(keyword[a]).match(/^(up|left|right|write|down|end|and|start|home|top|bottom|arriba|abajo|izquierda|derecha|cima|top|final|oben|unten|links|rechts|Anfang|su|giù|sinistra|destra|inizio|inizio|fine|fondo|baixo|esquerda|direita|topo)/i))
				direction = String(keyword[a]);
			// if (!isNaN(keyword[a])) // if is a number
			if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);
			if (String(keyword[a]).match(/^scroll/i))
				option = "scroll";
			if (String(keyword[a]).match(/^page/i))
				option = "page";
			if (String(keyword[a]).match(/^all|top|bottom|cima|final|end|Anfang|tutto|tutta|topo/i))
				all_the_way = true;
		}
		keyword = keyword[0];
	}
	var dom = dom || document; // start under body this time // Version 1.5.3 - From document.body to dom || document.body
	var el = dom.activeElement; // Version 1.5.3 - From document to dom
	var all_elems = dom.body.getElementsByTagName("*");
	var traverse = "parents"; // keep looking for element to scroll?
	var elem = el; // Version 1.5.3 - Added var in front. Was it missing all this time??
	// If the current active element isScrollable then just scroll it
	// 	If not then try a parent. If parents are still not then try the children.
	// 	If the option is "scroll" then do the opposite. Skip the body and do the children.
	
	if (option.match(/^scroll/i))
	{
		if (el == dom.body || el == dom.documentElement) // Version 1.5.3 - Added || el == document.documentElement // Version 1.5.3 - document to dom
		{
			traverse = 0;
			elem = all_elems[traverse];	
		}
	}
	if (test_mode) console.log(elem); 
	//debugger;
	while (elem)
	{
		if (elem.nodeName == "IFRAME") { // Version 1.5.2j - To scroll iframes (tinyMCE)
			try {
				//var iframe_dom = elem.contentWindow.document; // Version 1.5.3 - Otherwise we do iframe and don't do children
				//var result = scroll_it(keyword, iframe_dom); // Version 1.5.3 
				//if (result) return true; // Iframe scrolled so we can exit
				elem = elem.contentWindow.document.scrollingElement; // Version 1.5.3 - Commented out
			} catch (error) {
				console.log(error);
			}
		}
		if (elem && elem.hasAttribute('data-sra') && elem.getAttribute('data-sra') == sra_date) // Version 1.5.2j - Evernote was still scrolling twice. I didn't know we had to check for sra_date in the middle of a function
			return true;
		
		if (isScrollable(elem) && (isVisible(elem) && isOnScreen(elem) == true || elem == dom.body || elem == dom.documentElement)) // Version 1.5.3 - Changed document. to dom.
		{
			if (test_mode) console.log(elem);
			if (direction.match(/^(up|top|start|arriba|cima|oben|su|inizio)/i))
			{
				keyCode = 33; // Version 1.5.2j - PageUp
				//if (elem.scrollTop > 0)
				{
					var scrollTop = elem.scrollTop; // record current scrollTop
					if (elem == document.body)
						elem.scrollTop -= window.innerHeight - leeway;
					else
						elem.scrollTop -= elem.clientHeight - leeway;
					if (direction.match(/^(top|start|inizio)/i) || all_the_way == true) {
						elem.scrollTop = 0; 
						ctrl = 1;
						keyCode = 36; // Version 1.5.2j - Home key
					}
					if (elem.scrollTop != scrollTop) // If it equals recorded scrollTop then it did not move
						break;
				}			
			}
			else if (direction.match(/^(down|end|bottom|abajo|final|unten|giù|fine|fondo|baixo)/i))
			{
				keyCode = 34; // Version 1.5.2j - PageDown
				//if (elem.scrollTop < (elem.scrollHeight - elem.clientHeight))
				{
					var scrollTop = elem.scrollTop; // record current scrollTop
					if (elem == document.body)
						elem.scrollTop += window.innerHeight - leeway;
					else
						elem.scrollTop += elem.clientHeight - leeway;
					if (direction.match(/^(end|bottom|fine|fondo)/i) || all_the_way == true) {
						elem.scrollTop = elem.scrollHeight; 	
						ctrl = 1; // Version 1.5.2j
						keyCode = 35; // Version 1.5.2j - End key
					}
					if (elem.scrollTop != scrollTop) // If it equals recorded scrollTop then it did not move		
						break;
				}
			}
			if (direction.match(/^left|start|izquierda|links|sinistra|esquerda/i))
			{
				//if (elem.scrollLeft > 0)
				{
					var scrollLeft = elem.scrollLeft; // record current scrollTop
					if (elem == document.body)
						elem.scrollLeft -= window.innerWidth - leeway;
					else
						elem.scrollLeft -= elem.clientWidth - leeway;
					if (direction.match(/^start/i) || all_the_way == true)
						elem.scrollLeft = 0; 
					if (elem.scrollLeft != scrollLeft) // If it equals recorded scrollLeft then it did not move
						break;
				}			
			}
			else if (direction.match(/^right|write|end|derecha|rechts|destra|direita/i))
			{
				//if (elem.scrollLeft < (elem.scrollWidth - elem.clientWidth))
				{
					var scrollLeft = elem.scrollLeft; // record current scrollTop
					if (elem == document.body)
						elem.scrollLeft += window.innerWidth - leeway;
					else
						elem.scrollLeft += elem.clientWidth - leeway;
					if (direction.match(/^end/i) || all_the_way == true)
						elem.scrollLeft = elem.scrollWidth; 
					if (elem.scrollLeft != scrollLeft) // If it equals recorded scrollLeft then it did not move			
						break;
				}
			}
		}
		if (traverse == "parents")
		{
			// We didn't break so try a parent
			if (elem.parentElement) 
				elem = elem.parentElement;
			else
			{
				// Went through parents without finding element to scroll. So let's try children of document
				traverse = 0;
				elem = el.children[traverse];		
			}
		} 
		else 
		{
			traverse++;
			if (traverse < all_elems.length)
				elem = all_elems[traverse]; 
			else if (option.match(/^scroll/i) && elem != dom.body && elem != dom.documentElement) // try to scroll the body last // Version 1.5.3 - Changed document to dom
				elem = dom.scrollingElement; // Version 0.99.7 - Was document.body but did not scroll in stackoverflow. Also added document.documentElement to line above and 2131 // Version 1.5.3 - Changed document to dom
			else
				break;
		}
	}
	// Need to blur a textarea if it was active but now the body is scrolling
	if (elem == document.body && document.body != document.activeElement)
		document.activeElement.blur();
		
	if (test_mode && elem) { console.log(elem); 
	console.log("Top Before:"+scrollTop+" Top After:"+elem.scrollTop); }
	if (!elem || scrollTop == elem.scrollTop // Version 1.5.2j - Scroll Google Docs 
	|| document.activeElement.className.match(/docs-texteventtarget-iframe/i)) { // Version 1.5.2j - Google Docs new invisible contenteditable does scrolling 23 px so we have to detect Google Docs iframe
		if (direction.match(/^(up|top|start|arriba|cima|oben|su|inizio)/i)) {
			keyCode = 33; // PageUp key
			if (direction.match(/^(top|start|inizio)/i) || all_the_way == true) {
				ctrl = 1;
				keyCode = 36; // Home key
			}
		}
		if (direction.match(/^(down|end|bottom|abajo|final|unten|giù|fine|fondo|baixo)/i)) {
			keyCode = 34; // PageDown key
			if (direction.match(/^(end|bottom|fine|fondo)/i) || all_the_way == true) {
				ctrl = 1;
				keyCode = 35; // End key
			}
		}
		if (keyCode)
			keypress([keyCode, ctrl, 0, 0]);
	}	
	if (test_mode && elem) { console.log(elem); console.log("Top Before:"+scrollTop+" Top After keypress:"+elem.scrollTop); }
	if (elem && typeof scrollTop !== "undefined" && scrollTop != elem.scrollTop && sra_date) { // Version 1.5.2j // Version 1.5.3 - Added && typeof scrollTop !== "undefined"
		elem.setAttribute('data-sra', sra_date); // Version 1.5.2j
		return true; // We scrolled an element
	}
	else 
		return false; // We did not scroll an element
}


function isScrollable(el)
{
	/* This function will determine if an element is scrollable vertically or horizontally */
	var scrollable = false;
	/* clientWidth and clientHeight is the visible width and height of an elements contents.
		The value does not include the scrollBar, border, and the margin.
		scrollWidth and scrollHeight is the total width of the elements contents including
		the visible part and the non-visible part. The value does not include the scrollBar, 
		border, and the margin.
	*/
	if (el == document.body && (el.scrollHeight > window.innerHeight || el.scrollWidth > window.innerWidth))
		scrollable = true;
	if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
		scrollable = true;
	/* the above did NOT work. For some reason on one of my TDs it had scrollHeight of 936
		and clientHeight of 934. But there were no scrollbars! So the only method that
		works is to try to set the scrollTop and ScrollLeft and see if it takes
	*/
	if (el.scrollTop == 0 && el.scrollLeft == 0)
	{
		// Record values
		var scrollTop = el.scrollTop;
		var scrollLeft = el.scrollLeft;
		// try to change value
		el.scrollTop = 1;
		el.scrollLeft = 1;
		if (el.scrollTop == 1 || el.scrollLeft == 1)
			scrollable = true;
		// Put scrolling back
		el.scrollTop = scrollTop;
		el.scrollLeft = scrollLeft;
	}
	else
		scrollable = true;
	/* overflow specified in CSS can't be determined with style.overflow. So we must use
		getComputedStyle. If either overflow-x or overflow-y is hidden but not the other
		then overflow will not be hidden. But if both overflow-x and overflow-y are hidden
		then overflow will be hidden. So we only need to check "overflow".
	*/
	if (document.defaultView.getComputedStyle(el,null).getPropertyValue("overflow") == "hidden")
		scrollable = false;
	
	return (scrollable);
}


function copyNodeStyle(sourceNode, targetNode) { // Version 1.7.6 - Added because cssText was empty for textarea in iFrame
	var computedStyle = window.getComputedStyle(sourceNode);
	Array.from(computedStyle).forEach(function (key) {
		return targetNode.style.setProperty(key, computedStyle.getPropertyValue(key), computedStyle.getPropertyPriority(key));
	});
}

function scrollToCursor(el)
{
	var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
	var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
	/* The following lines make the contenteditable div or textarea scroll to where the text was inserted
		Otherwise the text will start flowing below the visible part of the div */
	if (isTextInput(el)) // textarea or input
	{
		//el.blur(); el.focus(); // This scrolls to the cursor
		/* Blurring and focus is the only thing that scrolls to the cursor in textarea or input
			however the blur part will cause some textareas to submit such as realvolve notes.
			So we need to copy the textarea into a pre to find the cursor position
		*/
		if (document.getElementById("sra-pre-mirror")) // Version 1.5.3 - From pre_mirror to sra_pre_mirror
			var pre = document.getElementById("sra-pre-mirror");
		else
			var pre = document.createElement("pre"); // Version 0.98.7 - 5/18/2017 - Bug: Had "pre-mirror" here
		
		pre.id = "sra-pre-mirror";
		
		var the_text = el.value; // All the text in the textarea
		var position = el.selectionEnd; // Cursor position in characters		
		
		var completeStyle = window.getComputedStyle(el, null).cssText; // Copy the complete style
		if (completeStyle != "")
			pre.style.cssText = completeStyle; // Everything copies fine in Chrome	
		else
			copyNodeStyle(el, pre); // Version 1.7.6 - Added because cssText was empty for textarea in iFrame

		
		pre.style.position = "absolute";
		pre.style.visibility = "hidden";
		pre.style.left = Math.round(el.getBoundingClientRect().left + scrollLeft) + "px"; // Version 0.99.2
		pre.style.top = Math.round(el.getBoundingClientRect().top + scrollTop) + "px"; // Version 0.99.2
		if (el.nodeName == "INPUT") { // Version 1.7.6
			pre.style.whiteSpace = "nowrap";
			pre.style.overflow = "scroll";
		}
			
		// replace <>" with entities
		the_text = the_text.replace(/>/g,'&gt;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); 			
		pre.textContent = the_text.substring(0, position); // Insert text up to cursor position
		
		//el.parentNode.insertBefore(pre, el.nextSibling); // insert pre after textarea
		el.ownerDocument.body.appendChild(pre); // Version 1.6.7 - From el.document to el.ownerDocument
		
		// Insert blank span to get position as cursor
		var cursor_span = document.createElement('span');
		cursor_span.textContent = "|";
		pre.appendChild(cursor_span);
		
		// Now insert the rest of the text in a span element at the end in case of word wrapping
		var span_mirror = document.createElement('span');
		span_mirror.textContent = the_text.substring(position) || '.';
		pre.appendChild(span_mirror);
		
		//Set scrollTop to the same place
		pre.scrollTop = el.scrollTop;
		// Set scrollLeft to same place
		pre.scrollLeft = el.scrollLeft;
		
		var cursorRect = cursor_span.getBoundingClientRect(); // Get cursor position from cursor_span
		
		if (test_mode) console.log (cursor_span, "cursorRect:",cursorRect);
	}
	else // if contentEditable div
	{	
		// Version 1.4.4c - Use this in future: document.activeElement.contentWindow.document.activeElement.ownerDocument.defaultView.window.getSelection()
		var win = el.ownerDocument.defaultView.window; // Version 1.4.4c
		if (win.getSelection() && win.getSelection().rangeCount > 0)
			var cursorRect = win.getSelection().getRangeAt(0).getBoundingClientRect();
		else
			var cursorRect = el.getBoundingClientRect();
		//if (test_mode) console.log ("cursorRect:",cursorRect);
		//if (test_mode) console.log (win.getSelection().rangeCount);
		// Version 1.5.3 - Let's try using a cursorSpan for contentEditable elements as well
		// Version 1.7.6 - Commented out below. Was causing extra text node to be created between words with display_speech(). It wasn't being used anyway. if (cursor_span) has been commented out since 1.5.3
		/*if (win.getSelection() && win.getSelection().rangeCount > 0) {
			var sel = win.getSelection();
			var range = sel.getRangeAt(0).cloneRange(); // Version 1.5.4 - Added .cloneRange()
			var cursor_span = document.createElement("span");
			//cursor_span.innerHTML = '|';
			range.insertNode(cursor_span);
			//if (test_mode) console.log("cursor_spanRect:",getOffset(cursor_span)); // Version 1.5.4
			//if (cursor_span) cursor_span.parentNode.removeChild(cursor_span);
			sel.collapseToEnd(); // Version 1.5.4 - Added to try and stop text from being highlighted
			//sel.removeAllRanges(); sel.addRange(range); // Restore previous selection (range) // Version 1.5.4 - Commented out to stop the text from being highlighted!
		} // Removed because caused contentEditable at https://app.smart-radiology.com/ to always select text after inputting speech
		*/
	}	
	
	// Version 1.5.3 - Let's try scrollIntoViewIfNeeded
	//el.scrollIntoViewIfNeeded(true);
	//if (cursor_span) cursor_span.scrollIntoViewIfNeeded(false); // Version 1.5.3 - This works with TinyMCE in iframe if I don't try to scroll to el as well, but doesn't work in textarea!!
		
	//for (var elem = el; elem; elem = elem.parentElement) // Version 0.99.2 - Commented out parents
	var elem = el; // Version 0.99.2 - Just scrolling to cursor in activeElement because of problem with stackoverflow textarea // Version 1.5.2j - Added var
	elems = [el, el.ownerDocument.scrollingElement]; // Version 1.5.3 - To scroll in tinyMCE and CKEditor
	for (var e = 0; e < elems.length; e++) // Version 1.5.3
	{
		// Version 1.7.6 - Moved getting cursorRect into loop because if one element moves then the cursorRect will change
		if (isTextInput(el))
			var cursorRect = cursor_span.getBoundingClientRect(); // Get cursor position from cursor_span
		else if (win.getSelection() && win.getSelection().rangeCount > 0) {
			var cursor_span = win.getSelection().getRangeAt(0);
			var cursorRect = cursor_span.getBoundingClientRect();
			if (cursorRect.x == 0 && cursorRect.y == 0) // Version 1.7.6 - Happens with "Press Enter key" (insertParagraph) and not adding \n
				var cursorRect = cursor_span.startContainer.getBoundingClientRect(); // So get rect of startContainer instead
		} else {
			var cursor_span = el;
			var cursorRect = el.getBoundingClientRect();
		}
		
		var elem = elems[e]; // Version 1.5.3
		var elRect = elem.getBoundingClientRect();
		if (elem == el) // Version 1.5.3 - activeElement or scrollingElement (body or html of window or iframe)
			var bottom = elRect.bottom; 
		else 
			var bottom = elem.clientHeight; // If scrolling element then we need clientHeight (same as window.innerHeight)
		if (test_mode) console.log ("cursor_span:",cursor_span, "cursorRect:",cursorRect);
		if (test_mode) console.log (elem);
		if (test_mode) console.log ("elRect:",elRect); // Version 0.98.7 - Forgot to add if (test_mode)
		if (test_mode) console.log ("el scrollTop:",elem.scrollTop);
		//if (test_mode) console.log ("scrollHeight: "+elem.scrollHeight+", clientHeight: "+elem.clientHeight+", offsetHeight: "+elem.offsetHeight);
		// elRect.height = element height including scrollbar; el.clientheight = element height without scrollbar
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
	// Version 1.5.2i - The above does not work with TinyMCE and CKEditor because they use a negative top to scroll instead of scrollTop
	// Therefore detect if cursor is offscreen // Version 1.5.3 - Changed above to check cursor offscreen in document scrollingElement and not just contenteditable element
	
	
	//Version 1.5.3 - Removed below because was causing Disqus for Lucian and Italian websites for other users to constantly scroll to the bottom right
	/*var screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight; // Version 1.2.0
	var screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth; // Version 1.2.0
	if (test_mode) console.log("screenWidth: "+screenWidth+", screenHeight: "+screenHeight);
	if (cursorRect.bottom < 0 || cursorRect.right < 0 || 
	cursorRect.top > screenHeight || cursorRect.left > screenWidth) { 
		var win = el.ownerDocument.defaultView.window; 
		if (win.getSelection() && win.getSelection().rangeCount > 0)
			win.scrollTo(cursorRect.x, cursorRect.y);	
	
	}*/
	
	/* Version 1.7.9 - Removed line to remove cursorSpan because: Cannot read properties of undefined (reading 'removeChild') at scrollToCursor (content.js:4896:42) in Microsoft Teams chat
		I can't remove cursor_span because above it is setting cursor_span as an element on the page sometimes!
		I can only delete it if I check that it is a pre that I created with textContent == "|"
	*/
	//if (!test_mode) // Version 1.7.6 - Keep cursor_span for testing but remove it for cleanup if not testing
	//if (cursor_span) cursor_span.parentNode.removeChild(cursor_span); // Version 1.5.2j - I should clean up created elements 
	
}

function getOffset( el ) { 
// https://stackoverflow.com/questions/442404/retrieve-the-position-x-y-of-an-html-element
// Get element position
// Seems to be the same as getBoundingClientRect() so not needed
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}


function redo(keyword)
{
	var times = 1;
	var el = document.activeElement;
	
	if (Array.isArray(keyword))
	{
		if (keyword.length <= 0) option = "redo";
		else keyword = keyword[0]; // version 0.99.7
		for (var a = 0; a < keyword.length; a++)
		{	
			// if (!isNaN(keyword[a])) // if is a number
			if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);		
		}	
	}
	
	for (i = 0; i < times; i++) {
			if (el.className.match(/docs-texteventtarget-iframe/i)) // Version 1.5.2 - Google Docs
				keypress(["z", 1, 0, 1]); // z+ctrl+shift
			else if (el.id.match(/WACViewPanel_EditingElement/i)) // Version 1.5.2 - onedrive.live.com - Word online
				keypress(["y", 1]); // y+ctrl
			else
				send_command("redo");
	}
}


function undo(keyword)
{
	var option = "undo";
	var direction = "backward";
	var times = 1;
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
	if (el.shadowRoot) { // Version 1.7.11 - Get shadowRoot elems (Bing chat)
		while (el.shadowRoot) {
			el = el.shadowRoot.activeElement;
			dom = el.ownerDocument;
		}
	}
	
	if (test_mode) console.log("activeElement: ",el); // Verison 1.5.2k
	
	if (test_mode) console.log("keyword: "+keyword); // Version 1.0.1 - Added if (test_mode)
	//if (test_mode) console.log(typeof keyword);
	if (Array.isArray(keyword))
	{
		if (keyword.length <= 0) option = "undo";
		//else keyword = keyword[0]; // Version 0.99.7 // Version 1.2.9 - Removed because it was making "delete last word" into "delete last"
		for (var a = 0; a < keyword.length; a++)
		{
			if (String(keyword[a]).match(/^last|previous/i)) // Version 1.5.2k - Removed |next . Why was it there?
				direction = "backward";
			else if (String(keyword[a]).match(/^next/i))
				direction = "forward";	
			// else if (!isNaN(keyword[a])) // if is a number
			else if (String(keyword[a]).match(/\d+/)) // Version 1.7.8 - enter_key() was pressing enter 0 times.
				times = parseInt(keyword[a]);
			else if (String(keyword[a]).match(/^(word|sentence|character|paragraph)$/i))
				option = String(keyword[a]);
			else if (String(keyword[a]).match(/^(letter|character)$/i)) // Version 1.5.2k - Added |character
				option = "character";
				
		}	
	}
	
	var selection = el.ownerDocument.defaultView.getSelection(); // Version 1.5.2f - Changed from window.getSelection() to el.ownerDocument.defaultView.getSelection()

	var keyCode = 39; // Version 1.5.2f right arrow
	var shift = 1; // Version 1.5.2f - Need shift for selecting in Google Docs
	var ctrl = 0; // Version 1.5.2f - Without ctrl key then it just moves one character
	
	// Version 1.5.2f - Added keyCodes below:
	if (direction == "forward") { 
		keyCode = 39; // Right arrow
		if (option == "word" || option.match(/paragraph/i)) ctrl = 1;	
		if (option == "line" || option.match(/paragraph/i)) keyCode = 40; // Down arrow
		if (option == "lineboundary") keyCode = 35; // End key
		if (option == "documentboundary") { keyCode = 35; ctrl = 1; } // End key
	}
	else if (direction == "backward") { 
		keyCode = 37; // Left arrow
		if (option == "word" || option.match(/paragraph/i)) ctrl = 1;	
		if (option == "line" || option.match(/paragraph/i)) keyCode = 38; // Up Arrow	
		if (option == "lineboundary") keyCode = 36; // Home key
		if (option == "documentboundary") { keyCode = 36; ctrl = 1; } // Home key	
	}	
	
	for (i = 0; i < times; i++)
	{
		if (option.match(/^undo/i) && keyword.length <= 1) { // Version 1.5.2f - Added && keyword.length == 1 // Version 1.5.7 - From == 1 to <= 1 because Spanish undo was just doing a backspace
			/*if (document.activeElement.className.match(/docs-texteventtarget-iframe/i)) // Version 1.5.2 - Google Docs
				keypress(["z", 1]);
			else if (document.activeElement.id.match(/WACViewPanel_EditingElement/i)) // Version 1.5.2 - onedrive.live.com - Word online
				keypress(["z", 1]);
			else {*/
			/* Version 1.5.2f - Word online accepts CTRL-Z and execCommand("undo") so to see if
				execCommand works first we will check the before
				and after of el.innerText.length. If  innerText is the same then
				we will send the keypresses. We will NOT check the sent variable because it is misleading.
			*/
				/* Verison 1.5.2k - Gmail spelling check and grammar check puts spans in the contentEditable
					element that causes undo not to work properly, so we need to remove these spans with below:
				*/
				var remove_array = el.querySelectorAll('[aria-invalid]'); // Version 1.5.2k - See above
				for (var r = 0; r < remove_array.length; r++) 
					remove_array[r].outerHTML = remove_array[r].innerHTML; // Version 1.5.2k - Replace the span with the innerHTML (which is the text)
				var before_length = (el.value) ? el.value.length : el.innerText.length; // Version 1.5.2i
				if (test_mode) console.log("before_length: "+before_length); // Version 1.5.2h
				var sent = send_command("undo"); // Version 1.5.2f - Added var sent =
				var after_length = (el.value) ? el.value.length : el.innerText.length; // Version 1.5.2i
				if (before_length != after_length) { // Version 1.5.2f 
					if (el.innerText == "\u200C") // Version 1.5.2 - Remove textInput event from facebook, messenger, twitter, hubspot
						send_command("delete");
					if (!selection.isCollapsed) // Version 1.5.2f - Added to remove any text selection
						selection.collapseToEnd();
				}
				if (test_mode) console.log("after_length:"+after_length); // Version 1.5.2h
			//}
			
			if (before_length == after_length) { // Version 1.5.2f 
				keypress(["z", 1]); // Version 1.5.2f - Moved from if statements above for Google Docs and Word online to here
				//keypress(39); // Version 1.5.2f - Right arrow to remove any text selection // Removed. Messes up deleting a period or question mark in Google docs
			}	
		}
		else 
		{
			var before_length = (el.value) ? el.value.length : el.innerText.length; // Version 1.5.2i
			if (test_mode) console.log("before_length: "+before_length); // Version 1.5.2h
			selection.modify("extend", direction, option);
			send_command("delete"); // Version 1.5.2f - From document to dom // Verison 1.5.2h - From dom.execCommand("delete") to send_command("delete") because Evernote was doing "Delete last word" twice
			var last_letter = lastLetter(el);
			if (test_mode) console.log("last_letter: "+last_letter.charCodeAt(0));
			if (!option.match(/^character/i) && last_letter && last_letter.match(/( |\u00A0)$/)) // Version 1.5.2h - Added - && last_letter && last_letter.match(/ |\u00A0/) because dog. deletes g. \u00A0 = &nbsp; // Version 1.7.6 - From / |\u00A0/ to /( |\u00A0)$/ because lastLetter() may return 2 characters now
				send_command("delete"); // Delete one more time to remove &nbsp; // Version 1.5.2f - From document to dom // Verison 1.5.2h - From dom.execCommand("delete") to send_command("delete") because Evernote was doing "Delete last word" twice
			
			var after_length = (el.value) ? el.value.length : el.innerText.length; // Version 1.5.2i
			if (test_mode) console.log("after_length:"+after_length); // Version 1.5.2h	
			if (before_length == after_length) { 
				keypress([keyCode, ctrl, 0, shift]); // Version 1.5.2f - Google Docs
				keypress(8); // Version 1.5.2f - Google Docs backspace
			}
		}
	}
	if (sent && sra_date) // Version 1.5.2i
		el.setAttribute('data-sra', sra_date); // Version 1.5.2i
}


function display_speech(obj) // Version 1.3.9 - Changed to (obj) from (el, text) 
{
	var el = document.activeElement; // Version 1.3.9
	var insertType = (obj.hasOwnProperty("insertType")) ? obj.insertType : "insertText"; // Version 1.4.4b - For insertHTML() custom command
	var text = (obj.hasOwnProperty("speech")) ? obj.speech : ""; // Version 1.3.9
	var sra_date = (obj.hasOwnProperty("date")) ? obj.date : 0; // Version 1.3.9
	if (test_mode) console.log(el);
	var sent = false; // Version 1.3.5 - Moved declaration of sent here
	var iframe = false; // Version 1.3.8 - Needed for bitrix24.com CRM comment box
	// If element is IFRAME get the activeElement on the iframe
	if (el.nodeName == "IFRAME")
		try {
			while (el.nodeName == "IFRAME") {
				iframe = el.contentWindow.document; // Version 1.3.8
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	if (el.shadowRoot) { // Version 1.7.11 - Get shadowRoot elems (Bing chat)
		while (el.shadowRoot) {
			el = el.shadowRoot.activeElement;
			iframe = el.ownerDocument;
		}
	}
	if (document.activeElement.className.match(/docs-texteventtarget-iframe/i)) // Version 1.0.9 - Changed from == to .match because Google added another class to the element
	//if (el.hasAttribute("aria-label") && el.getAttribute("aria-label") == "Document content")
	{ // Google Docs iFrame - Version 0.99.2
		copyStringToClipboard(text); // Version 0.99.2
		//stringToKeypress(text);
		//document.activeElement.contentWindow.document.execCommand("paste", false, null);

		//processGoogleDoc(text);
		return;
	}
	var ckeditor5 = (el.className.match(/ck-editor/)) ? true : false; // Version 1.5.2i
	if (document.activeElement.id.match(/WACViewPanel_EditingElement/i) || // Version 1.5.2 - Word online
		ckeditor5) // Version 1.5.2i 
	{ 
		var cr_timer_ms = 500; // Version 1.6.13 - Word online needs half a second or it jumps the cursor back to the beginning of the line after the sentence is printed
		if (ckeditor5)
			cr_timer_ms = 200;
		if (text.match(/\n/)) {
			var lines = text.split("\n");
			for (let line = 0; line < lines.length; line++) { // Version 1.6.13 - From var to let to use in SetTimeout loop
				setTimeout(function () { // Version 1.6.13
					obj.speech = lines[line];
					if (test_mode) console.log(obj.speech);
					if (lines[line] != "") display_speech(obj);
					if (line < lines.length - 1) 
						setTimeout(function () { 
							//if (document.activeElement.id.match(/WACViewPanel_EditingElement/i))
							//	document.execCommand("insertLineBreak"); 
							//else if (el.className.match(/ck-editor/)) // ckeditor5
								keypress(13);
						}, 100);
				}, line * cr_timer_ms);
			}
			return;
		}
		/*if (text.match(/^(\n)$/)) { keypress(13); return; }
		if (text.match(/^(\n\n)$/)) { keypress(13); keypress(13); return; }
		if (text.match(/\n/)) insertType = "insertHTML"; // New lines in a sentence will be a space*/
	}
	var watir = (el.firstChild && el.firstChild.nodeType == 1 && el.firstChild.hasAttribute("data-contents")) ? true : false; // Version 1.5.2 - facebook.com|messenger.com|twitter.com|hubspot.com use Watir (ruby) contentEditable divs
	if (watir && text.match(/\n/)) // Version 1.5.2 - If using watir (twitter|hubspot|messenger)
		insertType = "insertHTML"; // Version 1.5.2 - If we use insertText with \n then it deletes text already there
	/* if (window.location.href.match(/facebook.com|messenger.com|twitter.com|hubspot.com/i)) { // Version 1.5.2 - Hubspot
		if (text.match(/^(\n)$/)) { keypress(13); document.execCommand("insertText", false, "\n\u200c"); return; }
		if (text.match(/^(\n\n)$/)) { keypress(13); keypress(13); document.execCommand("insertText", false, "\n\u200c"); return; }
	}*/
	//var tinymce = (el.className.match(/cp_embed_iframe|mce/) || el.id.match(/result-iframe|mce/)) ? true : false; // Version 1.3.5 - Some tinyMCE Editors were putting speech text twice in a row // Version 1.3.8 - Moved to put below iframe block above
	var tinymce = false; // Version 1.5.2j - Keep or not?
	//var ckeditor = (el.className.match(/cke_editable|ck-editor/)) ? true : false; // Version 1.4.4c
	var ckeditor = false; // Version 1.5.2j - Keep or not? - CKEditor 5 demo will not do new line or document.execCommand("insertHTML", false, "<br>"); consistently!
	
	// Can element accept input?
	// tinyMCE tries to select other fields // Version 0.99.6
	if (!document.activeElement.id.match(/WacFrame_Word_0/i)) // Version 1.5.2 - Word online will start typing in Search box instead of editor
	if (!tinymce && !sra.settings.disable_autofocus) // Version 1.3.5 - Changed to tinymce
	if (!sra.settings.tts_speaking) // Version 1.2.0
	if ( (!el.isContentEditable && !isTextInput(el)) || !isVisible(el) ) {
		if (window.location.href.match(/chrome-extension:.*?iframe.html/i)) // Version 1.7.7 - If iframe.html don't use findElement so it doesn't focus on it.
			var el = document.getElementById("speech_div");
		else
			var el = findElement(el, document); // If not then find one that can // Version 1.3.9b - Changed from el = findElement(el, document) to var el_obj = findElement(iframe)
		//el = el_obj["el"]; // Version 1.3.9b
		//iframe = el_obj["dom"].document; // Version 1.3.9b
	}
	if (!tinymce && !ckeditor) // Version 1.5.2i - Changed from (!el.className.match(/cke_editable/) && !el.className.match(/^mce/)) to 
		text = capitalize(el, text); // Possibly put a capital for the first letter of the text string
	if (sra.settings.always_lowercase) // Version 1.5.2
		text = text.toLowerCase();
	
	/* The common factor with facebook, messenger, twitter and hubspot contentEditable messing up is
		when they are blank. el.textContent == "" && el.innerText == "\n" so maybe I can solve this
		problem with future websites by always doing a textInput if contentEditable matches above.
	*/
	// Version 1.0.4 - facebook chat box messes up if we use InsertHTML without doing a textInput of the first letter
	//if (window.location.href.match(/facebook.com|messenger.com|twitter.com|hubspot.com/i) && el.textContent == "") { // Version 1.3.9 - Added Twitter and it stopped the Something went wrong error // Version 1.5.2 - Added hubspot.com because contentEditable gets error: Sorry, there was a problem loading the editor.
	if (watir && el.innerText.match(/\n$/)) { // Version 1.5.2 - Fix facebook, messenger, twitter and hubspot contentEditable
		//var firstChar = text.charAt(0); // Version 1.4.6 - Removed because facebook chat and messenger.com are displaying "This Page Isn't Available Right Now This may be because of a technical error that we're working to get fixed. Try reloading this page."
		var firstChar = "\u200C"; // Version 1.4.6 - Zero-width non-joiner - To fix facebook chat
		var textEvent = document.createEvent('TextEvent');
    	textEvent.initTextEvent('textInput', true, true, null, firstChar);
		el.dispatchEvent(textEvent);
		//send_command("delete"); // Version 1.5.2 - Because hubspot moved focus away from the box and placed cursor back at beginning resulting in: Hi momHow are you
		// text = text.substring(1); // cut off firstChar from text // Version 1.4.6 - To fix facebook chat
		if (window.location.href.match(/twitter.com/i)) 
			moveCursor("end"); // Version 1.5.2 - Because twitter moved focus away from the box and placed cursor back at beginning resulting in: Hi momHow are you
	}
	
	if (el.isContentEditable)
	{
		text = linebreak(text); // Add P tag to 'New Paragrah' and br tag to 'New Line'
		if (test_mode) console.log(text);
		//insertTextAtCursor(text); // This one didn't work with html nor did it move the caret to the end.
		//pasteHtmlAtCaret(text); // Works with html and text, but does not allow undo after
		if (!tinymce && !iframe) { // Version 1.3.5 - Some tinyMCE Editors were inserting speech text twice 
			//setTimeout(function() { // Version 1.4.6 - Added setTimeout to prevent facebook chat error // Version 1.5.0 - Removed because evernote & messenger was duplicating again. After removal facebook chat and reply to comment was still working!
			if (!sra.settings.use_keypresses) { // Version 1.7.7
				sent = document.execCommand(insertType, false, text); // Kind of works with html and allows undo after. Just problems with new paragraphs and new lines // Version 1.4.4b - Changed from insertHTML to insertText
				if (test_mode) console.log("contentEditable Sent: "+sent);
			} else { // Version 1.7.7
				keypress([text]);
				sent = true;
			}
			//}, 0); // Version 1.4.6 - Added setTimeout to prevent facebook chat error
		}
		if (!sent && !tinymce && !ckeditor && iframe) // Version 1.4.4c - Added && !ckeditor
		{ // Version 1.3.8 
			if (!sra.settings.use_keypresses) { // Version 1.7.7
				try {
					// text = capitalize(el, text); // Version 1.4.4b for CKEditor. Will this mess others up??
					sent = iframe.execCommand(insertType, false, text);
					if (test_mode) console.log("Iframe contentEditable Sent: "+sent); // Version 1.3.9 - Moved into here
				}
				catch (err) { 
					if (test_mode) console.log(err);
				}
			} else { // Version 1.7.7
				keypress([text]);
				sent = true;
			}
		}
		// Version 1.0.1 - The following keypress event stops Word Online from messing up! But what about other elements?
		var keyCode = 00;
		eventObj = document.createEvent("Events");
	 	eventObj.initEvent("keypress", true, true);
	 	eventObj.keyCode = keyCode;
	    eventObj.which = keyCode;
	    eventObj.charCode = keyCode;
	    el.dispatchEvent(eventObj);
		obj.test_mode = test_mode; // Version 1.4.4c
		obj.settings = sra.settings; // Version 1.5.2
		if (!sent) {	
			// Version 0.99.6 - Added support for tinyMCE and CKEditor
			var actualCode = '(' + function(obj) { // Version 1.4.4b - Changed from text to obj
			    var sent = false; // Version 1.4.4c
				var insertType = (obj.hasOwnProperty("insertType")) ? obj.insertType : "insertText"; // Version 1.4.4b - For insertHTML() custom command
				var test_mode = obj.test_mode;
				var text = (obj.hasOwnProperty("speech")) ? obj.speech : ""; // Version 1.4.4b - In this inject
				/*if (typeof tinyMCE == "undefined" && typeof CKEDITOR == "undefined") { // Version 1.3.5 - Added if because some TinyMCE were inserting text twice // Version 1.4.4c - Changed != to ==
					sent = document.execCommand(insertType, false, text); 			    
					if (test_mode) console.log("Inject InsertHTML Sent: "+sent); // Version 1.4.4b
					// The above can't be used because it injects in a frame that does not have tinyMCE defined and then the insert goes twice
				}*/
				var cap = false; // Should first letter be capitalized?
				var space = false; // Should a space be added to the beginning of the text
				var first_char = /\S/;
			    
				if (typeof CKEDITOR != "undefined") {
					var ck_insertType = (obj.hasOwnProperty("insertType")) ? "insertHtml" : "insertText";
					var e = CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]];
					var r = e.getSelection().getRanges()[ 0 ];
					r.collapse( 1 );
					r.setStartAt( ( r.startPath().block || r.startPath().blockLimit ).getFirst(), CKEDITOR.POSITION_AFTER_START );
					var docFr = r.cloneContents();
					var lastLetter = docFr.getHtml(); // Version 1.4.4c - Removed .slice(-1);
					console.log(docFr.getHtml());
					if (lastLetter.match(/([\n\.!\?;]|<br>|\u200C)$/) || lastLetter == "") // Version 1.0.1 - Added ; to capitalize after "new line" because &nbsp; is last letter // Version 1.5.2g - Added |\u200C and  || lastLetter == ""
						cap = true;
					if (lastLetter.match(/[\.!\?\w]$/)) // Version 1.4.4b - Added $ here and |<br>$ above
						space = true;
					if (cap == true && !obj.settings.always_lowercase) // Version 1.5.2
						text = text.replace(first_char, function(m) { return m.toUpperCase(); }); // Capitalize first letter
						/* Note: Above we are capitalizing first letter found not first character because
						speech recognition may have returned /n or /n/n as the first characters */
					if (space == true && !text.match(/^[ \n\.!\?,]/)) // if there is not already a space or .!?, at beginning of string
						text = " "+text; // Add space to beginning of text
					text = text.replace(/ ?\n/g, '\n\u200C'); // Version 1.4.4c // Version 1.5.2g - Changed \n\r to \n\u200C because "New line" would sometimes not working after clicking in editor with mouse
					//CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]].insertHtml(text); // Version 1.4.4c - Removed
					CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]][ck_insertType](text); // Version 1.4.4c
					if (test_mode) console.log ("CKEDITOR Insert");
				}
				else if (typeof tinyMCE != "undefined") {
					//console.log("tinyMCE");
					var startOffset = tinyMCE.activeEditor.selection.getRng(1).startOffset;
					var lastLetter = tinyMCE.activeEditor.selection.getRng(1).startContainer.textContent.charAt(startOffset-1);
					// Verison 1.5.2i - New way to get lastLetter below with selection because range doesn't include \n
					var sel = tinyMCE.activeEditor.selection.win.getSelection();
					sel.modify("extend", "backward", "documentboundary");
					lastLetter = sel.toString().slice(-1);
					sel.collapseToEnd();
					
					if (lastLetter.match(/[\n\.!\?]/) || startOffset <= 1)
						cap = true;
					if (lastLetter.match(/[\.!\?\w]/))
						space = true;
					if (cap == true && !obj.settings.always_lowercase) // Version 1.5.2
						text = text.replace(first_char, function(m) { return m.toUpperCase(); }); // Capitalize first letter
						/* Note: Above we are capitalizing first letter found not first character because
						speech recognition may have returned /n or /n/n as the first characters */
					if (space == true && !text.match(/^[ \n\.!\?,]/)) // if there is not already a space or .!?, at beginning of string
						text = " "+text; // Add space to beginning of text
					//console.log(lastLetter);
					var one_line = / ?\n/g; // Version 1.4.4c - Needed because \n does not work with mceInsertContent
					var two_line = / ?\n\n/g;
					text = text.replace(two_line, '\n\n').replace(one_line, '<br \>\u200C'); // Version 1.1.0 - \u200C = &zwnj; = zero-width non-joiner
					sent = tinyMCE.execCommand('mceInsertContent',false,text); // Version 1.4.4c - Removed and put back because insertType below does not scroll to cursor
					//sent = tinyMCE.execCommand(insertType,false,text); // Version 1.4.4c - Doesn't scroll to cursor so not using
					if (test_mode) console.log("tinyMCE Sent: "+sent); // Version 1.4.4b 
				}
			} + ')(' + JSON.stringify(obj) + ');'; // Version 1.4.4b - Changed from text to obj
			/*var script = document.createElement('script');
			script.textContent = actualCode;
			(document.head||document.documentElement).appendChild(script);
			script.remove();*/
			// Version 1.7.0 - From https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions/9517879#9517879
			// On certain websites like Google search this Manifest V3 compatible way doesn't work and console.error:
			// Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src 'nonce-RUe_5sZjmPFm2hP2pxVDxw' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:". Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list.
			// Version 1.7.0b - Possibly solved above error with https://stackoverflow.com/questions/70978021/chrome-extension-how-do-i-use-declarativenetrequest-to-bypass-the-content-secur
			try {
				var el = document.createElement("div");
				el.setAttribute('onreset', actualCode);
				el.dispatchEvent(new CustomEvent('reset'));
				el.removeAttribute('onreset');
			} catch (error) {
				console.log(error);
			}
		}	
		//keypress(el, 74); // 74 = j, 39 = right arrow
		scrollToCursor(el);
		if (!window.location.href.match(/chrome-extension:.*?iframe.html/i)) // Version 1.7.7 - Don't scroll to position in iframe.html
			scrollToPosition(el); // Version 1.0.2 // If we pasted speech in a textbox then it should be onscreen
		if (test_mode) console.log(el);	
		//document.execCommand("insertText", false, text); // Does not save undo history without clicking somewhere with mouse
		/*var event = document.createEvent('TextEvent'); // Does not save undo history without clicking somewhere with mouse
		event.initTextEvent('textInput', true, true, null, text);
		el.dispatchEvent(event); */
	}
	else if (isTextInput(el))
	{
		if (sra.settings.submit_search_fields && isSearch(el)) el.value = ""; // clear value if it is a search input
		//insertTextAtCaret(el, text);
		//document.execCommand("insertText", false, text); // Undo history does not work unless you click somewhere with a mouse
		//el.blur(); el.focus(); // Otherwise InsertHTML does not scroll to the cursor position, but this prevents gmail recipient field from showing suggestions unless we do it before insertHTML
		if (!iframe) { // Version 1.7.11 - hubspot.com > "create contact" wasn't working sometimes without this
			if (!sra.settings.use_keypresses) { // Version 1.7.7
				sent = document.execCommand("InsertHTML", false, text); // Undo history works good // Version 1.3.9 - Added sent =
			} else { // Version 1.7.7
				keypress([text]);
				sent = true;
			}
		}
		if (test_mode) console.log("input Sent: "+sent); // Version 1.3.9
		if (!sent && iframe) 
		{ // Version 1.3.9 
			if (!sra.settings.use_keypresses) { // Version 1.7.7
				try {
					sent = iframe.execCommand("InsertHTML", false, text);
					if (test_mode) console.log("Iframe input Sent: "+sent);
				}
				catch (err) { 
					if (test_mode) console.log(err);
				}
			} else { // Version 1.7.7
				keypress([text]);
				sent = true;
			}
		}
		//if (text.match(/( *?)\n$/) && lastLetter(el) != "\n") // For some reason InsertHTML will not send \n the VERY first time we try it!
		//	document.execCommand("InsertHTML", false, "\n"); // So send the \n again
		//if (text.match(/\n$/))
		//	el.blur(); el.focus(); // Otherwise InsertHTML does not scroll to the cursor position
		//keypress(el, 74);
		scrollToCursor(el); 
		scrollToPosition(el); // Version 1.0.2 // If we pasted speech in a textbox then it should be onscreen
		// The next 3 lines do not preserve undo history without clicking somewhere else
		/* var event = document.createEvent('TextEvent'); 
		event.initTextEvent('textInput', true, true, null, text);
		el.dispatchEvent(event); */
		if (test_mode) console.log(el);		
	}
	else { // Version 1.7.11 - Bing chat doesn't detect contentEditble or input or iframe so...
		// Send execCommand anyway
		if (!sra.settings.use_keypresses) {
			if (!iframe) {
				sent = document.execCommand("InsertHTML", false, text);
				if (test_mode) console.log("execCommand Sent: "+sent);
			}
			else {
				sent = iframe.execCommand("InsertHTML", false, text);
				if (test_mode) console.log("iFrame execCommand Sent: "+sent);
			}
			
			if (!sent && !sra.settings.disable_autofocus) { // Version 1.7.12 - Added && !sra.settings.disable_autofocus because was causing Gmail to do strange things if Settings > General > Keyboard Shortcuts is on and Auto focus on nearest textbox is off
				keypress([text]); 
				sent = true;	
			}
		} 
		else { // if (sra.settings.use_keypresses)
			//keypress([text]); // Version 1.7.12 - Commented out both because it presses a lot of keys at gmail and youtube if "Use keypresses to send text" is enabled.
			//sent = true;
		}
		
	}
	
	if (sent && sra_date) // Version 1.3.9
		el.setAttribute('data-sra', sra_date); // Version 1.3.9
	
	//keypress(el);
	if (sra.settings.submit_search_fields && isSearch(el)) // See if element is input and part of a search form
		el.form.submit(); // submit form if settings.submit_search_fields is set to do so automatically
	
	for (var i = 0; i < el.attributes.length; i++) {
	    var attrib = el.attributes[i];
	    if (attrib.specified) {
	        //if (test_mode) console.log(attrib.name + " = " + attrib.value);
		}
	}
	if (test_mode) console.log(el.nodeName);
	// For Google's search box the opacity is 0; change it to 1
	if (el.style.opacity == 0) el.style.opacity = 1;
	//el.value += text;
	//document.activeElement.form.submit();
}

function send_command(cmd) {
	// send_command(cmd) created on 12/20/2017 - Version 0.99.6
	var el = document.activeElement; // Version 1.5.2 - Was not sending in iFrames previously
	var dom = document; // Version 1.5.2
	if (el.nodeName == "IFRAME") // Version 1.5.2
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.8
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	if (el.shadowRoot) { // Version 1.7.11 - Get shadowRoot elems (Bing chat)
		while (el.shadowRoot) {
			el = el.shadowRoot.activeElement;
			dom = el.ownerDocument;
		}
	}
	
	var sent = dom.execCommand(cmd); // Version 1.5.2 - Changed document to dom
	if (test_mode) console.log("Cmd sent:"+sent);
	if (sent && sra_date) // Version 1.5.2
		el.setAttribute('data-sra', sra_date); // Version 1.5.2
	if (!sent) {
		// Inject code into head
		var obj = { cmd: cmd, test_mode: test_mode, sra_date: sra_date }; // Version 1.5.2i
		var actualCode = '(' + function(obj) { // Version 1.5.2i - From cmd to obj
			    var sent = false; // Version 1.5.2i
				var cmd = obj.cmd; // Version 1.5.2i
				var sra_date = obj.sra_date; // Version 1.5.2i
				var test_mode = obj.test_mode; // Version 1.5.2i
				sent = document.execCommand(cmd); // Version 1.5.2i - Added sent =
				if (test_mode) console.log("Injected document.exeCommand sent:"+sent);
				if (typeof CKEDITOR != "undefined") {
					CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]].execCommand(cmd);
					// Get list of CKEditor commands: CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]].commands 
					// All that works in SRA so far is undo, redo
					if (test_mode) console.log("Injected CKeditor");
				}
				else if (typeof tinyMCE != "undefined") {
					sent = tinyMCE.execCommand(cmd); // Version 1.5.2i - Added sent = 
					// List of tinyCME commands: http://archive.tinymce.com/wiki.php/TinyMCE3x:Command_identifiers
					// All that works in SRA so far is undo, redo, backspace|delete
					if (test_mode) console.log("Injected tinyMCE.execCommand sent:"+sent);
				}
				if (sent && sra_date) { // Version 1.5.2i
					var el = document.activeElement; // Version 1.5.2 - Was not sending in iFrames previously
					var dom = document; // Version 1.5.2
					if (el.nodeName == "IFRAME") // Version 1.5.2
						try {
							while (el.nodeName == "IFRAME") {
								dom = el.contentWindow.document; // Version 1.3.8
								el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
							}
							if (test_mode) console.log(el); // Version 1.3.5
						} catch (err) { 
							if (test_mode) console.log(err);
						}
					el.setAttribute('data-sra', sra_date); // Version 1.5.2i
				}
			} + ')(' + JSON.stringify(obj) + ');'; // Version 1.5.2i - From cmd to obj
			/*var script = document.createElement('script');
			script.textContent = actualCode;
			(document.head||document.documentElement).appendChild(script);
			script.remove();*/
			// Version 1.7.0 - From https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions/9517879#9517879
			// On certain websites like Google search this Manifest V3 compatible way doesn't work and console.error:
			// Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src 'nonce-RUe_5sZjmPFm2hP2pxVDxw' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:". Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list.
			// Version 1.7.0b - Possibly solved above error with https://stackoverflow.com/questions/70978021/chrome-extension-how-do-i-use-declarativenetrequest-to-bypass-the-content-secur
			try {
				var el = document.createElement("div");
				el.setAttribute('onreset', actualCode);
				el.dispatchEvent(new CustomEvent('reset'));
				el.removeAttribute('onreset');
			} catch (error) {
				console.log(error);
			}
	}
	return sent; // Version 1.5.2f - Added
}


} // end if (typeof content_script_loaded === 'undefined')
	
/* function getAllElems(all_elems, iframe) { // Version 1.3.9b - This function gets all elements in top DOM and all iframes in one array
	// This function is recursive so that it can get nested iframes as well if they are in same domain
	all_elems = all_elems || [];
	iframe = iframe || window;
	var elems = iframe.document.getElementsByTagName("*"); // nodeList of top dom elements
	all_elems = Array.prototype.concat.apply(all_elems, elems); // Turn nodeList into array and add to all_elems
	//all_elems = [...all_elems, ...elems]; // Version 1.5.2 - ES6 spread operator instead of concat.apply
	
	for (var f = 0; f < iframe.frames.length; f++) {
		try { // Try is to catch from line below: Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			//var frame_elems = window.frames[f].document.getElementsByTagName("*"); // nodeList of iframe elements
			//all_elems = Array.prototype.concat.apply(all_elems, frame_elems); // Turn nodeList into array and add to all_elems
			if (iframe.frames[f].document) // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
				all_elems = getAllElems(all_elems, iframe.frames[f]);
		}
		catch (err) { 
			if (test_mode) console.log(err);
		}
	}
	return (all_elems);
}*/


function getAllElems(selectors, dom) { // Version 1.5.2 - Get all elements including those in iframes but in order of appearance
	var all_elems = [];
	dom = dom || document;
	selectors = selectors || "*";
	//var elems = dom['body'||'documentElement'].getElementsByTagName("*");
	//var elems = dom['documentElement'||'body'].querySelectorAll(selectors); // Version 1.7.6 - From ['body'||'documentElement'] to ['documentElement'||'body'] otherwise read() can't see body element
	dom = dom.documentElement || dom.body || dom; // Version 1.7.11 - shadowRoots have no body or documentElement
	var elems = dom.querySelectorAll(selectors); // Version 1.7.11 - shadowRoots have no body or documentElement
	//if (test_mode) console.log("Window Elements: ",elems);
	for (var i = 0; i < elems.length; i++) {
		if (elems[i].nodeName == "IFRAME") {
			try {
				if (elems[i].contentWindow.document) {// Uncaught DOMException: Blocked a frame with origin "https://googleads.g.doubleclick.net" from accessing a cross-origin frame.
					var iframe_elems = getAllElems(selectors, elems[i].contentWindow.document);
					// all_elems.push(...iframe_elems) // ES6 way with spread will have stack overflow after about 100,000 elements
					for (var ii = 0; ii < iframe_elems.length; ii++)
						all_elems.push(iframe_elems[ii]);
				}
			} 
			catch (err) {
				if (test_mode) console.log(err);
			}
		}
		/* Version 1.7.11 - Below doesn't work because the selectors doesn't contain shadowRoot elements
			because they can be any element! So the only way to get switch_fields() to work is to
			querySelectorAll("*") or change to walking the DOM forward or backward from the element
		*/
		else if (elems[i].shadowRoot) { // Version 1.7.11 - Also get shadowRoot elems (Bing chat)
			var shadowRootElems = getAllElems(selectors, elems[i].shadowRoot);
			for (var ii = 0; ii < shadowRootElems.length; ii++)
				all_elems.push(shadowRootElems[ii]);
		}
		else {
			all_elems.push(elems[i]);
		}		
	}
	return all_elems;
}


function findElementFrame(el, iframe) { // Version 1.3.9b - This function returns the frame that the element is in
	
	iframe = iframe || window;
	if (iframe.document.contains(el))
		return(iframe);
	
	for (var f = 0; f < iframe.frames.length; f++) {
		try {
			if (iframe.frames[f].document)
				iframe = findElementFrame(el, iframe);
		}
		catch (err) { 
			if (test_mode) console.log(err);
		}
	}
	return(iframe);
}

function pasteString (string) { // Version 1.5.2
	var el = document.activeElement;
	var dom = document;
	if (Array.isArray(string)) 
	{
		string = string[0];
	}
	//string = string.replace(/\n/, "<br>"); // replace \n with html new line
	if (el.nodeName == "IFRAME") // Version 1.5.2
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.8
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}

	if (sra.settings.always_lowercase)  // Version 1.5.2
		string = string.toLowerCase();
		
	if (test_mode) console.log(string);
		
	// Version 1.7.0c - Added below copy and paste handlers from keypress.js that is used with Google Docs.
	// Version 1.5.2g - Created paste_event_handler as stand alone function instead of inline with addEventListner. Also moved above instead of down below
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
	
	// Put string in clipboard by firing copy and listening but preventing default copy
    function handler (event){
        event.clipboardData.setData('text/html', string);
		event.clipboardData.setData('text/plain', string);
        event.preventDefault();
        document.removeEventListener('copy', handler, true);
    }
    document.addEventListener('copy', handler, true);
    document.execCommand('copy');
	
	// Paste string into activeElement of document or iframe (dom)
	dom.execCommand("paste", false, null);
	
	// Put previous clipboard data back into clipboard // Version 1.5.2g - Added to this function instead of resuing handler() above
	function copy_event_handler (event){
		if (clipboard_data_html)
			event.clipboardData.setData('text/html', clipboard_data_html);
		if (clipboard_data_plain)
			event.clipboardData.setData('text/plain', clipboard_data_plain);
		//if (test_mode) console.log("5. previous_clipboard_data: "+previous_clipboard_data);
        event.preventDefault();
        document.removeEventListener('copy', copy_event_handler, true);
    }
	document.addEventListener('copy', copy_event_handler, true);
    document.execCommand('copy');
	
	// Get current clipboard data by adding eventListener and firing paste // Version 1.7.0c - Removed below - buggy
	/*var clipboard_data;
	document.addEventListener('paste', function (evt) {
			  clipboard_data = evt.clipboardData.getData('text/html');
		});
	document.execCommand("paste", false, null); // to fire eventListener	
	
	// Put string in clipboard by firing copy and listening but preventing default copy
    function handler (event){
        event.clipboardData.setData('text/html', string);
        event.preventDefault();
        document.removeEventListener('copy', handler, true);
    }
    document.addEventListener('copy', handler, true);
    document.execCommand('copy');
    
    // Paste string into Google Docs iFrame
    dom.execCommand("paste", false, null);
    
    // Put previous cliboard data back into clipboard
    string = clipboard_data;
	document.addEventListener('copy', handler, true);
    document.execCommand('copy');  
    */
}


function getActiveElement() { // Version 1.7.11
	// Return activeElement in document or iframe or shadowRoot
	
	var el = document.activeElement; // Version 1.5.2 - Was not sending in iFrames previously
	var dom = document; // Version 1.5.2
	if (el.nodeName == "IFRAME") // Version 1.5.2
		try {
			while (el.nodeName == "IFRAME") {
				dom = el.contentWindow.document; // Version 1.3.8
				el = el.contentWindow.document.activeElement; // Blocked a frame with origin "http://jsfiddle.net" from accessing a cross-origin frame.
			}
			if (test_mode) console.log(el); // Version 1.3.5
		} catch (err) { 
			if (test_mode) console.log(err);
		}
	if (el.shadowRoot) { // Version 1.7.11 - Get shadowRoot elems (Bing chat)
		while (el.shadowRoot) {
			el = el.shadowRoot.activeElement;
			dom = el.ownerDocument;
		}
	}
	return el;
	// To get DOM from el use: el.ownerDocument
	// To get window from el use: el.ownerDocument.defaultView
	// To get elements from DOM of el (inc. iFrame & shadowRoot) use: el.getRootNode().querySelectorAll("*")
	// To get the host element of the shadowRoot use: el.getRootNode().host
}


var content_script_loaded = true;


