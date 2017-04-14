var user = ""
var uuid = ""

function setUser(name){
	user = name
}

function checkUser(){
	while(user==""){
		user = prompt("Please enter your name:", "");
	}
	$.getJSON('/uuid', function(data) {
    		uuid = data.uuid
	});
}

function sendMessage(){
	var message = document.getElementById("msg-input").value
	xhr = new XMLHttpRequest();
	var url = "/sendMessage";
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.onreadystatechange = function () { 
    		if (xhr.readyState == 4 && xhr.status == 200) {
			console.log(xhr.responseText)
    		}
	}
	var data = JSON.stringify({"Originator":user, "Text":message});
	xhr.send(data);
	document.getElementById("msg-input").value = ""

}

function displayMessages(){
	$.getJSON('/messages', function(data) {
		var html = ""
		for(var i=0; i < data.length; i++){
			var name = data[i].Rumor.Originator
			var parts = data[i].Rumor.MessageID.split(':')
			var msgNum = parts[1]
			var id = parts[0]
			var text = data[i].Rumor.Text
			if(uuid == id){
				html += '<li class="right clearfix"><span class="chat-img pull-right"><img src="http://placehold.it/50/FA6F57/fff&text='
				html += name[0]
				html += '" alt="User Avatar" class="img-circle" /></span><div class="chat-body clearfix"><div class="header"><small class=" text-muted">Message #: '
				html += msgNum
				html += '</small><strong class="pull-right primary-font">'
				html += name
				html += '</strong></div><p>'
				html += text
				html += '</p></li>'
			} else {
				html += '<li class="left clearfix"><span class="chat-img pull-left"><img src="http://placehold.it/50/55C1E7/fff&text='
				html += name[0]
				html += '" alt="User Avatar" class="img-circle" /></span><div class="chat-body clearfix"><div class="header"><strong class="primary-font">'
				html += name
				html += '</strong> <small class="pull-right text-muted">Message #: '
				html += msgNum
				html += '</small></div><p>'
				html += text
				html += '</p></div></li>'
			}
		}
		document.getElementById("messages").innerHTML = html
	});
}

function addPeer(){
	peerURL = document.getElementById("peer-input").value
	xhr = new XMLHttpRequest();
	var url = "/addPeer";
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.onreadystatechange = function () { 
    		if (xhr.readyState == 4 && xhr.status == 200) {
       			console.log(xhr.responseText)
    		}
	}
	var data = JSON.stringify({"URL":peerURL});
	xhr.send(data);

	document.getElementById("peer-input").value = ""
}

var timer = setInterval(displayMessages, 1000);
