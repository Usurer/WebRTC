var socket = new WebSocket('ws://127.0.0.1:1337/');
var signalingChannel = new SignalingChannel();
var servers = {iceServers:[{url:"stun:stun.l.google.com:19302"}]};

function SignalingChannel() {
	this.send = function(msg) {
		logg("Sending setup signal");
		socket.send(message);
	};
};


function start() {

	pc = new webkitRTCPeerConnection(servers);

	pc.onicecandidate = function (evt) {
		if (evt.candidate)
	    	signalingChannel.send(JSON.stringify({ "candidate": evt.candidate }));
	};

	pc.onnegotiationneeded = function () {
	    pc.createOffer(localDescCreated, logError);
	};
}

function localDescCreated(desc) {
    pc.setLocalDescription(desc, function () {
        signalingChannel.send(JSON.stringify({ "sdp": pc.localDescription }));
    }, logError);
}


signalingChannel.onmessage = function (evt) {
    if (!pc)
        start();

    var message = JSON.parse(evt.data);
    if (message.sdp)
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
            // if we received an offer, we need to answer
            if (pc.remoteDescription.type == "offer")
                pc.createAnswer(localDescCreated, logError);
        }, logError);
    else
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
};

function logError(error) {
    log(error.name + ": " + error.message);
}