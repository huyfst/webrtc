import { useEffect, useRef } from 'react';
import 'webrtc-adapter';
import socket from './socket';
import { useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const iceConfiguration = {
        iceServers: [
            {
                urls: import.meta.env.VITE_REACT_TURN_SERVER_URL,
                username: import.meta.env.VITE_REACT_TURN_SERVER_USERNAME,
                credential: import.meta.env.VITE_REACT_TURN_SERVER_CREDENTIAL,
            },
        ],
        iceTransportPolicy: 'relay',
    };
    const remotePeerConnection = new RTCPeerConnection(iceConfiguration);
    const localPeerConnection = new RTCPeerConnection(iceConfiguration);
    const dataChannel = localPeerConnection.createDataChannel('chat');
    const handle = () => {
        dataChannel.send(1);
    };
    const addLocalTrack = async () => {
        const localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        videoRef.current.srcObject = localStream;
        localStream.getTracks().forEach((track) => {
            localPeerConnection.addTrack(track, localStream);
        });
    };

    useEffect(() => {
        socket.connect();
        addLocalTrack();
        remotePeerConnection.addEventListener('track', async (event) => {
            const [remoteStream] = event.streams;
            remoteVideoRef.current.srcObject = remoteStream;
            console.log('remote stream>>>', remoteStream);
        });
        // Remote
        socket.on('message offer', async (message) => {
            console.log('receive message offer', message);
            if (message.offer) {
                remotePeerConnection.setRemoteDescription(
                    new RTCSessionDescription(message.offer)
                );
                console.log(
                    'remote des remote>>>',
                    remotePeerConnection.currentRemoteDescription
                );
                try {
                    const answer = await remotePeerConnection.createAnswer();
                    await remotePeerConnection.setLocalDescription(answer);
                    socket.emit('message answer', { answer, userId: 2 });
                } catch (error) {
                    console.log(error);
                }
            }
        });

        localPeerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('message remote candidate', {
                    iceCandidate: event.candidate,
                    userId: 1,
                });
            }
        };

        // Remote
        remotePeerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('message local candidate', {
                    iceCandidate: event.candidate,
                    userId: 2,
                });
            }
        };

        // Remote
        socket.on('message remote candidate', async (message) => {
            console.log('receive message candidate', message);
            if (message.iceCandidate) {
                try {
                    await remotePeerConnection.addIceCandidate(
                        message.iceCandidate
                    );
                    console.log('add remote candidate');
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        });

        socket.on('message local candidate', async (message) => {
            console.log('receive message candidate', message);
            if (message.iceCandidate) {
                try {
                    await localPeerConnection.addIceCandidate(
                        message.iceCandidate
                    );
                    console.log('add local  candidate');
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        });

        localPeerConnection.addEventListener(
            'connectionstatechange',
            (event) => {
                if (localPeerConnection.connectionState === 'connected') {
                    console.log('Peers connected!');
                }
            }
        );

        remotePeerConnection.addEventListener(
            'connectionstatechange',
            (event) => {
                if (remotePeerConnection.connectionState === 'connected') {
                    console.log('Peers connected!');
                }
            }
        );

        remotePeerConnection.addEventListener('datachannel', (event) => {
            const dataChannel = event.channel;
            dataChannel.addEventListener('message', (event) => {
                const message = event.data;
                console.log('message>>>', message);
            });
        });
    }, []);

    async function makeCall() {
        console.log('making call............');
        socket.on('message answer', async (message) => {
            console.log('receive message answer', message);
            if (message.answer) {
                const remoteDesc = new RTCSessionDescription(message.answer);
                try {
                    await localPeerConnection.setRemoteDescription(remoteDesc);
                    console.log(
                        'remote des local>>>',
                        localPeerConnection.currentLocalDescription
                    );
                } catch (error) {
                    console.log(error);
                }
            }
        });
        try {
            const offer = await localPeerConnection.createOffer();
            await localPeerConnection.setLocalDescription(offer);

            socket.emit('message offer', { offer, userId: 1 });
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                width={400}
                height={300}
            />
            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                width={400}
                height={300}
            />
            <button onClick={makeCall}>send</button>
            <button onClick={handle}>Send message</button>
            <button onClick={() => navigate('/login')}>Login</button>
        </>
    );
}

export default Home;
