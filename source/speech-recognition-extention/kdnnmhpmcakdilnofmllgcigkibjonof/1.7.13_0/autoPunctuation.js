/*
Why
Just why "should" I stay? Tell me why you want to leave.
There are many reasons why I should go. This is why I want to leave.
Why "does" she do that? Why she does that I'll never know.

Where
Where are you going? I'm going where no one can follow me.
Go where I tell you. Where it lands nobody knows.
Where I am going you can't follow. Where you see a dog, just wait.
Where are the clouds? Where he goes nobody knows.

When
When you see a fence stay there. When "do" you want to leave? When "will" I see you again?
I'd like to know when you are going. When they arrive keep them company.
When I leave here I'm going to the store. 
When I leave here "should" I take a shower? When you see the mailman "would" you stop him for me?
When there are no cars you can cross. When there are no cars "may" I cross?
When that happens don't freak out. When Bob comes let him in. When cats hunt they are alone. When cats hunt "are" they alone?
When "does" she arrive? When she "does" that I go crazy. When Bob comes "can" you let him in.


What
What I have to say is hard to beleive. What they do is their business.
What she does there is silly. What I like about you is your hair.
That is what it takes to be a plumber. What you see is what you get.
When she arrives "what" will she be wearing? That is what will happen.
She told me what to do. That is what should happen. What "should" I do?
When I leave here "what" "should" Bob do? When I left here "what" I saw was amazing!
What "else" "can" you do? What on earth? What "the" hell? What "the" cat does is stupid.
What "a" coward. What "a" goat sees it eats.

If
If she leaves try to stop her. If I go "will" "you" come with me? If I leave "can" "you" get her?
If she leaves "should" "I" try to stop her? If she leaves "you" "should" try to stop her.
If she leaves "don't" stop her. If the toilet overflows "what" "should" "I" do?

Which
Which way should I go? Which one do you want? Which dog?
Which "is" exactly what I said. Which "can" be tricky. Which "was" the right thing to do.?
Which "can" work sometimes. Which "could" never work. Which "will" never work.

Does
Does she like cats? Doesn't everyone?

Did
Before I left last night did the cat wake you up?
Did it work? When you used the cup did it work?
He did it. He did it again. Did he leave? He did. 

Do
Do what you want. Do not go in there.
Do you like me? Do I know you? Do they live here? Do cats like water? Do techs like to eat?
Do white people live here? (people = plural) Do white persons live here?

Don't
Don't do that! Don't have a fit! 
Don't you like cats? Don't you know? Don't you like it? Don't they want to go?

How
How I would love to start over. How she looks right now is amazing.
How on earth did that happen? How much? How fat are you? How about that?
How come there are no plants? How are you? How is it going?

Should
Should she come? Should I leave? (It) Should work. 
Should it work then I'll go. Should they stay? 
Should they stay then I'll leave.

May
May I leave now? May she come with me?

Might
Might you like to go?

Who
Who else would it be? Who does she like? Who can it be now? Who are you? Who does she like? Who am I?
Who she likes is very special. Who a person is will come to light.

Could 
(It) Could be. Could it be a cat? Could John come over. Could he?
Could that happen? (It) Could rain. 

Have
Have one. Have a nice day. Have all the candy you want.
Have it your way. 
Have there been any changes? (Should be Has)
Have the Baker's gone there? Have they all left?
Have you gone there? Have I seen it? Haven't you?

Has
Has anyone seen it? Has everyone gone there? Has it been that long?
Has anything changed? Hasn't everybody?

Won't
(It) Won't work. (It) Won't happen. 
Won't you come? Won't it be hard?  Won't there be any dip?

*/


function auto_punctuation(text) {
	//console.log(text);
	var punc = "."; // Default to period
	var regex = "";
	var opt_first_words = ["to", "but", "or", "however", "and", "so", "also", "oh", "anyway", "well", "well then", "then", "so then", "and just", "then just", "and just", "in time", "still", "now", "until", "until then", "for instance", "thus", "consequently", "still", "the fact remains", "therefore", "hence", "yet", "just", "lastly", "furthermore", "nevertheless", "nonetheless", "otherwise", "moreover", "for example", "besides", "by the way", "first of all", "second", "third", "besides", "besides that", "finally", "to conclude", "in conclusion", "in fact", "to put it another way", "for that reason", "listen", "tell me", "so tell me", "in other words", "after all", "incidentally", "honestly", "to be honest", "actually", "generally", "in general", "technically speaking", "technically", "indeed", "thereafter", "but really"];
	var transition_words = ["but", "or", "however", "so", "so then", "then", "just", "and just", "in time", "now", "until", "until then", "consequently"];
	//var opt_first_words = "(but|or|however|and|so|also|anyway|well|well then|then|so then|then just|and just|in time|still|now|until|until then|for instance|thus|consequently|still|the fact remains|therefore|hence|yet|just|lastly|furthermore|nevertheless|nonetheless|otherwise|moreover|for example|besides|by the way|first of all|second|third|besides|besides that|finally|to conclude|in conclusion|in fact|to put it another way|for that reason)? ?";
	var pronouns = "(I|your?|we|they|she|he|it|that|the|y'all|there)\\b";
	var articles = "(a|one)\\b";
	var properName = "[A-Z][a-z]+\\b";
	var alwaysQ = "(are|will|can?|could|should|would|does|did|is|was|were|am i|won't|may|has)(n't)?\\b";
	var maybeQ = "(how|when|where|why|what|who|whom)('d)?\\b";
	// I want you to finish your report today 'however' busy you are.
	var first_word_comma = "(lately|personally|however|actually|okay|yes|yet|well|also|anyway|still|therefore|hence|moreover|furthermore|fortunately|sadly|nevertheless|otherwise|for instance|that said|consequently|the fact remains|lastly|by the way|for that reason|in fact|to put it another way|finally|for example|for instance|as a matter of fact|what's more|what is more|in other words|incidentally|frankly|honestly|to be honest|luckily|generally|in general|in conclusion|thus|indeed|thereafter)";
	
	// If last letter of string already has punctuation mark then return
	if (text.match(/[\n\.!\?,]$/)) return text;
	
	// Return if Auto Punctuation is turned off in settings
	if (sra.settings.auto_punctuation === false) return text;
	
	// EXCLAMATION - Thank you very much! I love her so much! I love you! This is the greatest thing ever!
	// I don't think it's that great. He doesn't like it so much. I'm not sure it is the best one.
	// It couldn't be more awesome! It could have been awesome. It would have been neat.
	var negative_words = "\\b(can't|isn't|wasn't|won't|doesn't|didn't|hasn't|don't|not)\\b";
	var exclamation_words = "(delicious|fun|happy|beautiful|really pretty|very pretty|so much|very much|really liked|great|greatest|cool|really neat|very good|really good|awesome|wonderful|adorable|best|amazing|amazement|amazed|magnificent|fantastic|brilliant|breathtaking|superb|brilliant|genius|outstanding|astounding|incredible|marvelous|miraculous|mind-blowing|staggering|stunning|spectacular|excellent|fabulous|splendid|groovy|remarkable|extraordinary|astonishing|exciting|excited|perfect|perfection|delightful|delighted)";
	regex = new RegExp(negative_words);
	if (!text.match(regex)) {
		regex = new RegExp(" "+exclamation_words+"( \\S+)?( \\S+)?$",'i');
		if (text.match(regex)) punc = "!";
	}
	
	// See if sentence begins with an alwaysQ
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+alwaysQ,'i');
	if (text.match(regex)) punc = "?";
	// See if a sentence has a transition in middle of sentence : "It's free 'so' can I go?"
	regex = new RegExp(" ?("+transition_words.join("|")+") "+alwaysQ,'i');
	if (text.match(regex)) punc = "?";
	
	// See if sentence begins with maybeQ without a pronoun or article following it (or a proper name?)
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+maybeQ,'i');
	if (text.match(regex)) punc = "?";
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+maybeQ+" "+pronouns,'i');
	if (text.match(regex)) punc = ".";
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+maybeQ+" "+articles,'i');
	if (text.match(regex)) punc = ".";
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+maybeQ+" "+properName);
	if (text.match(regex)) punc = ".";
	// See if a sentence has a transition in middle of sentence : "I really like her 'but' what if she doesn't like me?"
	regex = new RegExp(" ?("+transition_words.join("|")+") "+maybeQ+"(?! "+pronouns+")",'i');
	if (text.match(regex)) punc = "?";
	
	// "Which" followed by another question word is a statment: " 'Which' 'is' wrong in my opinion." : " 'Which' one is it?"
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"which",'i');
	if (text.match(regex)) punc = "?";
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"which "+alwaysQ,'i');
	if (text.match(regex)) punc = ".";
	// See if a sentence has a transition in middle of sentence : "I see a lot of them 'so' which one should I take"
	regex = new RegExp(" ?("+transition_words.join("|")+") "+"which ",'i');
	if (text.match(regex)) punc = "?";
	
	// "Do" or "Don't" followed by a pronoun or a plural noun is a question. "Don't 'you' like me?" : "Do 'cats' like water?"
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"(do|don't) "+pronouns,'i');
	if (text.match(regex)) punc = "?";
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"(do|don't) (\\S+)s",'i');
	if (text.match(regex)) punc = "?";
	// See if a sentence has a transition in middle of sentence : "Cats can swim 'but' do they like it?"
	regex = new RegExp(" ?("+transition_words.join("|")+") "+"(do|don't) "+pronouns,'i');
	if (text.match(regex)) punc = "?";
	// See if a sentence has a transition in middle of sentence : "Cats can swim 'but' can dogs climb trees?"
	regex = new RegExp(" ?("+transition_words.join("|")+") "+"(do|don't) (\\S+)s",'i');
	if (text.match(regex)) punc = "?";
	
	// "Might" followed by a pronoun or a plural noun or an article is a question. "Might 'you' like to come?" : "Might 'a' bird come?"
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"(might) "+pronouns,'i');
	if (text.match(regex)) punc = "?";
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"(might) "+articles,'i');
	if (text.match(regex)) punc = "?";
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"(might) (\\S+)s\\b",'i');
	if (text.match(regex)) punc = "?";
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"(might) "+properName); // Might Jack like to come?
	if (text.match(regex)) punc = "?";

	// "Have" or "Haven't" followed by a pronoun is a question. " Have they left?" : "Have the Baker's gone?" : "Have we met?": "Have the last one"
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"(have|haven't) (I|you|we|they|there|y'all)\\b",'i');
	if (text.match(regex)) punc = "?";
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"(have|haven't) the (\\S+)s\\b",'i');
	if (text.match(regex)) punc = "?";
	
	// "If" and "When" followed with a alwaysQ and a pronoun : "If I leave where 'will' 'you' go?" "When she comes what "should" "I" do?
	// "If the cat meows "can" "you" let it outside?" : "When Bob comes 'will' 'he' be alone?"
	regex = new RegExp("^ ?("+opt_first_words.join("|")+")? ?"+"(if|when) (.*?)"+alwaysQ+" "+pronouns,'i');
	if (text.match(regex)) punc = "?";
	
	// Question at end of sentence : "I 'don't' know you, 'do' I?" : "That's not how you do it." : "John has it." : "It 'hasn't' come yet, 'has' it?"
	// "It 'didn't' work, 'did' it?" : "I don't think he did it." : "Easy does it." : "It doesn't belong there, does it?" : "It is how John does it."
	// "They don't like it, do they?" : "Jim likes it, doesn't he?" : "Come with me, will you?" 
	// "I think that was it." : "That wasn't John, was it?" : "That isn't it" : "This is fun, isn't it?"
	// "There were too many people, weren't there?"
	// "I'm not crazy, am I?"
	var pronouns = "(I|you|we|they|she|he|it|that|y'all|there)\\b";
	var articles = "(a|one)\\b";
	var properName = "[A-Z][a-z]+\\b";
	var alwaysQ2 = "(are|will|can?|could|should|would|am|won't|don't|doesn't|didn't|hasn't|haven't|may|is)(n't)?\\b";
	var maybeQ2 = "(doesn't|don't|didn't|wasn't|was|hasn't|haven't|weren't|were)\\b";
	var maybeQ3 = "(does|do|did|was|wasn't|has|have|were|weren't)\\b";
	if (punc != "?") {
		regex = new RegExp("( )"+alwaysQ2+" "+pronouns+"( think| know| agree)?$",'i');
		if (text.match(regex)) punc = "?"; text = text.replace(regex, ", $2$3 $4$5"); 
		regex = new RegExp(maybeQ2+"(.*?)( )"+maybeQ3+" "+pronouns+"$",'i');
		if (text.match(regex)) punc = "?"; text = text.replace(regex, "$1$2,$3 $4 $5"); 
	}
	
	// Questions at end: A handful 'of what'? He might go where?
	// I don't know what. I don't know where.
	regex = new RegExp("(of what|go where|do what)$",'i');
	if (text.match(regex)) punc = "?";
		
	// COMMA after first words : "Personally, I would be careful."
	regex = new RegExp("^ ?"+first_word_comma+"\\b ",'i');
	text = text.replace(regex, "$1, ");
	
	https://regex101.com/r/kZdtwU/1
	var comma_phrase = "\\b(a few \\S+|a couple of \\S+|an? \\S+|\\S+s|\\d+ \\S+|some \\S+|a pair of \\S+s|one \\S+|two \\S+|three \\S+|four \\S+|five \\S+|six \\S+)"; // an elephant, lions, 5 dogs, some horses, a pair of pants
	var comma_phrases = Array(11).join(comma_phrase+"? ?"); // Combine phrase 10 times in a string. Make them all optional by adding "?" and optional space
	regex = new RegExp(comma_phrases+comma_phrase+" "+comma_phrase+"( and )"+comma_phrase,'i'); // Last two comma_phrase must be NOT optional
	var matches = text.match(regex,'i'); // How many matches
	if (test_mode) console.log(matches);
	var reg_string = " ";
	if (matches) {
		for (var i=1; i < matches.length; i++) {
			if (typeof matches[i] !== "undefined") {
				reg_string += "$"+i;
				if (i < matches.length - 3) reg_string += ", "; 	
			}
		}
	}
	text = text.replace(regex, reg_string);
	/*
	// COMMA - I'll need a wrench, a screwdriver and pliers. For lunch I have an apple, a tuna sandwich and a soda.
	regex = new RegExp("\\b(an? \\S+) (an? \\S+) (an? \\S+)\\b",'i'); text = text.replace(regex, "$1, $2, $3");
	regex = new RegExp("\\b(an? \\w+) (an? \\S+) and\\b",'i'); text = text.replace(regex, "$1, $2 and");
	
	// COMMA - My favorite animals are horses, dogs and goldfish.
	regex = new RegExp("\\b(\\S+s) (\\S+s) (\\S+s)\\b",'i'); text = text.replace(regex, "$1, $2, $3");
	regex = new RegExp("\\b(\\w+s) (\\S+s) and\\b",'i'); text = text.replace(regex, "$1, $2 and");
	*/
	
	text = text + punc; // Add punctuation to string
	return text;

}
