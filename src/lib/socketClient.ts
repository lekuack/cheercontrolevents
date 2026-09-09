import { io, Socket } from "socket.io-client";

let socket: Socket;

export const initSocket = () => {
  if (!socket) {
    socket = io();
  }
  return socket;
};

export const getSocket = () => {
  return socket;
};
