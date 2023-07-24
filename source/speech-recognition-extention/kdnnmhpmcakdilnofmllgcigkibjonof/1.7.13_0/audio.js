//window.resizeTo(0, 0);
//onload = () => {
    const params = new URLSearchParams(window.location.search);
    let audio = new Audio(params.get('src'));
    
	for(var key of params.keys()) { // Get all parameters
		console.log(key);
		var value = params.get(key);
		audio[key] = value; // Set key value in audio element
		if (typeof value == 'string' && value.match(/^(0|false)$/i)) // Needed for preservesPitch
			audio[key] = false;
	}
    audio.onended = function() {
		close();
	}
	audio.play();
    /*setTimeout(()=>{
        close();
    }, urlParams.get('length'));*/
//}