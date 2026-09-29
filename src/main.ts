import './style.css';
import { Game } from './core/Game';

const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
new Game(canvas).init().catch(error=>{console.error(error);document.querySelector('#play')!.textContent='启动失败 · 查看控制台'});
