export type UserRole = 'ADMIN' | 'MEMBER';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Room {
  id: string;
  roomCode: string;
  maxMembers: number;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  roomId: string;
  role: UserRole;
  status: UserStatus;
  socketId?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  roomId: string;
  createdAt: string;
}

export interface RoomState {
  room: Room;
  currentUser: User;
  members: User[];
  pendingRequests: User[];
  messages: Message[];
}
