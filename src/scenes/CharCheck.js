import Phaser from "phaser";
export class CharCheck extends Phaser.Scene {
  constructor(){ super("CharCheck"); }
  preload(){ this.load.spritesheet("adam","./assets/limezu/characters/Adam.png",{frameWidth:16,frameHeight:32}); }
  create(){
    this.cameras.main.setBackgroundColor("#333");
    // 24列 x 7行 = 168帧, 放大2倍标号
    const cols=24;
    for(let f=0; f<168; f++){
      const cx=(f%cols), cy=Math.floor(f/cols);
      const x=10+cx*40, y=10+cy*90;
      this.add.image(x,y,"adam",f).setOrigin(0).setScale(2);
      this.add.text(x,y+68,""+f,{fontSize:"9px",color:"#ff0"});
    }
  }
}
