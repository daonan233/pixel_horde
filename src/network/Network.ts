import { Client, type Room } from 'colyseus.js';
import type { CombatEvent, InputMessage, ShotMessage, WorldSnapshot } from '../../shared/protocol';

export class Network {
  room?:Room; id='local'; connected=false;
  onSnapshot:(snapshot:WorldSnapshot)=>void=()=>{};onCombat:(event:CombatEvent)=>void=()=>{};
  async connect(){
    const protocol=location.protocol==='https:'?'https':'http';const host=location.hostname||'localhost';
    try{const client=new Client(`${protocol}://${host}:2567`);this.room=await client.joinOrCreate('horde');this.id=this.room.sessionId;this.connected=true;this.room.onMessage('snapshot',(s:WorldSnapshot)=>this.onSnapshot(s));this.room.onMessage('combat',(e:CombatEvent)=>this.onCombat(e));this.room.onLeave(()=>this.connected=false)}catch(error){console.warn('Offline mode: server unavailable',error);this.connected=false}
  }
  input(data:InputMessage){this.room?.send('input',data)}
  shoot(data:ShotMessage){this.room?.send('shoot',data)}
}
