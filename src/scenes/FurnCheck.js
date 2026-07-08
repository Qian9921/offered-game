import Phaser from "phaser";
const IDS=[122,128,132,155,156,157,211,214,259,296,185,186,187,193,194,170,171,172,88,86];
export class FurnCheck extends Phaser.Scene {
  constructor(){ super("FurnCheck"); }
  preload(){ const P="./assets/limezu/singles16/Modern_Office_Singles_"; IDS.forEach(i=>this.load.image("f"+i,P+i+".png")); }
  create(){
    this.cameras.main.setBackgroundColor("#2a2a3a");
    let x=60,y=60,col=0;
    IDS.forEach(i=>{
      this.add.image(x,y,"f"+i).setOrigin(0.5,0.5).setScale(3);
      this.add.text(x,y+60,""+i,{fontSize:"14px",color:"#ffd24d"}).setOrigin(0.5,0);
      col++; x+=180; if(col>=5){col=0;x=60;y+=170;}
    });
  }
}
