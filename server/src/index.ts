import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './GameRoom';

const app=express();app.get('/health',(_req,res)=>res.json({ok:true,game:'PIXEL HORDE'}));
const httpServer=createServer(app);const gameServer=new Server({transport:new WebSocketTransport({server:httpServer,pingInterval:6000,pingMaxRetries:4})});
gameServer.define('horde',GameRoom);const port=Number(process.env.PORT||2567);httpServer.listen(port,()=>console.log(`PIXEL HORDE server ready on http://localhost:${port}`));
