# rtc-signaller

[![Build Status](http://etd-packaging.research.nicta.com.au/jenkins/view/rtc/job/rtc-signaller/badge/icon)](http://etd-packaging.research.nicta.com.au/jenkins/view/rtc/job/rtc-signaller/)

The `rtc-signaller` package provides a simple interface for WebRTC Signalling that is protocol independent.  Rather than tie the implementation specifically to Websockets, XHR, etc. the signaller package allows you to implement signalling in your application and then `pipe` it to the appropriate output interface.

This in turn reduces the overall effort required to implement WebRTC signalling over different protocols and also means that your application code is able to include different underlying transports with relative ease.

## Getting Started (Client)

### Creating a Signaller and Associating a Transport

The first thing you will need to do is to include the `rtc-signaller` package in your application, and provide it a channel name that it will use to communicate with its peers.

```js
var signaller = require('rtc-signaller'),
	channel = signaller('channel-name');
```

The next thing to do is to tell the signaller which transport it is going to be using:

```js
channel.setTransport(require('rtc-signaller-socket.io')({ host: 'rtc.io' }));
```

### Handling Events

At the point at which the transport is associated, the channel will attempt to connect. Once this connection is established, the signaller will become aware of other peers (if any) that are currently connected to the room:

```js
// wait for ready event
channel.once('ready', function() {
	console.log('connected to ' + channel.name + ' with ' + channel.peers.length + ' other peers');
});
```

In addition to the `ready` event, the channel will also trigger a `peer:discover` event to signal the discovery of a new peer in the channel:

```js
channel.on('peer:discover', function(peer) {
	console.log('discovered a new peer in the channel');
});
```

### Peers vs Peer Connections

When working with WebRTC and signalling concepts, it's important to differentiate between peers and actual `RTCPeerConnection` instances.  From a signalling perspective, a peer is someone (or something) out there that we can potentially connect with.

It is completely reasonable to have 0..n `RTCPeerConnection` instances associated with each of the peers that we have knowledge of.

### Connecting to a Peer

So once we know about other peers in the current channel, we should probably look at how we can start connecting with them.  To do this we need to start the offer-answer negotiation process.

In an application where we want to automatically connect to every other known peer in the channel, we could implement code similar to that shown below:

```js
channel.on('peer:discover', function(peer) {
	var connection = channel.connect(peer);

	// add a stream to the connection
	connection.addStream(media.stream);
});
```

In the example above, once a peer is discovered our application will automatically attempt to connect with the peer by [creating an offer](http://dev.w3.org/2011/webrtc/editor/webrtc.html#widl-RTCPeerConnection-createOffer-void-RTCSessionDescriptionCallback-successCallback-RTCPeerConnectionErrorCallback-failureCallback-MediaConstraints-constraints) and then sending that offer using the signaller transport.

Now in most circumstances using code like the sample above will result in two peers creating offers for each other and duplicating the connection requests.  In this situation, the [signaller will coordinate the connection requests](http://git-ent.research.nicta.com.au/doehlman/rtc-signaller/issues/1) and make sure that peers find each other correctly.

Once two peers have established a working connection, the channel will let you know:

```js
channel.on('peer:connect', function(connection) {
});
```
