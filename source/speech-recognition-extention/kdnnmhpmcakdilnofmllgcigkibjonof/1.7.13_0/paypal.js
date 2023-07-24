
	/* Edit the Following VariableS: */
	var paypal_mode = "sandbox"; // sandbox or live
	var sandbox_client_id = "AStL_3rjjkkNNdwqB2k6QE3pD4J4NtWAejecqtaIkkkWdItj7Nrw1X31QwwUeQps4B7kj5yNu0bFmrQK";
	var sandbox_plan_id = "P-0VL93432H0118240HL5ZYY3Q";
	var live_client_id = "AR6L3f7i4iOuNAtu-rS_nZbdxNNjckVel8WcqZZA_wOaibpbzjP_ToQOxDbKq-x7BFoX0EAI2r5ejLty";
	var live_plan_id = "P-2H313562RF930110PL5CV4BI";
	
	/* DO NOT EDIT BELOW THIS LINE UNLESS EXPERT */
	var client_id = (paypal_mode == "sandbox") ? sandbox_client_id : live_client_id;
	var plan_id = (paypal_mode == "sandbox") ? sandbox_plan_id : live_plan_id;
	
	// Dynamically load paypal javascript sdk
	var script = document.createElement('script');
	script.src = "https://www.paypal.com/sdk/js?client-id=" + client_id + "&vault=true"; // https://developer.paypal.com/docs/subscriptions/reference/customize-the-sdk/ intent is not applicable with subscriptions
	script.setAttribute("data-sdk-integration-source", "button-factory");
	script.onload = function() {	show_paypal_button();  };
	document.getElementsByTagName("head")[0].appendChild(script);

  

function show_paypal_button() {	
	paypal.Buttons({
		style: {
	          shape: 'rect',
	          color: 'gold',
	          layout: 'vertical',
	          label: 'subscribe'
	      },
	      createSubscription: function(data, actions) {
	        return actions.subscription.create({
	          'plan_id': plan_id,
	          // 'notify_url': "http://www.example.com" // Maybe works. See: https://stackoverflow.com/questions/32655755/customize-notify-url-in-rest-api/48143850
	        });
	      },
	      onApprove: function(data, actions) {
	        //alert('You have successfully created subscription ' + data.subscriptionID);
	        console.log(data); // {orderID: "9JY32908CH124011T", paymentID: null, billingToken: "BA-9SL09500LC622213M", subscriptionID: "I-WBTRGFXR2XD5", facilitatorAccessToken: "A21AAION4kbv47CctrTc7qAoDiUt6wA_BBnqgjUIB7uQCH4wGX2E1ESWVcMOtvj5GXC7sNAL0tuYuwKkcHbGrhXBhpxapwBPQ"}
	      }
	}).render('#paypal-button-container');
}


function ajax(url, data, callback) { // Cross browser ajax request
	// To use with JSON object: ajax(url, JSON.stringify(obj), callback);
	try {
		var x = new(this.XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
		x.open(data ? 'POST' : 'GET', url, true); // If data is empty then GET is used. Ex:(url = https://example.com?hi=1)
		x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		x.onreadystatechange = function () {
			if (x.status == 200 && x.readyState > 3) {
				if (callback) callback(x.responseText, x);
			}
			else
				console.log("There is a problem communicating with the server. Status: "+x.status)
		};
		x.send(data);
	} catch (e) {
		window.console && console.log(e);
	}
};


function reviver(key, value)
{
	/* This JSON reviver function just changes a string of numbers "656" into a number 656 */
	/* It also works with negative values */
	if (typeof value === 'string') {
		var re = /^[\d,]*$/; // New 3/21/2020 - Remove commas if it is just numbers (digits) and commas
		if (value.match(re))  
			value = value.replace(",", ""); // Remove all commas from number
		if (!isNaN(value)) // if ! is Not a Number (NaN)
		{
			// Ok, it is a number so process it
			value = Number(value);
		}	
	}
	return value;
} // end function reviver(key, value)


function ajax_callback(data, x) {
	if (test_mode) console.log(data);
	try {
		var obj = JSON.parse(data, reviver);
	}
	catch (error) {
		console.log("Ajax response is not JSON. Error: "+error);
		console.log(data);
	}
	if (obj.hasOwnProperty('status')) {
		sra.settings.status = obj['status'];
		if (running_script == "sr") 
			document.settings_form.status = sra.settings.status;
	}
	if (obj.hasOwnProperty('order_id')) sra.settings.order_id = obj['order_id'];
	console.log(obj); // { "status": "ACTIVE", "createdTime": "1606324738689", "license": "FREE TRIAL", "kind": "paypal", "order_id": "I-234234234"}
	obj.settings = sra.settings; // Add status and order_id to settings
	save_to_storage(obj);
}

function iterate (obj, key) { // find key and return value in nested object
    var result;

    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (property === key) {
                return obj[key]; // returns the value
            }
            else if (typeof obj[property] === "object") {
                // in case it is an object
                result = iterate(obj[property], key);

                if (typeof result !== "undefined") {
                    return result;
                }
            }
        }   
    }
}


function checkNested(obj) { // checkNested(obj, 'v', 1, 'price'); // For obj.v[1].price
  for (var i = 1; i < arguments.length; i++) {
    if (!obj.hasOwnProperty(arguments[i])) {
      return false;
    }
    obj = obj[arguments[i]];
  }
  return true;
}


function price_callback(data, x) {
	if (test_mode) console.log(data);
	try {
		var obj = JSON.parse(data, reviver);
	}
	catch (error) {
		console.log("Ajax response is not JSON. Error: "+error);
		console.log(data);
	}
	/*if (obj.hasOwnProperty('name') && document.getElementById('name'))
		document.getElementById('name').innerHTML = obj['name'];
	
		['billing_cycles'][0]['pricing_scheme']['fixed_price']['currency_code']
	*/
	
	if (checkNested(obj, ['billing_cycles'],[0],['pricing_scheme'],['fixed_price'],['currency_code']))
		document.getElementById("currency_code").innerHTML = obj.['billing_cycles'][0]['pricing_scheme']['fixed_price']['currency_code'];
	
	var key_array = ['name', 'value', 'currency_code'];
	for (key in key_array) {
		var v = iterate(obj, key);
		if (v && document.getElementById(key))
			document.getElementById(key).innerHTML = v;
	}
}


window.addEventListener('DOMContentLoaded', function(){
	// Check for updated Paypal price
	ajax("https://www.seabreezecomputers.com/speech/license/check.php", "id="+plan_id , price_callback);
	
});