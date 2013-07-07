var socket = new WebSocket('ws://192.168.1.3:1337/'); //var socket = new WebSocket('ws://localhost:1337/');
var signalingChannel = new SignalingChannel();
var servers = {iceServers:[{url:"stun:stun.l.google.com:19302"}]};
var pc;
var channel;
var lastMessage;
var currentCandidate;
var receivedCandidate;
var receivedSdp;
var isMaster = false;
//deccriptions
var masterDescription;
var masterRemoteDescription;
var slaveDescription;
//candidates
var masterCandidate;
var masterRemoteCandidate;
var slaveCandidate;
var slaveRemoteCandidate;

//test shit
var masterReady = false;

socket.addEventListener("message", onMessage, false);

function SignalingChannel() {
	this.send = function(msg) {
		//console.log("Sending setup signal");
        console.log("msg is:")
        console.info(msg);
		try {
            socket.send(msg);
        }
        catch (e) {
            console.log('ERRRRORRR!!!');
            console.info(e);
        }
	};
};

function startMaster(){
    console.log('Staring master!');
    isMaster = true;
    pc = new webkitRTCPeerConnection(servers,{ optional:[ { RtpDataChannels: true } ]});             
    
    createChannelMaster();       
    pc.onicecandidate = masterGotCandidate;

    //WARN!!!
    //All this stuff will fall down with exceptions. (((
    //But there is a workaround )
    //Execute pc.createOffer(masterGotDescription) from console and check channel.readyState - it should be 'open'
    //Execute setupChat() on both environments
    //Now type shannel.send('data') and enjoy ))
    //
    //About exceptions/errors/etc 
    //It looks like onIceCandidate shouldn't run before the descriptions would be set.
    //Try to do something about it, dude.    
    
    //pc.createOffer(masterGotDescription);  

    // This is workaround   
    DoOffer();
    masterReady = true;
};

function DoOffer() {
    if (masterReady) {
        console.log('Master is ready!!!');
        pc.createOffer(masterGotDescription);
        setupChat();
    }
    else {
        console.log('Master is not ready!!!');
        setTimeout(DoOffer, 1000);
    };
}

function startSlave() {
    console.log('Staring slave!');
    pc = new webkitRTCPeerConnection(servers,{ optional:[ { RtpDataChannels: true } ]});

    pc.onicecandidate = slaveGotCandidate; 

    pc.onnegotiationneeded = function () {
     //    console.log('run onnegotiationneeded - creating an offer');
        // pc.createOffer(localDescCreated, logError);
    };

    //createDataChannels(pc, isInitiator);
    acceptChannelSlave();
};

function createChannelMaster(){    
    //console.log('Master creates an offer');
    //pc.createOffer(localDescCreated, logError);        
    console.log('Master creates data channel');
    channel = pc.createDataChannel("msid:1234", { reliable : false });
}

function acceptChannelSlave(){
    pc.ondatachannel = function (evt) {
        console.log('Slave received a channel: ');
        console.info(evt.channel);
        channel = evt.channel;        
    };   
};


function masterGotDescription(desc) {
    console.log('Master got description: ');
    console.info(desc);    
    masterDescription = desc;       
    pc.setLocalDescription(desc);
    console.log('Sending description to slave')
    signalingChannel.send(JSON.stringify(pc.localDescription));
};

function slaveGotDescription(desc) {
    console.log('Slave got description: ');
    console.info(desc);  
    slaveDescription = desc;
    var slaveRTCDescription = new RTCSessionDescription(slaveDescription);
    pc.setRemoteDescription(slaveRTCDescription);
    pc.createAnswer(slaveAnswers);
};

function slaveAnswers(desc) {
    console.log('Slave answers: ');
    console.info(desc);  
    pc.setLocalDescription(desc);    
    console.log('Sending desc to Master: ');
    signalingChannel.send(JSON.stringify({ "sdp": pc.localDescription }));    
};

function masterGotAnswer(desc) {
    console.log('Master got answer: ');
    console.info(desc);    
    masterRemoteDescription = desc;    
    var masterRTCDescription = new RTCSessionDescription(masterRemoteDescription.sdp);   
    pc.setRemoteDescription(masterRTCDescription);
    console.log('Master remote desc was set!');     
};

function masterGotCandidate(evt) {
    console.log('Master got candidate; evt is ');        
    console.info(evt);
    if (evt.candidate) {
        masterCandidate = evt.candidate;
        //Master candidate should be sent to Slave
        signalingChannel.send(JSON.stringify(evt));
        //pc.addIceCandidate(evt.candidate);
    };    
};

function slaveGotCandidate(evt) {
    console.log('Slave got candidate; evt is ');        
    console.info(evt);
    if (evt.candidate) {
        slaveCandidate = evt.candidate;        
        signalingChannel.send(JSON.stringify(evt.candidate));        
    };
    setupChat();
};

function slaveReceivedCandidate(evt) {
    console.log('Slave got candidate; evt is ');        
    console.info(evt);
    slaveRemoteCandidate = evt;
    var cnd = new RTCIceCandidate(slaveRemoteCandidate.candidate);
    pc.addIceCandidate(cnd);
};

function masterReceivedCandidate(evt) {
    console.log('Master received candidate; evt is ');        
    console.info(evt);
    masterRemoteCandidate = evt;
    var cnd = new RTCIceCandidate(masterRemoteCandidate);    
    pc.addIceCandidate(cnd);
};

function onMessage(evt) {    
    console.log('Processing signaling message...');   
    console.info(evt); 
    var message = JSON.parse(evt.data);
    console.info(message);
    lastMessage = message;

    if (message.sdp) {    
        if (!isMaster) {
            slaveGotDescription(message);
        }
        else {
            masterGotAnswer(message);
        }
    }
    else {
        console.log('Candidate?');
        if (!isMaster){
            slaveReceivedCandidate(message);
        }
        else {
            masterReceivedCandidate(message);
        }        
    };

};

function setupChat() {
    channel.onopen = function () {
        // e.g. enable send button
        // enableChat(channel);
        console.log('Chat enabled.');
    };

    channel.onmessage = function (evt) {
        // showChatMessage(evt.data);
        console.log(evt.data);
    };
};

function sendChatMessage(msg) {
    channel.send(msg);
};

function logError(error) {
    console.info(error);
    console.log(error.name + ": " + error.message);
};

function setupSlaveMirror() {
    // Slave gets an info about Master's events
    if (isMaster) return;
    channel.onmessage = function (evt) {
        // showChatMessage(evt.data);
        console.log(evt.data);
        var packet = JSON.parse(evt.data);
        document.getElementById('myDiv').style.top = packet.y + 'px';
        document.getElementById('myDiv').style.left = packet.x + 'px';
        channel.send('Slave mirrrors: ' + evt.data);
    };   
};

function setupMasterSender() {
    // Master sends ifo about events to Slave
    if (!isMaster) return;
    document.onclick = function(e) {
        console.log('Clicked');
        window.eventCoords = {x: e.clientX, y: e.clientY};
        var packet = JSON.stringify({x: e.clientX, y: e.clientY, performance: performance.now() });
        channel.send(packet);
    };
};

function setupMasterMirror() {
    // Master gets an info about Slave's events (now it's just a copy of Master's data)
    if (!isMaster) return;
    channel.onmessage = function (evt) {
        // showChatMessage(evt.data);
        console.log(evt.data + ' - ' + performance.now());
        document.getElementById('myDiv').style.top = window.eventCoords.y + 'px';
        document.getElementById('myDiv').style.left = window.eventCoords.x + 'px';
    };   
};

function setupMirroring() {
    if (typeof channel !== 'undefined' && channel.readyState == 'open') {
        setupSlaveMirror();
        setupMasterSender();
        setupMasterMirror();
    }
    else {
        setTimeout(setupMirroring, 1000);
    }
};

setupMirroring();