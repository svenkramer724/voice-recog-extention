var times_var = "(?: ?(\\S*?) ?(?:times?|x|fois|volt[ae]?|vezes|veces|mal|gånger|回|次|बार))?"; // Version 1.6.9 // Version 1.7.2 - Added बार for Hindi
/*	times?|x (English). fois (French). volt[ae]? (Italian). vezes (Portuguese). 
	veces (Spanish). mal (German). gånger (Swedish). 回 (Japanese). 次 (Chinese).

*/
//var word_boundary = "(?<=^|$|\\s|[¿¡!-/:-@[-`{-~])"; // Version 1.7.2 - https://regex101.com/r/6AyYif/1 ?<= is positive look behind. Needed as the start word boundary or in the middle. Remove < and use ?= for positive look ahead which is needed for the word boundary at the end.
var word_boundary = "(?<=^|$|\\s|[¿¡!-)+-/:-@[-`{-~])"; // Version 1.7.2 - https://regex101.com/r/6AyYif/2 ?<= is positive look behind. Needed as the start word boundary or in the middle. Remove < and use ?= for positive look ahead which is needed for the word boundary at the end. // This version skips * for bad words matching with !-)+-/ instead of !-/

sra.commands = [
	{ heading: "Built-In Web Speech API Commands" },
	{ speech: "Period", output: ".", },
	{ speech: "Dot", output: ".", },
	{ speech: "Question mark", output: "?", },
	{ speech: "Exclamation point|mark", output: "!", }, 
	{ speech: "Comma", output: ",", },
	{ speech: "Percent", output: "%", },
	{ speech: "New line", output: "\\n", },
//	{ phrase: "^New line$", action: "enter_key()", }, /* Version 1.1.0 */ // Version 1.3.5 - Removed
	{ speech: "New paragraph", output: "\\n\\n", },
//	{ phrase: "^New paragraph$", action: "\n\n", }, /* Version 1.3.5 */ // Causes error: The message port closed before a response was received.. NOTE: You must reload the web page you were trying to use speech recognition on before this extension will work on it.
	{ speech: "Smiley Face", output: ":-)", },
	{ speech: "Frowny Face", output: ":-(", },
	{ speech: "Sad Face", output: ":-(", },
	{ speech: "Kissy face", output: ":-*", },
	{ speech: "Wink wink", output: ";-)", },
	{ speech: "Hashtag", output: "#", },
	
	{ heading: "<span class='title'></span> Extra Commands", },
	{ speech: "Full Stop", output: ".", }, // Version 1.6.11
	{ speech: "Semicolon", output: ";", },
	{ speech: "Colon", output: ":", },
	{ speech: "Quote", output: '"', }, 
	{ speech: "Single quote", output: "'", },
	{ speech: "Apostrophe", output: "'", },
	//{ speech: "Plus", output: "+", }, // Version 1.7.11 - Removed - Google does it by itself with numbers
	//{ speech: "Minus", output: "-", }, // Version 1.7.11 - Removed - Google does it by itself with numbers
	{ speech: "Open parenthesis", output: "(", },
	{ speech: "Close parenthesis", output: ")", },
	{ speech: "Open bracket", output: "[", },
	{ speech: "Close bracket", output: "]", },
	
	{ heading: "Settings" },
	{ phrase : "^(?:switch |change |set )(?:the )?language to (.*?)$", action : "set_language(keyword)", 
		description: "<b>Switch|Change|Set</b> (the) <b>language to (spanish|english|etc)</b>" },
	{ phrase : "^(?:Turn )?(on|off|start|stop|enable|disable|activate)(?: *?)(?:dictation|speech to text)$" , action : "dictation(keyword)",
		description: "(Turn (on|off) |Start|Stop) <b>Dictation|Speech to text</b> (Only available in Full Version)" },
	{ phrase : "^(?:Turn )?(on|off|start|stop|enable|disable|activate)(?: *?)(?:auto punctuation)$" , action : "toggle_autop(keyword)",
		description: "(Turn (on|off) |Start|Stop) <b>Auto Punctuation</b> (Only available in Full Version)" },
		
	{ heading: "Music and Videos" },
	{ /* phrase : "^(play |listen to )(.*?)(?: *?)?(?:in |and )?(?:a )?(new tab)?$", action : "play(keyword)", */
		 description: "<b>Youtube</b> (title of artist, song or video)" // Version 1.5.2k - Changed to youtube
		},
	{ heading: "Tabs and Navigation" },
	{ phrase : "^(?:start |open )?(?:a )?new tab$", action : "url", 
		description: "(Start|Open) (a) <b>New Tab</b>" },
	{ phrase : "^(?:go to |open |start )(.*?\\.\\s?\\S{2,6})(?: *?)?(?:in |and )?(?:a )?(new tab)?$", action : "url(keyword)", /* Version 0.99.7 - Added \\s? */
		description: "<b>Go to|Open|Start</b> &nbsp;&nbsp;&nbsp; <b>anywebpage.com</b> (in a new tab)"}, /* Must escape . and S with two \\ */
	{ phrase : "^(switch|change) tab(s)?$", action : "switch_tabs(right)", 
		description: "(Switch|Change) <b>tab</b>(s)"},
	{ phrase : "^(next|previous|close|remove) tab$", action : "switch_tabs(keyword)", 
		description: "next|previous|close|remove <b>tab</b>" },
	{ phrase : "^(?:go |switch |change |click |select )(?:to |on |in )?(?:the )?(.*?) tab$", action : "switch_tabs(keyword)", 
		description: "Go to|Switch to|Change to|Click the|Select the <b>(nth|title of tab) tab</b>" },
	{ phrase : "^(?:go to )?(?:my |the )?(home(?: *?)?page)$", action : "url(keyword)",
		description: "(Go to (my|the)) <b>home page</b>", },
	{ phrase : "^(?:go )(?:back|to the previous page|to previous page|back to the previous page|back to previous page)$", action : "browse(back)",  // Version 1.6.11 - From navigation to browser
		description: "<b>Go Back</b> (to (the) previous page)" },  
	{ phrase : "^(?:go )(?:forward)$", action : "browse(forward)", // Version 1.6.11 - From navigation to browser
		description: "<b>Go forward</b>" },  
	{ phrase : "^(?:refresh|reload)(?: page)?$", action : "browse(reload)", // Version 1.6.11 - From navigation to browser
		description: "<b><b>Reload|Refresh</b> (page)</b>" }, 

	{ heading: "Screen Reader (Text-To-Speech)" },	
	{ phrase : "^Read (the )?(all|everything|page|webpage|paragraphs?|screen|article|website|site|main|content|main content|alert|notifications?|status)$", action : "read(keyword)", 
		description: "<b>Read</b> <b>all|everything|page|webpage|paragraph|screen|article|website|site|main|content|main content|alert|notification|status</b>" }, // Version 1.3.3 - Added ""main content""
	{ phrase : "^Read (the )?(buttons?|inputs?|links?|hyperlinks?|web links?|images?|figures?|headings?|titles?|headlines?|text\\s?areas?|(text )?box)( on screen)?$", action : "read(keyword)", 
		description: "<b>Read</b> <b>buttons|inputs|links|hyperlinks|web links|images|figures|headings|titles|headlines|textareas|text box</b> (on screen)" },	
	{ phrase : "^Read (the )?(menu|navigation|header|banner|footer|contentinfo|sidebar|aside|complementary|complimentary|toolbar)$", action : "read(keyword)", 
		description: "<b>Read</b> <b>menu|navigation|header|banner|footer|contentinfo|sidebar|aside|complementary|toolbar</b>" },	// Version 1.3.3 - Added "toolbar"
	{ phrase : "^Read (the )?(selected|highlighted|selection)(?: text)?$", action : "read(keyword)", 
		description: "<b>Read</b> <b>selection|selected|highlighted (text)</b>" },	
	{ phrase : "^(Stop|Pause|Resume|Unpause|Continue|Start) ?(?:reading|speaking|talking)?$", action : "stopSpeaking(keyword)", 
		description: "<b>Stop|Pause|Resume|Unpause|Continue|Start</b> &nbsp;&nbsp;&nbsp;&nbsp; (reading|speaking|talking) (Or press ESC)" },		

	{ heading: "Keys" },
	//{ phrase : "^(press |click |price )?(?:the )?(enter|inter|presenter|in turkey|Uline|frozen turkey)\\b(?: *?)(key)?(?: *?)(\\S*?)?(?: *?)(time|x)?(?:s)?$", action : "enter_key(keyword)", // Version 1.3.8 - Added \\b \\ Version 1.6.9 - Replaced with below for new times_var
	{ phrase : "^(press |click |price )?(?:the )?(enter|inter|presenter|in turkey|Uline|frozen turkey)\\b(?: *?)(key)?"+times_var+"$", action : "enter_key(keyword)", // Version 1.3.8 - Added \\b	
		description: "(Press) (the) <b>Enter</b> (key) (n time(s))", },
	// { phrase : "^(press |click )?(?:the )?space(?: *?)(bar)?(key)?(?: *?)(\\S*?)?(?: *?)(time|x)?(?:s)?$", action : "spacebar(keyword)", // Version 1.6.9 - Replaced with below
	{ phrase : "^(press |click )?(?:the )?space( ?bar)?\\b(?: *?)(key)?"+times_var+"$", action : "spacebar(keyword)", // Version 1.6.9 - Added \\b and change (bar) to ( ?bar)
		description: "(Press) (the) <b>Space</b> (bar) (key) (n time(s))", },
	{ phrase : "^(press |pressed |click )?(?:the )?(?:backspace|delete)\\b(?: *?)(key)?(?: *?)(?!word|sentence|paragraph|letter|character)"+times_var+"$", action : "backspace(keyword)", // Version 1.3.8 - Added \\b // Version 1.5.2f - Added (?!word|sentence|paragraph|letter|character)
		description: "(Press) (the) <b>Backspace|Delete</b> (key) (n time(s))", },
	{ phrase : "^(press |pressed |click )?(?:the )?(?:escape)\\b(?: *?)(key)?"+times_var+"$", action : "escape_key(keyword)", // Version 1.3.8 - Added \\b // Version 1.6.9 - New "+times_var+"
		description: "(Press) (the) <b>Escape</b> (key) (n time(s))", },
	
	{ heading: "Undo/Redo" },
	{ phrase : "^(?:press |click )?(?:the )?(?:redo)\\b(?: *?)(?:key)?"+times_var+"$", action : "redo(keyword)", // Version 1.6.9 - Added \\b // Version 1.6.9 new "+times_var+"
		description: "(Press) (the) <b>Redo</b> (key) (n time(s))", },
	{ phrase : "^(?:press |click )?(?:the )?(undo|under)\\b(?: *?)(?:key)?"+times_var+"$", action : "undo(keyword)", // Version 1.4.0 - Added \\b
	 	description: "(Press) (the) <b>Undo</b> (key) (n time(s))", },
	{ phrase : "^(?:undo |under |erase |delete )(?:the )?(last|previous|next)?(?: *?)(\\S*?)?(?: *?)(word|sentence|character|letter|paragraph)(?:s)?$", action : "undo(keyword)", // Version 1.5.2f - Added |paragraph
		description: "<b>Undo|Erase|Delete</b> (the) (last|previous|next) (n) <b>word|sentence|character|letter</b>(s)", },
	
	{ heading: "Arrow Keys and Cursor" },
	{ phrase : "^(?:press |pressed |price )?(?:the )?(home|end|up|down|left|right)\\b(?: *?)(?:arrow )?(?:key)?"+times_var+"$", action : "moveCursor(keyword)", // Version 1.3.8 - Added \\b // Version 1.6.9 new "+times_var+"
		description: "(Press) (the) <b>Home|End|Up|Down|Left|Right</b> (arrow) (key) (n time(s))", },
	{ phrase : "^(?:move |place |put )(?:the )?cursor (?:to |on |in |at )?(?:the )?(up|left|right|write|down|end|and|start|home|top|bottom)(?: *?)(?:by |of )?(\\S*?)?(?: *?)(?:the )?(time|x|line|word|character|space|letter|sentence|paragraph|box|text|field|document)?(?:s)?$", action : "moveCursor(keyword)", // Version 1.5.2d - Added |document
		description: "<b>Move|Place|Put</b> (the) <b>Cursor</b> (to|on|in|at) (the) <b>up|left|right|down|end|start|home|top|bottom</b> (by|of) (n) (the) (time|line|word|character|space|letter|sentence|paragraph|box|text|field)(s)", },
	
	{ heading: "Edit" },
	{ phrase : "^(?:select |highlight )(?:to )?(?:the )?(last|previous|next|all|text|field|box|none|nothing|start|end)?(?:of )?(?:the )?(?: *?)(\\S*?)?(?: *?)(character|letter|word|sentence|paragraph|line|document|paper)?(?:s)?$", action : "select(keyword)", // Version 1.5.2f - Added |start|end and (?:of )?(?:the )? and |document|paper
		description: "<b>Select|Highlight</b> (to) (the) (last|previous|next|all|text|field|box|none|nothing|start|end) (n) (character|letter|word|sentence|paragraph|line|document|paper)(s)", },
	{ phrase : "^(?:deselect|unselect|unhighlight)( all)?$", action : "select(none)",
		description: "<b>Deselect|Unselect|Unhighlight</b> (all)", },
	{ phrase : "^(copy|coffee|cut|paste)(?: to| from)?(?: the)?(?: clipboard)?$", action : "clipboard(keyword)", // Version 1.5.2 - Added (?: to| from)?(?: clipboard)? // Version 1.6.9 - Added (?: the)?
		description: "<b>Copy|Cut|Paste</b> (to|from) (clipboard)", },
	{ phrase : "^(clear|clearfield|cleartext)(?: the)?(?: field| text| textarea| input| box| all| the)?(?: box| field| input| text)?$", action : "clear_text(keyword)", // Version 1.5.2k - Added cleartext
		description: "<b>Clear</b> (the) (field|text|textarea|input|box|all)", },
	{ phrase : "^(?:find |search for )(.*?)$", action : "find_phrase(keyword)",
		description : "<b>Find</b> (word or phrase)", },
	
	{ heading: "Scrolling" },
	{ phrase : "^(?:press |pressed )?(scroll |page )(page|body|document|menu|sidebar|box)? ?(all the way )?(?:to )?(?:the )?(up|down|left|right|write|start|top|end|bottom)?(?: *?)(?:key)?$", action : "scroll_it(keyword)", // Version 1.5.4d - From (scroll |page ) to (scroll )(page|body|document|menu|box)? ? // Also ? after directions to make them optional
		description: "<b>Scroll</b> (page|body|document|menu|sidebar|box) (all the way) (to the) <b>up|down|left|right|write|start|top|end|bottom</b>", },
	{ phrase : "^(?:press |pressed )?(scroll |page )(page|body|document|menu|box)? ?(up|down|left|right)?( all the way)?(?: *?)(?:to )?(?:the )?(start|top|end|bottom)(?: *?)(?:key)?$", action : "scroll_it(keyword)", // Version 1.5.4d - From (scroll |page ) to (scroll )(page|body|document|menu|box)? ? // Also ? after directions to make them optional
		description: "<b>Scroll</b> (page|body|document|menu|box) &nbsp;&nbsp;&nbsp; <b>up|down|left|right</b> (all the way) (to) (the) <b>start|top|end|bottom</b>", },

	{ heading: "Forms, Buttons and Links" },
	{ phrase : "^(?:press |pressed |click )?(?:the )?(tab)\\b(?: *?)?(?:key)?"+times_var+"$", action : "switch_fields(keyword)", // Version 1.6.9 - Added \\b // Version 1.6.9 new "+times_var+"
		description: "(Press) (the) <b>tab</b> (key) (n time(s))", },
	{ phrase : "^(?:press |pressed |click )?(?:the )?(shift tab)\\b(?: *?)(?:key)?"+times_var+"$", action : "switch_fields(keyword)", // Version 1.6.9 - Added \\b and new "+times_var+"
		description: "(Press) (the) <b>shift tab</b> (key) (n time(s))", },
	{ phrase : "^tab\\b(?: *?)?(?:to )?(?:the )?(previous|left|up|app|backward|next|right|down|forward|for word|4 word)?(?:s|es)?"+times_var+"$", action : "switch_fields(keyword)", // Version 1.6.9 - Added \\b and new "+times_var+"
		description: "<b>Tab</b> (previous|left|up|app|backward|next|right|down|forward) (n time(s))", },
	{ phrase : "^(next|previous)\\b(?: *?)?(?:field|input|box|element|selection|option|entry|area|button)?"+times_var+"$", action : "switch_fields(keyword)", // Version 1.5.2 - Added (?: *?)(\\S*?)?(?: *?)(?:time|x)?(?:s)? // Version 1.6.9 - Added \\b and new "+times_var+"
		description: "<b>Next|Previous</b> (field|input|box|element|selection|option|entry|area|button) (n times(s))", },
	{ phrase : "^(?:go |switch |change |focus |tab )(?:to |on |in )?(?:the )?(.*?)?(?: *?)(form|field|input|box|element|selection|option|entry|area|link|button|switch)(?:s|es)?$", action : "switch_fields(keyword)",
		description: "<b>Go|Switch|Change|Focus|Tab</b> (to|on|in) (the) (<b>keyword</b>) <b>form|field|input|box|element|selection|option|entry|area|link|button|switch|textarea</b>", },
	//{ phrase : "^(?:click |quick |press |check |uncheck )(?:to |on |in )?(?:the )?(.*?)(?: *?)?(button|link|box)?(\\d*?)?(?: more)?(?: time| x)?(?:s)?$", action : "click_keyword(keyword)", // Version 1.5.2d - Removed - Clicking on a button multiple times is too messy Such as "Show numbers" > "Click on 10" or Google Docs: "Click on Document 2"
	//	description: "<b>Click|Press|Check|Uncheck</b> (to|in|on) (the) (<b>keyword</b>) (button|link|box) (n time(s))", },
	{ phrase : "^(?:click |quick |press |check |uncheck )(?:to |on |in )?(?:the )?(.*?)(?: *?)?(?:button|link)?$", action : "click_keyword(keyword)", // Version 1.5.2d - Added - Clicking on a button multiple times is too messy Such as "Show numbers" > "Click on 10" or Google Docs: "Click on Document 2" // Version 1.5.2j - Removed |box at end so can say click on textbox
		description: "<b>Click|Press|Check|Uncheck</b> (to|in|on) (the) (<b>keyword</b>) (button|link|box)", },
	{ phrase : "^(click|check|uncheck)$", action : "click_keyword(keyword)",
		description: "<b>Click|Check|Uncheck</b>", },
	{ phrase : "^(?:press |pressed |click )?(?:the )?(submit)(?: *?)(?:the )?(button|form)?$", action : "submit_form()",
		description: "(Click|Press) (the) <b>submit</b> (the) (button|form)", },
	
	{ heading: "Tooltips" },
	{ phrase : "^(add |show |hide |remove )(labels|tooltips)$", action : "add_labels(keyword)",
		description: "<b>Add|Show|Hide|Remove</b> &nbsp;&nbsp;&nbsp; <b>labels|tooltips</b>",  },
	{ phrase : "^(add |show |hide |remove )(numbers)$", action : "add_numbers(keyword)", // Version 1.5.2b
		description: "<b>Add|Show|Hide|Remove</b> &nbsp;&nbsp;&nbsp; <b>numbers</b>",  },
	

];

// Version 1.0.7 - Sometimes this was erasing the loaded custom_commands from storage.js in sra object if chrome.storage.get was faster than usual
if (!sra.hasOwnProperty("custom_commands")) { 
	// Version 1.6.2 - Added \.? to end of all phrases to correct Edge auto punctuation. 。? for Japanese
	sra.custom_commands = [
		{ phrase : "(Enter |type )?(my )?e-?mail( address)?\.?", action : "john@email.com", description: "Type my email address", enable: true}, // Version 1.7.3 - From email to e-?mail because Edge started putting E-mail
		{ phrase : "(Enter |type )?(my )?name\.?", action : "John Smith", description: "Type my name", enable: true},
		{ phrase : "(Youtube) (.*?)(in the background)?\.?", action : "url(http://www.google.com/search?btnI&q=youtube $2, https://www.youtube.com, $3)", description: "Youtube 'title of song or video'", enable: true}, // Version 1.5.2 - Removed Play|Listen to| and changed q=youtube play to q=youtube // Version 1.5.4j - Added (in the background)? and changed true to $3
		{ phrase : "Sean|Shawn", action : "replace_word(Shaun)", description: "Always replace Sean or Shawn with Shaun", enable: true},
	];
	
	if (chrome.i18n.getUILanguage().match(/^es/)) { // Version 1.5.7 - If Spanish
		sra.custom_commands.push( { phrase : "Escrib(a|e) mi (dirección de )?correo electrónico\.?", action: "juan@email.com", description: "Escribe mi correo electrónico", enable: true});
		sra.custom_commands.push( { phrase : "Escrib(a|e) mi nombre\.?", action: "Juan Garcia", description: "Escribe mi nombre", enable: true});
	}
	if (chrome.i18n.getUILanguage().match(/^de/)) { // Version 1.5.7 - If German
		sra.custom_commands.push( { phrase : "(Schreibe?n? |Geben |Tippe )?(Sie )?(meinen? )?E-?Mail(-Adresse)?( ein)?\.?", action: "janschmidt@email.com", description: "Schreib meine E-Mail", enable: true}); // Version 1.7.3 - From E-Mail to E-?Mail
		sra.custom_commands.push( { phrase : "(Schreibe?n? |Geben |Tippe )?(Sie )?(meinen? )?Namen?( ein)?\.?", action: "Jan Schmidt", description: "Schreib meinen Namen", enable: true});
	}
	if (chrome.i18n.getUILanguage().match(/^ja/)) { // Version 1.5.9 - If Japanese
		sra.custom_commands.push( { phrase : "私のメール(アドレス)?(を入力|を書く)?。?", action: "kenjisato@email.com", description: "私のメールアドレス", enable: true}); // Version 1.6.2 - Added |を書く and from アドレス to (アドレス)?
		sra.custom_commands.push( { phrase : "私の名前(を入力|を書く)?。?", action: "Kenji Sato", description: "私の名前", enable: true}); // Version 1.6.2 - Added |を書く
	}
	if (chrome.i18n.getUILanguage().match(/^fr/)) { // Version 1.6.0 - If French
		sra.custom_commands.push( { phrase : "([ÉE]cris|[ÉE]crivez|Tape[rz]|Entre[rz])? ?mon (adresse )?e-?mail\.?", action: "jeanmartin@email.com", description: "Entrez mon email", enable: true}); // Version 1.7.3 - From email to e-?mail
		sra.custom_commands.push( { phrase : "([ÉE]cris|[ÉE]crivez|Tape[rz]|Entre[rz])? ?mon nom\.?", action: "Jean Martin", description: "Tapez mon nom", enable: true});
	}
	if (chrome.i18n.getUILanguage().match(/^it/)) { // Version 1.6.1 - If Italian
		sra.custom_commands.push( { phrase : "(Scrivi |Digita |Inserisci )?(il |la )?mi[ao] (indirizzo )?e-?mail\.?", action: "marcorossi@email.com", description: "Scrivi il mio indirizzo email", enable: true}); // Version 1.7.3 - From email to e-?mail
		sra.custom_commands.push( { phrase : "(Scrivi |Digita |Inserisci )?(il )?mio nome\.?", action: "Marco Rossi", description: "Scrivi il mio nome", enable: true});
	}
}

//sra.custom_commands = [];

// replace_words_obj is used in sr.js:replace_mistakes(speech) function
var replace_words_obj = {
	"okay" : " ok", "comma" : ",", "semicolon" : ";", "colon" : ":", 
	"single quote ?" : " ' ", "quote ?" : ' " ', // Version 1.6.2 - From "'" and '"' to " ' " and  ' " '
	"apostrophe" : "'", 
	// "plus" : "+", "minus" : "-", "equals" : "=", // Version 1.7.11 - Removed - Google does it by itself with numbers
	"clickstart" : "click start", "clickstop" : "click stop",
	//"|[.? ]*question mark[.?]?" : "?", // Version 1.6.2 - Added for Edge
	//"exclamation (point|mark)\.?" : "!", // Version 1.6.2 - For Edge: From point to (point|mark)\.? 
	"question mark" : "?", // Version 1.6.2 - Added for Edge
	"exclamation (point|mark)" : "!", // Version 1.6.2 - From point to (point|mark)
	// Version 1.2.0
	"open (parenthesis|parentheses) ?" : "(", "close (parenthesis|parentheses)" : ")",
	"open bracket ?" : "[", "close bracket" : "]",
	"ampersand" : " &", "asterisk" : "*",
	// Version 1.3.5
	"new line" : "\n",
	"new paragraph" : "\n\n", // Version 1.6.2 - Uncommented for Edge
	//"|^new line\.?" : "\n", "|^new paragraph\.?" : "\n\n", // Version 1.6.2 - Added for Edge
	//"|[, ]*?new line(\.)?" : "$1\n", // Version 1.6.2 - Added .? for Edge
	//"|[, ]*?new paragraph(\.)?" : "$1\n\n", // Version 1.6.2 - Uncommented and added .? for Edge (has been commented forever?)
 	/* Version 1.7.6 - Google's web speech API stopped doing most punctuation and smileys. 
		It still does hashtag # and percent % and dollars $
	*/
	"Smiley Face" : ":-)", 
	"Frowny Face" : ":-(", 
	"Sad Face" : ":-(", 
	"Kissy face" : ":-*", 
	"Wink wink" : ";-)",
	
	/* Portuguese */
 	"Vírgula" : ",", "Ponto de interrogação" : "?", "Ponto de exclamação" : "!",
 	"Ponto e vírgula" : ";", "Dois pontos" : ":", "Aspas" : '"',
 	"Aspas simples" : "'", "Apóstrofo" : "'",
 	"ponto" : ".", "por cento" : "%", "nova linea" : "\n", "nova linha" : "\n",
 	"novo paragrafo" : "\n\n", "Novo parágrafo" : "\n\n", "Carinha sorriso" : ":-)",
 	"Carinha frustrada" : ":-(" , "Carinha triste" : ":-(", "Carinha de beijo" : ":-*", 
 	"Sinal de mais" : "+", "Sinal de menos" : "-", "Sinal de igual" : "=",
 	/* Spanish */
 	/* "punto" : ".",*/ "Signo de interrogación" : "?", "Signo de exclamación" : "!", /* Version 1.4.7 - Removed "punto" because randomly it started overriding Italian question mark and exclamation point */
 	"coma" : ",", "Nueva línea": "\n", "Nuevo párrafo" : "\n\n",
 	"Cara sonriente" : ":-)", "Cara de tristeza" : ":-(", "Cara triste" : ":-(",
 	"Cara de besos" : ":-*", "Guiño guiño" : ";-)", "Punto y coma" : ";",
 	"Dos puntos" : ":", "Comillas" : '"', "Comillas simples" : "'",
 	"Apóstrofe" : "'", "Signo de más" : "+", "Signo menos" : "-", "Signo de igual" : "=",
	/* German Version 1.4.9 - 6/28/2021 - German cmds were displaying from languages.js but were not converting for this many years?!? */
 	"punkt": ".",
	"fragezeichen": "?",
	"ausrufezeichen": "!", 
	/* "Komma": ",", */ // Version 1.5.1 - Removed because komma is a common word in Swedish
	"komma": ",", // Version 1.7.4 - Added again because Google Web Speech API stopped converting it. change_language() in languages.js deletes "komma" for Swedish
	"prozent": "%",
	"neue zeile": "\n",
	"neuer absatz": "\n\n",
	"semikolon": ";",
	"doppelpunkt": ":",
	"zitat": '"', 
	"apostroph": "'",
	//"plus": "+", // Version 1.7.11 - Removed - Google does it by itself with numbers
	//"minus": "-", // Version 1.7.11 - Removed - Google does it by itself with numbers
	/* Italian */
	"punto e virgola": ";", 
	"punto interrogativo": "?", 
	"punto esclamativo": "!", 
	// "periodo": ".", // Version 1.5.1 - Should have been il punto
	"punto": ".", 
	"virgola": ",", 
	"per cento": "%", 
	"nuova linea": "\n", 
	"nuovo paragrafo": "\n\n", 
	"faccina sorridente": ":-)", 
	"faccina triste": ":-(", 
	"faccina bacio": ":-*", 
	"faccina occhiolino": ";-)", 
	"cancelletto": "#", 
	"due punti": ":", 
	"virgolette": '"', 
	"virgoletta": "'", 
	"apostrofo": "'", 
	// "più": "+", // Version 1.5.1 - Removed because più also means more
	// "meno": "-", // Version 1.5.1 - Removed because meno also means less
	// "uguale": "=", // Version 1.5.1 - Removed because uguale also means same as
 	
	/* French */
 	"Nouvelle ligne" : "\n",
	"Nouveau paragraphe" : "\n\n", // Version 1.6.2 - Added for Edge
	"Point d'interrogation" : "?", // Version 1.6.0 - Added
	"Point d'exclamation" : "!", // Version 1.6.0 - Added
	"Point final" : ".", // Version 1.7.7
	"virgule" : ",", // Version 1.7.7
	"deux points" : ":", // Version 1.7.7
	"point virgule" : ";", // Version 1.7.7
	"Astérisque" : "*", // Version 1.7.7 
	/* Czech */
	"Tečka": ".",
	"Otazník": "?",
	"Vykřičník": "!", 
	"Čárka": ",",
	"Procent": "%",
	"Nový řádek": "\n",
	"Nový odstavec": "\n\n",
	"Apostrof": "'",
	"Hvězdička": "*",
	/* Swedish */
	"Punkt": ".", 
	"Frågetecken": "?",
	"Utropstecken": "!", 
	// "Komma": ":", // Version 1.3.1 - Removed. Komma is a common word. Should have been a comma anyway
	"kommatecken": ",", // Version 1.5.5 - Tony Ziegler wants to use comma in Swedish
	"Procent": "%",
	"Ny rad": "\n",
	"Ny linje": "\n",
	"Nytt stycke": "\n\n",
	"Leende": ":-)",
	"Semikolon": ";",
	"Kolon": ":",
	"Citat": '"', 
	"Apostrof": "'",
	"Plustecken": "+",
	"Minustecken": "-",
	"Likamedtecken": "=",
	/* Japanese */
	"|句点|": "。", // Version 1.5.2 - |x| = match anywhere; x| = match if word boundary at front; |x = match if word boundary at end
	"|ドット|": ".",
	"|クエスチョンマーク|はてなマーク|疑問符|": "?",
	"|ビックリマーク|感嘆符|": "!", 
	"|改行|": "\n",
	"|新しい段落|新段落|": "\n\n",
	/* Chinese */
	"|句号|句號|": "。", // zh-CN|zh-TW
	"|问号|問號|": "?", // zh-CN|zh-TW
	"|惊叹号|感叹号|感嘆號|": "!", // zh-CN|zh-CN|zh-TW 
	"|顿号|逗号|逗號|": "、", // zh-CN|zh-CN|zh-TW 
	"|新建一行|": "\n", // zh-CN|zh-TW
	"|新段落|新段|新款|新短评|": "\n\n", // zh-CN - paragraph = 段, 段落, 款, 短评, zh-TW - paragraph = 段, 段落, 款, 短評
	/* Hindi - Version 1.7.2 */
	"पूर्ण विराम": "।", // Full stop
	"प्रशनवाचक चिन्ह|प्रश्न चिह्न|प्रश्न चिन्ह|प्रश्नवाचक चिन्ह": "?",
	"विस्मयादिवाचक चिन्ह|विस्मयादिबोधक बिंदु|विस्मयादिबोधक चिह्न": "!",
	"अल्प विराम|अल्पविराम": ",", // comma
	"सेमीकोलन|अर्धविराम|अर्ध विराम": ";",
	"उप विराम": ":",
	"नई पंक्ति": "\n",
	"नया पैराग्राफ": "\n\n",
	
	// Edge - Version 1.6.2 This should fix "New line." and "New paragraph." for all languages above in Edge
	"|^(\n+)[.?, ]+" : "$1", // Version 1.6.2 - Fix speech: "New line." or "New paragraph."
	"|([.?]) (\n+)[.?, ]+" : "$1$2", // Version 1.6.2 - Fix speech: "How are you today? New paragraph."
	"|[, ]*?(\n+)([.?, ]+)" : "$2$1", // Version 1.6.2 - Fix speech: "This is silly New line." or "Everything is all right, new line."
	"|[,.? ]*([.?!])[,.?]*( )?" : "$1$2", // Version 1.6.2 - Fix speech: "How are you? Question mark." to "How are you?"
	"|, period." : ".", // Version 1.6.2 - Fix speech: "This is terrible, period." to "This is terrible."
};


var replace_obj = {
	"last" : "last", "first" : 1, "second" : 2, "third" : 3, "3rd" : 3,
	"fourth" : 4, "4th" : 4, "fifth" : 5, "5th": 5, "v" : 5, "sixth" : 6, "6th" : 6,
	"seventh" : 7, "7th" : 7, "eighth" : 8, "8th" : 8, "ninth" : 9, "9th" : 9,
	"tenth" : 10, "10th" : 10, "eleventh" : 11, "11th" : 11, "twelfth" : 12, "12th" : 12,
	"thirteenth" : 13, "13th" : 13, "fourteenth" : 14, "14th" : 14, "fifteenth" : 15, "15th" : 15,
	"one" : 1, "two" : 2, "three" : 3, "four" : 4, "five" : 5, "six" : 6, "seven" : 7, "eight" : 8,
	"nine" : 9, "ten" : 10, "twice" : 2, "for" : 4, "to" : 2,
	"login" : "log in|login", "username" : "username|user name", "user id" : "userid|user id",
	"clothe|clothes" : "close", 
	"(\\d+)(th|ème|º|ª|\\.)" : "$1", // Version 1.5.2k - Google Web Speech API kept changing Click on 58" to "58th"
	// Spanish
	"último": "last", "última": "last", "primero": 1, "primera": 1, 
	"segund(o|a)": 2, "tercero": 3, "tercera": 3,
	"cuarto": 4, "cuarta": 4, "quinto": 5, "quinta": 5, "v": 5, "sexto": 6, "sexta": 6,
	"séptimo": 7, "séptima": 7, "octavo": 8, "octava": 8, "noveno": 9, "novena": 9,
	"décimo": 10, "décima": 10, "undécim(o|a)": 11, "11º": 11, "duodécim(o|a)": 12, "12º": 12,
	"decimotercer(o|a)": 13, "13": 13, "decimocuart(o|a)": 14, "14": 14, "decimoquint(o|a)": 15, "15": 15,
	"uno|una|un": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8,
	"nueve": 9, "diez": 10, "once": 11, 
	"trece": 13, "13": 13, "catorce": 14, "14": 14, "quince": 15, "15": 15,
	"dos veces": 2,
	"arriba": "up", "abajo": "down", "superior": "top", "cima": "top", "inferior": "bottom", // Version 1.5.4i and lines below
	"izquierda": "left", "derecha": "right", "completamente": "all the way", 
	"inicio": "home", "fin": "end", "final": "end",
	"veces?" : "time", "palabra": "word", "p[aá]rrafo": "paragraph", "l[ií]nea": "line", 
	"oraci[oó]n": "sentence", "letra": "letter", "car[aá]cter": "character",
	"anterior(es)?": "previous", "siguientes?": "next", "tod[ao]s?" : "all", "ninguno|nada": "none",
	"Copiar": "copy", "Pegar": "paste", "Cortar": "cut",
	"papel": "paper", // Version 1.5.5
	// French
	"dernier": "last", "premier" : 1, "deuxième" : 2, "troisième" : 3, "3(e|ème)" : 3,
	"quatrième" : 4, "4(e|ème)" : 4, "cinquième" : 5, "5(e|ème)": 5, "v" : 5, "sixième" : 6, "6(e|ème)" : 6,
	"septième" : 7, "7(e|ème)" : 7, "huitième" : 8, "8(e|ème)" : 8, "neuvième" : 9, "9(e|ème)" : 9,
	"dixième" : 10, "10(e|ème)" : 10, "onzième" : 11, "11(e|ème)" : 11, "douzième" : 12, "12(e|ème)" : 12,
	"treizième" : 13, "13(e|ème)" : 13, "quatorzième" : 14, "14(e|ème)" : 14, "quinzième" : 15, "15(e|ème)" : 15,
	"un" : 1, "deux" : 2, "trois" : 3, "quatre" : 4, "cinq" : 5, "six" : 6, "sept" : 7, "huit" : 8,
	"neuf" : 9, "dix" : 10, "de" : 2,
	"haut" : "up", "bas" : "down", "gauche" : "left", "droite" : "right", // Version 1.6.0 - And below
	"tout en haut" : "top", "tout en bas" : "bottom",
	"tout" : "all", "accueil" : "home", "fin" : "end", "début" : "start",
	"ligne" : "line", "paragraphe" : "paragraph", "mot" : "word", "phrase" : "sentence",
	"boîte" : "box", "champ" : "field", "papier" : "paper", "fois" : "time",
	"Copier" : "copy", "Couper" : "cut", "Coller": "paste", // Version 1.7.13
	
	// Italian
	"ultimo" : "last", "ultima" : "last", "prim(o|a)" : 1, "second(o|a)" : 2, "terz(o|a)" : 3, "3(a|°)" : 3,
	"quart(o|a)" : 4, "4(a|°)": 4, "quint(o|a)" : 5, "5(a|°)": 5, "v" : 5, "sest(o|a)" : 6, "6(a|°)" : 6,
	"settim(o|a)" : 7, "7(a|°)" : 7, "ottav(o|a)" : 8, "8(a|°)" : 8, "non(o|a)" : 9, "9(a|°)" : 9,
	"decim(o|a)" : 10, "10(a|°)" : 10, "undicesim(o|a)" : 11, "11(a|°)" : 11, "dodicesim(o|a)" : 12, "12(a|°)" : 12,
	"tredicesim(o|a)" : 13, "13(a|°)" : 13, "quattordicesim(o|a)" : 14, "14(a|°)" : 14, 
	"quindicesim(o|a)" : 15, "15(a|°)" : 15,
	"uno|una" : 1, "due" : 2, "tre" : 3, "quattro" : 4, "cinque" : 5, "sei" : 6, "sette" : 7, "otto" : 8,
	"nove" : 9, "dieci" : 10,
	"su|l'alto|alto" : "up", "giù|basso" : "down", // Version 1.6.1 - And below
	"sinistra" : "left", "destra" : "right",
	"(all')?inizio" : "start", "fine" : "end", "cima" : "top", "fondo" : "bottom",
	"tutt[oa] ?" : "all", "completamente ?" : "all the way", "volta|volte" : "time",
	"successivo|successiva" : "next", "precedente" : "previous", 
	"carta|foglio" : "paper", "documento" : "document", "casella" : "box", "campo" : "field",
	"riga|righe|linea|linee" : "line", "parola|parole" : "word", "lettera|lettere" : "letter",
	"frase|frasi" : "sentence", "paragrafo|paragrafi" : "paragraph", 
	
	// Portuguese
	"último": "last", "última": "last", "primeir(o|a)": 1, "segund(o|a)": 2, "terceir(o|a)": 3, "terceiro": 3,
	"quart(o|a)": 4, "4(º|ª)": 4, "quint(o|a)": 5, "5(º|ª)": 5, "v": 5, "sext(o|a)": 6, "6(º|ª)": 6,
	"sétim(o|a)": 7, "7(º|ª)": 7, "oitav(o|a)": 8, "8(º|ª)": 8, "non(o|a)": 9, "9(º|ª)": 9,
	"décim(o|a)": 10, "10(º|ª)": 10, "décim(o|a) primeir(o|a)": 11, "11(º|ª)": 11, "décim(o|a) segund(o|a)": 12, "12(º|ª)": 12,
	"décim(o|a) terceir(o|a)": 13, "13": 13, "décim(o|a) quart(o|a)": 14, "14": 14, "décim(o|a) quint(o|a)": 15, "15(º|ª)": 15,
	"um": 1, "dois": 2, "três": 3, "quatro": 4, "cinco": 5, "seis": 6, "sete": 7, "oito": 8,
	"nove": 9, "dez": 10, "duas": 2,
	// German
	"letzter" : "last", "letzten" : "last", "letzte" : "last", "letztes" : "last",
	"erster" : 1, "ersten" : 1, "erste" : 1, "erstes" : 1,
	"zweiter" : 2, "zweiten" : 2, "zweite" : 2, "zweites" : 2, 
	"dritter" : 3, "dritten" : 3, "dritte" : 3, "drittes" : 3,"3\\." : 3,
	"vierter" : 4, "vierten" : 4, "vierte" : 4,"viertes" : 4, "4\\." : 4,
	"fünfter" : 5, "fünften" : 5,"fünfte" : 5,"fünftes" : 5, "5\\.": 5,  
	"sechster" : 6, "sechsten" : 6, "sechste" : 6, "sechstes" : 6,"6\\." : 6,
	"siebter" : 7, "siebten" : 7, "siebte" : 7, "siebtes" : 7, "7\\." : 7, 
	"achter" : 8, "achten" : 8, "achte" : 8, "achtes" : 8, "8\\." : 8, 
	"neunter" : 9, "neunten" : 9, "neunte" : 9, "neuntes" : 9,"9\\." : 9,
	"zehnter" : 10, "zehnten" : 10, "zehnte" : 10, "zehntes" : 10, "10\\." : 10, 
	"elfter" : 11, "elften" : 11, "elfte" : 11, "elftes" : 11, "elf" : 11, "11\\." : 11, 
	"zwölfter" : 12,"zwölften" : 12,"zwölfte" : 12, "zwölftes" : 12, "12\\." : 12,
	"Dreizehnter" : 13, "Dreizehnten" : 13, "Dreizehnte" : 13, "Dreizehntes" : 13, "13\\." : 13, 
	"Vierzehnter" : 14, "Vierzehnten" : 14, "Vierzehnte" : 14, "Vierzehntes" : 14, "14\\." : 14, 
	"Fünfzehnter" : 15, "Fünfzehnten" : 15, "Fünfzehnte" : 15, "Fünfzehntes" : 15, "15\\." : 15,
	"eins" : 1, "zwei" : 2, "drei" : 3, "vier" : 4, "fünf" : 5, "sechs" : 6, "sieben" : 7, "acht" : 8,
	"neun" : 9, "zehn" : 10, "zweimal" : 2,
	"weiter" : "next", "zurück" : "previous", // Version 1.5.8 and below - weiter = forward. zurück = back.
	"nächste[rsn]" : "next", "vorherige?r?" : "previous", 
	"ganz ?" : "all the way", "papier" : "paper",
	"ganz nach unten" : "bottom", "ganz nach oben" : "top", "oben" : "up", "unten" : "down",
	"links" : "left", "rechts" : "right", "ausblenden" : "hide", "entfernen" : "remove",
	"anfang": "start", "ende": "end", // Version 1.5.9
	
	// Swedish
	"sista": "sista", "första": 1, "andra": 2, "tredje": 3, "3:e": 3,
	"fjärde": 4, "fjärde": 4, "femte": 5, "femte": 5, "sjätte": 6, "sjätte": 6,
	"sjunde": 7, "sjunde": 7, "åttonde": 8, "åttonde": 8, "nionde": 9, "nionde": 9,
	"tionde": 10, "10th": 10, "elfte": 11, "11th": 11, "tolfte": 12, "12th": 12,
	"trettonde": 13, "13th": 13, "fjortonde": 14, "14th": 14, "femtonde": 15, "15th": 15,
	"en": 1, "två": 2, "tre": 3, "fyra": 4, "fem": 5, "sex": 6, "sju": 7, "åtta": 8,
	"nio": 9, "tio": 10, "två gånger": 2, 
	// Japanese
	"最後": "last", "最初": 1, "(第)?一": 1, "(第)?二": 2, "(第)?三": 3, "(第)?四": 4, "(第)?五": 5, "(第)?六": 6,
	"(第)?七": 7, "(第)?八": 8, "(第)?九": 9, "(第)?十": 10, "(第)?十一": 11, "(第)?十二": 12, "(第)?十三": 13,
	"(第)?十四": 14, "(第)?十五": 15,
	"[1一]?番": "all the way", // Version 1.5.9 and below
	"上": "up", "下": "down", "左": "left", "右": "right", "[1一]?番下": "bottom", "[1一]?番上": "top",
	"終了": "end", "最後": "end", "先頭": "home", "最初": "home",
	"紙": "paper", "回": "times", "行": "line", "語": "word", "文字": "letter", "文": "sentence", 
	"段落": "paragraph", 
	"コピー": "copy", "切り取る": "cut", "切り取り": "cut", "貼り付ける?": "paste", // Version 1.7.13
	
	// Chinese Simplified zh-CN
	"最后": "last", "第一": 1, "第1": 1, "第2": 2, "第二": 2, "第三": 3, "第3": 3, 
	"第四次": 4, "第四": 4, "第4": 4, "第五": 5, "第5": 5, "第六": 6,  "第6": 6,
	"第七": 7, "第7": 7, "第八": 8, "第8": 8, "第九": 9, "第9": 9, 
	"十分之一": 10, "第10": 10, "(第)?十": 10, "十一": 11,  "第11": 11, "十二": 12,  "第12": 12, 
	"(第)?十三": 13,  "第13": 13, "(第)?十四": 14, "(第)?14(次)?": 14, "(第)?十五": 15, "第15": 15, 
	"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, 
	"九": 9, "十": 10, "两次?": 2, 
	"复制" : "copy", "剪切" : "cut", "粘贴" : "paste", // Version 1.7.13
	// Chinese Traditional zh-TW
	"最後": "last", "第一": 1, "第二": 2, "第三": 3, "第3": 3, 
	"第四次": 4, "第四": 4, "第五": 5,  "第六": 6, 
	"第七": 7, "第7": 7, "第八": 8, "第8": 8, "第九": 9, "第9": 9, 
	"十分之一": 10, "第10": 10, "(第)?十": 10, "十一": 11, "十二": 12,  
	"第十三": 13, "十四": 14, "第14次": 14, "十五": 15, 
	"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, 
	"九": 9, "十": 10, "兩次?": 2, 
	"复制": "copy", "剪切": "cut", "粘贴|贴上|貼上" : "paste", // Version 1.7.13
	
	// Hindi - Version 1.7.2 
	"अंतिम": "last", "पहले": 1, "दूसरे": 2, "तीसरे": 3, "चौथे": 4, "पांचवें": 5, "छठे": 6,
	"सातवें": 7, "आठ": 8, "नौवें": 9, "दसवें": 10, "ग्यारहवें": 11, "बारहवें": 12, "तेरहवें": 13, "चौदहवें": 14, "पन्द्रहवें": 15, 
	"एक" : 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "छह": 6, "सात": 7,  
	"आठ": 8, "नौ": 9, "दस": 10, "ग्यारह": 11, "बारह": 12, "तेरह": 13, "चौदह": 14, "पंद्रह": 15,
	"होम|घर": "home", "अंत|एंड|समाप्ति": "end", "अप|ऊपर": "up", "नीचे|डाउन": "down", "बाएं|बाएँ|बायां|बाईं|लेफ्ट|बाया|बाय|माया": "left", "दाएं|दाएँ|दायां|दायाँ|नया|दया": "right",
	"शीर्ष|शीश": "top", "सबसे|सभी|बहुत|तक|ओर": "all the way", "अंतिम": "last", "प्रारंभ|शुरुआत": "start",
	"बार": "times", "लाइन": "line", "पंक्तियों": "line", "शब्द": "word", "अक्षर": "letter", "वाक्य": "sentence",
	"पैराग्राफ़": "paragraph", "दस्तावेज़": "document", "बॉक्स": "box", "अगला": "next", "पिछला": "previous", // Version 1.7.5 - Changed Hindi next. Was incorrect
	
}


function command_search(speech)
{
	if (sra.settings.disable_commands) return(false); // 8/21/2017 - Version 0.98.9
	var cmd_list = "";
	//var speech = that.value;
	speech = speech.replace(/^ /, ""); // Remove space from beginning of text if it exists	
	var found = false;
	if (isEdge) { // Version 1.6.2 - Correct Edge auto punctuation
		speech = speech.replace(/(^¿| ?[.?,]|[。？、，])$/g, ""); // Version 1.6.2 - Remove period or question mark at end of text if it exists for Edge. [。？、] are Japanese and Chinese. The space before a question mark is for French. 
		speech = speech.replace(/[,]/g, ""); // Version 1.6.8 - Added , because Edge changes "Click on easy fluffy pancakes" to "Click on easy, fluffy pancakes".
	}
	var re; // reg expression
	for (var i = 0; i < sra.commands.length; i++) // loop through commands
	{
		if (sra.commands[i].phrase)
		{
			//cmd_list += '<br>"'+sra.commands[i].phrase+'" : "'+sra.commands[i].action+'"';
			var phrase = sra.commands[i].phrase;
			phrase = "^(" + phrase + ")$"; // Version 1.2.6 - 3/4/2019 // Version 1.5.3 - Added from custom_command_search
			try { // Version 1.5.3 - Added from custom_command_search
				re = new RegExp(phrase,'i'); // insensitive case search: 'i'; beginning of string: ^
			} catch(err) { 
				console.log(err);
				send_to_content({ "interim" : err.message });
				document.getElementById('error').innerHTML = "Command Regex error: "+err.message;
			}
			// re = new RegExp(phrase,'i'); // insensative case search: 'i'; beginning of string: ^ // Version 1.5.3 - Replaced with above in try {}
			var matches = speech.match(re);
			if (matches)
			{
				matches.shift(); // Version 1.5.3 - Added from custom_command_search
				found = true; // We found a speech command. 
				console.log("Speech: "+speech); // Version 1.3.8 - Removed if (test_mode)
				console.log("Phrase Found: "+sra.commands[i].phrase); // Version 1.3.8 - Removed if (test_mode)
				console.log("Action Found: "+sra.commands[i].action); // Version 1.3.8 - Removed if (test_mode)
				console.log("Matches: "+JSON.stringify(matches)); // Version 1.3.8 - Removed if (test_mode)
				if (document.getElementById('info_box')) { // Version 1.5.2
					document.getElementById('info_box').innerHTML += " <b>Phrase Found:</b> "+sra.commands[i].phrase;
					document.getElementById('info_box').innerHTML += " <b>Action Found:</b> "+sra.commands[i].action;
				}
				if (sra.commands[i].action)
				{		
					var option;
					var command; // Version 1.5.2 - Adding a bunch from custom_command_search() for languages to easily have action "switch_fields(next, keyword)"
					var action = sra.commands[i].action; // Version 1.5.2
					if (sra.commands[i].action.match(/\(/)) // If there is a (
					{
						command = action.split('(')[0]; // switch_tabs(left) = switch_tabs
						option = sra.commands[i].action.split("(")[1].slice(0, -1); // switch_tabs(left) = "left"
						option = option.split(/\s*,\s*/); // Version 1.5.2 - Split by , 
						for (var o = 0; o < option.length; o++) { // Version 1.5.2
							if (option[o] == "keyword") {
								// option = []; // Version 1.5.2 - Removed
								for (var a = 0; a < matches.length; a++)
								{
									if (a > 0 && matches[a] != null && matches[a] != "")
									{
										var keyword = matches[a];
										//if (replace_obj.hasOwnProperty(keyword.toLowerCase())) // Version 1.5.2 - Removed
										//	keyword = replace_obj[keyword.toLowerCase()]; // Replace First or 1st with '1', etc...
										for (var replace_obj_key in replace_obj) {// Version 1.5.2 - Replace First or 1st with '1' using regex
											var replace_obj_re = new RegExp("^(?:"+replace_obj_key+")$", "i"); // Version 1.5.2k - Added ?: to not remember first match
											if (test_mode && keyword.match(replace_obj_re)) console.log(replace_obj_re);
											keyword = keyword.replace(replace_obj_re, replace_obj[replace_obj_key]); 
										}
										if (a == 1) // Version 1.5.2
											option[o] = keyword; // Version 1.5.2
										else // Version 1.5.2
											option.push(keyword);
									}
								}	
							}
						} // Version 1.5.2
						for (var o = 0; o < option.length; o++) // Version 1.5.2 - Remove null options
							if (option[o] == null || option[o] == "keyword") 
								option.splice(o, 1);
						if (test_mode) console.log(option);
					}
					
					if (document.getElementById('info_box') && option) { // Version 1.5.2
						document.getElementById('info_box').innerHTML += " <b>Action with Keywords:</b> "+sra.commands[i].action.split('(')[0]+"("+option.join(", ")+")";
					}
						
					/*if (sra.commands[i].action.match(/switch_tabs/i)) 
						switch_tabs(option);
					else if (sra.commands[i].action.match(/url/i)) 
						url(option); */
					
					if (window[sra.commands[i].action.split('(')[0]])
						window[sra.commands[i].action.split('(')[0]](option);
					else {
						send_to_content({ "command" : sra.commands[i].action.split('(')[0], "option" : option, "date" : new Date().getTime() }); // Version 1.3.9 - Added "date" : new Date().getTime()
						/*var speech_iframe = document.getElementById("speech_iframe").contentDocument; // Version 1.7.6
						if (speech_iframe.defaultView.window[sra.commands[i].action.split('(')[0]]) { // Version 1.7.6 - Call function in speech_iframe content.js
							speech_iframe.defaultView.window['sra_date'] = new Date().getTime();
							speech_iframe.defaultView.window[sra.commands[i].action.split('(')[0]](option); // Version 1.7.6
						}	*/
						
					}
					// Version 1.5.2 - Replaced above with below taken from custom_command_search() // Reverted back to above because below didn't work well
					/*var action_seconds = 0;
					if (window[command]) {
						(function(command, option) { setTimeout(function() { window[command].apply(this, option); }, action_seconds); })(command, option); // Wait to make sure tab is loaded first
								action_seconds += 500; // The next commands don't have to take as long to run (250 ms after 1000 is already run)
					}
					else {
						if ( (action.split('(').length -1) >= 2) { // Version 1.3.0 - If multiple ( then send entire action. e.g. document.querySelectorAll(".r")[$1].click() 
							command = action; option = [];
						}
						(function(command, option) { setTimeout(function() { send_to_content({ "command" : command, "option" : option, "date" : new Date().getTime() }); }, action_seconds); })(command, option); // Wait to make sure tab is loaded first	// Version 1.3.9 - Added "date" : new Date().getTime()		
						action_seconds += 500; // The next commands don't have to take as long to run
					}*/
					
					/*else if (sra.commands[i].action.match(/switch_fields/i)) 
						send_to_content({ "command" : "switch_fields", "option" : option });
					else if (sra.commands[i].action.match(/switch_focus/i)) 
						send_to_content({ "command" : "switch_focus", "option" : option });
					else if (sra.commands[i].action.match(/click_keyword/i)) 
						send_to_content({ "command" : "click_keyword", "option" : option });
					else if (sra.commands[i].action.match(/enter_key/i)) 
						send_to_content({ "command" : "enter_key"});
					else if (sra.commands[i].action.match(/spacebar/i)) 
						send_to_content({ "command" : "spacebar"}); */
				}
				break;
			}
		}
	}
	return(found);
}


function custom_command_search(speech)
{
	var new_tab = false;
	var cmd_list = "";
	//var speech = that.value;
	speech = speech.replace(/^ /, ""); // Remove space from beginning of text if it exists	
	var found = false; 
	var word_replace_found = false; // Version 1.2.6
	if (document.getElementById('error').innerHTML.match(/custom command error/i)) // Version 1.6.4
		document.getElementById('error').innerHTML = ""; // Wipe out error as we start going through custom commands
	
	var re; // reg expression
	for (var i = 0; i < sra.custom_commands.length; i++) // loop through commands
	{
		if (sra.custom_commands[i].phrase && sra.custom_commands[i].enable && sra.custom_commands[i].action)
		{
			// if user said "in a new tab"
			if (speech.match(/new tab$/))
			{
				speech = speech.replace(/(?: in | and )?(?:a )?(new tab)?$/, "");
				new_tab = true;
			}
					
			//cmd_list += '<br>"'+sra.commands[i].phrase+'" : "'+sra.commands[i].action+'"';
			var phrase = sra.custom_commands[i].phrase;
			phrase = phrase.replace(/^\s*/g, ''); // Version 1.0.4 - Steve Axtell was putting " http:..." for action. Remove space
			var word_replace = (phrase.match(/^\\b.*?\\b$/)) ? sra.custom_commands[i].action : false; // Version 1.2.6 - if phrase starts and ends with \b
			if (sra.custom_commands[i].action.match(/replace_word/i)) {
				word_replace = sra.custom_commands[i].action.match(/replace_word\((.*?)\)/i); // Or can have action: replace_word(okay);
				if (word_replace && word_replace.length > 1) {
					word_replace = word_replace[1]; // Convert "replace_word(okay)" to "okay"
					//phrase = "\\b(?:" + phrase + ")(?:$|\\b|\\s*?)"; // Version 1.2.9 - Added () to prevent "Custom command error: Invalid regular expression: /\btimes|*\b/: Nothing to repeat" // Version 1.4.4b - Added ?: so can remember match with $1 instead of $2 // Version 1.5.3 - Changed \\b to (?:$|\\b|\\s*?) to match swear words like b****
					//phrase = "(?=^|\\b|\\W)(?:" + phrase + ")(?=$|\\b|\\s|[.!?])"; // Version 1.5.5 - To match k** but not k*****. ?= is positive lookahead. It sees if the following is true but it doesn't become part of the match // Version 1.5.8 - Changed \\b to (?=^|\\b) in order to match él at beginning of a phrase \\ Version 1.6.6 - Add \\W because él was not matching in the middle of a phrase
					phrase = word_boundary + "(?:" + phrase + ")" + word_boundary.replace("<", ""); // Version 1.7.2 - Use new word_boundary variable. Remember that < needs to be replaced for the end word boundary
				}
			}
			//if (phrase.charAt(0) != "^") phrase = "^"+phrase; // Make sure phrase starts with ^
			//if (phrase.charAt(phrase.length-1) != "$") phrase = phrase+"$"; // Make sure phrase ends with $
			/* Version 1.2.6 - 3/4/2019 - phrase needs to be surrounded with ^( and )$ otherwise ^hi|hello$
				will match "hi there" and "well hello" without wanting it to. Also I found out that ^ and $ can be added even if already there
			*/
			if (!word_replace) phrase = "^(" + phrase + ")$"; // Version 1.2.6 - 3/4/2019
			try { // Version 0.99.7
				if (word_replace) // Version 1.5.5
					re = new RegExp(phrase,'ig'); // Version 1.5.5 - Added g for replace_word() to be global
				else
					re = new RegExp(phrase,'i'); // insensitive case search: 'i'; beginning of string: ^ 
			} catch(err) { 
				console.log(err);
				err.message = err.message.replace(/^(.*?): \/.*\/:(.*?)$/, "$1: /"+sra.custom_commands[i].phrase+"/:$2"); // Version 1.6.4 - "Invalid regular expression: /(?=^|\b)(?:****)(?=$|\b|\s|[.!?])/: Nothing to repeat" to "Invalid regular expression: /****/: Nothing to repeat
				send_to_content({ "interim" : err.message });
				document.getElementById('error').innerHTML = "Custom command error. "+err.message; // Version 1.6.4 - Confusing for user to see the phrase with my start and end additions
			}
			var matches = speech.match(re);
			if (matches)
			if (word_replace) { // Version 1.2.6
				speech = speech.replace(re, word_replace); // Version 1.0.4 - Allow word replace in sr.html text box
				found = speech; word_replace_found = true;
				if (test_mode) console.log("word_replace: "+phrase+": "+sra.custom_commands[i].action+": "+speech);
				if (document.getElementById('info_box')) { // Version 1.5.2
					document.getElementById('info_box').innerHTML += " <b>Custom Phrase Found:</b> "+sra.custom_commands[i].phrase;
					document.getElementById('info_box').innerHTML += " <b>Action Found:</b> "+sra.custom_commands[i].action;
				}
			}
			else
			{
				matches.shift(); // Version 1.2.6 - Remove first match because now pos 0 and 1 are the same since we added () around the phrase
				word_replace_found = false; // Version 1.3.0 - Added so that speech is not sent twice on line 469 and 481
				if (found == false) // Version 1.3.0 - Added so that word replace works along with another found action
					found = true; // We found a speech command. 
				console.log("Speech: "+speech);
				console.log("Phrase Found: "+sra.custom_commands[i].phrase);
				console.log("Action Found: "+sra.custom_commands[i].action);
				console.log("Matches: "+JSON.stringify(matches));
				if (document.getElementById('info_box')) { // Version 1.5.2
					document.getElementById('info_box').innerHTML += " <b>Custom Phrase Found:</b> "+sra.custom_commands[i].phrase;
					document.getElementById('info_box').innerHTML += " <b>Action Found:</b> "+sra.custom_commands[i].action;
				}
				if (sra.custom_commands[i].action)
				{

					// Replace $0 $1 $2 ... with matches[0] matches[1] ...
					var action = sra.custom_commands[i].action;
					for (s = 0; s < matches.length; s++)
					{
						var string_num = s;
						var num_re = new RegExp("\\$"+string_num,'ig'); // Version 1.0.9 - Added g for global replace
						if (!matches[s]) matches[s] = ""; // Version 0.98.2 Added 12/11/2016 because if optional match is not there it was showing as null and ending up as undefined
						else {
							//if (replace_obj.hasOwnProperty(matches[s].toLowerCase())) // Version 0.99.7 // Version 1.5.2 - Removed
							//	matches[s] = replace_obj[matches[s].toLowerCase()]; // Replace First or 1st with '1', etc...
							for (var replace_obj_key in replace_obj) {// Version 1.5.2 - Replace First or 1st with '1' using regex
								var replace_obj_re = new RegExp("^(?:"+replace_obj_key+")$", "i"); // Version 1.5.2k - Added ?: to not remember that match
								matches[s] = matches[s].replace(replace_obj_re, replace_obj[replace_obj_key]); 
							}
						}
						action = action.replace(num_re, matches[s]);
					}	
					
					if (document.getElementById('info_box') && matches) { // Version 1.7.6 - Added from command_search() above
						document.getElementById('info_box').innerHTML += " <b>Action with Keywords:</b> "+action;
					}

					var option; var command;
					var action_seconds = 0; 
					//var action = action.replace(/print_text *?\((.*)\)/g, function (match, capture) { // Version 0.99.8 - Resolve print_text() command
					var action = action.replace(/(?:print_text|insertText|script) *\((?<params>(([^)(]|\(*([^)(]|\([^)(]*\))*\))*))\)/g, function (match, capture) { // Version 1.3.0 - Resolve print_text() command with recursive parenthesis // Version 1.5.2 - Added |insertText
						// match = print_text ("<text>;")	capture = "<text>;"
						console.log(capture);
						var encodedStr = capture.replace(/[\u0021-\u9999<>\&\(\)]/gim, function(i) {
   							return '&#'+i.charCodeAt(0)+';'; // replace unicode 00A0-9999<>&() with html entity
						});
						encodedStr = encodedStr.replace(/;/g, "%3B"); // replace ; with %3B
						if (match.match(/^script/i)) // Version 1.3.0
							encodedStr = "script(" + encodedStr + ")";
						if (match.match(/^(print_text|insertText)/i)) // Version 1.5.2 - Because print_text was printing &#115; etc. in contentEditible because content.js was using insertText lately
							encodedStr = "insertHTML(" + encodedStr + ")";
						return encodedStr;
					});
					
					action = action.replace(/(^|[^\\])\\n/g,'$1\n'); // Version 1.5.2 - Convert string \n to new line \n unless it is escaped as \\n
					action = action.replace(/\\u([a-fA-F0-9]{4})/g, function(match, capture) { // Version 1.5.2 - Replace Unicode Escape Sequences in Strings \u2665 becomes heart: https://mathiasbynens.be/notes/javascript-escapes#unicode
						//console.log("Match:"+match, "capture:"+capture); 
						return String.fromCodePoint(parseInt(capture, 16)); 
					});
					action = action.replace(/\\u\{([0-9a-fA-F]{1,})\}/g, function(match, capture) { // Version 1.5.2 - Replace Extended Unicode Escapes in Strings \u{1F302} umbrella
						//console.log("Match:"+match, "capture:"+capture); 
						return String.fromCodePoint(parseInt(capture, 16)); 
					});
					
					
					if (test_mode) console.log(action);	
					var split_action = action.split(/\s*;\s*/); // Split action by ";" - Version 0.99.7 - changed to regex for optional spaces
					//var split_action = action.split(/\s*;\s*(?!([^()\"\']|[(][^()\"\'])*[\)\"\'])/); // Version 1.5.2 - Split by ";" not in nested parentheses or quotes https://regex101.com/r/QulRhd/1/
					for (var a = 0; a < split_action.length; a++) if (typeof split_action[a] !== "undefined") { // Version 1.5.2 - Added if (typeof split_action[a] !== "undefined") because regex split leaves undefined array items
						//action = unescape(split_action[a]); // Version 0.99.7 - Added unescape so %3B = ;
						action = split_action[a].replace(/%3B/g, ";"); // Version 0.99.7 - Replace %3B with ;
						if (action.match(/^\s*((https?|ftp|file)\:\/\/)/)) // if http or ftp or version 0.98.3 "file" 12/27/2016
						{
							// Go to url
							action = action.replace(/^\s*/g, ''); // Version 1.0.4 - Steve Axtell was putting " http:..." for action. Remove space
							url(action, new_tab);
							action_seconds += 1000; // Make sure next command waits for the tab to load first
						}
						else if (action.indexOf("(") != -1)
						{
							if (action.substr(-1) == ")") // Version 1.3.0 - Only remove ( if ) is the last character
								command = action.split('(')[0]; // switch_tabs(left) = switch_tabs
							else command = action; // Version 1.3.0 - else send entire action to content for inject_script()
							command = command.replace(/^\s*/g, ''); // Version 1.0.4 - Steve Axtell was putting " http:..." for action.
							command = command.replace(/%28/g, "("); // Version 0.99.7 - Replace %28 with ( 
							command = command.replace(/%29/g, ")"); // Version 0.99.7 - Replace %29 with ) 
							if (test_mode) console.log("Command: "+command); // Version 1.5.6
							// option = action.split("(")[1].slice(0, -1); // switch_tabs(left) = left
							option = ""; // Version 1.3.0
							if (action.substr(-1) == ")") // Version 1.3.0 - Only remove ) if it is the last character
								option = action.split(/\((.+)/)[1].slice(0, -1); // Version 0.99.7 - split at \( but only first occurrence. eval(document.execCommand("copy")) = document.execCommand("copy")
							option = option.replace(/%28/g, "("); // Version 0.99.7 - Replace %28 with (
							option = option.replace(/%29/g, ")"); // Version 0.99.7 - Replace %29 with )
							//option = option.split(/\s*,\s*/); // Version 0.99.7 - Split by , and added .apply(this, below
							option = option.split(/\s*,\s*(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/); // Version 1.7.6 - Split by comma , not in double quotes
							for (var o = 0; o < option.length; o++) {
								//option[o] = option[o].replace(/^["']|["']$/g, ""); // Version 0.99.7 - Remove quotes or single quotes at beginning and end if there
								option[o] = option[o].replace(/%2C/g, ","); // Version 1.7.6 - Replace %2C with ,
								if (option[o].charAt(0) == '"' && option[o].charAt(option.length-1) == '"') // Version 1.7.6 - Only if it begins and ends with quotes then
									option[o] = option[o].replace(/^["]|["]$/g, ""); // Version 1.7.6 - Remove quotes from beginning and end
								if (option[o].charAt(0) == "'" && option[o].charAt(option.length-1) == "'") // Version 1.7.6 - Only if it begins and ends with quotes then
									option[o] = option[o].replace(/^[']|[']$/g, ""); // Version 1.7.6 - Remove single quotes from beginning and end
							}	
							if (test_mode) console.log("Option: ", option); // Version 1.5.6
							//var splt = command.split("."); // Version 1.3.0 - Was in content.js
							var splt = command.match(/(.*)\.(.*)/); // Version 1.3.0a - Split at last period only
							if (splt)
								splt.shift(); // Version 1.3.0a - Remove first element from array which is the entire match. We just want the last two elements
							if (window[command]) {
								(function(command, option) { setTimeout(function() { window[command].apply(this, option); }, action_seconds); })(command, option); // Wait to make sure tab is loaded first
								action_seconds += 500; // The next commands don't have to take as long to run (250 ms after 1000 is already run)
							}
							else if (splt && splt.length == 2 && splt[0][splt[1]]) { // Version 1.3.0 - Was in content.js
								var phrase = splt[0][splt[1]](option); // Works with: ibm.toUpperCase()
								if (test_mode) console.log("2: "+phrase);
								action = phrase;
								(function(action) { setTimeout(function() { send_to_content({ "speech" : action, "date" : new Date().getTime() }); }, action_seconds); })(action); // Wait to make sure tab is loaded first	// Version 1.9.3 - Added "date" : new Date().getTime()	
								found = action; // Version 1.0.4 - Allow word replace in sr.html text box
								if (found == "") found = true; // Version 1.2.8 - Otherwise sr.js prints out the entire command if there is a blank command such as two ;; Example: PHRASE: (.*?)?(capitalized?) (.*?)  ACTION: $1;capitalize_first_letter($3)
								action_seconds += 500; // The next commands don't have to take as long to run
							}
							else {
								if ( (action.split('(').length -1) >= 2) { // Version 1.3.0 - If multiple ( then send entire action. e.g. document.querySelectorAll(".r")[$1].click() 
									command = action; option = [];
								}
								(function(command, option) { setTimeout(function() { send_to_content({ "command" : command, "option" : option, "date" : new Date().getTime() }); }, action_seconds); })(command, option); // Wait to make sure tab is loaded first	// Version 1.3.9 - Added "date" : new Date().getTime()		
								action_seconds += 500; // The next commands don't have to take as long to run
							}
						}
						else {
							if (test_mode) console.log(action);
							action = action.replace(/%28/g, "("); // Version 0.99.7 - Replace %28 with (
							action = action.replace(/%29/g, ")"); // Version 0.99.7 - Replace %29 with )
							if (action != "")  // Version 1.3.0 - Added if (action!= "") Otherwise it might try to click on an input element even though there is no text
								(function(action) { setTimeout(function() { send_to_content({ "speech" : action, "date" : new Date().getTime() }); }, action_seconds); })(action); // Wait to make sure tab is loaded first	// Version 1.3.9 - Added "date" : new Date().getTime()	
							found = action; // Version 1.0.4 - Allow word replace in sr.html text box
							if (found == "") found = true; // Version 1.2.8 - Otherwise sr.js prints out the entire command if there is a blank command such as two ;; Example: PHRASE: (.*?)?(capitalized?) (.*?)  ACTION: $1;capitalize_first_letter($3)
							action_seconds += 500; // The next commands don't have to take as long to run		
						}
					}
				}
				break;
			}
		}
	}
	if (word_replace_found)  {
		send_to_content({ "speech" : speech, "date" : new Date().getTime() }); // Version 1.2.6 // Version 1.3.9 - Added "date" : new Date().getTime()
	}
	return(found);
}


function switch_tabs(option)
{
	var nextTab = null; 
	if (Array.isArray(option)) option = option[0];
	if (option == null || option == "") option = "next"; // Version 0.99.7
	// First get currently active tab
	chrome.tabs.query({ currentWindow: true, active: true}, function (tabs) {
		var currentId = tabs[0].id;
		var currentIndex = tabs[0].index; // index is 0 to the number of tabs in window
		// Second get all the tabs in the current window
	  	chrome.tabs.query({currentWindow: true}, function (tabs) {
        	var numTabs = tabs.length;
        	if (isNaN(option)) // if option is a string and not a number
        	{
				if (option.match(/^(right|next|siguiente|weiter|prossima)/i)) nextTab = currentIndex + 1;
	        	else if (option.match(/^(left|previous|anterior|zurück|precedente)/i)) nextTab = currentIndex - 1;
	        	else if (option.match(/^last$/i)) nextTab = tabs.length - 1;
	        	else if (option.match(/^close|remove|cerrar|cierra|schließen|entfernen|chiudi|elimina$/i)) chrome.tabs.remove(currentId);
	        }
	        else // if option is a number
	        {
	        	nextTab = option - 1; // Go to that tab number (Remember that first tab is 0)
	        }
        	if (nextTab >= tabs.length) nextTab = 0;
        	else if (nextTab < 0) nextTab = tabs.length - 1;
        	if (isNaN(option)) // if option is a string and not a number
        	{
				for (var i=0; i < tabs.length; i++)
	        	{
	        		// Search for tab url or title with keywords with and without spaces: sea breeze computers, seabreezecomputers
					//var re = new RegExp("^(https?:\/\/)?(www\.)?"+option,'i'); // Version 1.2.7 - Removed
	        		//var re_no_spaces = new RegExp("^"+option.replace(" ",""),'i'); // Version 1.2.7 - Removed
					var re = new RegExp(option,'i'); // Version 1.2.7 - Added
	        		var re_no_spaces = new RegExp(option.replace(" ",""),'i'); // Version 1.2.7 - Added
					if (tabs[i].url.match(re) || tabs[i].url.match(re_no_spaces) || tabs[i].title.match(re))
					{
						nextTab = i;
						if (i != currentId) break; // break for loop if we found a new tab
					}
					if (test_mode) console.log("id:"+tabs[i].id+". index: "+tabs[i].index+". url: "+tabs[i].url.substring(0, 15)+". title: "+tabs[i].title); 
				}
			}
			// finally, get the index of the tab to activate and activate it
        	if (nextTab != null)
				chrome.tabs.update(tabs[nextTab].id, {active: true});

		});
	});
}


function url(keyword, new_tab, focused)
{
	if (test_mode) console.log(keyword, new_tab, focused);
	var name = false; // Version 1.5.2 - Let tabs have a name
	window['tabs_array'] = window['tabs_array'] || []; // Version 1.5.2 - Let tabs have a name
	if (focused) { // Version 1.5.4j
		if (String(focused).match(/^(1|true)$/)) focused = true;
		else focused = false; // If another language says in the background then focused should be false
	}
	else focused = true; // end Version 1.5.4j - If they say nothing then focused should be true
	//var focused = focused || true; // Version 1.5.2 // Version 1.5.4j - Commented out 3 lines
	//if (String(focused).match(/^(0|false|background)$/)) focused = false;
	//else focused = true;
	var new_tab = (typeof new_tab === 'undefined') ? false : new_tab;
	if (String(new_tab).match(/^(new|nov|nuev|neu|ny|nou)|^(_blank|1|true)$/)) new_tab = true; // Version 1.5.2
	else if (String(new_tab).match(/^(0|false)$/)) new_tab = false; // Version 1.5.2
	else name = String(new_tab); // Version 1.5.2
	var new_tab_url = "https://www.google.com/"; // Version 1.1.2
	var homepage = false;
	var currentId;
	var currentIndex;
	var currentURL; // Version 1.5.2 
	// Version 0.99.7 - Added || keyword == "" below so that url() will open a new tab
	if (typeof keyword === "undefined" || keyword == "") { new_tab = true; keyword = new_tab_url; } // Version 1.1.2 - Was https://www.google.com/_/chrome/newtab - // Version 0.99.0 - Was chrome://newtab/
	//console.log(typeof keyword);
	if (Array.isArray(keyword)) 
	{
		for (var a = 1; a < keyword.length; a++)
		{	
			if (keyword[a].match(/new|nov|nuev|neu|ny|nou|_blank/)) new_tab = true; // Version 1.5.2 - Added |_blank
			else name = keyword[a]; // Version 1.5.2
			if (a == 1) // Version 1.5.2
				if (keyword[a].match(/^(0|false)$/)) new_tab = false; 
			if (a == 2) // Version 1.5.2
				if (keyword[a].match(/^(0|false)$/)) focused = false; 
		}
		if (keyword[0].match(/home( *?)page/)) { homepage = true; keyword = new_tab_url; } // Version 1.1.2 - Was https://www.google.com/_/chrome/newtab - // Version 0.99.0 - Was chrome://newtab/
		else keyword = "http://" + keyword[0].replace(/ /gi, ""); // Turn into url
		if (test_mode) console.log(keyword);
	}
	else if (keyword.match(/home( *?)page/)) { homepage = true; keyword = new_tab_url; } // Version 1.1.2 - Was https://www.google.com/_/chrome/newtab - // Version 0.99.9
	else if (!keyword.match(/^(http|ftp|file)/i)) keyword = "http://" + keyword; // Version 0.99.7 // Version 1.0.4 - Forgot to have |ftp|file here
	
	// First get currently active tab
	chrome.tabs.query({ currentWindow: true, active: true}, function (tabs) {
		currentId = tabs[0].id;
		currentIndex = tabs[0].index; // index is 0 to the number of tabs in window
		currentURL = tabs[0].url; // Version 1.5.2
		// Don't change url of Speech Recognition tab
		//if (tabs[0].url.match(/sr.html/i) || tabs[0].title.match(/speech/i))
		if (tabs[0].url == window.location.href) // if current tab is the speech recognition tab
			new_tab = true;
		
		// Second get all the tabs in the current window
	  	chrome.tabs.query({currentWindow: true}, function (tabs) {	// Version 1.5.2
			if (name) { // If the tab was given a name
				if (name.match(/^(http|ftp|file)/i)) { // If new_tab matches a url
					var re = new RegExp("^("+name+")",'i');
					if (test_mode) console.log(re, tabs, new_tab, focused);
					if (!currentURL.match(re)) {
						for (var t = 0; t < tabs.length; t++) {
							if (tabs[t].url.match(re)) {
								currentId = tabs[t].id;
								new_tab = false;
							}
						}
					} // else it will open in active tab because currentId is active tab with same url as name
					else {
						new_tab = false;
					}
				}
				else { // if new_tab is a name and not a website
					for (var t = 0; t < tabs.length; t++) {
						if (tabs_array[name] == tabs[t].id) {
							currentId = tabs[t].id;
							new_tab = false;
						}
					}
				}
			}
			
			if (new_tab)
			{	
				chrome.tabs.create({"url":keyword,"active":focused}, function(tab){ // Version 1.5.2 - Changed true to focused
			        if (name) // Version 1.5.2
						tabs_array[name] = tab.id;
					/* tab_id = tab.id;
			        tab_url = tab.url;
			        updateBadge(); */
					currentId = tab.id; // Version 1.7.3 - For use with window["background_tab"] below
					/* 	Version 1.7.3 - If focused is false and user has extra commands then 
						previously it would send the extra commands to SRA tab and do nothing.
						So let's make it have a background_tab for a few seconds that 
						send_to_content() can use.
					*/
					if (!focused) {
						window["background_tab"] = currentId;
						if (test_mode) console.log(window["background_tab"]);
						clearTimeout(window["bg_tab_timer"]);
						window["bg_tab_timer"] = setTimeout(function() { window["background_tab"] = null; }, 5000); // Only set for 5 seconds
					}
			    });
			}
			else
			{
				// Change url of current tab
				chrome.tabs.update(currentId, {"url": keyword, "active": focused }); // Version 1.5.2 - Added , "active": focused
				/* 	Version 1.7.3 - If focused is false and user has extra commands then 
					previously it would send the extra commands to SRA tab and do nothing.
					So let's make it have a background_tab for a few seconds that 
					send_to_content() can use.
				*/
				if (!focused) {
					window["background_tab"] = currentId;
					if (test_mode) console.log(window["background_tab"]);
					clearTimeout(window["bg_tab_timer"]);
					window["bg_tab_timer"] = setTimeout(function() { window["background_tab"] = null; }, 5000); // Only set for 5 seconds
				}
			}
					
		}); // Version 1.5.2 Close get all tabs loop
	});
		

}


function play(keyword, new_tab)
{
	var new_tab = (typeof new_tab === 'undefined') ? false : new_tab;
	var homepage = false;
	var currentId;
	var currentIndex;
	if (typeof keyword === "undefined") { new_tab = true; keyword = "chrome://newtab/"; }
	//console.log(typeof keyword);
	if (Array.isArray(keyword)) 
	{
		for (var a = 2; a < keyword.length; a++)
		{	
			if (keyword[a].match(/new|nov|nuev|neu|ny|nuova/i)) new_tab = true; 
		}
		if (keyword[0].match(/home( *?)page/)) { homepage = true; keyword = "chrome://newtab/"; }
		else keyword = "https://www.youtube.com/results?search_query=" + keyword[1]; // Turn into url. btnI = I'm feeling lucky btn
		if (test_mode) console.log(keyword);
	}
	else // Version 0.99.7 - If keyword is a string
		keyword = "https://www.youtube.com/results?search_query=" + keyword; // Version 1.2.7
	
	if (new_tab) {	
			chrome.tabs.create({"url":keyword, active:true});
	}
	else {
		// First get currently active tab
		chrome.tabs.query({ currentWindow: true, active: true}, function (tabs) {
			if (!tabs[0].url.match(/https?:\/\/(www\.)?youtube\./i)) { // Version 1.2.7 - if current tab is not youtube.com	
				chrome.tabs.query({currentWindow: true}, function (tabs) { // Version 1.2.7 - Search for youtube tab
					var re = new RegExp("(youtube|youtu.be)",'i');
					for (var i=0; i < tabs.length; i++)
					{
						if (test_mode) console.log(tabs[i].url);
						// Search for tab url or title with keywords: youtube or youtu.be	
						if (tabs[i].url.match(re) || tabs[i].title.match(re))
						{
							chrome.tabs.update(tabs[i].id, {"url": keyword, active: true});
							break; // break for loop if we found a youtube tab
						}	
					}
					if (i >= tabs.length) // if we did not find a youtube tab
						chrome.tabs.create({"url":keyword, active:true});
				});
			}	
			else { // update current tab since it is youtube
				chrome.tabs.update({"url": keyword, active: true});			
			}
		});	
	}
	
	setTimeout(function() { 
		send_to_content({ "command" : "click_element", "option" : "thumbnail" }); // Click on first thumbnail at youtube.com
	}, 1000);

}


function set_language(keyword) {
	// Set language with your voice - Version 0.98.8
	
	var re = new RegExp("^"+keyword,'i');
	// Look for language in form
	for (var i = 0; i < document.settings_form.select_language.length; i++) { // Version 1.6.1 - Replaced languages with document.settings_form.select_language
		if (document.settings_form.select_language.options[i].text.match(re)) {
			document.settings_form.select_language.selectedIndex = i;
			break;
		}
	}
	if (i == languages.length) { // Version 1.6.1 - if so then the language was not found in the form
		// so look for the language in the languages object (which is always the English translation of language names
		for (var j = 0; j < languages.length; j++) {
			if (languages[j]["Language"].match(re)) {
				for (var k = 0; k < document.settings_form.select_language.length; k++) {
					if (languages[j]["Code"].toLowerCase() == document.settings_form.select_language[k].value.toLowerCase()) {
						document.settings_form.select_language.selectedIndex = k;
						break;
					}
				}
				break;
			}
		}
	}
	change_language(); // function is in languages.js
}


function dictation(keyword) {
	// Version 0.99.7 - Turn dictation on/off
	// Only works in Full Version
	if (Array.isArray(keyword)) keyword = keyword[0];

	if (keyword.match(/on|start|enable|Activ|Comience|Aktiv|på|accendi|Commence[rz]/i)) {
		if (document.settings_form.disable_speech2text.checked == true)
			document.settings_form.disable_speech2text.click();
	} else if (keyword.match(/off|stop|disable|disact|Detener|Apaga|Deaktiv|av|spegni|Arr[eê]te[rz]/i)) {
		if (document.settings_form.disable_speech2text.checked == false)
			document.settings_form.disable_speech2text.click();
	}
}

function toggle_autop(keyword) {
	// Version 1.0.1 - Turn Auto Punctuation on/off
	// Only works in Full Version
	if (Array.isArray(keyword)) keyword = keyword[0];

	if (keyword.match(/on|start|enable|Activ|Comience|Aktiv|på|accendi/i)) {
		if (document.settings_form.auto_punctuation.checked == false)
			document.settings_form.auto_punctuation.click();
	} else if (keyword.match(/off|stop|disable|disact|Detener|Apaga|Deaktiv|av|spegni/i)) {
		if (document.settings_form.auto_punctuation.checked == true)
			document.settings_form.auto_punctuation.click();
	}
}

function capitalize_first_letter(string, all_words) {
	// Version 0.99.8 - capitalize first letter of string. If all_words is true capitalize first letter of every word
	if (Array.isArray(string)) string = string[0];
	var all_words = (typeof all_words === 'undefined') ? false : all_words;	
	
	string = string.charAt(0).toUpperCase() + string.slice(1); // Capitalize first letter of string
	if (all_words == "1" || all_words == "true") { // Vesion 1.0.7 - Was just: if (all_words)
		string = string.replace(/\w\S*/g, function(string)
		{
			return string.charAt(0).toUpperCase() + string.substr(1).toLowerCase();
		});
	}
	if (test_mode) console.log(string);
	//return string;
	send_to_content({ "speech" : string, "date" : new Date().getTime() }); // Version 1.3.9 - Added "date" : new Date().getTime()
	// textbox(string); // Version 1.7.0b - Print to textbox on sr.html // Version 1.7.6 - Removed - Now using iframe.html content.js in send_to_content
}


function remove_auto_caps(string) {
	// Version 1.1.8 - This function will remove Google's Web Speech Auto Capitalization
	var regex = /\b[A-Z][a-z]/g; // Match all capital letters with lower case letters after them (Won't match I or USA or I.B.M.)
	var modified = string.replace(regex, function(match) {
		return match.toLowerCase();
	});
	return(modified);
}


function keypress_inject(keyCode, ctrl, alt)
{
	var params = keyCode.split(',');
	keyCode = params[0]; 
	console.log(keyCode);
	ctrl = (typeof ctrl != 'undefined' && ctrl != "0" && ctrl != "false") ? true : false; // Version 0.99.7 - Was: (params[1] && params[1].match(/true/))
	alt = (typeof alt != 'undefined' && alt != "0" && alt != "false") ? true : false; // Version 0.99.7 - Was: (params[1] && params[1].match(/true/))
	if (isNaN(keyCode)) { // if keyCode is not a number
		keyCode = keyCode.charCodeAt(0); // Convert string character into charCode
	}
	
	var actualCode = '(' + function(keyCode, ctrl, alt) {
	    // All code is executed in a local scope.
	    // For example, the following does NOT overwrite the global `alert` method
	    //var alert = null;
	    // To overwrite a global variable, prefix `window`:
	    //window.alert = null;
	    // Simulate a keypress
	    var el = window.document.activeElement;
	
		// Event method
	  	var eventObj = window.document.createEvent("Events");
	  	eventObj.initEvent("keydown", true, true); // bubble, cancelable
	 	eventObj.keyCode = keyCode;
	    eventObj.which = keyCode;
	    eventObj.charCode = 0;
	    el.dispatchEvent(eventObj);
	    //document.dispatchEvent(eventObj);
	    
	    eventObj = document.createEvent("Events");
	  	eventObj.initEvent("keypress", true, true);
	 	eventObj.keyCode = keyCode;
	    eventObj.which = keyCode;
	    eventObj.charCode = keyCode;
	    el.dispatchEvent(eventObj);
	    //document.dispatchEvent(eventObj);
	    
	    eventObj = document.createEvent("Events");
	  	eventObj.initEvent("keyup", true, true);
	 	eventObj.keyCode = keyCode;
	    eventObj.which = keyCode;
	    eventObj.charCode = 0;
	    el.dispatchEvent(eventObj);
	    //document.dispatchEvent(eventObj);
	    
	    // keyboard event method
		//var keyCode = 74; // 74 = j
		var keyboardEvent = window.document.createEvent("KeyboardEvent");
		var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
	    keyboardEvent[initMethod](
	                       "keypress",
	                        true,      // bubbles oOooOOo0
	                        true,      // cancelable   
	                        null,    // view
	                        ctrl,     // ctrlKeyArg
	                        alt,     // altKeyArg
	                        false,     // shiftKeyArg
	                        false,     // metaKeyArg
	                        keyCode,  
	                        keyCode          // charCode   
	    );
	    
		
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
	
	/* var script = document.createElement('script');
	script.textContent = actualCode;
	(document.head||document.documentElement).appendChild(script);
	script.parentNode.removeChild(script);
	*/
	
	 chrome.tabs.executeScript(null, {
    code: 'var s = document.createElement("script");' +
          's.textContent = ' + JSON.stringify(actualCode) + ';' + 
          '(document.head||document.documentElement).appendChild(s);' + 
          's.parentNode.removeChild(s);' 
	});
	
}


function keypress_test(key, ctrl, alt, shift) {

	console.log(key);
	ctrl = (typeof ctrl != 'undefined' && ctrl != "0" && ctrl != "false") ? true : false; // Version 0.99.7 - Was: (params[1] && params[1].match(/true/))
	alt = (typeof alt != 'undefined' && alt != "0" && alt != "false") ? true : false; // Version 0.99.7 - Was: (params[1] && params[1].match(/true/))
	if (!isNaN(key)) { // if key is a number
		key = String.fromCharCode(key); // Convert charcode to string
	}
	console.log(key);
	
	var actualCode = '(' + function(key, ctrl, alt, shift) {
		//https://elgervanboxtel.nl/site/blog/simulate-keydown-event-with-javascript	
	  var e = new Event("keydown");
	  e.key=key;    // just enter the char you want to send 
	  e.keyCode=e.key.charCodeAt(0);
	  e.which=e.keyCode;
	  e.altKey=ctrl;
	  e.ctrlKey=alt;
	  e.shiftKey=shift;
	  e.metaKey=false;
	  e.bubbles=true;
	  document.dispatchEvent(e);
	  
	  } + ')( ' + JSON.stringify(key) + ');';
		
	/* var script = document.createElement('script');
	script.textContent = actualCode;
	(document.head||document.documentElement).appendChild(script);
	script.parentNode.removeChild(script);
	*/
	
	 chrome.tabs.executeScript(null, {
    code: 'var s = document.createElement("script");' +
          's.textContent = ' + JSON.stringify(actualCode) + ';' + 
          '(document.head||document.documentElement).appendChild(s);' + 
          's.parentNode.removeChild(s);' 
	});

}


// Version 1.0.5 - https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
function export_commands() {
	var file = new Blob([JSON.stringify(sra.custom_commands)], {type: 'text/plain'});
	var filename = 'sra_commands.txt';
	
	if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
		var a = document.createElement("a");
		a.style.position = "absolute";
		a.style.left = "-2000px";
		a.href = URL.createObjectURL(file);
		a.download = filename;
		document.body.appendChild(a);
		a.click();
	}
}


// Version 1.0.5 - https://stackoverflow.com/questions/14446447/how-to-read-a-local-text-file
function import_commands() {
	var input = document.custom_commands_form.import_file;
	var reader = new FileReader();
	reader.onload = function(){
  		var text = reader.result;
  		try {
  			var import_obj = JSON.parse(text);
  			document.getElementById('import_error').innerHTML = "";
		}
  		catch (err) {
  			// Unexpected token p in JSON at position 6 (if you forgot to put quotes around "phrase")
  			// Unexpected token ] in JSON at position 459 (if you left a comma after the last array element
  			document.getElementById('import_error').innerHTML = err.message;
  			if (err.message.match(/^Unexpected token [a-zA-Z]/i))
  				document.getElementById('import_error').innerHTML += '. Make sure key names like "phrase" are surrounded by quotes.';
  			else if (err.message.match(/^Unexpected token \]/i))
  				document.getElementById('import_error').innerHTML += '. Make sure the last array element does not have a comma after it, before the ]';
  			return;
  		}
  			
  		var import_type = document.querySelector('input[name=import_type]:checked').value;
  		//var node = document.getElementById('output');
  		//node.innerText = text;
		if (test_mode) console.log(text);
		if (test_mode) console.log(import_obj);
		if (test_mode) console.log(import_type);
		
		if (import_type == "append")
			sra.custom_commands = sra.custom_commands.concat(import_obj);
		else
			sra.custom_commands = import_obj;
		
		print_custom_commands(); // reprint custom commands
		setup_forms(); // Resetup forms
		var obj = { custom_commands : sra.custom_commands };
		if (test_mode) console.log("custom_commands object: "+JSON.stringify(obj));
		save_to_storage(obj);	
	}
	reader.readAsText(input.files[0]);
}
// <input type='file' accept='text/plain' onchange='import_commands(event)'>

// Version 1.5.2d - add_number helper because iframes were putting same numbers as main window
window["add_numbers_obj"] = {};
chrome.runtime.onMessage.addListener(
	function(obj, sender, sendResponse) {
		if (test_mode) console.log(JSON.stringify(sender), JSON.stringify(obj));	
		if (obj.hasOwnProperty("add_numbers")) {
			// sender.tab.id., sender.frameId
			if (typeof window["add_numbers_obj"][sender.tab.id] === "undefined")
				window["add_numbers_obj"][sender.tab.id] = { 
					start_at: 0,
					frameIds: [],
				}
			if (sender.frameId != 0) {// 0 is window.top so a positive would be an iframe
				if (obj.add_numbers == null)
					window["add_numbers_obj"][sender.tab.id]["frameIds"].push(sender.frameId);	
				if (window["add_numbers_obj"][sender.tab.id]["frameIds"].length > 0
				&& window["add_numbers_obj"][sender.tab.id].start_at > 0) 
				{
					window["add_numbers_obj"][sender.tab.id].start_at += obj["add_numbers"];
					var frameId = window["add_numbers_obj"][sender.tab.id]["frameIds"].pop();
					var send_obj = { 
						"command" : "add_numbers", 
						"option" : ['show', window["add_numbers_obj"][sender.tab.id].start_at], 
						"date" : new Date().getTime(),
					}
					chrome.tabs.sendMessage(sender.tab.id, send_obj, {frameId: frameId},
						function(response) { if (test_mode) console.log(response); }
					);
					if (window["add_numbers_obj"][sender.tab.id]["frameIds"].length == 0)
						window["add_numbers_obj"][sender.tab.id].start_at = 0;
				}
			}
			if (sender.frameId == 0) { // window.top
				window["add_numbers_obj"][sender.tab.id].start_at = obj.add_numbers;
				//setTimeout(function() { 
					if (window["add_numbers_obj"][sender.tab.id]["frameIds"].length > 0) {
						var frameId = window["add_numbers_obj"][sender.tab.id]["frameIds"].pop();
						var send_obj = { 
							"command" : "add_numbers", 
							"option" : ['show', window["add_numbers_obj"][sender.tab.id].start_at], 
							"date" : new Date().getTime(),
						}
						chrome.tabs.sendMessage(sender.tab.id, send_obj, {frameId: frameId},
							function(response) { if (test_mode) console.log(response); }
						);
						if (window["add_numbers_obj"][sender.tab.id]["frameIds"].length == 0)
							window["add_numbers_obj"][sender.tab.id].start_at = 0;
					}
				//}, 350);
			}
		
		}
		var sender_tab_id = (sender && sender.tab && sender.tab.id) ? sender.tab.id : null; // Version 1.5.4g - To prevent Error in event handler: TypeError: Cannot read properties of undefined (reading 'id')
		var sender_frame_id = sender.frameId || null; // Version 1.5.4g - To prevent Error in event handler: TypeError: Cannot read properties of undefined (reading 'id')
		sendResponse({farewell: "From commands.js. To tab.id:"+sender_tab_id+", frameId: "+sender_frame_id+", Object: ",obj}); // Version 1.4.4b
    }
);


// Version 1.7.0b - Inject script from sr.html tab instead of content script: https://stackoverflow.com/questions/70978021/chrome-extension-how-do-i-use-declarativenetrequest-to-bypass-the-content-secur
function script(code) {
	// convert html entities into text
	var element = document.createElement('div');
	element.innerHTML = code;
    code = element.textContent;
	element.remove();
	code = "function sra_function() {"+ code + "}\n" + 
		"var sra_result = sra_function();\n" +
		"var sra_event = new CustomEvent('sra_event', { detail: sra_result });\n "+
		"document.dispatchEvent(sra_event);\n"; // Version 1.5.6
	
	// get the currently active tab
	if (sra.settings.chrome_windows) var cur_tab_obj = { active: true, lastFocusedWindow: true}; // Version 1.2.0
	else var cur_tab_obj = { active: true, currentWindow: true}; // Version 1.2.0
	chrome.tabs.query(cur_tab_obj, function (tabs) {
		var active_tab = tabs[0].id;
		if (tabs[0].url != window.location.href) { // if current tab is not the speech recognition tab
			chrome.scripting.executeScript({
				target: { tabId: active_tab, allFrames: true },
				func: (code) => {
					var el = document.createElement("script");
					el.textContent = code;
					(document.head||document.documentElement).appendChild(el);
					el.remove();
				},
				args: [code],
				world: "MAIN",
			},
			(injectionResults) => {
				console.log(injectionResults);
			});
		} else { // inject into sr.html
			try {
				/*var script = document.createElement('script'); 
				script.textContent = code;
				(document.head||document.documentElement).appendChild(script); // Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self'". Either the 'unsafe-inline' keyword, a hash ('sha256-QMyi9Bu69Paww+fnzto/sR6tH17OHuKsccHooIc6H5A='), or a nonce ('nonce-...') is required to enable inline execution.
				script.remove(); // Version 1.3.0 - Removed in case user wants to reuse variable e.g. var dog = document.getElementById(dog) // Version 1.5.6 - Added this line back because even if you remove the script code, the variables and functions are still in memory and can be used
				*/
				/*var el = document.createElement("div");
				el.setAttribute('onreset', code);
				el.dispatchEvent(new CustomEvent('reset')); // console error: Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src 'self'". Either the 'unsafe-inline' keyword, a hash ('sha256-...'), or a nonce ('nonce-...') is required to enable inline execution. Note that hashes do not apply to event handlers, style attributes and javascript: navigations unless the 'unsafe-hashes' keyword is present.
				el.removeAttribute('onreset');*/
			} catch (error) {
				console.log(error);
			}
		}
    });
}