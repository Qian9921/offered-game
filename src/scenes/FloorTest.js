import Phaser from "phaser";
export class FloorTest extends Phaser.Scene {
  constructor(){ super("FloorTest"); }
  preload(){ this.load.spritesheet("rb","./assets/limezu/roombuilder_16.png",{frameWidth:16,frameHeight:16}); this.load.spritesheet("of","./assets/limezu/office_16.png",{frameWidth:16,frameHeight:16}); }
  create(){
    this.cameras.main.setBackgroundColor("#222");
    // 展示roombuilder frame 80~175,每个放大2倍3x3铺一小块,标号
    let x=20,y=20,col=0;
    for(let f=80; f<176; f++){
      // 3x3小块
      for(let a=0;a<3;a++)for(let b=0;b<3;b++) this.add.image(x+b*16, y+a*16, "rb", f).setOrigin(0).setScale(1);
      this.add.text(x, y+50, "rb"+f, {fontSize:"9px",color:"#fff"});
      col++; x+=64;
      if(col>=14){ col=0; x=20; y+=72; }
    }
  }
}
