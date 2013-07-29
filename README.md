# rtc-signaller

The `rtc-signaller` package provides a simple interface for WebRTC 
Signalling that is protocol independent.  Rather than tie the 
implementation specifically to Websockets, XHR, etc. the signaller package
allows you to implement signalling in your application and then `pipe` it 
to the appropriate output interface.

This in turn reduces the overall effort required to implement WebRTC
signalling over different protocols and also means that your application
code is able to include different underlying transports with relative ease.

[
![Build Status]
(https://travis-ci.org/rtc-io/rtc-signaller.png?branch=master)
](https://travis-ci.org/rtc-io/rtc-signaller)

## Getting Started (Client)

### Creating a Signaller and Associating a Transport

The first thing you will need to do is to include the `rtc-signaller`
package in your application, and provide it a channel name that it will use
to communicate with its peers.

```js
var signaller = require('rtc-signaller');
var channel = signaller('channel-name');
```

The next thing to do is to tell the signaller which transport it is
going to be using:

```js
channel.setTransport(require('rtc-signaller-ws')({ host: 'rtc.io' }));
```

### Handling Events

At the point at which the transport is associated, the channel will attempt
to connect. Once this connection is established, the signaller will become
aware of other peers (if any) that are currently connected to the room:

```js
// wait for ready event
channel.once('ready', function() {
  console.log('connected to ' + channel.name);
});
```

In addition to the `ready` event, the channel will also trigger a
`peer:discover` event to signal the discovery of a new peer in the channel:

```js
channel.on('peer:discover', function(peer) {
  console.log('discovered a new peer in the channel');
});
```

### Peers vs Peer Connections

When working with WebRTC and signalling concepts, it's important to
differentiate between peers and actual `RTCPeerConnection` instances.
From a signalling perspective, a peer is someone (or something) out there
that we can potentially connect with.

It is completely reasonable to have 0..n `RTCPeerConnection` instances
associated with each of the peers that we have knowledge of.

### Connecting to a Peer

So once we know about other peers in the current channel, we should probably
look at how we can start connecting with them.  To do this we need to start
the offer-answer negotiation process.

In an application where we want to automatically connect to every other
known peer in the channel, we could implement code similar to that shown
below:

```js
channel.on('peer:discover', function(peer) {
  var connection = channel.connect(peer);

  // add a stream to the connection
  connection.addStream(media.stream);
});
```

In the example above, once a peer is discovered our application will
automatically attempt to connect with the peer by creating an offer
and then sending that offer using the signaller transport.

Now in most circumstances using code like the sample above will result in
two peers creating offers for each other and duplicating the connection
requests.  In this situation, the signaller will coordinate the connection
requests and make sure that peers find each other correctly.

Once two peers have established a working connection, the channel
will let you know:

```js
channel.on('peer:connect', function(connection) {
});
```

## Signaller reference

The Signaller constructor accepts an `opts` object, with the option
of simply providing a channel name.

For example:

```js
var Signaller = require('rtc-signaller');
var signaller;

// create a signaller for channel, using rtc.io as the signalling endpoint
signaller = new Signaller('test');

// or, create a signaller with an alternative signalling server
signaller = new Signaller({
  channel: 'test',
  host: 'http://anotherserver.com'
});
```

It should be noted, that it is also possible and acceptable to create a 
new signaller instance simply by calling the constructor as a function:

```js
var signaller = require('rtc-signaller')('test');
```

### connect(callback)

### inbound()

Return a pull-stream sink for messages generated by the transport

### join(name, callback)

Send a join command to the signalling server, indicating that you would like 
to join the current room.  In the current implementation of the rtc.io suite
it is only possible for the signalling client to exist in one room at one
particular time, so joining a new channel will automatically mean leaving the
existing one if already joined.

### negotiate(targetId, sdp, callId, type)

The negotiate function handles the process of sending an updated Session
Description Protocol (SDP) description to the specified target signalling
peer.  If this is an established connection, then a callId will be used to 
ensure the sdp is deliver to the correct RTCPeerConnection instance

### outbound()

Return a pull-stream source that can write messages to a transport

### send(data)

Send data across the line

### _autoConnect(opts)

## Helper Functions (Not Exported)

### createMessageParser(signaller)

This is used to create a function handler that will operate more quickly that 
when using bind.  The parser will pull apart a message into parts (splitting 
on the pipe character), parsing those parts where appropriate and then
triggering the relevant event.

### inbound()

The inbound function creates a pull-stream sink that will accept the 
outbound messages from the signaller and route them to the server.

### outbound()

The outbound function creates a pull-stream source that will be fed into 
the signaller input.  The source will be populated as messages are received
from the websocket and closed if the websocket connection is closed.
