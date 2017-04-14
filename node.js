var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var fs = require('fs');
var request = require('request')

const PORT = process.argv[2];
const n = 1;

var app = express()
var myID = uuid.v4()
var state = {}
var peers = []
var messages = {}
var orderedMessages = []
var nextMsgNum = 1

app.use(express.static('public'));
app.use(bodyParser.json());

app.listen(PORT, function() {
  console.log('Listening on ' + PORT + "...")
})

/*if (fs.existsSync(PORT + "/state.js")) {
    state = JSON.parse(fs.readFileSync(PORT + '/state.js'));
} else {
	if (!fs.existsSync(PORT)){
    		fs.mkdirSync(PORT);
	}
	fs.openSync(PORT + '/state.js', 'w');
}
if (fs.existsSync(PORT + "/messages.js")) {
    messages = JSON.parse(fs.readFileSync(PORT + '/messages.js'));
} else {
	var fd = fs.openSync(PORT + '/messages.js', 'w');
}*/

function init(){
	if(state[myID]== null){
		state[myID] = {
			EndPoint: "http://ec2-34-209-42-123.us-west-2.compute.amazonaws.com:" + PORT,
			MessageNumber: 0
		}
	}
	if(messages[myID] == null){
			messages[myID] = {}
	}
}

init()

function getPeer(){
	var numPeers = peers.length
	if(numPeers > 0){
		var choice = peers[getRandomInt(0, peers.length-1)]
		/*var choice = myID
		while(choice == myID){
			var keys = Object.keys(state)
    			choice = keys[ keys.length * Math.random() << 0];
		}*/
		return choice;
	}
	return -1
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function store(message){
	console.log("******************RECEIVED MESSAGE*************************")
	console.log(message)
	if(state[message.uuid] == null){
		peers.push(message.uuid)
		state[message.uuid] = {
			EndPoint: message.EndPoint,
			MessageNumber: 0
		} 
	}

	orderedMessages.push(message)
	var messageID = message.Rumor.MessageID;
	var idParts = messageID.split(':');
	var id = idParts[0]
	var msgNum = idParts[1]
	//Check for user
	if(messages[id] == null){
		messages[id] = {}
	}
	messages[id][msgNum] = {}
	messages[id][msgNum]["Text"] = message.Rumor.Text;
	messages[id][msgNum]["Originator"] = message.Rumor.Originator;
	
	state[id].MessageNumber = Object.keys(messages[id]).length;
	
	console.log(state)
	console.log(messages)
	console.log(peers)
}

function processWants(wants){
	console.log("******************RECEIVED WANT*************************")
	console.log(wants)
	if(state[wants.uuid] == null){
		peers.push(wants.uuid)
		state[wants.uuid] = {
			EndPoint: wants.EndPoint,
			MessageNumber: 0
		} 
	}

	var send = false
	for(var work in wants.Want){
		if(state[work] != null && state[work]['MessageNumber'] > wants.Want[work]){
			sendRumor(wants.EndPoint, work, wants.Want[work])
		} else if(state[work] != null && state[work]['MessageNumber'] < wants.Want[work]){
			send = true
		} else if(state[work] == null){
			state[work] = {
				EndPoint: "",
				MessageNumber: 0
			}
			send = true
		}
	}
	if(send){
		sendWant(wants.EndPoint)
	}
}

function sendWant(endpoint){
	console.log("Sending want...")
	var wantUrl = endpoint + '/want'
	var data = { "Want":{}, "uuid" : myID , "EndPoint": state[myID]["EndPoint"] }
	for(var peer in state){
		data.Want[peer] = state[peer]["MessageNumber"]
	}
	request.post({
  		headers: {'content-type' : 'application/json'},
  		url: wantUrl,
  		body: JSON.stringify(data)
		}, function(error, response, body){
  			console.log(body);
		});
}

function sendRumor(endpoint, id, msgNum){
	console.log("Sending rumor...")
	if(state[myID]["MessageNumber"] > 0){
		var rumorUrl = endpoint + '/rumor'
		var totalMsgs = state[id]['MessageNumber']
		for(msgNum; msgNum < totalMsgs; msgNum++){
			var returnNum = msgNum + 1
			var data = {"Rumor":{"MessageID":id+":"+ returnNum , "Originator": messages[id][returnNum ]["Originator"], "Text": messages[id][returnNum ]["Text"]}, "uuid" : myID , "EndPoint": state[myID]["EndPoint"] }
			request.post({
  			headers: {'content-type' : 'application/json'},
  			url: rumorUrl,
  			body: JSON.stringify(data)
			}, function(error, response, body){
  				console.log(body);
			});
		}
	}
}

function propogate(){
	console.log("Propogating");
  	var peer = getPeer();
	if(peer != -1){
		if(false){//getRandomInt(0,1)){
			sendRumor(state[peer]['EndPoint'], myID, state[myID]['MessageNumber']-1)
		} else {
			sendWant(state[peer]['EndPoint'])
		}
	}
} 

var interval = setInterval(propogate, n*1000);

app.post('/want', function (req,res) {
	console.log("Processing wants...")
	wants = req.body
	processWants(wants)
	res.sendStatus(200)
}) 

app.post('/rumor', function(req,res) {
	console.log("Saving rumor...")
	store(req.body)
	res.sendStatus(200)
})

app.get('/messages', function(req, res) {
	res.send(JSON.stringify(orderedMessages))
})

app.get('/uuid', function(req, res) {
	var uuid = {'uuid':myID}
	res.send(JSON.stringify(uuid))
})

app.post('/sendMessage', function(req, res) {
	var messageID = myID + ":" + nextMsgNum
	state[myID]["MessageNumber"] = nextMsgNum
	var message = {'Rumor':{"MessageID":messageID,"Originator":req.body.Originator,"Text":req.body.Text},"Endpoint": state[myID]["EndPoint"]}
	orderedMessages.push(message)
	if(messages[myID] == null){
		messages[myID] = {}
	}
	messages[myID][nextMsgNum] = {}
	messages[myID][nextMsgNum]["Text"] = message.Rumor.Text;
	messages[myID][nextMsgNum]["Originator"] = message.Rumor.Originator;
	nextMsgNum++

	res.sendStatus(200)
})

app.post('/addPeer', function(req, res) {
	var url = req.body.URL + '/uuid'
	request(url, function(error, response, body) {
		body = JSON.parse(body)
  		id = body.uuid;
		if(state[id] == null){
			peers.push(id)
			state[id] = {
				EndPoint: req.body.URL,
				MessageNumber: 0
			} 
		}
		console.log("******************ADDING PEER*************************")
		console.log(state)
		console.log(messages)
		});
	res.sendStatus(200)
})