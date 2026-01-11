import { io } from 'socket.io-client';

export default io(import.meta.env.VITE_REACT_API_SERVER, {
    autoConnect: false,
    query: { userId: JSON.parse(localStorage.getItem('userId')) },
});
