
function create_social_buttons()
{
	var url = encodeURIComponent('https://chrome.google.com/webstore/detail/speech-recognition-anywhe/kdnnmhpmcakdilnofmllgcigkibjonof');
	var text = encodeURIComponent('Speech Recognition Anywhere'); // used on Twitter as text and Pinterest as description
	var media = encodeURIComponent('http://seabreezecomputers.com/speech/440x280.jpg'); // used on Pinterest
	var string = "";
	var social_script = document.getElementById('social_script');
	
	var social_div = document.createElement('div');
	
	string += '<div class="cool_social_div" id="cool_social_div">'+
				'<div class="cool_social_button cool_social_google" title="Share this on Google+">'+
					'<a href="http://plus.google.com/share?url='+url+'" target="_blank">'+
					'<b><span style="color: #DB4437">G+</span> Share</b>'+
					'</a>'+
				'</div>'+
				'<div class="cool_social_button cool_social_twitter" title="Share this on Twitter">'+
					'<a href="http://www.twitter.com/intent/tweet?url='+url+'&text='+text+'" target="_blank">'+
					'Tweet'+
					'</a>'+
				'</div>'+
				'<div class="cool_social_button cool_social_facebook" title="Share this on Facebook">'+
					'<a href="http://www.facebook.com/sharer/sharer.php?u='+url+'" target="_blank">'+
					'<b><span class="cool_social_f"> f </span> Share</b>'+
					'</a>'+
				'</div>'+
				'<div class="cool_social_button cool_social_linkedin" title="Share this on LinkedIn">'+
					'<a href="http://www.linkedin.com/shareArticle?mini=true&url='+url+'" target="_blank">'+
					'<b><span class="cool_social_in">in</span> Share</b>'+
					'</a>'+
				'</div>'+
				'<div class="cool_social_button cool_social_pinterest" title="Share this on Pinterest">'+
				'	<a href="http://pinterest.com/pin/create/button/?url='+url+'&media='+media+'&description='+text+'" target="_blank">'+
				'	<i><b>P in it</b></i>'+
				'	</a>'+
			'	</div>'+
			'</div>';
	
	social_div.innerHTML = string;
	social_script.parentNode.insertBefore(social_div, social_script.nextSibling);
}


create_social_buttons();
	


